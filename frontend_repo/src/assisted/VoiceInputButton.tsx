import { Mic } from "lucide-react";

export default function VoiceInputButton({ highContrast = false }: { highContrast?: boolean }) {
  return (
    <button
      className={`fixed bottom-5 right-5 sm:bottom-7 sm:right-7 rounded-full shadow-2xl w-16 h-16 sm:w-20 sm:h-20
      flex items-center justify-center border-4 animate-[pulse_2s_ease-in-out_infinite] focus:outline-none focus:ring-4 ${
        highContrast
          ? "border-amber-300 bg-amber-400 text-slate-900 focus:ring-amber-200"
          : "border-amber-200 bg-amber-500 text-white focus:ring-amber-300"
      }`}
      aria-label="Speak your details"
    >
      <Mic className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden />
    </button>
  );
}
