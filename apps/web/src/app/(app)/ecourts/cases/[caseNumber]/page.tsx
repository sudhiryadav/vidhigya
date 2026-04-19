"use client";

import { CaseDetails } from "@/components/ecourts/CaseDetails";
import { ecourtsService } from "@/services/ecourts";
import { APIResponse, GetCaseDetailsResponse } from "@/types/ecourts";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CaseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const caseNumber = params.caseNumber as string;

  const [caseData, setCaseData] = useState<GetCaseDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (caseNumber) {
      loadCaseDetails();
    }
  }, [caseNumber]);

  const loadCaseDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: APIResponse<GetCaseDetailsResponse> =
        await ecourtsService.getCaseDetails({
          caseNumber: decodeURIComponent(caseNumber),
        });

      if (response.success && response.data) {
        setCaseData(response.data);
      } else {
        setError(response.error?.message || "Failed to load case details");
      }
    } catch (err) {
      console.error("Case details error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                Loading case details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-primary hover:text-primary/80"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-primary hover:text-primary/80"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium text-foreground">
              Case Not Found
            </h3>
            <p className="text-muted-foreground">
              The requested case could not be found or you don't have permission
              to view it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-primary hover:text-primary/80"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Search
          </button>
        </div>

        {/* Case Details */}
        <CaseDetails
          caseData={caseData.case}
          hearings={caseData.hearings}
          orders={caseData.orders}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
