const DEFAULT_API_BASE =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
    : "http://127.0.0.1:8000/api/v1";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/$/, "");
export type LLMMode = "online" | "offline" | "auto";
export type SupportedTTSLang = "en" | "hi" | "te" | "ta" | "bn" | "gu" | "kn" | "ml" | "mr" | "ne" | "ur";

export interface VoiceLangMeta {
  code: SupportedTTSLang;
  locale: string;
  label: string;
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

export interface CitizenProfile {
  name: string;
  aadhaar_no: string;
  phone?: string;
  age: number;
  ration_card: string;
  monthly_income: number;
  occupation: string;
  language: string;
  state: string;
  caste: string;
  gender?: string;
  bpl_status?: boolean;
  land_ownership?: boolean;
  student_status?: boolean;
  bank_account?: boolean;
  head_of_family?: boolean;
  resident?: boolean;
  informal_worker?: boolean;
}

export interface SchemeInfo {
  id: string;
  title: string;
  category: string;
  description: string;
  coverage: string;
  due_date: string;
  eligible: boolean;
  scheme_scope?: string;
  reason_eligible?: string;
  reason_not_eligible?: string;
  estimated_benefit?: any;
  required_states?: string[];
  official_url?: string;
  benefits?: any;
  ministry?: string;
  application_process?: string[];
}

export interface QueryResponse {
  eligible_policies: number;
  eligible_schemes: SchemeInfo[];
  not_eligible_schemes: SchemeInfo[];
  monthly_benefit_value: number;
  ml_prediction: {
    approval_likelihood: number;
  };
  decision_output: {
    document_advice: string[];
  };
  explanation: string;
  reasoning_details?: string;
  recommended_schemes: SchemeInfo[];
}

export interface AllSchemeInfo {
  policy_id: string;
  name: string;
  description: string;
  category: string;
  ministry: string;
  scheme_scope: "Central" | "State";
  state_name?: string | null;
  subsidy_label: string;
  monthly_subsidy_rs: number;
  annual_subsidy_rs: number;
  subsidy_display: string;
  criteria_lines: string[];
  required_documents: string[];
  application_process: string[];
  official_url?: string | null;
}

export interface AllSchemesResponse {
  central_count: number;
  state_count: number;
  selected_state_filter?: string | null;
  central_schemes: AllSchemeInfo[];
  state_schemes: AllSchemeInfo[];
}

export const mockQueryResponse: QueryResponse = {
  eligible_policies: 5,
  eligible_schemes: [],
  not_eligible_schemes: [],
  monthly_benefit_value: 5000,
  ml_prediction: {
    approval_likelihood: 0.85,
  },
  decision_output: {
    document_advice: ["Aadhaar", "Income Certificate"],
  },
  explanation: "You are highly eligible for the PM-Kisan scheme.",
  reasoning_details:
    "AI analyzed your profile and matched it with agricultural ministry data...",
  recommended_schemes: [],
};

export async function fetchCitizenProfile(
  aadhaarNo: string
): Promise<CitizenProfile> {
  const res = await fetch(`${API_BASE}/citizen/by-aadhaar/${aadhaarNo}`);
  if (!res.ok) throw new Error("Failed to fetch profile");
  const data = await res.json();
  return {
    ...data,
    caste: data.caste || data.caste_category || data.Caste_Category || "Unknown",
  };
}

export async function fetchAllSchemes(state?: string): Promise<AllSchemesResponse> {
  const params = new URLSearchParams();
  if (state && state.trim()) params.set("state", state.trim());

  const url = `${API_BASE}/policies/all${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch all schemes");
  const data = await res.json();
  return {
    central_count: Number(data.central_count || 0),
    state_count: Number(data.state_count || 0),
    selected_state_filter: data.selected_state_filter || null,
    central_schemes: data.central_schemes || [],
    state_schemes: data.state_schemes || [],
  };
}

export async function submitQuery(
  query: string,
  profile?: CitizenProfile | null,
  aadhaar_no?: string
): Promise<QueryResponse> {

  // ✅ Always send a valid profile to backend
  const safeProfile = profile
    ? {
        user_id: "user",
        name: profile.name,
        income: profile.monthly_income * 12, // Convert monthly → annual
        occupation: profile.occupation,
        state: profile.state,
        caste: profile.caste,
        aadhaar_no: profile.aadhaar_no,
        phone: profile.phone,
        age: profile.age,
        gender: profile.gender,
        bpl_status: profile.bpl_status,
        land_ownership: profile.land_ownership,
        student_status: profile.student_status,
        bank_account: profile.bank_account,
        head_of_family: profile.head_of_family,
        resident: profile.resident,
        informal_worker: profile.informal_worker
      }
    : {
        user_id: "guest",
        occupation: "unknown",
        state: "India",
        caste: "general"
      };

  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      profile: safeProfile,
      aadhaar_no: aadhaar_no || ""
    }),
  });

  if (!res.ok) throw new Error("Failed to submit query");

  const data = await res.json();

  // Mapping function for Consistency
  const mapScheme = (s: any, isEligible: boolean) => ({
    id: s.policy_id || s.id,
    title: s.name || s.title,
    category: s.category,
    description: s.description,
    coverage: s.benefits?.amount || s.coverage || "N/A",
    due_date: s.deadline || s.due_date || "N/A",
    eligible: isEligible,
    scheme_scope: s.scheme_scope,
    reason_eligible: s.reason_eligible,
    reason_not_eligible: s.reason_not_eligible,
    estimated_benefit: s.estimated_benefit,
    required_states: s?.eligibility_criteria?.required_states || [],
    official_url: s.official_url,
    ministry: s.ministry,
    application_process: s.application_process
  });

  return {
    ...data,
    eligible_schemes: (data.eligible_schemes || []).map((s: any) =>
      mapScheme(s, true)
    ),
    not_eligible_schemes: (data.not_eligible_schemes || []).map((s: any) =>
      mapScheme(s, false)
    ),
    recommended_schemes: (data.recommended_schemes || []).map((s: any) =>
      mapScheme(s, false)
    )
  };
}

export const mockProfile: CitizenProfile = {
  name: "Rohit",
  aadhaar_no: "123456789012",
  age: 29,
  ration_card: "White Card",
  monthly_income: 20000,
  occupation: "Self-employed",
  language: "English",
  state: "Andhra Pradesh",
  caste: "General"
};

export async function getLLMMode(): Promise<LLMMode> {
  const res = await fetch(`${API_BASE}/llm/mode`);
  if (!res.ok) throw new Error("Failed to fetch LLM mode");
  const data = await res.json();
  return data.mode as LLMMode;
}

export async function setLLMMode(mode: LLMMode): Promise<LLMMode> {
  const res = await fetch(`${API_BASE}/llm/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error("Failed to set LLM mode");
  const data = await res.json();
  return data.mode as LLMMode;
}

export async function sendRegistrationOtp(phone: string): Promise<{ ok: boolean; phone: string; message: string }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
  } catch {
    throw new Error(`Cannot reach backend at ${API_BASE}. Start backend and retry.`);
  }
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Failed to send OTP");
  return data;
}

