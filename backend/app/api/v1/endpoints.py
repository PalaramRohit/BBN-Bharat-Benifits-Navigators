from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Literal
import traceback
import io
import base64
import requests
import re

try:
    from gtts import gTTS
    from gtts.lang import tts_langs
except Exception:
    gTTS = None
    tts_langs = None

from ...policies.models import UserProfile
from ...orchestration.orchestrator import orchestrator
from ...users.citizen_service import CitizenService
from ...intelligence.llm_service import llm_service
from ...auth.otp_service import OTPService
from ...config import get_settings
from ...policies.scheme_rules import get_rule_for_scheme, normalize_scheme_name

router = APIRouter()
settings = get_settings()

_SCHEME_SUBSIDY_HINTS = {
    "pm kisan": 6000.0,
    "pradhan mantri kisan samman nidhi": 6000.0,
    "rythu bandhu": 10000.0,
    "ysr rythu bharosa": 13500.0,
    "atal pension yojana": 12000.0,
    "national old age pension": 12000.0,
    "gruha lakshmi": 24000.0,
    "lakshmir bhandar": 12000.0,
    "ladli behna": 15000.0,
    "orunodoi": 15000.0,
    "kanya sumangala": 15000.0,
    "kalyana lakshmi": 100000.0,
    "kanya utthan": 50000.0,
    "pm ujjwala yojana": 1600.0,
    "pmay": 150000.0,
    "pmjay": 500000.0,
    "chiranjeevi yojana": 500000.0,
    "swasthya sathi": 500000.0,
    "mukhyamantri amrutum": 500000.0,
    "himcare": 500000.0,
    "mhis": 500000.0,
}

_CATEGORY_DEFAULT_SUBSIDY = {
    "farmer": 8000.0,
    "women": 12000.0,
    "health": 500000.0,
    "pension": 12000.0,
    "education": 10000.0,
    "housing": 150000.0,
    "insurance": 200000.0,
}

_TTS_LANG_ALIASES = {
    "english": "en",
    "hindi": "hi",
    "telugu": "te",
    "tamil": "ta",
    "bengali": "bn",
    "bangla": "bn",
    "assamese": "bn",
    "gujarati": "gu",
    "kannada": "kn",
    "malayalam": "ml",
    "marathi": "mr",
    "nepali": "ne",
    "urdu": "ur",
    "kashmiri": "ur",
    "sindhi": "ur",
    "konkani": "mr",
    "odia": "hi",
    "or": "hi",
    "punjabi": "hi",
    "pa": "hi",
    "bodo": "hi",
    "dogri": "hi",
    "maithili": "hi",
    "manipuri": "bn",
    "sanskrit": "hi",
    "santali": "hi",
}


def _supported_tts_langs() -> set[str]:
    if tts_langs is None:
        return {"en"}
    try:
        return set(tts_langs().keys())
    except Exception:
        return {"en"}


def _normalize_tts_lang(value: Optional[str]) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return "en"

    normalized = _TTS_LANG_ALIASES.get(raw, raw)
    supported = _supported_tts_langs()
    if normalized in supported:
        return normalized
    if normalized in {"ks", "sd"} and "ur" in supported:
        return "ur"
    if normalized in {"mr", "kok"} and "mr" in supported:
        return "mr"
    if "hi" in supported:
        return "hi"
    return "en"


def _parse_amount(text: str) -> float:
    if not text:
        return 0.0
    matches = re.findall(
        r"(\d[\d,]*(?:\.\d+)?)\s*(lakh|lakhs|lac|lacs|crore|crores|cr)?",
        text.lower(),
    )
    if not matches:
        return 0.0

    best = 0.0
    for num_raw, unit in matches:
        value = float(num_raw.replace(",", ""))
        multiplier = 1.0
        if unit in {"lakh", "lakhs", "lac", "lacs"}:
            multiplier = 100000.0
        elif unit in {"crore", "crores", "cr"}:
            multiplier = 10000000.0
        best = max(best, value * multiplier)
    return best


def _is_coverage_like(policy: dict) -> bool:
    benefits = policy.get("benefits", {}) or {}
    text = " ".join(
        [
            str(policy.get("category", "")),
            str(policy.get("description", "")),
            str(benefits.get("coverage", "")),
            str(benefits.get("details", "")),
            str(benefits.get("amount", "")),
        ]
    ).lower()
    keywords = ["insurance", "coverage", "hospital", "sum insured", "health cover"]
    return any(k in text for k in keywords)


