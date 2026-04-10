import { useEffect, useMemo, useRef, useState } from "react";
import { Contrast, FileText, Volume2 } from "lucide-react";
import { JanSetuLogo } from "@/components/dashboard/JanSetuLogo";
import { useBBN } from "@/context/BBNContext";
import {
  buildLanguageAwareQuery,
  detectVoiceLangFromTranscript,
  playBackendTTS,
  resolveTTSLang,
  speakBrowserTTS,
  transcribeVoiceAudio,
  voiceLangMeta,
  type SupportedTTSLang,
} from "@/lib/api";
import WelcomeHero from "./WelcomeHero";
import AssistantRequestCard from "./AssistantRequestCard";
import AssistedStepGuide from "./AssistedStepGuide";

export default function AssistedLayout() {
  const { userProfile, queryResponse, runQuery, isLoading, toggleAssistedMode, selectedLanguage } = useBBN();
  const [activeSection, setActiveSection] = useState<"overview" | "benefits" | "assistance">("overview");
  const [highContrast, setHighContrast] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [pendingVoiceQuery, setPendingVoiceQuery] = useState("");
  const [detectedVoiceLang, setDetectedVoiceLang] = useState<SupportedTTSLang>("en");
  const [outputVoiceLang, setOutputVoiceLang] = useState<SupportedTTSLang>("en");
  const [isOutputLangManual, setIsOutputLangManual] = useState(false);

  const benefitsRef = useRef<HTMLDivElement | null>(null);
  const assistanceRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const lastSpokenRef = useRef("");
  const awaitingVoiceResponseRef = useRef(false);
  const baselineExplanationRef = useRef("");

  const hasLinkedProfile = !!userProfile?.aadhaar_no;
  const selectedTtsLang = useMemo(() => resolveTTSLang(selectedLanguage), [selectedLanguage]);
  const detectedVoiceMeta = useMemo(
    () => voiceLangMeta(detectedVoiceLang || selectedTtsLang),
    [detectedVoiceLang, selectedTtsLang]
  );
  const outputVoiceMeta = useMemo(
    () => voiceLangMeta(outputVoiceLang || selectedTtsLang),
    [outputVoiceLang, selectedTtsLang]
  );

  const speakText = async (text: string, langCode: SupportedTTSLang, locale: string) => {
    const preferDeepMale = langCode === "hi" || langCode === "te";
    const meta = { code: langCode, locale, label: outputVoiceMeta.label };
    if (preferDeepMale) {
      try {
        await speakBrowserTTS(text, meta, { preferDeepMale: true });
        return;
      } catch {
        // fall through
      }
    }
    try {
      await playBackendTTS(text, langCode);
    } catch {
      try {
        await speakBrowserTTS(text, meta, { preferDeepMale });
      } catch {
        // Ignore synthesis errors on unsupported browsers.
      }
    }
  };

  useEffect(() => {
    setDetectedVoiceLang(selectedTtsLang);
    setOutputVoiceLang(selectedTtsLang);
    setIsOutputLangManual(false);
  }, [selectedTtsLang]);

  useEffect(() => {
    if (!hasLinkedProfile || queryResponse || isLoading) return;
    runQuery("What benefits am I eligible for?", false, userProfile, userProfile?.aadhaar_no || "");
  }, [hasLinkedProfile, queryResponse, isLoading, userProfile?.aadhaar_no]);

  useEffect(() => {
    if (!voiceGuidanceEnabled) return;
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
  }, [queryResponse?.explanation, voiceGuidanceEnabled, outputVoiceMeta]);

  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
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
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const monthlyBenefitDisplay = useMemo(() => {
    const value = queryResponse?.monthly_benefit_value;
    if (typeof value === "number") {
      return `Rs ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    return isLoading ? "Loading..." : "Rs 0.00";
  }, [queryResponse, isLoading]);

  const eligibleSchemes = queryResponse?.eligible_policies ?? 0;
  const requiredDocs = queryResponse?.decision_output?.document_advice || [];
  const highlightText =
    queryResponse?.explanation ||
    (hasLinkedProfile
      ? "We are preparing your personalized eligibility summary."
      : "Linked profile not available in this session yet.");

  const currentStep = !hasLinkedProfile
    ? 1
    : !queryResponse
      ? 2
      : activeSection === "assistance"
        ? 4
        : requiredDocs.length > 0
          ? 3
          : 2;

  const openBenefits = () => {
    setActiveSection("benefits");
    benefitsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openAssistanceSection = () => {
    setActiveSection("assistance");
    assistanceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleVoiceCapture = (transcript: string, detectedLang?: SupportedTTSLang) => {
    const cleaned = transcript.trim();
    if (!cleaned) return;
    const inferredLang = detectedLang || detectVoiceLangFromTranscript(cleaned, selectedTtsLang);
    setDetectedVoiceLang(inferredLang);
    if (!isOutputLangManual) {
      setOutputVoiceLang(inferredLang);
    }
    setPendingVoiceQuery(cleaned);
    setVoiceTranscript(cleaned);
  };

  const handleSelectOutputLanguage = (lang: SupportedTTSLang) => {
    setOutputVoiceLang(lang);
    setIsOutputLangManual(true);
  };

  const submitPendingVoiceQuery = async () => {
    const cleaned = pendingVoiceQuery.trim();
    if (!cleaned) return;
    if (!hasLinkedProfile) {
      const msg = "Profile is not linked yet. Please verify Aadhaar once in dashboard.";
      setVoiceTranscript(msg);
      setPendingVoiceQuery("");
      if (voiceGuidanceEnabled) {
        try {
          await speakText(msg, outputVoiceMeta.code, outputVoiceMeta.locale);
        } catch {
          // no-op
        }
      }
      return;
    }
    const languageAwareQuery = buildLanguageAwareQuery(cleaned, outputVoiceMeta.code);
    baselineExplanationRef.current = queryResponse?.explanation || "";
    awaitingVoiceResponseRef.current = true;
    await runQuery(languageAwareQuery, false, userProfile, userProfile?.aadhaar_no || "");
    setPendingVoiceQuery("");
  };

  const startVoiceInput = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      const msg = "Voice input not supported in this browser.";
      setVoiceTranscript(msg);
      if (voiceGuidanceEnabled) {
        void speakText(msg, outputVoiceMeta.code, outputVoiceMeta.locale).catch(() => {
          // no-op
        });
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      recorder.onstart = () => {
        setIsVoiceListening(true);
        setVoiceTranscript("");
        setPendingVoiceQuery("");
      };

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsVoiceListening(false);
        setVoiceTranscript("Could not capture voice. Please try again.");
        setPendingVoiceQuery("");
      };

      recorder.onstop = async () => {
        setIsVoiceListening(false);

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
          setVoiceTranscript("No clear speech detected. Please speak louder and try again.");
          setPendingVoiceQuery("");
          return;
        }

        setVoiceTranscript("Transcribing voice...");
        try {
          const stt = await transcribeVoiceAudio(audioBlob, selectedTtsLang, selectedTtsLang);
          if (!stt.text) {
            setVoiceTranscript("Could not detect speech text. Please try again.");
            setPendingVoiceQuery("");
            return;
          }
          handleVoiceCapture(stt.text, stt.detectedLanguage);
        } catch {
          setVoiceTranscript("Could not transcribe voice. Please try again.");
          setPendingVoiceQuery("");
        }
      };

      recorder.start();
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 7000);
    } catch {
      setIsVoiceListening(false);
      setVoiceTranscript("Microphone permission denied or unavailable.");
      setPendingVoiceQuery("");
    }
  };

  return (
    <div className={`min-h-screen ${highContrast ? "bg-slate-950 text-white" : "bg-background text-foreground"}`}>
      <header className={`${highContrast ? "bg-slate-900" : "gradient-hero"} px-4 sm:px-6 lg:px-8 py-4 shadow-lg`}>
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <JanSetuLogo onDark className="shrink-0" />
          <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
            <div className="rounded-full bg-white/15 border border-white/20 px-4 py-2 text-white text-sm font-semibold">
              Assisted Mode: ON
            </div>
            <button
              onClick={() => setVoiceGuidanceEnabled((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Volume2 className="w-4 h-4" />
              Voice Guide: {voiceGuidanceEnabled ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => setHighContrast((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Contrast className="w-4 h-4" />
              {highContrast ? "Normal" : "High Contrast"}
            </button>
            <button
              onClick={toggleAssistedMode}
              className="inline-flex items-center rounded-full bg-white text-primary px-4 py-2 text-sm font-semibold shadow-md hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              Exit Assisted View
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-10 pt-6">
        <WelcomeHero
          userName={userProfile?.name || "Citizen"}
          hasLinkedProfile={hasLinkedProfile}
          highContrast={highContrast}
          onStartVoiceInput={startVoiceInput}
          onSubmitVoiceQuery={submitPendingVoiceQuery}
          isVoiceListening={isVoiceListening}
          canSubmitVoiceQuery={!!pendingVoiceQuery.trim()}
          isSubmittingVoiceQuery={isLoading}
          voiceTranscript={voiceTranscript}
          detectedVoiceLanguageLabel={detectedVoiceMeta.label}
          selectedOutputLanguageCode={outputVoiceMeta.code}
          onSelectOutputLanguageCode={handleSelectOutputLanguage}
          profileMeta={
            hasLinkedProfile
              ? {
                  age: userProfile?.age,
                  state: userProfile?.state || "N/A",
                  caste: userProfile?.caste || "N/A",
                  monthlyIncome: userProfile?.monthly_income ?? null,
                }
              : null
          }
        />

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className={`rounded-3xl border p-5 sm:p-7 ${highContrast ? "bg-slate-900 border-slate-700" : "border-[#f0d9bb] bg-white premium-card"}`}>
              <p className={`text-lg font-semibold mb-2 ${highContrast ? "text-sky-300" : "text-[#c1782d]"}`}>Your Benefits Overview</p>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                <div className={`flex-1 rounded-2xl border p-4 sm:p-5 ${highContrast ? "border-slate-700 bg-slate-800" : "border-border bg-[#f1f8f7]"}`}>
                  <p className={`text-2xl font-semibold ${highContrast ? "text-white" : "text-[#0f4d4d]"}`}>Eligible Schemes</p>
                  <p className={`mt-1 text-6xl font-extrabold leading-tight ${highContrast ? "text-sky-300" : "text-[#0a5e5d]"}`}>{eligibleSchemes}</p>
                  <p className={`mt-2 text-2xl ${highContrast ? "text-slate-200" : "text-[#266968]"}`}>{monthlyBenefitDisplay} Monthly Benefits</p>
                  <button
                    onClick={openBenefits}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xl font-bold gradient-primary text-white shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    View My Benefits
                  </button>
                </div>
                <div className={`flex-1 rounded-2xl border p-4 sm:p-5 ${highContrast ? "border-slate-700 bg-slate-800 text-white" : "border-[#f0d9bb] bg-[#fffaf3] text-slate-900"}`}>
                  <p className={`text-2xl font-semibold ${highContrast ? "text-sky-300" : "text-[#c1782d]"}`}>Eligibility Spotlight</p>
                  <p className="mt-2 text-3xl font-bold leading-relaxed">{highlightText}</p>
                </div>
              </div>
            </div>

            <div ref={benefitsRef} className={`rounded-3xl border p-5 sm:p-6 shadow-card ${
              activeSection === "benefits" ? "border-[#0f7675]" : highContrast ? "border-slate-700" : "border-border"
            } ${highContrast ? "bg-slate-900 text-white" : "bg-white"}`}>
              <div className="flex items-center gap-3 mb-4">
                <FileText className={`${highContrast ? "text-sky-300" : "text-[#0f7675]"} w-7 h-7`} />
                <h3 className={`text-3xl font-bold ${highContrast ? "text-white" : "text-[#0f4d4d]"}`}>My Benefits (Detailed)</h3>
              </div>
              {(queryResponse?.eligible_schemes?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {queryResponse?.eligible_schemes?.slice(0, 6).map((scheme) => (
                    <div
                      key={scheme.id}
                      className={`rounded-2xl border px-4 py-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#cfe0df] bg-[#f1f8f7]"}`}
                    >
                      <p className={`text-2xl font-bold ${highContrast ? "text-white" : "text-[#0f4d4d]"}`}>{scheme.title}</p>
                      <p className={`text-lg mt-1 ${highContrast ? "text-slate-200" : "text-[#2f5757]"}`}>{scheme.category}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-xl ${highContrast ? "text-slate-200" : "text-[#4f6968]"}`}>
                  Benefits will appear here after linked profile eligibility is loaded.
                </p>
              )}

              <div className="mt-5">
                <h4 className={`text-2xl font-bold mb-2 ${highContrast ? "text-white" : "text-[#0f4d4d]"}`}>Required Documents</h4>
                {requiredDocs.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {requiredDocs.map((doc) => (
                      <span
                        key={doc}
                        className={`rounded-full border px-4 py-2 text-lg font-semibold ${
                          highContrast ? "border-slate-600 bg-slate-800 text-white" : "border-[#cfe0df] bg-[#f1f8f7] text-[#1d5f5f]"
                        }`}
                      >
                        {doc}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className={`text-lg ${highContrast ? "text-slate-200" : "text-[#4f6968]"}`}>
                    Documents will appear after checking eligibility.
                  </p>
                )}
              </div>
            </div>

            <div ref={assistanceRef} className={`rounded-3xl border p-5 sm:p-6 shadow-card ${
              activeSection === "assistance" ? "border-[#0f7675]" : highContrast ? "border-slate-700" : "border-border"
            } ${highContrast ? "bg-slate-900 text-white" : "bg-white"}`}>
              <h3 className={`text-3xl font-bold ${highContrast ? "text-white" : "text-[#0f4d4d]"}`}>Claim Assistance (In Assisted Mode)</h3>
              <p className={`mt-2 text-xl ${highContrast ? "text-slate-200" : "text-[#3b5f5f]"}`}>
                All elder assistance actions stay on this page.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <AssistedStepGuide
              currentStep={currentStep}
              highContrast={highContrast}
              onOpenBenefits={openBenefits}
              onOpenAssistance={openAssistanceSection}
            />
            <AssistantRequestCard highContrast={highContrast} onFlowComplete={openAssistanceSection} />
          </div>
        </section>
      </div>
    </div>
  );
}
