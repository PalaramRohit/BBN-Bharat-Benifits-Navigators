import { AlertCircle, Mic, Volume2 } from "lucide-react";
import React from "react";
import type { SupportedTTSLang } from "@/lib/api";

interface WelcomeHeroProps {
  userName?: string;
  hasLinkedProfile: boolean;
  highContrast?: boolean;
  voiceTranscript?: string;
  isVoiceListening?: boolean;
  canSubmitVoiceQuery?: boolean;
  isSubmittingVoiceQuery?: boolean;
  detectedVoiceLanguageLabel?: string;
  selectedOutputLanguageCode?: SupportedTTSLang;
  onSelectOutputLanguageCode?: (lang: SupportedTTSLang) => void;
  onStartVoiceInput: () => void;
  onSubmitVoiceQuery?: () => void;
  profileMeta?: {
    age?: number;
    state: string;
    caste: string;
    monthlyIncome: number | null;
  } | null;
}

const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  userName = "Citizen",
  hasLinkedProfile,
  highContrast = false,
  voiceTranscript = "",
  isVoiceListening = false,
  canSubmitVoiceQuery = false,
  isSubmittingVoiceQuery = false,
  detectedVoiceLanguageLabel = "English",
  selectedOutputLanguageCode = "en",
  onSelectOutputLanguageCode,
  onStartVoiceInput,
  onSubmitVoiceQuery,
  profileMeta = null,
}) => {
  const outputLangOptions: Array<{ code: SupportedTTSLang; label: string }> = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "te", label: "Telugu" },
    { code: "ta", label: "Tamil" },
  ];

  const formatRupees = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return `Rs ${value.toLocaleString("en-IN")}`;
  };

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 ${
        highContrast ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-[#f0d9bb] premium-card"
      }`}
    >
      {!highContrast && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,153,51,0.12),transparent_40%),radial-gradient(circle_at_85%_0%,rgba(15,118,117,0.12),transparent_45%)] pointer-events-none" />
      )}
      <div className="relative flex flex-col gap-5">
        <div className="space-y-3">
          <p className={`text-xl font-semibold ${highContrast ? "text-sky-300" : "text-[#c1782d]"}`}>Assisted Mode</p>
          <h1 className={`text-4xl sm:text-5xl leading-tight font-extrabold ${highContrast ? "text-white" : "text-[#0f2948]"}`}>
            Namaste, {userName} Ji
          </h1>

          {hasLinkedProfile ? (
            <p className={`text-2xl max-w-4xl ${highContrast ? "text-slate-200" : "text-[#324d63]"}`}>
              Your profile is already linked from Aadhaar. We are showing personalized welfare guidance.
            </p>
          ) : (
            <div className={`rounded-2xl border px-4 py-4 text-xl inline-flex items-start gap-3 ${
              highContrast ? "border-amber-300/60 bg-slate-800 text-amber-100" : "border-[#f0d9bb] bg-[#fffaf3] text-[#6c4e2e]"
            }`}>
              <AlertCircle className="w-6 h-6 mt-0.5" />
              <span>
                Profile is not linked in this session yet. Assisted Mode will auto-fill once Aadhaar is verified in dashboard.
              </span>
            </div>
          )}

          {hasLinkedProfile && (
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className={`rounded-2xl border px-4 py-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#cfe0df] bg-[#f1f8f7]"}`}>
                <p className={`text-sm uppercase tracking-wide font-semibold ${highContrast ? "text-slate-300" : "text-[#5d7b89]"}`}>Age</p>
                <p className="text-4xl font-extrabold mt-1">{profileMeta?.age ?? "N/A"}</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#cfe0df] bg-[#f1f8f7]"}`}>
                <p className={`text-sm uppercase tracking-wide font-semibold ${highContrast ? "text-slate-300" : "text-[#5d7b89]"}`}>State</p>
                <p className="text-4xl font-extrabold mt-1">{profileMeta?.state || "N/A"}</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#cfe0df] bg-[#f1f8f7]"}`}>
                <p className={`text-sm uppercase tracking-wide font-semibold ${highContrast ? "text-slate-300" : "text-[#5d7b89]"}`}>Caste</p>
                <p className="text-4xl font-extrabold mt-1">{profileMeta?.caste || "N/A"}</p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#cfe0df] bg-[#f1f8f7]"}`}>
                <p className={`text-sm uppercase tracking-wide font-semibold ${highContrast ? "text-slate-300" : "text-[#5d7b89]"}`}>Monthly Income</p>
                <p className="text-4xl font-extrabold mt-1">{formatRupees(profileMeta?.monthlyIncome ?? null)}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              type="button"
              onClick={onStartVoiceInput}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-xl font-extrabold shadow-md focus:outline-none focus:ring-2 ${
                isVoiceListening
                  ? "bg-amber-500 text-white focus:ring-amber-300"
                  : highContrast
                    ? "bg-sky-600 text-white focus:ring-sky-300"
                    : "bg-[#0f7675] text-white focus:ring-[#0f7675]/40"
              }`}
            >
              <Mic className="w-6 h-6" />
              {isVoiceListening ? "Listening... Tap Again" : "Speak your question"}
            </button>
            <div className={`rounded-2xl border px-4 py-3 text-lg inline-flex items-center gap-2 ${
              highContrast ? "border-slate-700 bg-slate-800 text-slate-200" : "border-[#cfe0df] bg-[#f1f8f7] text-[#2f5757]"
            }`}>
              <Volume2 className={`w-5 h-5 ${highContrast ? "text-sky-300" : "text-[#0f7675]"}`} />
              Example: "I am a farmer from Andhra Pradesh"
            </div>
          </div>

          {voiceTranscript && (
            <div className={`rounded-2xl border px-4 py-3 text-lg ${
              highContrast ? "border-slate-700 bg-slate-800 text-white" : "border-[#cfe0df] bg-[#f1f8f7] text-[#234949]"
            }`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="font-bold">You said:</span> {voiceTranscript}
                </span>
                <div className="inline-flex items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                    highContrast ? "border-slate-600 bg-slate-700 text-slate-100" : "border-[#b9d2d1] bg-[#e7f3f2] text-[#1f5555]"
                  }`}>
                    Detected: {detectedVoiceLanguageLabel}
                  </span>
                  <div className="inline-flex items-center gap-1 rounded-full border px-1 py-1 bg-white/70 border-[#b9d2d1]">
                    {outputLangOptions.map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => onSelectOutputLanguageCode?.(opt.code)}
                        className={`rounded-full px-2 py-1 text-xs font-bold transition-colors ${
                          selectedOutputLanguageCode === opt.code
                            ? (highContrast ? "bg-sky-600 text-white" : "bg-[#0f7675] text-white")
                            : (highContrast ? "bg-slate-800 text-slate-200" : "bg-transparent text-[#2a5b5a] hover:bg-[#e7f3f2]")
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {canSubmitVoiceQuery && onSubmitVoiceQuery && (
                    <button
                      type="button"
                      onClick={onSubmitVoiceQuery}
                      disabled={isSubmittingVoiceQuery}
                      className={`rounded-xl px-4 py-2 text-base font-bold shadow-sm focus:outline-none focus:ring-2 ${
                        highContrast
                          ? "bg-sky-600 text-white focus:ring-sky-300"
                          : "bg-[#0f7675] text-white focus:ring-[#0f7675]/40"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {isSubmittingVoiceQuery ? "Checking..." : "Enter"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WelcomeHero;