def _estimate_subsidy(policy: dict) -> dict:
    benefits = policy.get("benefits", {}) or {}
    text_parts = [
        str(benefits.get("amount", "")),
        str(benefits.get("coverage", "")),
        str(benefits.get("details", "")),
        str(policy.get("description", "")),
    ]
    combined = " ".join(text_parts).lower()

    amount = 0.0
    direct_amount = benefits.get("amount")
    if isinstance(direct_amount, (int, float)):
        amount = float(direct_amount)
    elif isinstance(direct_amount, str):
        amount = _parse_amount(direct_amount)

    if amount <= 0:
        for p in text_parts:
            amount = max(amount, _parse_amount(str(p)))

    if amount <= 0:
        scheme_key = normalize_scheme_name(str(policy.get("name", "")))
        amount = _SCHEME_SUBSIDY_HINTS.get(scheme_key, 0.0)

    if amount <= 0:
        category = str(policy.get("category", "")).strip().lower()
        amount = _CATEGORY_DEFAULT_SUBSIDY.get(category, 8000.0)

    if any(token in combined for token in ["per month", "monthly", "month"]):
        monthly = amount
        annual = amount * 12.0
        frequency = "monthly"
    else:
        annual = amount
        monthly = amount / 12.0
        frequency = "annual"

    if _is_coverage_like(policy):
        subsidy_display = f"Up to Rs {annual:,.0f} coverage / year"
    elif frequency == "monthly":
        subsidy_display = f"Rs {monthly:,.0f} per month (Rs {annual:,.0f} / year)"
    else:
        subsidy_display = f"Rs {annual:,.0f} per year (about Rs {monthly:,.0f} / month)"

    return {
        "monthly_subsidy_rs": round(monthly, 2),
        "annual_subsidy_rs": round(annual, 2),
        "subsidy_display": subsidy_display,
    }


def _infer_scope(policy: dict) -> tuple[str, Optional[str]]:
    rule = get_rule_for_scheme(str(policy.get("name", ""))) or {}
    rule_state = rule.get("state")
    if rule_state:
        return "State", str(rule_state)

    required_states = policy.get("eligibility_criteria", {}).get("required_states", []) or []
    cleaned = [str(s).strip() for s in required_states if str(s).strip()]
    specific = [s for s in cleaned if s.lower() not in {"all", "central"}]
    if specific:
        return "State", specific[0]
    return "Central", None


def _build_criteria_lines(policy: dict, scope_state: Optional[str]) -> list[str]:
    criteria = policy.get("eligibility_criteria", {}) or {}
    lines = []

    min_age = criteria.get("min_age")
    max_age = criteria.get("max_age")
    income_limit = criteria.get("income_limit")
    occupations = criteria.get("required_occupations", []) or []
    docs = criteria.get("required_documents", []) or []

    if min_age not in [None, 0] or max_age not in [None, 100]:
        if min_age not in [None, 0] and max_age not in [None, 100]:
            lines.append(f"Age: {int(min_age)} to {int(max_age)} years")
        elif min_age not in [None, 0]:
            lines.append(f"Age: {int(min_age)}+ years")
        elif max_age not in [None, 100]:
            lines.append(f"Age: up to {int(max_age)} years")

    if isinstance(income_limit, (int, float)) and float(income_limit) < 1_000_000_000:
        lines.append(f"Income Limit: up to Rs {float(income_limit):,.0f} per year")

    occ = [o for o in occupations if str(o).lower() != "any"]
    if occ:
        lines.append(f"Occupation: {', '.join(map(str, occ[:3]))}")

    if scope_state:
        lines.append(f"State: {scope_state}")
    else:
        lines.append("State: All India (Central)")

    if docs:
        lines.append(f"Documents: {', '.join(map(str, docs[:4]))}")

    rule = get_rule_for_scheme(str(policy.get("name", ""))) or {}
    if rule.get("bpl_status") is True:
        lines.append("Preference: BPL families")
    if rule.get("gender"):
        lines.append(f"Gender: {rule.get('gender')}")
    if rule.get("head_of_family") is True:
        lines.append("Applicant should be head of family")

    return lines[:7]


def _dedupe_scheme_key(name: str) -> str:
    raw = normalize_scheme_name(name or "")
    tokens = [t for t in raw.split() if t not in {"scheme", "yojana"}]
    return " ".join(tokens)


class QueryRequest(BaseModel):
    query: str
    profile: Optional[UserProfile] = None
    aadhaar_no: Optional[str] = None