export async function verifyRegistrationOtp(
  phone: string,
  code: string
): Promise<{ ok: boolean; phone: string; verified: boolean }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
  } catch {
    throw new Error(`Cannot reach backend at ${API_BASE}. Start backend and retry.`);
  }
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Failed to verify OTP");
  return data;
}

let activeTtsAudio: HTMLAudioElement | null = null;

const TTS_LANG_BY_UI_LANGUAGE: Record<string, SupportedTTSLang> = {
  english: "en",
  hindi: "hi",
  assamese: "bn",
  bengali: "bn",
  bodo: "hi",
  dogri: "hi",
  gujarati: "gu",
  kannada: "kn",
  kashmiri: "ur",
  konkani: "mr",
  maithili: "hi",
  malayalam: "ml",
  manipuri: "bn",
  marathi: "mr",
  nepali: "ne",
  odia: "hi",
  punjabi: "hi",
  sanskrit: "hi",
  santali: "hi",
  sindhi: "ur",
  tamil: "ta",
  telugu: "te",
  urdu: "ur",
};

const VOICE_META_BY_CODE: Record<SupportedTTSLang, VoiceLangMeta> = {
  en: { code: "en", locale: "en-IN", label: "English" },
  hi: { code: "hi", locale: "hi-IN", label: "Hindi" },
  te: { code: "te", locale: "te-IN", label: "Telugu" },
  ta: { code: "ta", locale: "ta-IN", label: "Tamil" },
  bn: { code: "bn", locale: "bn-IN", label: "Bengali" },
  gu: { code: "gu", locale: "gu-IN", label: "Gujarati" },
  kn: { code: "kn", locale: "kn-IN", label: "Kannada" },
  ml: { code: "ml", locale: "ml-IN", label: "Malayalam" },
  mr: { code: "mr", locale: "mr-IN", label: "Marathi" },
  ne: { code: "ne", locale: "ne-NP", label: "Nepali" },
  ur: { code: "ur", locale: "ur-IN", label: "Urdu" },
};

