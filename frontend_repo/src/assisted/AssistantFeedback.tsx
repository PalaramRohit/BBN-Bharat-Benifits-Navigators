import { MessageSquareHeart, Star } from "lucide-react";

interface AssistantFeedbackProps {
  rating: number;
  highContrast?: boolean;
  onRate: (rating: number) => void;
  onSubmit: () => void;
}

export default function AssistantFeedback({
  rating,
  highContrast = false,
  onRate,
  onSubmit,
}: AssistantFeedbackProps) {
  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 shadow-xl transition-all duration-300 ${
        highContrast ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-[#cfe0df] text-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <MessageSquareHeart className={`w-8 h-8 ${highContrast ? "text-sky-300" : "text-[#0f7675]"}`} />
        <h3 className="text-3xl font-extrabold">Rate Your Experience</h3>
      </div>
      <p className={`mt-3 text-xl ${highContrast ? "text-slate-200" : "text-[#0f4d4d]"}`}>
        How was your assistance experience?
      </p>

      <div className="mt-6 flex items-center justify-center gap-2">
        {Array.from({ length: 5 }).map((_, idx) => {
          const starValue = idx + 1;
          const active = starValue <= rating;
          return (
            <button
              key={starValue}
              onClick={() => onRate(starValue)}
              className={`h-14 w-14 rounded-xl grid place-items-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 ${
                highContrast ? "focus:ring-sky-300" : "focus:ring-[#0f7675]/35"
              }`}
              aria-label={`Rate ${starValue} stars`}
            >
              <Star
                className={`w-10 h-10 ${active ? "fill-amber-500 text-amber-500" : highContrast ? "text-slate-500" : "text-slate-300"}`}
              />
            </button>
          );
        })}
      </div>

      <button
        onClick={onSubmit}
        disabled={rating === 0}
        className="mt-6 w-full rounded-2xl px-5 py-4 text-xl font-extrabold text-white gradient-primary shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Submit Feedback
      </button>
    </section>
  );
}
