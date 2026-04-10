import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
    CitizenProfile,
    QueryResponse,
    fetchCitizenProfile,
    submitQuery,
    mockProfile,
    mockQueryResponse,
    LLMMode,
    getLLMMode,
    setLLMMode
} from '../lib/api';

interface BBNContextType {
    userProfile: CitizenProfile | null;
    selectedLanguage: string;
    smartIntakePrefill: Partial<CitizenProfile> | null;
    queryResponse: QueryResponse | null;
    isLoading: boolean;
    error: string | null;
    isAssistedMode: boolean;
    selectedScheme: any | null;
    showSchemeDetails: boolean;
    showProfileCompletion: boolean;
    activeTab: string;
    llmMode: LLMMode;
    isLLMModeLoading: boolean;
    llmModeError: string | null;
    setActiveTab: (tab: string) => void;
    updateLLMMode: (mode: LLMMode) => Promise<void>;
    setSelectedLanguage: (language: string) => void;
    setSelectedScheme: (scheme: any | null) => void;
    openSchemeDetails: (scheme?: any | null) => void;
    closeSchemeDetails: () => void;
    setShowProfileCompletion: (show: boolean) => void;
    openSmartIntake: (prefill?: Partial<CitizenProfile> | null) => void;
    setAadhaar: (aadhaar: string) => Promise<QueryResponse | null>;
    submitManualProfile: (profile: CitizenProfile) => void;
    runQuery: (
        query: string,
        simulate?: boolean,
        profileOverride?: CitizenProfile | null,
        aadhaarOverride?: string
    ) => Promise<void>;
    isApplying: boolean;
    startApplication: (scheme: any) => void;
    cancelApplication: () => void;
    toggleAssistedMode: () => void;
    resetAll: () => void;
}

const BBNContext = createContext<BBNContextType | undefined>(undefined);

