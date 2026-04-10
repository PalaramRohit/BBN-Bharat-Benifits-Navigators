import { useState } from "react";
import { PhoneCall, UserPlus } from "lucide-react";
import AssistantBookingModal from "./AssistantBookingModal";

interface AssistantRequestCardProps {
  onFlowComplete?: () => void;
  highContrast?: boolean;
}

export default function AssistantRequestCard({ onFlowComplete, highContrast = false }: AssistantRequestCardProps) {
  const [openBooking, setOpenBooking] = useState(false);

  return (
    <>
      <section className={`rounded-3xl border shadow-xl p-6 sm:p-7 ${
        highContrast
          ? "border-slate-700 bg-slate-900 text-white"
          : "border-[#9ed5cf] bg-gradient-to-br from-[#0f7675] to-[#6bbeb7] text-white"
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <UserPlus className="w-8 h-8" />
          <h3 className="text-3xl font-bold leading-tight">Request Local Assistant</h3>
        </div>
        <p className="text-2xl leading-relaxed">
          Book a nearby youth assistant to visit your home and help with scheme applications.
        </p>
        <button
          onClick={() => setOpenBooking(true)}
          className={`mt-5 inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-2xl font-extrabold shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 ${
            highContrast
              ? "bg-sky-500 text-white focus:ring-sky-200"
              : "bg-white text-[#0f4d4d] focus:ring-white/60"
          }`}
        >
          <PhoneCall className="w-7 h-7" />
          Request Assistance
        </button>
      </section>

      <AssistantBookingModal
        open={openBooking}
        onOpenChange={setOpenBooking}
        onFlowComplete={onFlowComplete}
      />
    </>
  );
}
