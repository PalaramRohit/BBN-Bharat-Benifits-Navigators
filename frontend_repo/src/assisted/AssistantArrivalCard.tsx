import { CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { NearbyAssistant } from "./AssistantFoundCard";

interface AssistantArrivalCardProps {
  assistant: NearbyAssistant;
  highContrast?: boolean;
  onStartAssistance: () => void;
  onReschedule: () => void;
  onCancelVisit: () => void;
}

export default function AssistantArrivalCard({
  assistant,
  highContrast = false,
  onStartAssistance,
  onReschedule,
  onCancelVisit,
}: AssistantArrivalCardProps) {
  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 shadow-xl transition-all duration-300 ${
        highContrast ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-[#cfe0df] text-slate-900"
      }`}
    >
      <div className={`rounded-2xl border p-4 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#d5e6e5] bg-[#f1f8f7]"}`}>
        <p className={`text-sm font-semibold ${highContrast ? "text-sky-300" : "text-[#0f7675]"}`}>Assistant Arrival</p>
        <h3 className="mt-2 text-3xl font-extrabold leading-tight">Your welfare assistant has arrived</h3>
        <p className={`mt-2 text-lg font-semibold ${highContrast ? "text-slate-200" : "text-[#0f4d4d]"}`}>
          {assistant.name} is at your door and ready to assist.
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        <button
          onClick={onStartAssistance}
          className="rounded-2xl px-5 py-4 text-xl font-extrabold text-white gradient-primary shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 inline-flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-6 h-6" />
          Start Assistance
        </button>
        <button
          onClick={onReschedule}
          className={`rounded-2xl px-5 py-4 text-xl font-bold border inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 ${
            highContrast
              ? "bg-slate-800 border-slate-600 text-white focus:ring-slate-500"
              : "bg-white border-[#c5d9d8] text-[#0f4d4d] focus:ring-[#0f7675]/30"
          }`}
        >
          <CalendarClock className="w-6 h-6" />
          Reschedule
        </button>
        <button
          onClick={onCancelVisit}
          className={`rounded-2xl px-5 py-4 text-xl font-bold border inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 ${
            highContrast
              ? "bg-slate-800 border-red-400/50 text-red-200 focus:ring-red-400/40"
              : "bg-white border-red-200 text-red-600 focus:ring-red-300"
          }`}
        >
          <XCircle className="w-6 h-6" />
          Cancel Visit
        </button>
      </div>
    </section>
  );
}
