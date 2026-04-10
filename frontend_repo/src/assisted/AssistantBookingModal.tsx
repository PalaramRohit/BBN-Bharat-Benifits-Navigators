import { useEffect, useMemo, useState } from "react";
import { Contrast, LocateFixed, UserRoundSearch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import assistantAvatar from "@/assets/avatar-assistant.png";
import AssistantFoundCard, { NearbyAssistant } from "./AssistantFoundCard";
import AssistantTracking from "./AssistantTracking";
import AssistantArrivalCard from "./AssistantArrivalCard";
import AssistantFeedback from "./AssistantFeedback";

type BookingStep = "request" | "found" | "tracking" | "arrival" | "feedback";

interface AssistantBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFlowComplete?: () => void;
}

interface HelpNeeded {
  schemeApplication: boolean;
  documentUpload: boolean;
  eligibilityExplanation: boolean;
}

const ASSISTANTS: Omit<NearbyAssistant, "etaMinutes">[] = [
  {
    id: "Ravi Kumar",
    phone: "9988776655",
    name: "Ravi Kumar",
    designation: "Govt Certified Welfare Assistant",
    rating: 4.8,
    distanceKm: 2.3,
    travelMode: "Bike",
    photoUrl: assistantAvatar,
  },
  {
    id: "Asha Devi",
    phone: "9977665544",
    name: "Asha Devi",
    designation: "Govt Certified Welfare Assistant",
    rating: 4.9,
    distanceKm: 1.8,
    travelMode: "Scooter",
    photoUrl: assistantAvatar,
  },
  {
    id: "Imran Khan",
    phone: "9966554433",
    name: "Imran Khan",
    designation: "Govt Certified Welfare Assistant",
    rating: 4.7,
    distanceKm: 2.9,
    travelMode: "Bike",
    photoUrl: assistantAvatar,
  },
];

const HELP_OPTIONS = [
  { key: "schemeApplication", label: "Scheme Application" },
  { key: "documentUpload", label: "Document Upload" },
  { key: "eligibilityExplanation", label: "Eligibility Explanation" },
] as const;