class LLMModeRequest(BaseModel):
    mode: Literal["online", "offline", "auto"]


class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


class TextToSpeechRequest(BaseModel):
    text: str
    lang: str = "en"
    slow: bool = False


@router.post("/query")
async def main_query(request: QueryRequest):
    """
    Main entry point for BBN intelligence.
    Routes through RAG -> Eligibility -> Decision Layer -> LLM Explanation.
    Supports Aadhaar-based profile auto-fetch if profile is not provided.
    """
    try:
        profile = request.profile or UserProfile(user_id="guest")
        response = await orchestrator.run_query(
            request.query,
            profile,
            request.aadhaar_no,
        )
        return response
    except Exception as e:
        print("\nFULL ERROR TRACE BELOW\n")
        traceback.print_exc()
        raise e


@router.get("/policies/search")
async def search_policies(q: str):
    from ...utils.rag_retriever import rag_retriever

    policies = rag_retriever.retrieve(q)
    return {"results": [p.dict() for p in policies]}


@router.get("/policies/all")
async def all_policies(state: Optional[str] = None):
    """
    Returns segregated central and state schemes with criteria and subsidy info.
    """
    from ...utils.rag_retriever import rag_retriever

    selected_state = (state or "").strip().lower()
    dedup: dict[str, dict] = {}
    dedup_score: dict[str, float] = {}

    for policy in rag_retriever.policies:
        name = str(policy.get("name", "")).strip()
        if not name:
            continue

        scope, scope_state = _infer_scope(policy)
        if scope == "State" and selected_state and scope_state and scope_state.strip().lower() != selected_state:
            continue

        subsidy = _estimate_subsidy(policy)
        criteria_lines = _build_criteria_lines(policy, scope_state if scope == "State" else None)
        subsidy_label = "Central Subsidy" if scope == "Central" else "State Subsidy"

        entry = {
            "policy_id": policy.get("policy_id"),
            "name": name,
            "description": policy.get("description") or "Government welfare support scheme.",
            "category": policy.get("category") or "General",
            "ministry": policy.get("ministry") or "Various",
            "scheme_scope": scope,
            "state_name": scope_state if scope == "State" else None,
            "subsidy_label": subsidy_label,
            "monthly_subsidy_rs": subsidy["monthly_subsidy_rs"],
            "annual_subsidy_rs": subsidy["annual_subsidy_rs"],
            "subsidy_display": subsidy["subsidy_display"],
            "criteria_lines": criteria_lines,
            "required_documents": (policy.get("eligibility_criteria", {}) or {}).get("required_documents", []),
            "application_process": policy.get("application_process") or [],
            "official_url": policy.get("official_url"),
        }

        key = f"{_dedupe_scheme_key(name)}|{scope}|{(scope_state or '').lower()}"
        score = 0.0
        score += len(str(entry["description"])) / 1000.0
        score += 2.0 if entry["required_documents"] else 0.0
        score += 2.0 if subsidy["annual_subsidy_rs"] > 0 else 0.0
        score += 1.0 if entry["official_url"] else 0.0

        if key not in dedup or score > dedup_score.get(key, -1):
            dedup[key] = entry
            dedup_score[key] = score

    central_schemes = sorted(
        [v for v in dedup.values() if v["scheme_scope"] == "Central"],
        key=lambda x: x["name"].lower(),
    )
    state_schemes = sorted(
        [v for v in dedup.values() if v["scheme_scope"] == "State"],
        key=lambda x: (str(x.get("state_name") or "").lower(), x["name"].lower()),
    )

    return {
        "central_count": len(central_schemes),
        "state_count": len(state_schemes),
        "selected_state_filter": state or None,
        "central_schemes": central_schemes,
        "state_schemes": state_schemes,
    }


@router.get("/citizen/by-aadhaar/{aadhaar_no}")
async def get_citizen_profile(aadhaar_no: str):
    """
    Fetches a profile from the synthetic citizen registry by Aadhaar number.
    Used for profile auto-population in the dashboard.
    """
    profile = await CitizenService.get_by_aadhaar(aadhaar_no)
    if not profile:
        raise HTTPException(status_code=404, detail="Citizen not found in registry")

    return {
        "name": profile.name,
        "aadhaar_no": profile.aadhaar_no,
        "age": profile.age,
        "state": profile.state,
        "caste": profile.caste,
        "ration_card": profile.ration_card_type or "None",
        "monthly_income": round(profile.income / 12, 2),
        "occupation": profile.occupation,
        "language": "English",
    }


