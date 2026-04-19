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
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  if (!courtData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              Court Not Found
            </h3>
            <p className="text-muted-foreground">
              The requested court could not be found or you don't have
              permission to view it.
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

        {/* Court Header */}
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {courtData.name}
              </h1>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${getCourtTypeColor(courtData.type)}`}
                >
                  {courtData.type.replace("_", " ")}
                </span>
                <span className="text-muted-foreground">
                  {courtData.district}, {courtData.state}
                </span>
              </div>
            </div>
          </div>

          {/* Court Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  Location
                </div>
                <div className="font-medium text-foreground">
                  {courtData.district}, {courtData.state}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  Court Type
                </div>
                <div className="font-medium text-foreground">
                  {courtData.type.replace("_", " ")}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-5 h-5 text-muted-foreground">
                <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Court ID
                </div>
                <div className="font-medium text-foreground">
                  {courtData.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Court Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Contact Information
            </h3>

            <div className="space-y-4">
              {courtData.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Phone
                    </div>
                    <div className="font-medium text-foreground">
                      {courtData.phone}
                    </div>
                  </div>
                </div>
              )}

              {courtData.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Email
                    </div>
                    <div className="font-medium text-foreground">
                      {courtData.email}
                    </div>
                  </div>
                </div>
              )}

              {courtData.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Website
                    </div>
                    <a
                      href={courtData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:text-primary/80"
                    >
                      {courtData.website}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Address
            </h3>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Full Address
                </div>
                <div className="font-medium text-foreground">
                  {courtData.address}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {courtData.district}, {courtData.state}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Court Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="font-medium text-muted-foreground">
                  Court ID:
                </span>
                <span className="ml-2 text-foreground">
                  {courtData.id}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">
                  Name:
                </span>
                <span className="ml-2 text-foreground">
                  {courtData.name}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">
                  Type:
                </span>
                <span className="ml-2 text-foreground">
                  {courtData.type.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-muted-foreground">
                  District:
                </span>
                <span className="ml-2 text-foreground">
                  {courtData.district}
                </span>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">
                  State:
                </span>
                <span className="ml-2 text-foreground">
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
