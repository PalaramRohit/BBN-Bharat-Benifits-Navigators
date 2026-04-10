import { useEffect, useMemo, useState } from "react";
import { Landmark, MapPinned, Wallet } from "lucide-react";
import { useBBN } from "@/context/BBNContext";
import { AllSchemeInfo, fetchAllSchemes } from "@/lib/api";

function money(value: number): string {
  if (!Number.isFinite(value)) return "Rs 0";
  return `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function AllSchemesDashboard() {
  const { userProfile } = useBBN();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [centralSchemes, setCentralSchemes] = useState<AllSchemeInfo[]>([]);
  const [stateSchemes, setStateSchemes] = useState<AllSchemeInfo[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<AllSchemeInfo | null>(null);

  const selectedState = userProfile?.state || "";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        setError("");
        const data = await fetchAllSchemes(selectedState);
        if (!mounted) return;
        setCentralSchemes(data.central_schemes || []);
        setStateSchemes(data.state_schemes || []);
        const first = data.central_schemes?.[0] || data.state_schemes?.[0] || null;
        setSelectedScheme(first);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load schemes");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedState]);

  const totalCount = useMemo(
    () => centralSchemes.length + stateSchemes.length,
    [centralSchemes.length, stateSchemes.length]
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="rounded-3xl border border-border bg-card p-6">
        <h3 className="text-2xl font-bold text-foreground">All Schemes</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Segregated list of Central and State schemes with eligibility criteria and subsidy values.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Total Schemes</p>
            <p className="text-2xl font-extrabold text-foreground">{totalCount}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Central Schemes</p>
            <p className="text-2xl font-extrabold text-[#0f7675]">{centralSchemes.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-4 py-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              State Schemes{selectedState ? ` (${selectedState})` : ""}
            </p>
            <p className="text-2xl font-extrabold text-[#c1782d]">{stateSchemes.length}</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Loading schemes...
        </div>
      )}
      {!!error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Landmark className="w-5 h-5 text-[#0f7675]" />
                <h4 className="text-lg font-bold">Central Schemes</h4>
              </div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {centralSchemes.map((scheme) => (
                  <button
                    key={`${scheme.policy_id}-${scheme.name}-central`}
                    type="button"
                    onClick={() => setSelectedScheme(scheme)}
                    className={`w-full text-left rounded-2xl border px-3 py-3 transition-colors ${
                      selectedScheme?.name === scheme.name && selectedScheme?.scheme_scope === scheme.scheme_scope
                        ? "border-[#0f7675] bg-[#f1f8f7]"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-bold text-foreground text-sm leading-tight">{scheme.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{scheme.subsidy_label}: {scheme.subsidy_display}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPinned className="w-5 h-5 text-[#c1782d]" />
                <h4 className="text-lg font-bold">State Schemes</h4>
              </div>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {stateSchemes.map((scheme) => (
                  <button
                    key={`${scheme.policy_id}-${scheme.name}-${scheme.state_name || "state"}`}
                    type="button"
                    onClick={() => setSelectedScheme(scheme)}
                    className={`w-full text-left rounded-2xl border px-3 py-3 transition-colors ${
                      selectedScheme?.name === scheme.name && selectedScheme?.state_name === scheme.state_name
                        ? "border-[#c1782d] bg-[#fffaf3]"
                        : "border-border bg-background hover:bg-muted/40"
                    }`}
                  >
                    <p className="font-bold text-foreground text-sm leading-tight">{scheme.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scheme.state_name ? `${scheme.state_name} · ` : ""}
                      {scheme.subsidy_label}: {scheme.subsidy_display}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-3xl border border-border bg-card p-5 h-fit xl:sticky xl:top-4">
            {selectedScheme ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {selectedScheme.scheme_scope} Scheme
                    {selectedScheme.state_name ? ` · ${selectedScheme.state_name}` : ""}
                  </p>
                  <h5 className="text-xl font-extrabold text-foreground mt-1">{selectedScheme.name}</h5>
                  <p className="text-sm text-muted-foreground mt-2">{selectedScheme.description}</p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4 space-y-2">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-[#0f7675]" />
                    {selectedScheme.subsidy_label}
                  </p>
                  <p className="text-sm text-foreground">{selectedScheme.subsidy_display}</p>
                  <p className="text-xs text-muted-foreground">
                    Monthly: {money(selectedScheme.monthly_subsidy_rs)} · Annual: {money(selectedScheme.annual_subsidy_rs)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-bold mb-2">Eligibility Criteria</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {selectedScheme.criteria_lines?.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select any scheme to view details and subsidy info.</p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