export const BBNProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userProfile, setUserProfile] = useState<CitizenProfile | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState("English");
    const [smartIntakePrefill, setSmartIntakePrefill] = useState<Partial<CitizenProfile> | null>(null);
    const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAssistedMode, setIsAssistedMode] = useState(false);
    const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
    const [showSchemeDetails, setShowSchemeDetails] = useState(false);
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    const [activeTab, setActiveTab] = useState("Dashboard");
    const [llmMode, setLlmMode] = useState<LLMMode>("auto");
    const [isLLMModeLoading, setIsLLMModeLoading] = useState(false);
    const [llmModeError, setLlmModeError] = useState<string | null>(null);
    const [tempAadhaar, setTempAadhaar] = useState("");
    const [isApplying, setIsApplying] = useState(false);

    const updateSelectedLanguage = (language: string) => {
        setSelectedLanguage(language);
        setUserProfile((prev) => (prev ? { ...prev, language } : prev));
    };

    useEffect(() => {
        const loadMode = async () => {
            try {
                setIsLLMModeLoading(true);
                setLlmModeError(null);
                const mode = await getLLMMode();
                setLlmMode(mode);
            } catch (_err: any) {
                setLlmModeError("Unable to load AI mode.");
            } finally {
                setIsLLMModeLoading(false);
            }
        };
        loadMode();
    }, []);

    const updateLLMMode = async (mode: LLMMode) => {
        try {
            setIsLLMModeLoading(true);
            setLlmModeError(null);
            const updated = await setLLMMode(mode);
            setLlmMode(updated);
        } catch (_err: any) {
            setLlmModeError("Failed to change AI mode.");
        } finally {
            setIsLLMModeLoading(false);
        }
    };

    const openSmartIntake = (prefill: Partial<CitizenProfile> | null = null) => {
        setSmartIntakePrefill(prefill);
        setShowProfileCompletion(true);
        setError(null);
    };

    const setAadhaar = async (aadhaar: string): Promise<QueryResponse | null> => {
        const normalizedAadhaar = (aadhaar || "").trim();
        setIsLoading(true);
        setError(null);
        setTempAadhaar(normalizedAadhaar);

        try {
            const profile = await fetchCitizenProfile(normalizedAadhaar);
            setUserProfile(profile);
            if ((profile?.age || 0) > 60) {
                setIsAssistedMode(true);
            }
            const initialResponse = await submitQuery("What benefits am I eligible for?", null, normalizedAadhaar);
            setQueryResponse(initialResponse);

            // Auto-select first scheme if none selected
            if (initialResponse.eligible_schemes.length > 0) {
                setSelectedScheme(initialResponse.eligible_schemes[0]);
            } else if (initialResponse.recommended_schemes.length > 0) {
                setSelectedScheme(initialResponse.recommended_schemes[0]);
            }

            setShowProfileCompletion(false);
            return initialResponse;
        } catch (err: any) {
            // If Aadhaar not found, show the profile completion modal
            setUserProfile(null);
            setQueryResponse(null);
            setSelectedScheme(null);
            openSmartIntake(null);
            setError("Aadhaar not found. Please complete your profile.");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const submitManualProfile = async (profile: CitizenProfile) => {
        setIsLoading(true);
        try {
            const normalizedProfile = {
                ...profile,
                aadhaar_no: tempAadhaar || profile.aadhaar_no,
                state: profile.state,
                caste: profile.caste,
                language: "English"
            };
            setUserProfile(normalizedProfile);
            if ((normalizedProfile?.age || 0) > 60) {
                setIsAssistedMode(true);
            }
            const initialResponse = await submitQuery("What benefits am I eligible for?", normalizedProfile, tempAadhaar || profile.aadhaar_no);
            setQueryResponse(initialResponse);

            // Auto-select first scheme
            if (initialResponse.eligible_schemes.length > 0) {
                setSelectedScheme(initialResponse.eligible_schemes[0]);
            } else if (initialResponse.recommended_schemes.length > 0) {
                setSelectedScheme(initialResponse.recommended_schemes[0]);
            }

            setShowProfileCompletion(false);
            setError(null);
        } catch (err: any) {
            setError("Failed to determine eligibility with provided data.");
        } finally {
            setIsLoading(false);
        }
    };

    const runQuery = async (
        query: string,
        simulate: boolean = false,
        profileOverride: CitizenProfile | null = null,
        aadhaarOverride: string = ""
    ) => {
        try {
            if (simulate) {
                const baseResponse = queryResponse || mockQueryResponse;
                const currentLikelihood = baseResponse?.ml_prediction?.approval_likelihood ?? 0.5;
                const queryLower = (query || "").toLowerCase();
                const categoryBoost =
                    queryLower.includes("health") ? 0.08 :
                        queryLower.includes("pension") ? 0.06 :
                            queryLower.includes("education") ? 0.05 :
                                queryLower.includes("ration") ? 0.04 : 0.03;
                const jitter = Math.random() * 0.04;
                const simulatedLikelihood = Math.min(
                    0.98,
                    Math.max(0.1, currentLikelihood + categoryBoost + jitter)
                );

                const currentMonthly = Number(
                    String(baseResponse?.monthly_benefit_value ?? 0).replace(/[^\d.]/g, "")
                ) || 0;
                const simulatedMonthly = Math.round(currentMonthly * (1 + categoryBoost / 2));

                const simulatedResponse: QueryResponse = {
                    ...baseResponse,
                    monthly_benefit_value: simulatedMonthly,
                    ml_prediction: {
                        ...baseResponse.ml_prediction,
                        approval_likelihood: simulatedLikelihood
                    },
                    explanation: `Simulation completed for: ${query}`
                };
                setQueryResponse(simulatedResponse);
                return;
            }

            setIsLoading(true);
            setError(null);
            const effectiveProfile = profileOverride || userProfile;
            const effectiveAadhaar = aadhaarOverride || tempAadhaar;

            const response = await submitQuery(query, effectiveProfile, effectiveAadhaar);
            setQueryResponse(response);
            if (profileOverride) {
                setUserProfile(profileOverride);
            }

            // Preserve simulator/quick-link selection; otherwise auto-select first result.
            const isPinnedSimulatorSelection =
                !!selectedScheme &&
                typeof selectedScheme.id === "string" &&
                (selectedScheme.id.startsWith("sim-") || selectedScheme.id.startsWith("quick-"));

            if (!isPinnedSimulatorSelection && !selectedScheme) {
                if (response.eligible_schemes.length > 0) {
                    setSelectedScheme(response.eligible_schemes[0]);
                } else if (response.recommended_schemes.length > 0) {
                    setSelectedScheme(response.recommended_schemes[0]);
                }
            }
        } catch (err: any) {
            setError(err.message || "Query failed");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAssistedMode = () => setIsAssistedMode(!isAssistedMode);
    const openSchemeDetails = (scheme: any | null = null) => {
        if (scheme) setSelectedScheme(scheme);
        setShowSchemeDetails(true);
    };
    const closeSchemeDetails = () => setShowSchemeDetails(false);

    const startApplication = (scheme: any) => {
        setSelectedScheme(scheme);
        setIsApplying(true);
    };

    const cancelApplication = () => {
        setIsApplying(false);
    };

    const resetAll = () => {
        setUserProfile(null);
        setSmartIntakePrefill(null);
        setQueryResponse(null);
        setError(null);
        setSelectedLanguage("English");
        setShowProfileCompletion(false);
        setIsApplying(false);
        setShowSchemeDetails(false);
    };

    return (
        <BBNContext.Provider value={{
            userProfile,
            selectedLanguage,
            smartIntakePrefill,
            queryResponse,
            isLoading,
            error,
            isAssistedMode,
            selectedScheme,
            showSchemeDetails,
            showProfileCompletion,
            activeTab,
            llmMode,
            isLLMModeLoading,
            llmModeError,
            setSelectedScheme,
            openSchemeDetails,
            closeSchemeDetails,
            setShowProfileCompletion,
            openSmartIntake,
            setActiveTab,
            updateLLMMode,
            setSelectedLanguage: updateSelectedLanguage,
            setAadhaar,
            submitManualProfile,
            runQuery,
            isApplying,
            startApplication,
            cancelApplication,
            toggleAssistedMode,
            resetAll
        }}>
            {children}
        </BBNContext.Provider>
    );
};

export const useBBN = () => {
    const context = useContext(BBNContext);
    if (context === undefined) {
        throw new Error('useBBN must be used within a BBNProvider');
    }
    return context;
};
