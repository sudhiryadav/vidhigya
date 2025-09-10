"use client";

import { CourtType, SearchCourtsRequest } from "@/types/ecourts";
import { Building2, Filter, Search } from "lucide-react";
import { useState } from "react";

interface CourtSearchFormProps {
  onSearch: (request: SearchCourtsRequest) => void;
  isLoading?: boolean;
}

export function CourtSearchForm({
  onSearch,
  isLoading = false,
}: CourtSearchFormProps) {
  const [formData, setFormData] = useState<SearchCourtsRequest>({
    state: "",
    district: "",
    courtType: undefined,
    name: "",
    limit: 20,
    offset: 0,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleInputChange = (
    field: keyof SearchCourtsRequest,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      state: "",
      district: "",
      courtType: undefined,
      name: "",
      limit: 20,
      offset: 0,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Search Courts
        </h2>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
        >
          <Filter className="w-4 h-4" />
          {showAdvanced ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Search Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Court Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter court name"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              State
            </label>
            <input
              type="text"
              id="state"
              value={formData.state || ""}
              onChange={(e) => handleInputChange("state", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter state name"
            />
          </div>
        </div>

        {/* Advanced Search Fields */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="district"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  District
                </label>
                <input
                  type="text"
                  id="district"
                  value={formData.district || ""}
                  onChange={(e) =>
                    handleInputChange("district", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter district name"
                />
              </div>

              <div>
                <label
                  htmlFor="courtType"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Court Type
                </label>
                <select
                  id="courtType"
                  value={formData.courtType || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "courtType",
                      (e.target.value as CourtType) || undefined
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select court type</option>
                  <option value={CourtType.SUPREME_COURT}>Supreme Court</option>
                  <option value={CourtType.HIGH_COURT}>High Court</option>
                  <option value={CourtType.DISTRICT_COURT}>
                    District Court
                  </option>
                  <option value={CourtType.SESSIONS_COURT}>
                    Sessions Court
                  </option>
                  <option value={CourtType.CIVIL_COURT}>Civil Court</option>
                  <option value={CourtType.FAMILY_COURT}>Family Court</option>
                  <option value={CourtType.CONSUMER_COURT}>
                    Consumer Court
                  </option>
                  <option value={CourtType.LABOUR_COURT}>Labour Court</option>
                  <option value={CourtType.REVENUE_COURT}>Revenue Court</option>
                  <option value={CourtType.OTHER}>Other</option>
                </select>
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
                Search Courts
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
