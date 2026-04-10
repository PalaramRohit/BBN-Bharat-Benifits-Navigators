import { useMemo, useState } from "react";
import { useBBN } from "@/context/BBNContext";
import { useI18n } from "@/hooks/use-i18n";
import {
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Languages,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

const GUIDE_TRANSLATIONS: Record<string, Record<string, string>> = {
  Hindi: {
    guide_header_title: "नागरिक उपयोगकर्ता मार्गदर्शिका",
    guide_header_subtitle: "JANSETU से क्या उम्मीद करें और हर सेक्शन को आसानी से कैसे उपयोग करें, यहाँ जानें।",
    guide_page_label: "पेज",
    guide_of_label: "में से",
    guide_expect_label: "आप क्या उम्मीद कर सकते हैं",
    guide_tips_label: "उपयोगकर्ता सुझाव",
    guide_prev: "पिछला",
    guide_next: "अगला",

    guide_welcome_title: "यह ऐप क्या करता है",
    guide_welcome_short: "ओवरव्यू",
    guide_welcome_summary: "JANSETU आपको केंद्रीय और राज्य योजनाएँ खोजने, पात्रता समझने और आवेदन प्रक्रिया शुरू करने में मदद करता है।",
    guide_welcome_expect_1: "आपकी प्रोफ़ाइल के आधार पर व्यक्तिगत योजना मिलान",
    guide_welcome_expect_2: "स्पष्ट पात्रता कारण (पात्र / अपात्र)",
    guide_welcome_expect_3: "मासिक और वार्षिक लाभ अनुमान",
    guide_welcome_tip_1: "तेज़ सत्यापन के लिए आधार और मोबाइल तैयार रखें",
    guide_welcome_tip_2: "सटीक परिणामों के लिए सही राज्य, व्यवसाय और आय दर्ज करें",
    guide_welcome_cta: "डैशबोर्ड पर जाएँ",

    guide_profile_title: "प्रोफ़ाइल लिंकिंग और स्मार्ट इंटेक",
    guide_profile_short: "प्रोफ़ाइल",
    guide_profile_summary: "आप सीधे आधार दर्ज कर सकते हैं। आधार न मिलने पर स्मार्ट इंटेक बेसिक जानकारी और OTP के साथ आगे बढ़ाता है।",
    guide_profile_expect_1: "लिंक्ड आधार के लिए ऑटो प्रोफ़ाइल फेच",
    guide_profile_expect_2: "OTP सत्यापन के साथ स्मार्ट इंटेक",
    guide_profile_expect_3: "सीनियर नागरिकों के लिए Assisted Mode ऑटो-ON",
    guide_profile_tip_1: "12 अंकों का आधार बिना स्पेस दर्ज करें",
    guide_profile_tip_2: "प्रोफ़ाइल न मिले तो एक बार स्मार्ट इंटेक पूरा करें",
    guide_profile_cta: "पात्रता पर जाएँ",

    guide_schemes_title: "सभी योजनाएँ और सब्सिडी दृश्य",
    guide_schemes_short: "योजनाएँ",
    guide_schemes_summary: "All Schemes टैब में केंद्रीय और राज्य योजनाएँ अलग दिखती हैं, साथ में सब्सिडी अनुमान, मानदंड और दस्तावेज़।",
    guide_schemes_expect_1: "केंद्रीय और राज्य योजनाएँ अलग सेक्शन में",
    guide_schemes_expect_2: "मासिक/वार्षिक सब्सिडी अनुमान",
    guide_schemes_expect_3: "पात्रता मानदंड और दस्तावेज़ एक जगह",
    guide_schemes_tip_1_with_state_prefix: "राज्य फ़िल्टर से प्रासंगिकता बढ़ती है:",
    guide_schemes_tip_1: "राज्य फ़िल्टर से प्रासंगिक परिणाम मिलते हैं",
    guide_schemes_tip_2: "आवेदन से पहले कई योजनाओं की तुलना करें",
    guide_schemes_cta: "All Schemes पर जाएँ",

    guide_apply_title: "क्लेम सहायता यात्रा",
    guide_apply_short: "आवेदन",
    guide_apply_summary: "Claim Assistance दस्तावेज़ चेकलिस्ट, चरण-दर-चरण आवेदन फ्लो और स्थानीय सहायता विकल्प देता है।",
    guide_apply_expect_1: "सबमिट से पहले दस्तावेज़ चेकलिस्ट",
    guide_apply_expect_2: "स्पष्ट अगले कदमों के साथ गाइडेड फ्लो",
    guide_apply_expect_3: "ज़रूरत होने पर सहायक अनुरोध समर्थन",
    guide_apply_tip_1: "दस्तावेज़ की स्पष्ट फोटो/PDF अपलोड करें",
    guide_apply_tip_2: "अंतिम सबमिट से पहले आधार OTP सत्यापन पूरा करें",
    guide_apply_cta: "Claim Assistance पर जाएँ",

    guide_voice_title: "आवाज़, भाषा और अभिगम्यता",
    guide_voice_short: "वॉइस",
    guide_voice_summary: "आप आवाज़ से पूछ सकते हैं, आउटपुट भाषा बदल सकते हैं और बड़े टेक्स्ट वाले Assisted अनुभव का उपयोग कर सकते हैं।",
    guide_voice_expect_1: "भाषा पहचान के साथ वॉइस इनपुट",
    guide_voice_expect_2: "भाषा फॉलबैक के साथ AI वॉइस प्रतिक्रिया",
    guide_voice_expect_3: "वरिष्ठों के लिए सरल Assisted UI",
    guide_voice_tip_1: "स्पष्ट बोलें और ट्रांसक्रिप्ट आने के बाद Enter दबाएँ",
    guide_voice_tip_2: "हेडर में भाषा कभी भी बदल सकते हैं",
    guide_voice_cta: "Optimization पर जाएँ",

    guide_trust_title: "विश्वास, सुरक्षा और डेटा उपयोग",
    guide_trust_short: "सुरक्षा",
    guide_trust_summary: "ऐप आपकी प्रोफ़ाइल का उपयोग केवल पात्रता, योजना मार्गदर्शन और आवेदन सहायता के लिए करता है।",
    guide_trust_expect_1: "केवल प्रोफ़ाइल-आधारित सिफारिश",
    guide_trust_expect_2: "राज्य ज्ञात होने पर अनावश्यक out-of-state योजना नहीं",
    guide_trust_expect_3: "निर्णयों के लिए पारदर्शी कारण",
    guide_trust_tip_1: "Age/State/Caste/Income कार्ड में डेटा जांचें",
    guide_trust_tip_2: "गलत हो तो प्रोफ़ाइल अपडेट करें",
    guide_trust_cta: "डैशबोर्ड पर लौटें",
  },
  Telugu: {
    guide_header_title: "పౌరుల వినియోగదారు మార్గదర్శిని",
    guide_header_subtitle: "JANSETU నుండి ఏమి ఆశించాలి మరియు ప్రతి విభాగాన్ని ఎలా ఉపయోగించాలో తెలుసుకోండి.",
    guide_page_label: "పేజీ",
    guide_of_label: "లో",
    guide_expect_label: "మీరు ఆశించగలవి",
    guide_tips_label: "వినియోగదారు సూచనలు",
    guide_prev: "మునుపటి",
    guide_next: "తదుపరి",
  },
  Tamil: {
    guide_header_title: "குடிமக்கள் பயனர் வழிகாட்டி",
    guide_header_subtitle: "JANSETU-வில் என்ன கிடைக்கும், ஒவ்வொரு பகுதியையும் எப்படி பயன்படுத்துவது என்பதை அறிக.",
    guide_page_label: "பக்கம்",
    guide_of_label: "இல்",
    guide_expect_label: "நீங்கள் எதிர்பார்க்கக் கூடியவை",
    guide_tips_label: "பயனர் குறிப்புகள்",
    guide_prev: "முந்தையது",
    guide_next: "அடுத்து",
  },
};

type GuidePage = {
  id: string;
  title: string;
  shortLabel: string;
  summary: string;
  expect: string[];
  tips: string[];
  ctaLabel: string;
  ctaTab: string;
  icon: any;
};

export function InsightsDashboard() {
  const { userProfile, setActiveTab } = useBBN();
  const { t, selectedLanguage } = useI18n();
  const tg = (key: string, fallback: string) =>
    GUIDE_TRANSLATIONS[selectedLanguage]?.[key] || t(key, fallback);
  const pages = useMemo<GuidePage[]>(
    () => [
      {
        id: "welcome",
        title: tg("guide_welcome_title", "What This App Does"),
        shortLabel: tg("guide_welcome_short", "Overview"),
        summary: tg(
          "guide_welcome_summary",
          "JANSETU helps you discover central and state welfare schemes, understand eligibility, and start applications with guided steps."
        ),
        expect: [
          tg("guide_welcome_expect_1", "Personalized scheme matching based on your profile"),
          tg("guide_welcome_expect_2", "Clear eligibility reasons (eligible / not eligible)"),
          tg("guide_welcome_expect_3", "Monthly and annual benefit estimates"),
        ],
        tips: [
          tg("guide_welcome_tip_1", "Keep Aadhaar and mobile ready for faster verification"),
          tg("guide_welcome_tip_2", "Use your real state, occupation, and income for accurate results"),
        ],
        ctaLabel: tg("guide_welcome_cta", "Go To Dashboard"),
        ctaTab: "Dashboard",
        icon: BookOpen,
      },
      {
        id: "profile",
        title: tg("guide_profile_title", "Profile Linking And Smart Intake"),
        shortLabel: tg("guide_profile_short", "Profile"),
        summary: tg(
          "guide_profile_summary",
          "You can enter Aadhaar directly. If Aadhaar is not found, Smart Intake asks basic details and OTP to continue safely."
        ),
        expect: [
          tg("guide_profile_expect_1", "Auto profile fetch for linked Aadhaar"),
          tg("guide_profile_expect_2", "Smart Intake fallback with OTP verification"),
          tg("guide_profile_expect_3", "Assisted Mode auto-activation for senior citizens"),
        ],
        tips: [
          tg("guide_profile_tip_1", "Enter 12-digit Aadhaar without spaces"),
          tg("guide_profile_tip_2", "If profile is missing, complete Smart Intake once"),
        ],
        ctaLabel: tg("guide_profile_cta", "Go To Eligibility"),
        ctaTab: "Eligibility",
        icon: BadgeCheck,
      },
      {
        id: "schemes",
        title: tg("guide_schemes_title", "All Schemes And Subsidy View"),
        shortLabel: tg("guide_schemes_short", "Schemes"),
        summary: tg(
          "guide_schemes_summary",
          "The All Schemes tab separates Central and State schemes and shows realistic subsidy estimates with criteria and required documents."
        ),
        expect: [
          tg("guide_schemes_expect_1", "Central and State schemes in separate sections"),
          tg("guide_schemes_expect_2", "Subsidy value shown as monthly/annual estimate"),
          tg("guide_schemes_expect_3", "Eligibility criteria and documents in one place"),
        ],
        tips: [
          userProfile?.state
            ? `${tg("guide_schemes_tip_1_with_state_prefix", "State filtering improves relevance for")} ${userProfile.state}`
            : tg("guide_schemes_tip_1", "State filtering improves relevance"),
          tg("guide_schemes_tip_2", "Compare multiple schemes before applying"),
        ],
        ctaLabel: tg("guide_schemes_cta", "Go To All Schemes"),
        ctaTab: "All Schemes",
        icon: FileSearch,
      },
      {
        id: "apply",
        title: tg("guide_apply_title", "Claim Assistance Journey"),
        shortLabel: tg("guide_apply_short", "Apply"),
        summary: tg(
          "guide_apply_summary",
          "Claim Assistance gives document checklist, step-by-step application flow, and assistance options for faster submission."
        ),
        expect: [
          tg("guide_apply_expect_1", "Document checklist before submission"),
          tg("guide_apply_expect_2", "Guided application flow with clear next actions"),
          tg("guide_apply_expect_3", "Assistant request support when needed"),
        ],
        tips: [
          tg("guide_apply_tip_1", "Upload clear document photos/PDFs"),
          tg("guide_apply_tip_2", "Complete Aadhaar OTP verification before final submit"),
        ],
        ctaLabel: tg("guide_apply_cta", "Go To Claim Assistance"),
        ctaTab: "Claim Assistance",
        icon: PhoneCall,
      },
      {
        id: "voice",
        title: tg("guide_voice_title", "Voice, Language, And Accessibility"),
        shortLabel: tg("guide_voice_short", "Voice"),
        summary: tg(
          "guide_voice_summary",
          "You can ask by voice, switch output language, and use assisted experiences with larger UI and spoken guidance."
        ),
        expect: [
          tg("guide_voice_expect_1", "Voice input with language detection"),
          tg("guide_voice_expect_2", "AI voice responses with language fallback"),
          tg("guide_voice_expect_3", "Elder-friendly assisted UI and guided actions"),
        ],
        tips: [
          tg("guide_voice_tip_1", "Speak clearly and wait for transcript before Enter"),
          tg("guide_voice_tip_2", "Use language selector in header anytime"),
        ],
        ctaLabel: tg("guide_voice_cta", "Go To Optimization"),
        ctaTab: "Optimization",
        icon: Languages,
      },
      {
        id: "trust",
        title: tg("guide_trust_title", "Trust, Safety, And Data Use"),
        shortLabel: tg("guide_trust_short", "Safety"),
        summary: tg(
          "guide_trust_summary",
          "The app uses your profile data only to compute eligibility, show scheme guidance, and support benefit application flow."
        ),
        expect: [
          tg("guide_trust_expect_1", "Profile-based recommendation only"),
          tg("guide_trust_expect_2", "No random out-of-state recommendations when state is known"),
          tg("guide_trust_expect_3", "Transparent reasoning for recommendation decisions"),
        ],
        tips: [
          tg("guide_trust_tip_1", "Check your profile cards for age/state/caste/income accuracy"),
          tg("guide_trust_tip_2", "Update profile if values look incorrect"),
        ],
        ctaLabel: tg("guide_trust_cta", "Back To Dashboard"),
        ctaTab: "Dashboard",
        icon: ShieldCheck,
      },
    ],
    [tg, userProfile?.state]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const activePage = pages[activeIndex];
  const ActiveIcon = activePage.icon;

  const goPrev = () => setActiveIndex((prev) => (prev === 0 ? pages.length - 1 : prev - 1));
  const goNext = () => setActiveIndex((prev) => (prev === pages.length - 1 ? 0 : prev + 1));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="rounded-3xl bg-foreground text-background p-6">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <BookOpen size={22} />
          {tg("guide_header_title", "Citizen User Guide")}
        </h3>
        <p className="text-sm opacity-80 mt-1">
          {tg("guide_header_subtitle", "Learn what to expect from JANSETU and how to use each section confidently.")}
        </p>
      </div>

      <div className="rounded-3xl bg-card border border-border p-4 md:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {pages.map((page, idx) => (
            <button
              key={page.id}
              onClick={() => setActiveIndex(idx)}
              className={`rounded-xl px-3 py-2 text-sm font-bold border transition-all ${
                activeIndex === idx
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-background text-foreground border-border hover:border-primary/40"
              }`}
            >
              {idx + 1}. {page.shortLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-card border border-border p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ActiveIcon size={20} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {tg("guide_page_label", "Page")} {activeIndex + 1} {tg("guide_of_label", "of")} {pages.length}
              </p>
              <h4 className="text-2xl font-extrabold text-foreground">{activePage.title}</h4>
            </div>
          </div>
          <button
            onClick={() => setActiveTab(activePage.ctaTab)}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            {activePage.ctaLabel}
          </button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{activePage.summary}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">
              {tg("guide_expect_label", "What You Can Expect")}
            </p>
            <ul className="space-y-2">
              {activePage.expect.map((item) => (
                <li key={item} className="text-sm text-foreground flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-info mb-2">
              {tg("guide_tips_label", "User Tips")}
            </p>
            <ul className="space-y-2">
              {activePage.tips.map((item) => (
                <li key={item} className="text-sm text-foreground flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-info" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between">
          <button
            onClick={goPrev}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground hover:border-primary/40"
          >
            <ChevronLeft size={16} />
            {tg("guide_prev", "Previous")}
          </button>

          <div className="text-xs font-semibold text-muted-foreground">
            {activePage.shortLabel}
          </div>

          <button
            onClick={goNext}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground hover:border-primary/40"
          >
            {tg("guide_next", "Next")}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
