import { FileText, HandHeart, Home, Landmark } from "lucide-react";

const items = [
  { label: "Home", icon: Home },
  { label: "My Benefits", icon: Landmark },
  { label: "Documents", icon: FileText },
  { label: "Get Help", icon: HandHeart },
];

export default function NavigationBar({ highContrast = false }: { highContrast?: boolean }) {
  return (
    <nav
      className={`fixed bottom-0 inset-x-0 shadow-2xl grid grid-cols-4 text-center py-2 sm:py-3 ${
        highContrast
          ? "bg-slate-800 text-white border-t border-slate-700"
          : "bg-white text-slate-800 border-t border-slate-200"
      }`}
      aria-label="Primary navigation"
    >
      {items.map(({ label, icon: Icon }) => (
        <button
          key={label}
          className={`flex flex-col items-center gap-1 text-base sm:text-lg font-semibold
            focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
              highContrast ? "hover:text-amber-300" : "hover:text-amber-600"
            }`}
          aria-label={label}
        >
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