export function resolveTTSLang(selectedLanguage?: string): SupportedTTSLang {
  const normalized = (selectedLanguage || "").trim().toLowerCase();
  return TTS_LANG_BY_UI_LANGUAGE[normalized] || "en";
}

export function voiceLangMeta(code: SupportedTTSLang): VoiceLangMeta {
  return VOICE_META_BY_CODE[code] || VOICE_META_BY_CODE.en;
}

export function detectVoiceLangFromTranscript(
  transcript: string,
  fallback: SupportedTTSLang = "en"
): SupportedTTSLang {
  const text = (transcript || "").trim();
  if (!text) return fallback;

  if (/[\u0980-\u09FF]/.test(text)) return "bn"; // Bengali/Assamese script
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu"; // Gujarati script
  if (/[\u0C00-\u0C7F]/.test(text)) return "te"; // Telugu script
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn"; // Kannada script
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml"; // Malayalam script
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta"; // Tamil script
  if (/[\u0600-\u06FF]/.test(text)) return "ur"; // Urdu/Arabic script
  if (/[\u0900-\u097F]/.test(text)) return "hi"; // Devanagari/Hindi

  const lower = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

  const teTokens = [
    "nenu",
    "naaku",
    "dayachesi",
    "namaskaram",
    "prabhutva",
    "raitu",
    "raithu",
    "raithunni",
    "raithu ni",
    "andhra",
    "telangana",
    "padhakam",
  ];
  const hiTokens = [
    "mera",
    "mujhe",
    "kripya",
    "namaste",
    "sarkari",
    "yojana",
    "kisan",
    "main",
  ];
  const taTokens = [
    "naan",
    "enakku",
    "vanakkam",
    "arasu",
    "udhavi",
    "thittam",
    "vivasayi",
  ];

  const score = (tokens: string[]) =>
    tokens.reduce((acc, token) => (lower.includes(token) ? acc + 1 : acc), 0);

  const teScore = score(teTokens);
  const hiScore = score(hiTokens);
  const taScore = score(taTokens);

  if (teScore >= hiScore && teScore >= taScore && teScore >= 2) return "te";
  if (hiScore >= teScore && hiScore >= taScore && hiScore >= 2) return "hi";
  if (taScore >= teScore && taScore >= hiScore && taScore >= 2) return "ta";

  return fallback;
}

