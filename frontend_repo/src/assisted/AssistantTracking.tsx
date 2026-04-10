import { CheckCircle2, Clock3, MapPinned, PhoneCall } from "lucide-react";
import { NearbyAssistant } from "./AssistantFoundCard";

const TRACK_STEPS = ["Assistant Assigned", "On The Way", "Arriving", "At Your Door"];

interface AssistantTrackingProps {
  assistant: NearbyAssistant;
  currentStep: number;
  highContrast?: boolean;
  onArrived: () => void;
}

export default function AssistantTracking({
  assistant,
  currentStep,
  highContrast = false,
  onArrived,
}: AssistantTrackingProps) {
  const progress = (currentStep / (TRACK_STEPS.length - 1)) * 100;

  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 shadow-xl transition-all duration-300 ${
        highContrast ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-[#cfe0df] text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm font-semibold ${highContrast ? "text-sky-300" : "text-[#0f7675]"}`}>Tracking Assistant</p>
          <h3 className="text-2xl font-extrabold mt-1">{assistant.name}</h3>
          <p className={`text-lg font-semibold ${highContrast ? "text-slate-200" : "text-[#0f4d4d]"}`}>Arriving in {assistant.etaMinutes} minutes</p>
        </div>
        <a
          href={`tel:${assistant.phone}`}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-lg font-bold text-white gradient-primary shadow-md hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <PhoneCall className="w-5 h-5" />
          Call
        </a>
      </div>

      <div className={`mt-5 rounded-2xl border p-4 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#d7e6e5] bg-[#f4f9f9]"}`}>
        <div className={`h-3 w-full rounded-full overflow-hidden ${highContrast ? "bg-slate-700" : "bg-[#d6e5e4]"}`}>
          <div
            className="h-full rounded-full gradient-primary transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 space-y-3">
          {TRACK_STEPS.map((step, index) => {
            const done = index <= currentStep;
            return (
              <div key={step} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                ) : (
                  <Clock3 className={`w-6 h-6 ${highContrast ? "text-slate-400" : "text-slate-400"}`} />
                )}
                <p className={`text-lg font-semibold ${done ? "" : "opacity-70"}`}>{step}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`mt-5 rounded-2xl border p-4 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#d7e6e5] bg-[#f4f9f9]"}`}>
        <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Map Preview</p>
        <div className={`mt-2 h-32 rounded-xl border grid place-items-center ${highContrast ? "border-slate-600 bg-slate-900" : "border-[#cddddd] bg-white"}`}>
          <p className="text-base font-semibold inline-flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-[#0f7675]" />
            Assistant route will appear here
          </p>
        </div>
      </div>

      <button
        onClick={onArrived}
        className="mt-5 w-full rounded-2xl px-5 py-4 text-xl font-extrabold text-white gradient-primary shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        Mark Arrived
      </button>
    </section>
  );
}
