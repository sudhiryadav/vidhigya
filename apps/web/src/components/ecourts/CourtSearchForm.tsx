"use client";

import { CourtType, SearchCourtsRequest } from "@/types/ecourts";
import { Building2, Filter, Search } from "lucide-react";
import { useState } from "react";

interface CourtSearchFormProps {
  onSearch: (request: SearchCourtsRequest) => void;
  isLoading?: boolean;
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
    <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Search Courts
        </h2>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
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
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Court Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className={inputClass}
              placeholder="Enter court name"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              State
            </label>
            <input
              type="text"
              id="state"
              value={formData.state || ""}
              onChange={(e) => handleInputChange("state", e.target.value)}
              className={inputClass}
              placeholder="Enter state name"
            />
          </div>
        </div>

        {/* Advanced Search Fields */}
        {showAdvanced && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="district"
                  className="mb-1 block text-sm font-medium text-foreground"
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
                  className={inputClass}
                  placeholder="Enter district name"
                />
              </div>

              <div>
                <label
                  htmlFor="courtType"
                  className="mb-1 block text-sm font-medium text-foreground"
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
                  className={inputClass}
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
                Search Courts
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
