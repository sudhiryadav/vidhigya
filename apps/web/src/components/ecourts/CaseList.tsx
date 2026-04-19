"use client";

import { Case, CaseStatus } from "@/types/ecourts";
import { format } from "date-fns";
import {
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  MapPin,
  User,
} from "lucide-react";
import { useState } from "react";

interface CaseListProps {
  cases: Case[];
  isLoading?: boolean;
  onCaseSelect?: (caseNumber: string) => void;
  onViewDetails?: (caseNumber: string) => void;
}

export function CaseList({
  cases,
  isLoading = false,
  onCaseSelect,
  onViewDetails,
}: CaseListProps) {
  const [selectedCase, setSelectedCase] = useState<string | null>(null);

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.PENDING:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case CaseStatus.DISPOSED:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case CaseStatus.TRANSFERRED:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case CaseStatus.WITHDRAWN:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case CaseStatus.ABATED:
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const handleCaseClick = (caseNumber: string) => {
    setSelectedCase(selectedCase === caseNumber ? null : caseNumber);
    onCaseSelect?.(caseNumber);
  };

  const handleViewDetails = (e: React.MouseEvent, caseNumber: string) => {
    e.stopPropagation();
    onViewDetails?.(caseNumber);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-lg border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 h-4 w-1/4 rounded bg-muted"></div>
                <div className="mb-3 h-6 w-3/4 rounded bg-muted"></div>
                <div className="h-3 w-1/2 rounded bg-muted"></div>
              </div>
              <div className="h-8 w-20 rounded bg-muted"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-medium text-foreground">
          No cases found
        </h3>
        <p className="text-muted-foreground">
          Try adjusting your search criteria to find more cases.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((caseItem) => (
        <div
          key={caseItem.caseNumber}
          className={`cursor-pointer rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md ${
            selectedCase === caseItem.caseNumber ? "ring-2 ring-ring" : ""
          }`}
          onClick={() => handleCaseClick(caseItem.caseNumber)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {caseItem.caseNumber}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseItem.status)}`}
                >
                  {caseItem.status.replace("_", " ")}
                </span>
              </div>

              <h4 className="mb-3 text-base font-medium text-foreground">
                {caseItem.caseTitle}
              </h4>

              <div className="grid grid-cols-1 gap-4 text-sm text-muted-foreground md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Filed: {formatDate(caseItem.filingDate)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{caseItem.court.name}</span>
                </div>

                {caseItem.petitioner.length > 0 && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Petitioner: {caseItem.petitioner[0].name}</span>
                  </div>
                )}

                {caseItem.respondent.length > 0 && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Respondent: {caseItem.respondent[0].name}</span>
                  </div>
                )}
              </div>

              {caseItem.nextHearingDate && (
                <div className="mt-3 rounded-lg bg-primary/10 p-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Next Hearing: {formatDate(caseItem.nextHearingDate)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={(e) => handleViewDetails(e, caseItem.caseNumber)}
                className="p-2 text-muted-foreground transition-colors hover:text-primary"
                title="View Details"
              >
                <Eye className="w-5 h-5" />
              </button>
              <ChevronRight
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  selectedCase === caseItem.caseNumber ? "rotate-90" : ""
                }`}
              />
            </div>
          </div>

          {/* Expanded Details */}
          {selectedCase === caseItem.caseNumber && (
            <div className="mt-6 border-t border-border pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Case Details */}
                <div>
                  <h5 className="mb-3 font-medium text-foreground">
                    Case Details
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Type:
                      </span>
                      <span className="ml-2 text-foreground">
                        {caseItem.caseType}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Stage:
                      </span>
                      <span className="ml-2 text-foreground">
                        {caseItem.caseStage}
                      </span>
                    </div>
                    {caseItem.caseDetails.caseCategory && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Category:
                        </span>
                        <span className="ml-2 text-foreground">
                          {caseItem.caseDetails.caseCategory}
                        </span>
                      </div>
                    )}
                    {caseItem.caseDetails.caseValue && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Value:
                        </span>
                        <span className="ml-2 text-foreground">
                          ₹{caseItem.caseDetails.caseValue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Court Information */}
                <div>
                  <h5 className="mb-3 font-medium text-foreground">
                    Court Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Name:
                      </span>
                      <span className="ml-2 text-foreground">
                        {caseItem.court.name}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Type:
                      </span>
                      <span className="ml-2 text-foreground">
                        {caseItem.court.type.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        District:
                      </span>
                      <span className="ml-2 text-foreground">
                        {caseItem.court.district}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        State:
                      </span>
                      <span className="ml-2 text-foreground">
                        {caseItem.court.state}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advocates */}
              {caseItem.advocate.length > 0 && (
                <div className="mt-6">
                  <h5 className="mb-3 font-medium text-foreground">
                    Advocates
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {caseItem.advocate.map((advocate, index) => (
                      <div
                        key={index}
                        className="rounded-lg bg-muted p-3"
                      >
                        <div className="font-medium text-foreground">
                          {advocate.name}
                        </div>
                        {advocate.barCouncilNumber && (
                          <div className="text-sm text-muted-foreground">
                            Bar Council: {advocate.barCouncilNumber}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          Type: {advocate.type.replace("_", " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
