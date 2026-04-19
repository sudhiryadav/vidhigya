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
      <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-2/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {caseData.caseNumber}
            </h1>
            <h2 className="text-lg font-medium text-foreground mb-3">
              {caseData.caseTitle}
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(caseData.status)}`}
              >
                {caseData.status.replace("_", " ")}
              </span>
              <span className="text-sm text-muted-foreground">
                Stage: {caseData.caseStage}
              </span>
            </div>
          </div>
        </div>

        {/* Case Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">
                Filing Date
              </div>
              <div className="font-medium text-foreground">
                {formatDate(caseData.filingDate)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">
                Court
              </div>
              <div className="font-medium text-foreground">
                {caseData.court.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">
                Case Type
              </div>
              <div className="font-medium text-foreground">
                {caseData.caseType}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Case Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parties Information */}
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Parties
          </h3>

          {caseData.petitioner.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-foreground mb-2">
                Petitioners
              </h4>
              <div className="space-y-2">
                {caseData.petitioner.map((party, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-primary/10 p-3"
                  >
                    <div className="font-medium text-foreground">
                      {party.name}
                    </div>
                    {party.address && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {party.address}
                      </div>
                    )}
                    {party.phone && (
                      <div className="text-sm text-muted-foreground">
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
              <h4 className="font-medium text-foreground mb-2">
                Respondents
              </h4>
              <div className="space-y-2">
                {caseData.respondent.map((party, index) => (
                  <div
                    key={index}
                    className="rounded-lg bg-destructive/10 p-3"
                  >
                    <div className="font-medium text-foreground">
                      {party.name}
                    </div>
                    {party.address && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {party.address}
                      </div>
                    )}
                    {party.phone && (
                      <div className="text-sm text-muted-foreground">
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
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Gavel className="w-5 h-5" />
            Advocates
          </h3>

          {caseData.advocate.length > 0 ? (
            <div className="space-y-3">
              {caseData.advocate.map((advocate, index) => (
                <div
                  key={index}
                  className="rounded-lg bg-muted p-3"
                >
                  <div className="font-medium text-foreground">
                    {advocate.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Type: {advocate.type.replace("_", " ")}
                  </div>
                  {advocate.barCouncilNumber && (
                    <div className="text-sm text-muted-foreground">
                      Bar Council: {advocate.barCouncilNumber}
                    </div>
                  )}
                  {advocate.phone && (
                    <div className="text-sm text-muted-foreground">
                      Phone: {advocate.phone}
                    </div>
                  )}
                  {advocate.address && (
                    <div className="text-sm text-muted-foreground">
                      Address: {advocate.address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No advocate information available
            </p>
          )}
        </div>
      </div>

      {/* Case Details Information */}
      {caseData.caseDetails && (
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Case Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              {caseData.caseDetails.caseCategory && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Category:
                  </span>
                  <span className="ml-2 text-foreground">
                    {caseData.caseDetails.caseCategory}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseSubCategory && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Sub Category:
                  </span>
                  <span className="ml-2 text-foreground">
                    {caseData.caseDetails.caseSubCategory}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseValue && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Case Value:
                  </span>
                  <span className="ml-2 text-foreground">
                    ₹{caseData.caseDetails.caseValue.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {caseData.caseDetails.caseNature && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Nature:
                  </span>
                  <span className="ml-2 text-foreground">
                    {caseData.caseDetails.caseNature}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseAct && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Act:
                  </span>
                  <span className="ml-2 text-foreground">
                    {caseData.caseDetails.caseAct}
                  </span>
                </div>
              )}
              {caseData.caseDetails.caseSection && (
                <div>
                  <span className="font-medium text-muted-foreground">
                    Section:
                  </span>
                  <span className="ml-2 text-foreground">
                    {caseData.caseDetails.caseSection}
                  </span>
                </div>
              )}
            </div>
          </div>
          {caseData.caseDetails.caseDescription && (
            <div className="mt-4">
              <span className="font-medium text-muted-foreground">
                Description:
              </span>
              <p className="mt-1 text-foreground">
                {caseData.caseDetails.caseDescription}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hearings */}
      {hearings.length > 0 && (
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Hearings
          </h3>
          <div className="space-y-4">
            {hearings.map((hearing) => (
              <div
                key={hearing.id}
                className="p-4 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getHearingStatusIcon(hearing.status)}
                      <span className="font-medium text-foreground">
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
                    <div className="text-sm text-muted-foreground mb-2">
                      Purpose: {hearing.purpose}
                    </div>
                    {hearing.judge && (
                      <div className="text-sm text-muted-foreground">
                        Judge: {hearing.judge.name}
                      </div>
                    )}
                    {hearing.remarks && (
                      <div className="text-sm text-muted-foreground mt-2">
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
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Orders
          </h3>
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-lg border border-border"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-foreground">
                      {order.orderType.replace("_", " ")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(order.orderDate)}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.orderStatus)}`}
                  >
                    {order.orderStatus}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Judge: {order.judge.name}
                </div>
                <div className="text-sm text-foreground">
                  {order.orderText}
                </div>
                {order.pdfUrl && (
                  <div className="mt-2">
                    <a
                      href={order.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/80"
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
