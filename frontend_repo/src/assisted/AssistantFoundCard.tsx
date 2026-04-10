import { Bike, MapPin, Star } from "lucide-react";

export interface NearbyAssistant {
  id: string;
  phone: string;
  name: string;
  designation: string;
  rating: number;
  distanceKm: number;
  travelMode: string;
  etaMinutes: number;
  photoUrl: string;
}

interface AssistantFoundCardProps {
  assistant: NearbyAssistant;
  highContrast?: boolean;
  onAccept: () => void;
  onFindAnother: () => void;
}

export default function AssistantFoundCard({
  assistant,
  highContrast = false,
  onAccept,
  onFindAnother,
}: AssistantFoundCardProps) {
  return (
    <section
      className={`rounded-3xl border p-5 sm:p-6 shadow-xl transition-all duration-300 ${
        highContrast ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-[#cfe0df] text-slate-900"
      }`}
    >
      <p className={`text-sm font-semibold ${highContrast ? "text-sky-300" : "text-[#0f7675]"}`}>Assistant Found Nearby</p>

      <div className="mt-3 flex items-center gap-4">
        <img
          src={assistant.photoUrl}
          alt={`${assistant.name} profile`}
          className="w-20 h-20 rounded-2xl object-cover border border-white/20 shadow-md"
        />
        <div>
          <h3 className="text-2xl font-extrabold leading-tight">{assistant.name}</h3>
          <p className={`text-lg font-semibold ${highContrast ? "text-slate-200" : "text-[#0f4d4d]"}`}>{assistant.designation}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#d5e6e5] bg-[#f1f8f7]"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Rating</p>
          <p className="mt-1 text-lg font-bold inline-flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            {assistant.rating.toFixed(1)}
          </p>
        </div>
        <div className={`rounded-2xl border p-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#d5e6e5] bg-[#f1f8f7]"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Distance</p>
          <p className="mt-1 text-lg font-bold inline-flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#0f7675]" />
            {assistant.distanceKm.toFixed(1)} km
          </p>
        </div>
        <div className={`rounded-2xl border p-3 ${highContrast ? "border-slate-700 bg-slate-800" : "border-[#d5e6e5] bg-[#f1f8f7]"}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Mode</p>
          <p className="mt-1 text-lg font-bold inline-flex items-center gap-2">
            <Bike className="w-5 h-5 text-[#0f7675]" />
            {assistant.travelMode}
          </p>
        </div>
      </div>

      <p className={`mt-4 text-xl font-bold ${highContrast ? "text-emerald-300" : "text-[#0a5e5d]"}`}>
        Estimated arrival: {assistant.etaMinutes} minutes
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          onClick={onAccept}
          className="rounded-2xl px-5 py-4 text-xl font-extrabold text-white gradient-primary shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Accept Assistant
        </button>
        <button
          onClick={onFindAnother}
          className={`rounded-2xl px-5 py-4 text-xl font-bold border focus:outline-none focus:ring-2 ${
            highContrast
              ? "bg-slate-800 border-slate-600 text-white focus:ring-slate-500"
              : "bg-white border-[#c5d9d8] text-[#0f4d4d] focus:ring-[#0f7675]/30"
          }`}
        >
          Find Another
        </button>
      </div>
    </section>
  );
}