export default function AssistantBookingModal({
  open,
  onOpenChange,
  onFlowComplete,
}: AssistantBookingModalProps) {
  const [step, setStep] = useState<BookingStep>("request");
  const [highContrast, setHighContrast] = useState(false);
  const [location, setLocation] = useState("Auto detected: Hyderabad, Telangana");
  const [helpNeeded, setHelpNeeded] = useState<HelpNeeded>({
    schemeApplication: true,
    documentUpload: true,
    eligibilityExplanation: true,
  });
  const [assistant, setAssistant] = useState<NearbyAssistant | null>(null);
  const [trackingStep, setTrackingStep] = useState(0);
  const [rating, setRating] = useState(0);

  const selectedHelpCount = useMemo(
    () => Object.values(helpNeeded).filter(Boolean).length,
    [helpNeeded],
  );

  useEffect(() => {
    if (!open) {
      setStep("request");
      setAssistant(null);
      setTrackingStep(0);
      setRating(0);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "tracking") return;
    if (trackingStep >= 3) return;

    const timer = window.setTimeout(() => {
      setTrackingStep((prev) => Math.min(prev + 1, 3));
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [step, trackingStep]);

  useEffect(() => {
    if (step !== "tracking" || trackingStep < 3) return;

    const timer = window.setTimeout(() => {
      setStep("arrival");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [step, trackingStep]);

  const getAnotherAssistant = (currentId?: string) => {
    const pool = ASSISTANTS.filter((item) => item.id !== currentId);
    const picked = pool[Math.floor(Math.random() * pool.length)];
    const etaMinutes = 14 + Math.floor(Math.random() * 8);
    const distanceDrift = Math.random() * 0.9;
    return {
      ...picked,
      etaMinutes,
      distanceKm: Number((picked.distanceKm + distanceDrift).toFixed(1)),
    };
  };

  const handleFindAssistant = () => {
    setAssistant(getAnotherAssistant());
    setStep("found");
  };

  const handleFindAnother = () => {
    setAssistant(getAnotherAssistant(assistant?.id));
  };

  const handleAcceptAssistant = () => {
    setTrackingStep(0);
    setStep("tracking");
  };

  const handleStartAssistance = () => {
    setStep("feedback");
  };

  const handleReschedule = () => {
    setStep("request");
    setAssistant(null);
    setTrackingStep(0);
  };

  const handleCancelVisit = () => {
    onOpenChange(false);
  };

  const handleFeedbackSubmit = () => {
    onOpenChange(false);
    onFlowComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-3xl w-[95vw] sm:w-full p-0 rounded-3xl overflow-hidden ${
          highContrast ? "bg-slate-950 border-slate-800 text-white" : "bg-[#f8fbfb] border-[#b9d7d5] text-slate-900"
        }`}
      >
        <div className={`${highContrast ? "bg-slate-900" : "gradient-hero"} px-5 sm:px-7 py-5 text-white`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Find Nearby Welfare Assistant
                </DialogTitle>
                <DialogDescription className="text-base sm:text-lg text-white/90">
                  Simple booking flow for at-home welfare support.
                </DialogDescription>
              </DialogHeader>
            </div>
            <button
              onClick={() => setHighContrast((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-3 py-2 text-sm sm:text-base font-semibold hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-pressed={highContrast}
            >
              <Contrast className="w-4 h-4" />
              High Contrast
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          {step === "request" && (
            <section className="space-y-5 animate-fade-in">
              <div className={`rounded-2xl border p-4 ${highContrast ? "bg-slate-900 border-slate-700" : "bg-white border-[#d2e3e2]"}`}>
                <label className="block text-base sm:text-lg font-bold mb-2">Location</label>
                <div className="flex items-center gap-2">
                  <LocateFixed className={`w-5 h-5 ${highContrast ? "text-sky-300" : "text-[#0f7675]"}`} />
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    className={`w-full rounded-xl px-3 py-3 text-lg border focus:outline-none focus:ring-2 ${
                      highContrast
                        ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-400 focus:ring-sky-300/40"
                        : "bg-white border-[#c5d9d8] text-slate-900 placeholder:text-slate-500 focus:ring-[#0f7675]/30"
                    }`}
                    placeholder="Enter your address"
                  />
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${highContrast ? "bg-slate-900 border-slate-700" : "bg-white border-[#d2e3e2]"}`}>
                <p className="text-base sm:text-lg font-bold mb-3">Help needed</p>
                <div className="space-y-3">
                  {HELP_OPTIONS.map((option) => (
                    <label
                      key={option.key}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 border cursor-pointer ${
                        highContrast ? "border-slate-700 bg-slate-800" : "border-[#d4e5e4] bg-[#f5fafa]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={helpNeeded[option.key]}
                        onChange={(event) => {
                          setHelpNeeded((prev) => ({ ...prev, [option.key]: event.target.checked }));
                        }}
                        className="h-6 w-6 rounded accent-[#0f7675]"
                      />
                      <span className="text-lg font-semibold">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className={`rounded-2xl border p-4 ${highContrast ? "bg-slate-900 border-slate-700" : "bg-white border-[#d2e3e2]"}`}>
                <p className="text-base sm:text-lg font-bold">Estimated arrival time</p>
                <p className={`mt-1 text-2xl font-extrabold ${highContrast ? "text-emerald-300" : "text-[#0a5e5d]"}`}>
                  15-22 minutes
                </p>
              </div>

              <button
                onClick={handleFindAssistant}
                disabled={location.trim().length < 3 || selectedHelpCount === 0}
                className="w-full rounded-2xl py-4 text-xl sm:text-2xl font-extrabold text-white gradient-primary shadow-lg hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <UserRoundSearch className="w-6 h-6" />
                Find Assistant
              </button>
            </section>
          )}

          {step === "found" && assistant && (
            <div className="animate-fade-in">
              <AssistantFoundCard
                assistant={assistant}
                highContrast={highContrast}
                onAccept={handleAcceptAssistant}
                onFindAnother={handleFindAnother}
              />
            </div>
          )}

          {step === "tracking" && assistant && (
            <div className="animate-fade-in">
              <AssistantTracking
                assistant={assistant}
                currentStep={trackingStep}
                highContrast={highContrast}
                onArrived={() => setStep("arrival")}
              />
            </div>
          )}

          {step === "arrival" && assistant && (
            <div className="animate-fade-in">
              <AssistantArrivalCard
                assistant={assistant}
                highContrast={highContrast}
                onStartAssistance={handleStartAssistance}
                onReschedule={handleReschedule}
                onCancelVisit={handleCancelVisit}
              />
            </div>
          )}

          {step === "feedback" && (
            <div className="animate-fade-in">
              <AssistantFeedback
                rating={rating}
                highContrast={highContrast}
                onRate={setRating}
                onSubmit={handleFeedbackSubmit}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