@router.get("/llm/mode")
async def get_llm_mode():
    return {"mode": llm_service.get_mode()}


@router.post("/llm/mode")
async def set_llm_mode(request: LLMModeRequest):
    return {"mode": llm_service.set_mode(request.mode)}


@router.post("/auth/send-otp")
async def send_otp(request: SendOtpRequest):
    try:
        sent, normalized_phone = OTPService.send_otp(request.phone)
        if not sent:
            raise HTTPException(status_code=500, detail="Failed to send OTP")
        return {"ok": True, "phone": normalized_phone, "message": "OTP sent"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Unexpected error sending OTP")


@router.post("/auth/verify-otp")
async def verify_otp(request: VerifyOtpRequest):
    try:
        verified, normalized_phone = OTPService.verify_otp(request.phone, request.code)
        if not verified:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        return {"ok": True, "phone": normalized_phone, "verified": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Unexpected error verifying OTP")


@router.post("/voice/tts")
async def text_to_speech(request: TextToSpeechRequest):
    """
    Generate speech audio (MP3) using gTTS and return base64 payload.
    """
    text = (request.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if gTTS is None:
        raise HTTPException(
            status_code=500,
            detail="gTTS is not installed on backend",
        )

    requested_lang = (request.lang or "").strip() or "en"
    lang_code = _normalize_tts_lang(requested_lang)

    try:
        buffer = io.BytesIO()
        try:
            tts = gTTS(text=text, lang=lang_code, slow=request.slow)
            tts.write_to_fp(buffer)
        except Exception:
            # Hard fallback so voice never fails for unsupported language codes.
            buffer = io.BytesIO()
            lang_code = "en"
            tts = gTTS(text=text, lang=lang_code, slow=request.slow)
            tts.write_to_fp(buffer)
        audio_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        return {
            "ok": True,
            "format": "mp3",
            "lang": lang_code,
            "requested_lang": requested_lang,
            "audio_base64": audio_b64,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {e}")


@router.post("/voice/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form(None),
    preferred_language: Optional[str] = Form(None),
):
    """
    Transcribe uploaded speech audio using Groq Whisper and auto-detect language.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    filename = file.filename or "speech.webm"
    content_type = file.content_type or "audio/webm"

    def normalize_lang(value: Optional[str]) -> str:
        raw = (value or "").strip().lower()
        if raw in {"te", "telugu"}:
            return "te"
        if raw in {"ta", "tamil"}:
            return "ta"
        if raw in {"hi", "hindi"}:
            return "hi"
        if raw in {"bn", "bengali", "bangla", "assamese"}:
            return "bn"
        if raw in {"gu", "gujarati"}:
            return "gu"
        if raw in {"kn", "kannada"}:
            return "kn"
        if raw in {"ml", "malayalam"}:
            return "ml"
        if raw in {"mr", "marathi", "konkani"}:
            return "mr"
        if raw in {"ne", "nepali"}:
            return "ne"
        if raw in {"ur", "urdu", "kashmiri", "sindhi"}:
            return "ur"
        if raw in {"en", "english"}:
            return "en"
        return ""

    def transcribe_once(language: Optional[str] = None):
        data = {
            "model": settings.GROQ_STT_MODEL or "whisper-large-v3-turbo",
            "response_format": "verbose_json",
            "temperature": "0",
        }
        if prompt:
            data["prompt"] = prompt
        if language:
            data["language"] = language

        files = {
            "file": (filename, file_bytes, content_type),
        }
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers=headers,
            data=data,
            files=files,
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        text = (payload.get("text") or "").strip()
        detected_language = (payload.get("language") or "").strip().lower()
        return payload, text, detected_language

    try:
        payload, text, detected_language = transcribe_once(None)
        preferred = normalize_lang(preferred_language)
        used_preferred_retry = False

        # If auto-detection falls back to English but user has Indic language preference,
        # retry once with that language forced to get native script output.
        if preferred in {"te", "ta", "hi", "bn", "gu", "kn", "ml", "mr", "ne", "ur"} and detected_language in {"", "en", "english"}:
            retry_payload, retry_text, retry_language = transcribe_once(preferred)
            if retry_text:
                payload, text = retry_payload, retry_text
                detected_language = retry_language or preferred
                used_preferred_retry = True

        return {
            "ok": True,
            "text": text,
            "language": detected_language,
            "model": settings.GROQ_STT_MODEL or "whisper-large-v3-turbo",
            "used_preferred_retry": used_preferred_retry,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT transcription failed: {e}")
