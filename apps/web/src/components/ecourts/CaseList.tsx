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
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No cases found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
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
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedCase === caseItem.caseNumber ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => handleCaseClick(caseItem.caseNumber)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {caseItem.caseNumber}
                </h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseItem.status)}`}
                >
                  {caseItem.status.replace("_", " ")}
                </span>
              </div>

              <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-3">
                {caseItem.caseTitle}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
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
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
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
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="View Details"
              >
                <Eye className="w-5 h-5" />
              </button>
              <ChevronRight
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  selectedCase === caseItem.caseNumber ? "rotate-90" : ""
                }`}
              />
            </div>
          </div>

          {/* Expanded Details */}
          {selectedCase === caseItem.caseNumber && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Case Details */}
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                    Case Details
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Type:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {caseItem.caseType}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Stage:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {caseItem.caseStage}
                      </span>
                    </div>
                    {caseItem.caseDetails.caseCategory && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Category:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {caseItem.caseDetails.caseCategory}
                        </span>
                      </div>
                    )}
                    {caseItem.caseDetails.caseValue && (
                      <div>
                        <span className="font-medium text-gray-600 dark:text-gray-400">
                          Value:
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          ₹{caseItem.caseDetails.caseValue.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Court Information */}
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                    Court Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Name:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {caseItem.court.name}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        Type:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {caseItem.court.type.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        District:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {caseItem.court.district}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">
                        State:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {caseItem.court.state}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advocates */}
              {caseItem.advocate.length > 0 && (
                <div className="mt-6">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-3">
                    Advocates
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {caseItem.advocate.map((advocate, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {advocate.name}
                        </div>
                        {advocate.barCouncilNumber && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Bar Council: {advocate.barCouncilNumber}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 dark:text-gray-400">
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
