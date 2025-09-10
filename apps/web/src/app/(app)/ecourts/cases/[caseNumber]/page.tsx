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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="border border-red-200 text-red-800 bg-red-50 dark:border-red-800 dark:text-red-200 dark:bg-red-900/20 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Case Not Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              The requested case could not be found or you don't have permission
              to view it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
