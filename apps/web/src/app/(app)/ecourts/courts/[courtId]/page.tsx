"use client";

import { ecourtsService } from "@/services/ecourts";
import { APIResponse, Court } from "@/types/ecourts";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CourtDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const courtId = params.courtId as string;

  const [courtData, setCourtData] = useState<Court | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (courtId) {
      loadCourtDetails();
    }
  }, [courtId]);

  const loadCourtDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response: APIResponse<Court> = await ecourtsService.getCourtDetails(
        decodeURIComponent(courtId)
      );

      if (response.success && response.data) {
        setCourtData(response.data);
      } else {
        setError(response.error?.message || "Failed to load court details");
      }
    } catch (err) {
      console.error("Court details error:", err);
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

  const getCourtTypeColor = (type: string) => {
    switch (type) {
      case "SUPREME_COURT":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "HIGH_COURT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "DISTRICT_COURT":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "SESSIONS_COURT":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "CIVIL_COURT":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "FAMILY_COURT":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "CONSUMER_COURT":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "LABOUR_COURT":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "REVENUE_COURT":
        return "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Loading court details...
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

  if (!courtData) {
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
              Court Not Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              The requested court could not be found or you don't have
              permission to view it.
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

        {/* Court Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {courtData.name}
              </h1>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${getCourtTypeColor(courtData.type)}`}
                >
                  {courtData.type.replace("_", " ")}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {courtData.district}, {courtData.state}
                </span>
              </div>
            </div>
          </div>

          {/* Court Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Location
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {courtData.district}, {courtData.state}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Court Type
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {courtData.type.replace("_", " ")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-5 h-5 text-gray-400">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Court ID
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {courtData.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Court Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contact Information
            </h3>

            <div className="space-y-4">
              {courtData.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Phone
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {courtData.phone}
                    </div>
                  </div>
                </div>
              )}

              {courtData.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Email
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {courtData.email}
                    </div>
                  </div>
                </div>
              )}

              {courtData.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Website
                    </div>
                    <a
                      href={courtData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      {courtData.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Address
            </h3>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Full Address
                </div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {courtData.address}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {courtData.district}, {courtData.state}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Court Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Court ID:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {courtData.id}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Name:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {courtData.name}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Type:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {courtData.type.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  District:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {courtData.district}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  State:
                </span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {courtData.state}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
