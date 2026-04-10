import { CheckCircle2, Circle, FileCheck2, HandHelping, UserCheck2 } from "lucide-react";

interface AssistedStepGuideProps {
  currentStep: number;
  highContrast?: boolean;
  onOpenBenefits: () => void;
  onOpenAssistance: () => void;
}

const steps = [
  {
    id: 1,
    title: "Profile Verified",
    description: "Your Aadhaar and profile are linked.",
    icon: UserCheck2,
  },
  {
    id: 2,
    title: "Benefits Reviewed",
    description: "Check schemes matched to your details.",
    icon: FileCheck2,
  },
  {
    id: 3,
    title: "Documents Ready",
    description: "Keep listed documents prepared.",
    icon: CheckCircle2,
  },
  {
    id: 4,
    title: "Request Local Help",
    description: "Book an assistant for doorstep support.",
    icon: HandHelping,
  },
];

export default function AssistedStepGuide({
  currentStep,
  highContrast = false,
  onOpenBenefits,
  onOpenAssistance,
}: AssistedStepGuideProps) {
  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 shadow-card ${
        highContrast ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-[#cfe0df]"
      }`}
    >
      <h3 className={`text-2xl font-extrabold ${highContrast ? "text-white" : "text-[#0f4d4d]"}`}>
        Step-by-Step Assistance
      </h3>
      <p className={`mt-1 text-base ${highContrast ? "text-slate-200" : "text-[#3f6060]"}`}>
        Follow these simple steps. We guide you one by one.
      </p>

      <div className="mt-4 space-y-3">
        {steps.map((step) => {
          const done = step.id <= currentStep;
          const active = step.id === currentStep;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={`rounded-2xl border px-4 py-3 transition-all ${
                active
                  ? highContrast
                    ? "border-sky-300 bg-slate-800"
                    : "border-[#0f7675] bg-[#eaf6f5]"
                  : highContrast
                    ? "border-slate-700 bg-slate-800"
                    : "border-[#d5e5e4] bg-[#f7fbfb]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${done ? "text-emerald-500" : highContrast ? "text-slate-400" : "text-slate-400"}`}>
                  {done ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold inline-flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${highContrast ? "text-sky-300" : "text-[#0f7675]"}`} />
                    {step.title}
                  </p>
                  <p className={`text-base mt-1 ${highContrast ? "text-slate-200" : "text-[#4f6968]"}`}>{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <button
          onClick={onOpenBenefits}
          className="rounded-2xl px-4 py-3 text-lg font-extrabold text-white gradient-primary shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Open Benefits
        </button>
        <button
          onClick={onOpenAssistance}
          className={`rounded-2xl px-4 py-3 text-lg font-bold border focus:outline-none focus:ring-2 ${
            highContrast
              ? "bg-slate-800 border-slate-600 text-white focus:ring-slate-500"
              : "bg-white border-[#c5d9d8] text-[#0f4d4d] focus:ring-[#0f7675]/30"
          }`}
        >
          Open Assistance
        </button>
      </div>
    </section>
  );
}

