import { useState } from "react";
import CourtSelector from "./CourtSelector";

/**
 * Example usage of CourtSelector component
 * This file demonstrates different configurations and use cases
 */
export default function CourtSelectorExample() {
  const [selectedCourtId, setSelectedCourtId] = useState<string>("");
  const [selectedCourt, setSelectedCourt] = useState<any>(null);

  const handleCourtChange = (courtId: string, court?: any) => {
    setSelectedCourtId(courtId);
    setSelectedCourt(court);
  };

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold">CourtSelector Examples</h1>

      {/* Basic Usage */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Basic Usage</h2>
        <CourtSelector value={selectedCourtId} onChange={handleCourtChange} />
        <p className="text-sm text-gray-600">
          Selected: {selectedCourtId ? selectedCourt?.name : "None"}
        </p>
      </div>

      {/* With Custom Configuration */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Custom Configuration</h2>
        <CourtSelector
          value={selectedCourtId}
          onChange={handleCourtChange}
          minChars={3}
          debounceMs={500}
          maxResults={15}
          showType={false}
          showLocation={true}
          placeholder="Search for courts..."
          label="Select Court"
          required={true}
        />
      </div>

      {/* With Error State */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">With Error State</h2>
        <CourtSelector
          value={selectedCourtId}
          onChange={handleCourtChange}
          error="Please select a valid court"
        />
      </div>

      {/* Disabled State */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Disabled State</h2>
        <CourtSelector
          value={selectedCourtId}
          onChange={handleCourtChange}
          disabled={true}
          placeholder="Disabled selector"
        />
      </div>

      {/* Minimal Display */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Minimal Display</h2>
        <CourtSelector
          value={selectedCourtId}
          onChange={handleCourtChange}
          showType={false}
          showLocation={false}
          placeholder="Just court names..."
        />
      </div>
    </div>
  );
}
