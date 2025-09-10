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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search Cases
        </h2>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Case Number
            </label>
            <input
              type="text"
              id="caseNumber"
              value={formData.caseNumber || ""}
              onChange={(e) => handleInputChange("caseNumber", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter case number"
            />
          </div>

          <div>
            <label
              htmlFor="partyName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Party Name
            </label>
            <input
              type="text"
              id="partyName"
              value={formData.partyName || ""}
              onChange={(e) => handleInputChange("partyName", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter party name"
            />
          </div>
        </div>

        {/* Advanced Search Fields */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="advocateName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter advocate name"
                />
              </div>

              <div>
                <label
                  htmlFor="courtId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Court ID
                </label>
                <input
                  type="text"
                  id="courtId"
                  value={formData.courtId || ""}
                  onChange={(e) => handleInputChange("courtId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter court ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="caseType"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter case type"
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="filingDateTo"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Reset
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