export function buildLanguageAwareQuery(query: string, lang: SupportedTTSLang): string {
  const cleaned = (query || "").trim();
  if (!cleaned) return "";

  if (lang === "hi") {
    return `${cleaned}\n\nमहत्वपूर्ण: जवाब केवल हिन्दी (देवनागरी लिपि) में दें। सरल और छोटा रखें।`;
  }
  if (lang === "te") {
    return `${cleaned}\n\nముఖ్యం: జవాబు కేవలం తెలుగు లిపిలో ఇవ్వండి. సులభంగా, చిన్నగా చెప్పండి.`;
  }
  if (lang === "ta") {
    return `${cleaned}\n\nமுக்கியம்: பதில் தமிழில் (தமிழ் எழுத்து) மட்டும் இருக்க வேண்டும். எளிமையாகவும் சுருக்கமாகவும் சொல்லுங்கள்.`;
  }

  if (lang === "bn") {
    return `${cleaned}\n\nImportant: Reply only in Bengali script. Keep it short and simple.`;
  }
  if (lang === "gu") {
    return `${cleaned}\n\nImportant: Reply only in Gujarati script. Keep it short and simple.`;
  }
  if (lang === "kn") {
    return `${cleaned}\n\nImportant: Reply only in Kannada script. Keep it short and simple.`;
  }
  if (lang === "ml") {
    return `${cleaned}\n\nImportant: Reply only in Malayalam script. Keep it short and simple.`;
  }
  if (lang === "mr") {
    return `${cleaned}\n\nImportant: Reply only in Marathi (Devanagari script). Keep it short and simple.`;
  }
  if (lang === "ne") {
    return `${cleaned}\n\nImportant: Reply only in Nepali (Devanagari script). Keep it short and simple.`;
  }
  if (lang === "ur") {
    return `${cleaned}\n\nImportant: Reply only in Urdu script. Keep it short and simple.`;
  }
  return `${cleaned}\n\nImportant: reply only in simple English.`;
}

export function normalizeDetectedLanguage(
  rawLanguage?: string,
  fallback: SupportedTTSLang = "en"
): SupportedTTSLang {
  const raw = (rawLanguage || "").trim().toLowerCase();
  if (!raw) return fallback;

  if (raw === "te" || raw.startsWith("telugu")) return "te";
  if (raw === "ta" || raw.startsWith("tamil")) return "ta";
  if (raw === "hi" || raw.startsWith("hindi")) return "hi";
  if (raw === "bn" || raw.startsWith("bengali") || raw.startsWith("bangla") || raw.startsWith("assamese")) return "bn";
  if (raw === "gu" || raw.startsWith("gujarati")) return "gu";
  if (raw === "kn" || raw.startsWith("kannada")) return "kn";
  if (raw === "ml" || raw.startsWith("malayalam")) return "ml";
  if (raw === "mr" || raw.startsWith("marathi")) return "mr";
  if (raw === "ne" || raw.startsWith("nepali")) return "ne";
  if (raw === "ur" || raw.startsWith("urdu")) return "ur";
  if (raw === "en" || raw.startsWith("english")) return "en";
  return fallback;
}

export interface STTResult {
  text: string;
  detectedLanguage: SupportedTTSLang;
  rawLanguage: string;
}

export async function transcribeVoiceAudio(
  audioBlob: Blob,
  fallbackLanguage: SupportedTTSLang = "en",
  preferredLanguage?: SupportedTTSLang
): Promise<STTResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, "voice-input.webm");
  if (preferredLanguage) {
    formData.append("preferred_language", preferredLanguage);
  }

  const res = await fetch(`${API_BASE}/voice/stt`, {
    method: "POST",
    body: formData,
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data?.detail || "Failed to transcribe voice audio");

  const text = (data?.text || "").toString().trim();
  const rawLanguage = (data?.language || "").toString();
  let detectedLanguage = normalizeDetectedLanguage(rawLanguage, fallbackLanguage);
  if (detectedLanguage === "en") {
    detectedLanguage = detectVoiceLangFromTranscript(text, detectedLanguage);
  }

  return {
    text,
    rawLanguage,
    detectedLanguage,
  };
}

