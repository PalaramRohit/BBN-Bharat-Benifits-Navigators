import React from "react";
import { ArrowRight } from "lucide-react";

interface BenefitCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  highContrast?: boolean;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ title, desc, icon, highContrast }) => {
  return (
    <article
      className={`group rounded-3xl border shadow-lg p-5 sm:p-6 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-2 focus-within:ring-amber-500 ${
        highContrast ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-100 text-slate-900"
      }`}
      tabIndex={0}
      role="button"
      aria-label={title}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${
            highContrast ? "bg-slate-700 text-amber-300" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {icon}
        </div>
        <h2 className="text-2xl font-bold leading-tight">{title}</h2>
      </div>
      <p className={`text-lg leading-relaxed ${highContrast ? "text-slate-100" : "text-slate-700"}`}>{desc}</p>
      <div
        className={`mt-auto inline-flex items-center gap-2 text-lg font-semibold ${
          highContrast ? "text-amber-300" : "text-amber-600"
        }`}
      >
        Open
        <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
      </div>
    </article>
  );
};

export default BenefitCard;
