"use client";

import { Case, Hearing, Order } from "@/types/ecourts";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Gavel,
  MapPin,
  User,
  XCircle,
} from "lucide-react";

interface CaseDetailsProps {
  caseData: Case;
  hearings?: Hearing[];
  orders?: Order[];
  isLoading?: boolean;
}

export function CaseDetails({
  caseData,
  hearings = [],
  orders = [],
  isLoading = false,
}: CaseDetailsProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "disposed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "transferred":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "withdrawn":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "abated":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getHearingStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "adjourned":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    try {
      const date = new Date(dateString);
      if (timeString) {
        const [hours, minutes] = timeString.split(":");
        date.setHours(parseInt(hours), parseInt(minutes));
      }
      return format(date, "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {caseData.caseNumber}
            </h1>
            <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-3">
              {caseData.caseTitle}
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(caseData.status)}`}
              >
                {caseData.status.replace("_", " ")}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Stage: {caseData.caseStage}
              </span>
            </div>
          </div>
        </div>

        {/* Case Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Filing Date
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {formatDate(caseData.filingDate)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Court
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {caseData.court.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Case Type
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {caseData.caseType}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Parties
          </h3>

          {caseData.petitioner.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Petitioners
              </h4>
              <div className="space-y-2">
                {caseData.petitioner.map((party, index) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {party.name}
                    </div>
                    {party.address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {party.address}
                      </div>
                    )}
                    {party.phone && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {party.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {caseData.respondent.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Respondents
              </h4>
              <div className="space-y-2">
                {caseData.respondent.map((party, index) => (
                  <div
                    key={index}
                    className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {party.name}
                    </div>
                    {party.address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {party.address}
                      </div>
                    )}
                    {party.phone && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Phone: {party.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Advocates Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Gavel className="w-5 h-5" />
            Advocates
          </h3>

          {caseData.advocate.length > 0 ? (
            <div className="space-y-3">
              {caseData.advocate.map((advocate, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {advocate.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Type: {advocate.type.replace("_", " ")}
                  </div>
                  {advocate.barCouncilNumber && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Bar Council: {advocate.barCouncilNumber}
                    </div>
                  )}
                  {advocate.phone && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Phone: {advocate.phone}
                    </div>
                  )}
                  {advocate.address && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Address: {advocate.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No advocate information available
            </p>
          )}
        </div>
      </div>

      {/* Case Details Information */}
      {caseData.caseDetails && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Case Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {caseData.caseDetails.caseCategory && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    Category:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {caseData.caseDetails.caseCategory}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseSubCategory && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    Sub Category:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {caseData.caseDetails.caseSubCategory}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseValue && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    Case Value:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    ₹{caseData.caseDetails.caseValue.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {caseData.caseDetails.caseNature && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    Nature:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {caseData.caseDetails.caseNature}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseAct && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    Act:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {caseData.caseDetails.caseAct}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseSection && (
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    Section:
                  </span>
                  <span className="ml-2 text-gray-900 dark:text-white">
                    {caseData.caseDetails.caseSection}
                  </span>
                </div>
              )}
            </div>
          </div>
          {caseData.caseDetails.caseDescription && (
            <div className="mt-4">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Description:
              </span>
              <p className="mt-1 text-gray-900 dark:text-white">
                {caseData.caseDetails.caseDescription}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hearings */}
      {hearings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Hearings
          </h3>
          <div className="space-y-4">
            {hearings.map((hearing) => (
              <div
                key={hearing.id}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getHearingStatusIcon(hearing.status)}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(
                          hearing.hearingDate,
                          hearing.hearingTime
                        )}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(hearing.status)}`}
                      >
                        {hearing.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Purpose: {hearing.purpose}
                    </div>
                    {hearing.judge && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Judge: {hearing.judge.name}
                      </div>
                    )}
                    {hearing.remarks && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Remarks: {hearing.remarks}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders */}
      {orders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Orders
          </h3>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {order.orderType.replace("_", " ")}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(order.orderDate)}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.orderStatus)}`}
                  >
                    {order.orderStatus}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Judge: {order.judge.name}
                </div>
                <div className="text-sm text-gray-900 dark:text-white">
                  {order.orderText}
                </div>
                {order.pdfUrl && (
                  <div className="mt-2">
                    <a
                      href={order.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                    >
                      View PDF
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
