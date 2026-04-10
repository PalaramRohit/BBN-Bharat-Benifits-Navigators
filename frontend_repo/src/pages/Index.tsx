import { useEffect } from "react";
import { GlobalHeader } from "@/components/dashboard/GlobalHeader";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import { HeroSection } from "@/components/dashboard/HeroSection";
import { EligibilityOverview } from "@/components/dashboard/EligibilityOverview";
import { SimulatorGauge } from "@/components/dashboard/SimulatorGauge";
import { RequiredDocuments } from "@/components/dashboard/RequiredDocuments";
import { RecommendedSchemes } from "@/components/dashboard/RecommendedSchemes";
import { EligibilityDashboard } from "@/components/dashboard/EligibilityDashboard";
import { ClaimAssistance } from "@/components/dashboard/ClaimAssistance";
import { OptimizationDashboard } from "@/components/dashboard/OptimizationDashboard";
import { InsightsDashboard } from "@/components/dashboard/InsightsDashboard";
import { AllSchemesDashboard } from "@/components/dashboard/AllSchemesDashboard";
import { SchemeDetailsModal } from "@/components/dashboard/SchemeDetailsModal";
import { ProfileCompletionModal } from "@/components/dashboard/ProfileCompletionModal";
import { ApplyNowPage } from "@/components/dashboard/ApplyNowPage";
import { RTAPanel } from "@/components/dashboard/RTAPanel";
import { BotpressWidget } from "@/components/dashboard/BotpressWidget";
import { useBBN } from "@/context/BBNContext";

const Index = () => {
  const { activeTab, userProfile, runQuery, isApplying, closeSchemeDetails } = useBBN();
  const normalizedTab = (activeTab || "").trim().toLowerCase();

  useEffect(() => {
    closeSchemeDetails();
    if (userProfile && normalizedTab !== "dashboard" && normalizedTab !== "all schemes") {
      runQuery(`Show me details for ${activeTab}`);
    }
  }, [activeTab, userProfile, normalizedTab]);

  const renderContent = () => {
    switch (normalizedTab) {
      case "eligibility":
        return <EligibilityDashboard />;
      case "claim assistance":
        return <ClaimAssistance />;
      case "optimization":
        return <OptimizationDashboard />;
      case "insights":
        return <InsightsDashboard />;
      case "all schemes":
        return <AllSchemesDashboard />;
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <EligibilityOverview />
              <RecommendedSchemes />
            </div>

            <aside className="space-y-6">
              <SimulatorGauge />
              <RTAPanel />
              <RequiredDocuments />
            </aside>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans">
      <BotpressWidget />
      <GlobalHeader />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <LeftSidebar />

        <main className="flex-1 min-h-0 p-6 overflow-y-auto hide-scrollbar">
          {normalizedTab !== "eligibility" && normalizedTab !== "claim assistance" && normalizedTab !== "insights" && normalizedTab !== "all schemes" && (
            <HeroSection showSearch={normalizedTab !== "optimization"} />
          )}
          {renderContent()}
        </main>
      </div>

      <SchemeDetailsModal />
      <ProfileCompletionModal />
      {isApplying && <ApplyNowPage />}
    </div>
  );
};

export default Index;

