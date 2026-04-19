"use client";

import { CaseStatus, SearchCasesRequest } from "@/types/ecourts";
import { Search } from "lucide-react";
import { useState } from "react";

interface CaseSearchFormProps {
  onSearch: (request: SearchCasesRequest) => void;
  isLoading?: boolean;
}

export function CaseSearchForm({
  onSearch,
  isLoading = false,
}: CaseSearchFormProps) {
  const [formData, setFormData] = useState<SearchCasesRequest>({
    caseNumber: "",
    partyName: "",
    advocateName: "",
    courtId: "",
    caseType: "",
    filingDateFrom: "",
    filingDateTo: "",
    status: undefined,
    limit: 20,
    offset: 0,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleInputChange = (
    field: keyof SearchCasesRequest,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      caseNumber: "",
      partyName: "",
      advocateName: "",
      courtId: "",
      caseType: "",
      filingDateFrom: "",
      filingDateTo: "",
      status: undefined,
      limit: 20,
      offset: 0,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Cases
        </h2>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-primary hover:text-primary/80"
        >
          {showAdvanced ? "Hide Advanced" : "Show Advanced"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Search Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="caseNumber"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Case Number
            </label>
            <input
              type="text"
              id="caseNumber"
              value={formData.caseNumber || ""}
              onChange={(e) => handleInputChange("caseNumber", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Enter case number"
            />
          </div>

          <div>
            <label
              htmlFor="partyName"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Party Name
            </label>
            <input
              type="text"
              id="partyName"
              value={formData.partyName || ""}
              onChange={(e) => handleInputChange("partyName", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Enter party name"
            />
          </div>
        </div>

        {/* Advanced Search Fields */}
        {showAdvanced && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="advocateName"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Advocate Name
                </label>
                <input
                  type="text"
                  id="advocateName"
                  value={formData.advocateName || ""}
                  onChange={(e) =>
                    handleInputChange("advocateName", e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Enter advocate name"
                />
              </div>

              <div>
                <label
                  htmlFor="courtId"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Court ID
                </label>
                <input
                  type="text"
                  id="courtId"
                  value={formData.courtId || ""}
                  onChange={(e) => handleInputChange("courtId", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Enter court ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="caseType"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Case Type
                </label>
                <input
                  type="text"
                  id="caseType"
                  value={formData.caseType || ""}
                  onChange={(e) =>
                    handleInputChange("caseType", e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Enter case type"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Case Status
                </label>
                <select
                  id="status"
                  value={formData.status || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "status",
                      (e.target.value as CaseStatus) || undefined
                    )
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select status</option>
                  <option value={CaseStatus.PENDING}>Pending</option>
                  <option value={CaseStatus.DISPOSED}>Disposed</option>
                  <option value={CaseStatus.TRANSFERRED}>Transferred</option>
                  <option value={CaseStatus.WITHDRAWN}>Withdrawn</option>
                  <option value={CaseStatus.ABATED}>Abated</option>
                  <option value={CaseStatus.OTHER}>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="filingDateFrom"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Filing Date From
                </label>
                <input
                  type="date"
                  id="filingDateFrom"
                  value={formData.filingDateFrom || ""}
                  onChange={(e) =>
                    handleInputChange("filingDateFrom", e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="filingDateTo"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Filing Date To
                </label>
                <input
                  type="date"
                  id="filingDateTo"
                  value={formData.filingDateTo || ""}
                  onChange={(e) =>
                    handleInputChange("filingDateTo", e.target.value)
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-transparent bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search Cases
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