function base64ToAudioBlob(base64: string, mimeType = "audio/mpeg"): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

interface BrowserVoiceOptions {
  preferDeepMale?: boolean;
}

function scoreVoiceForMeta(voice: SpeechSynthesisVoice, langPrefix: string, preferDeepMale: boolean): number {
  const voiceName = (voice.name || "").toLowerCase();
  const voiceLang = (voice.lang || "").toLowerCase();
  let score = 0;

  if (voiceLang.startsWith(langPrefix)) score += 10;
  if (voiceLang.includes(langPrefix)) score += 4;

  // Heuristic only: prefer male/deeper sounding voice labels when available.
  if (preferDeepMale) {
    if (voiceName.includes("male")) score += 8;
    if (voiceName.includes("man")) score += 5;
    if (voiceName.includes("ravi") || voiceName.includes("prabhat") || voiceName.includes("arjun")) score += 4;
    if (voiceName.includes("deep") || voiceName.includes("neural")) score += 2;
  } else if (voiceName.includes("neural")) {
    score += 2;
  }

  return score;
}

export async function speakBrowserTTS(
  text: string,
  meta: VoiceLangMeta,
  options: BrowserVoiceOptions = {}
): Promise<void> {
  const cleaned = (text || "").trim();
  if (!cleaned) return;

  const synth = typeof window !== "undefined" ? (window as any).speechSynthesis : null;
  if (!synth) throw new Error("Browser speech synthesis unavailable");

  const voices: SpeechSynthesisVoice[] = synth.getVoices ? synth.getVoices() : [];
  const langPrefix = (meta.locale || "en-IN").split("-")[0].toLowerCase();
  const preferDeepMale = !!options.preferDeepMale;

  const sorted = [...voices].sort(
    (a, b) => scoreVoiceForMeta(b, langPrefix, preferDeepMale) - scoreVoiceForMeta(a, langPrefix, preferDeepMale)
  );
  const selectedVoice = sorted[0];

  await new Promise<void>((resolve, reject) => {
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = meta.locale;
      if (selectedVoice) utterance.voice = selectedVoice;
      if (preferDeepMale) {
        utterance.rate = 0.88;
        utterance.pitch = 0.78;
      } else {
        utterance.rate = 0.95;
        utterance.pitch = 1;
      }
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("Browser TTS failed"));
      synth.speak(utterance);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Browser TTS failed"));
    }
  });
}

export async function playBackendTTS(text: string, lang = "en", slow = false): Promise<void> {
  const cleaned = (text || "").trim();
  if (!cleaned) return;

  const requestTTS = async (requestedLang: string) => {
    const res = await fetch(`${API_BASE}/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleaned, lang: requestedLang, slow }),
    });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error(data?.detail || "Failed to generate voice audio");
    if (!data?.audio_base64) throw new Error("No audio received from TTS API");
    return data;
  };

  let data: any;
  try {
    data = await requestTTS(lang);
  } catch (primaryError) {
    if ((lang || "").toLowerCase() !== "en") {
      data = await requestTTS("en");
    } else {
      throw primaryError;
    }
  }

  if (activeTtsAudio) {
    try {
      activeTtsAudio.pause();
    } catch {
      // no-op
    }
    if (activeTtsAudio.src?.startsWith("blob:")) {
      URL.revokeObjectURL(activeTtsAudio.src);
    }
    activeTtsAudio = null;
  }

  const audioBlob = base64ToAudioBlob(data.audio_base64, "audio/mpeg");
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  activeTtsAudio = audio;

  audio.onended = () => {
    URL.revokeObjectURL(audioUrl);
    if (activeTtsAudio === audio) activeTtsAudio = null;
  };
  audio.onerror = () => {
    URL.revokeObjectURL(audioUrl);
    if (activeTtsAudio === audio) activeTtsAudio = null;
  };

  await audio.play();
}
