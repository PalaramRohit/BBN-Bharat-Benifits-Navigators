import { BellRing, Mic, Search, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBBN } from "@/context/BBNContext";
import {
  buildLanguageAwareQuery,
  mockProfile,
  playBackendTTS,
  resolveTTSLang,
  speakBrowserTTS,
  transcribeVoiceAudio,
  voiceLangMeta,
  type SupportedTTSLang,
} from "@/lib/api";
import { useI18n } from "@/hooks/use-i18n";

const KNOWN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

const OCCUPATION_KEYWORDS = [
  "farmer", "student", "self-employed", "construction worker", "street vendor",
  "daily wage worker", "govt employee", "government employee", "private employee",
  "homemaker", "retired", "unemployed", "worker"
];

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractState(text: string): string | null {
  const normalized = text.toLowerCase();
  for (const state of KNOWN_STATES) {
    if (normalized.includes(state.toLowerCase())) {
      return state;
    }
  }
  const fallback = normalized.match(/\b(?:from|in)\s+([a-z\s]+)$/i);
  return fallback?.[1] ? toTitleCase(fallback[1].trim()) : null;
}

function extractOccupation(text: string): string | null {
  const normalized = text.toLowerCase();
  for (const keyword of OCCUPATION_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return toTitleCase(keyword.replace("government", "Govt"));
    }
  }
  const pattern = normalized.match(/\b(?:i am|i'm|im)\s+(?:a|an)?\s*([a-z\s-]+?)(?:\s+(?:from|in)\b|$)/i);
  return pattern?.[1] ? toTitleCase(pattern[1].trim()) : null;
}

interface HeroSectionProps {
  showSearch?: boolean;
}

export function HeroSection({ showSearch = true }: HeroSectionProps) {
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [benefitAlert, setBenefitAlert] = useState<{ message: string; amount: number } | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [detectedVoiceLang, setDetectedVoiceLang] = useState<SupportedTTSLang>("en");
  const [outputVoiceLang, setOutputVoiceLang] = useState<SupportedTTSLang>("en");
  const [isOutputLangManual, setIsOutputLangManual] = useState(false);
  const [isVoiceInputPending, setIsVoiceInputPending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const awaitingVoiceResponseRef = useRef(false);
  const baselineExplanationRef = useRef("");
  const lastSpokenRef = useRef("");

  const { userProfile, selectedLanguage, queryResponse, setAadhaar, runQuery, openSmartIntake, isLoading } = useBBN();
  const { t } = useI18n();
  const monthlyIncome = Number(userProfile?.monthly_income ?? 0);
  const annualIncome = monthlyIncome * 12;
  const selectedTtsLang = useMemo(() => resolveTTSLang(selectedLanguage), [selectedLanguage]);
  const detectedVoiceMeta = useMemo(() => voiceLangMeta(detectedVoiceLang), [detectedVoiceLang]);
  const outputVoiceMeta = useMemo(() => voiceLangMeta(outputVoiceLang), [outputVoiceLang]);

  const normalizeAmount = (value: unknown): number => {
    if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : 0;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\d.]/g, "");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    return 0;
  };

  const formatRupees = (value: number) => `Rs ${normalizeAmount(value).toLocaleString("en-IN")}`;
  const formatAmountForSpeech = (value: number) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(normalizeAmount(value));

  const buildBenefitAlertMessage = (amount: number, eligibleCount: number, lang: SupportedTTSLang) => {
    const amountText = formatAmountForSpeech(amount);
    if (lang === "hi") {
      return `लाभ अलर्ट: आपके आधार प्रोफाइल के अनुसार, आपकी अनुमानित मासिक लाभ राशि लगभग रुपये ${amountText} है। आप लगभग ${eligibleCount} योजनाओं के लिए पात्र हैं।`;
    }
    if (lang === "te") {
      return `బెనిఫిట్ అలర్ట్: మీ ఆధార్ ప్రొఫైల్ ఆధారంగా, మీ అంచనా నెలవారీ లాభం సుమారు రూ ${amountText}. మీరు సుమారు ${eligibleCount} పథకాల కోసం అర్హులు.`;
    }
    if (lang === "ta") {
      return `நலன் எச்சரிக்கை: உங்கள் ஆதார் சுயவிவரத்தின் அடிப்படையில், உங்கள் மாதாந்திர நலன் தொகை சுமார் ரூ ${amountText}. நீங்கள் சுமார் ${eligibleCount} திட்டங்களுக்கு தகுதி பெறுகிறீர்கள்.`;
    }
    return `Benefit alert: Based on your Aadhaar profile, your estimated monthly benefit amount is around Rs ${amountText}. You are eligible for about ${eligibleCount} schemes.`;
  };

  const speakText = async (text: string, langCode: SupportedTTSLang, locale: string) => {
    const preferDeepMale = langCode === "hi" || langCode === "te";
    const meta = { code: langCode, locale, label: outputVoiceMeta.label };
    if (preferDeepMale) {
      try {
        await speakBrowserTTS(text, meta, { preferDeepMale: true });
        return;
      } catch {
        // Fall through to backend audio.
      }
    }

    try {
      await playBackendTTS(text, langCode);
    } catch {
      try {
        await speakBrowserTTS(text, meta, { preferDeepMale });
      } catch {
        // no-op
      }
    }
  };

  useEffect(() => {
    setDetectedVoiceLang(selectedTtsLang);
    setOutputVoiceLang(selectedTtsLang);
    setIsOutputLangManual(false);
  }, [selectedTtsLang]);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // no-op
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!awaitingVoiceResponseRef.current) return;
    const explanation = queryResponse?.explanation || "";
    if (!explanation) return;
    if (explanation === baselineExplanationRef.current) return;
    if (explanation === lastSpokenRef.current) {
      awaitingVoiceResponseRef.current = false;
      return;
    }

    let cancelled = false;
    const speak = async () => {
      try {
        await speakText(explanation, outputVoiceMeta.code, outputVoiceMeta.locale);
      } finally {
        if (!cancelled) {
          lastSpokenRef.current = explanation;
          awaitingVoiceResponseRef.current = false;
          baselineExplanationRef.current = "";
        }
      }
    };

    void speak();
    return () => {
      cancelled = true;
    };
  }, [queryResponse?.explanation, outputVoiceMeta]);

  const processSearch = async (rawInput: string, fromVoice: boolean) => {
    if (!rawInput.trim()) return;
    setValidationError("");
    setBenefitAlert(null);
    const cleanedInput = rawInput.replace(/\s/g, "");

    if (/^\d{12}$/.test(cleanedInput)) {
      const aadhaarResponse = await setAadhaar(cleanedInput);
      if (aadhaarResponse) {
        const monthlyBenefit = normalizeAmount(aadhaarResponse.monthly_benefit_value);
        const eligibleCount = Math.max(
          Number(aadhaarResponse.eligible_policies || 0),
          Array.isArray(aadhaarResponse.eligible_schemes) ? aadhaarResponse.eligible_schemes.length : 0
        );
        const alertMessage = buildBenefitAlertMessage(monthlyBenefit, eligibleCount, outputVoiceMeta.code);
        setBenefitAlert({ message: alertMessage, amount: monthlyBenefit });
        await speakText(alertMessage, outputVoiceMeta.code, outputVoiceMeta.locale);
      }
      setIsVoiceInputPending(false);
      return;
    }
    if (/^\d+$/.test(cleanedInput) && cleanedInput.length !== 12) {
      setValidationError("Aadhaar number must be exactly 12 digits.");
      return;
    }
    if (/^[A-Za-z0-9]+$/.test(cleanedInput) && cleanedInput.length <= 12) {
      setValidationError("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    if (fromVoice) {
      const languageAwareQuery = buildLanguageAwareQuery(rawInput, outputVoiceMeta.code);
      baselineExplanationRef.current = queryResponse?.explanation || "";
      awaitingVoiceResponseRef.current = true;
      await runQuery(languageAwareQuery);
      setIsVoiceInputPending(false);
      return;
    }

    const extractedOccupation = extractOccupation(rawInput);
    const extractedState = extractState(rawInput);
    if (extractedOccupation || extractedState) {
      openSmartIntake({
        occupation: extractedOccupation || mockProfile.occupation,
        state: extractedState || mockProfile.state,
      });
      return;
    }

    await runQuery(rawInput);
  };

  const startListening = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setValidationError("Voice input is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.onstart = () => {
        setIsListening(true);
        setValidationError("");
      };

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = () => {
        setIsListening(false);
        setValidationError("Could not capture voice. Please try again.");
      };

      recorder.onstop = async () => {
        setIsListening(false);
        if (recordingTimeoutRef.current) {
          window.clearTimeout(recordingTimeoutRef.current);
          recordingTimeoutRef.current = null;
        }

        const audioBlob = new Blob(chunks, { type: mimeType || "audio/webm" });
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
        mediaRecorderRef.current = null;

        if (audioBlob.size < 5000) {
          setValidationError("No clear speech detected. Please speak louder and try again.");
          return;
        }

        try {
          const stt = await transcribeVoiceAudio(audioBlob, selectedTtsLang, selectedTtsLang);
          if (!stt.text) {
            setValidationError("Could not detect speech text. Please try again.");
            return;
          }
          setVoiceTranscript(stt.text);
          setInputValue(stt.text);
          setIsVoiceInputPending(true);
          setDetectedVoiceLang(stt.detectedLanguage);
          if (!isOutputLangManual) setOutputVoiceLang(stt.detectedLanguage);
        } catch {
          setValidationError("Could not transcribe voice. Please try again.");
        }
      };

      recorder.start();
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 7000);
    } catch {
      setIsListening(false);
      setValidationError("Microphone permission denied or unavailable.");
    }
  };

  const handleOutputLanguageChange = (lang: SupportedTTSLang) => {
    setOutputVoiceLang(lang);
    setIsOutputLangManual(true);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await processSearch(inputValue, isVoiceInputPending);
  };

  return (
    <div className="mb-7 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="hero-title text-foreground">
              <span className="bg-[linear-gradient(90deg,#f6b35e_0%,#ff9933_100%)] bg-clip-text text-transparent">
                {t("namaste", "Namaste")},
              </span>{" "}
              <span className="text-[#0f4d4d]">{userProfile?.name || t("citizen", "Citizen")}</span>
            </h2>
            <div className="body-copy mt-1.5 text-[#4f6160]">
              {t("hero_hint", "Enter Aadhaar or describe your profile like \"I am a farmer from Telangana\".")}
            </div>
          </div>
        </div>
      </div>

      {showSearch && (
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <Search size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isLoading ? "animate-pulse text-primary" : "text-muted-foreground"}`} />
          <input
            type="text"
            placeholder={isListening ? "Listening..." : t("hero_placeholder", "Enter Aadhaar or ask with occupation and state...")}
            value={inputValue}
            onChange={(e) => {
      setInputValue(e.target.value);
      setIsVoiceInputPending(false);
      setVoiceTranscript("");
      setBenefitAlert(null);
      if (validationError) setValidationError("");
    }}
            disabled={isLoading || isListening}
            className={`w-full pl-11 pr-12 py-3 rounded-xl bg-card border border-border text-[14px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-card transition-all ${isListening ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
          />
          <button
            type="button"
            onClick={startListening}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? "bg-primary text-white scale-110 animate-pulse" : "hover:bg-muted text-primary"}`}
          >
            <Mic size={18} />
          </button>
        </form>
      )}
      {validationError && (
        <p className="mt-2 text-sm font-semibold text-destructive">{validationError}</p>
      )}
      {voiceTranscript && (
        <div className="mt-3 max-w-xl rounded-xl border border-[#cfe0df] bg-[#f1f8f7] px-4 py-3">
          <div className="text-[16px] text-[#234949]">
            <span className="font-bold">You said:</span> {voiceTranscript}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#b9d2d1] bg-[#e7f3f2] px-3 py-1 text-sm font-semibold text-[#1f5555]">
              Detected: {detectedVoiceMeta.label}
            </span>
            <div className="inline-flex items-center gap-1 rounded-full border border-[#b9d2d1] bg-white/80 px-1 py-1">
              {[
                { code: "en" as SupportedTTSLang, label: "English" },
                { code: "hi" as SupportedTTSLang, label: "Hindi" },
                { code: "te" as SupportedTTSLang, label: "Telugu" },
                { code: "ta" as SupportedTTSLang, label: "Tamil" },
              ].map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleOutputLanguageChange(opt.code)}
                  className={`rounded-full px-2 py-1 text-xs font-bold ${
                    outputVoiceMeta.code === opt.code
                      ? "bg-[#0f7675] text-white"
                      : "text-[#2a5b5a] hover:bg-[#e7f3f2]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => processSearch(inputValue, true)}
              className="rounded-lg bg-[#0f7675] px-3 py-1.5 text-sm font-bold text-white"
            >
              Enter
            </button>
          </div>
        </div>
      )}
      {benefitAlert && (
        <div className="mt-3 max-w-xl rounded-xl border border-[#9bcfc9] bg-gradient-to-r from-[#dff4ef] to-[#eaf8f5] px-4 py-3 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <div className="flex items-center gap-2 text-[#155451]">
                <BellRing size={16} />
                <span className="text-sm font-extrabold uppercase tracking-wide">Benefit Alert</span>
              </div>
              <p className="mt-1 text-[15px] font-semibold text-[#1e4444]">
                Estimated Monthly Benefit: <span className="font-extrabold">{formatRupees(benefitAlert.amount)}</span>
              </p>
              <p className="mt-1 text-sm text-[#2b5e5c]">{benefitAlert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => void speakText(benefitAlert.message, outputVoiceMeta.code, outputVoiceMeta.locale)}
              className="inline-flex items-center gap-1 rounded-lg bg-[#0f7675] px-3 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              <Volume2 size={14} />
              Replay Voice
            </button>
          </div>
        </div>
      )}

      {userProfile && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Age</p>
            <p className="text-[35px] leading-none font-extrabold text-foreground mt-1">{userProfile.age ?? "--"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">State</p>
            <p className="text-[34px] leading-none font-extrabold text-foreground mt-1">{userProfile.state || "--"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Caste Category</p>
            <p className="text-[35px] leading-none font-extrabold text-foreground mt-1">{userProfile.caste || "--"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Income (Monthly)</p>
            <p className="text-[34px] leading-none font-extrabold text-foreground mt-1">{formatRupees(monthlyIncome)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">Income (Annual)</p>
            <p className="text-[34px] leading-none font-extrabold text-foreground mt-1">{formatRupees(annualIncome)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
