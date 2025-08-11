import { apiClient } from "@/services/api";
import { Search, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface Court {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  address: string;
}

interface CourtSelectorProps {
  value?: string;
  onChange: (courtId: string, court?: Court) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  // Search configuration
  minChars?: number;
  debounceMs?: number;
  maxResults?: number;
  // Display options
  showType?: boolean;
  showLocation?: boolean;
  // Error handling
  error?: string;
}

/**
 * CourtSelector - A searchable dropdown component for selecting courts
 *
 * Features:
 * - Debounced search with configurable delay
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Minimum character requirement before search
 * - Configurable display options (court type, location)
 * - Error handling and validation
 * - Dark mode support
 * - Loading states
 *
 * @example
 * ```tsx
 * // Basic usage
 * <CourtSelector
 *   value={selectedCourtId}
 *   onChange={(courtId, court) => setSelectedCourtId(courtId)}
 * />
 *
 * // With custom configuration
 * <CourtSelector
 *   value={selectedCourtId}
 *   onChange={(courtId, court) => setSelectedCourtId(courtId)}
 *   minChars={3}
 *   debounceMs={500}
 *   maxResults={15}
 *   showType={false}
 *   showLocation={true}
 *   placeholder="Search courts..."
 *   label="Select Court"
 *   required={true}
 * />
 * ```
 */
export default function CourtSelector({
  value,
  onChange,
  placeholder = "Search for a court...",
  label = "Court",
  required = false,
  disabled = false,
  className = "",
  minChars = 2,
  debounceMs = 300,
  maxResults = 10,
  showType = true,
  showLocation = true,
  error,
}: CourtSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchCourtById = useCallback(async (courtId: string) => {
    try {
      const court = (await apiClient.getCourt(courtId)) as Court;
      setSelectedCourt(court);
      setSearchTerm(court.name);
    } catch (error) {
      console.error("Error fetching court:", error);
    }
  }, []);

  // Fetch selected court details when value changes
  useEffect(() => {
    if (value && !selectedCourt) {
      fetchCourtById(value);
    }
  }, [value, selectedCourt, fetchCourtById]);

  const searchCourts = useCallback(
    async (query: string) => {
      if (query.length < minChars) {
        setCourts([]);
        return;
      }

      setLoading(true);
      try {
        const results = (await apiClient.searchCourts(query)) as Court[];
        setCourts(results.slice(0, maxResults));
      } catch (error) {
        console.error("Error searching courts:", error);
        setCourts([]);
      } finally {
        setLoading(false);
      }
    },
    [minChars, maxResults]
  );

  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        searchCourts(query);
      }, debounceMs);
    },
    [searchCourts, debounceMs]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchTerm(query);
    setHighlightedIndex(-1);

    if (query === "") {
      setCourts([]);
      setSelectedCourt(null);
      onChange("");
    } else {
      debouncedSearch(query);
    }
  };

  const handleCourtSelect = (court: Court) => {
    setSelectedCourt(court);
    setSearchTerm(court.name);
    setCourts([]);
    setIsOpen(false);
    onChange(court.id, court);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setSelectedCourt(null);
    setSearchTerm("");
    setCourts([]);
    onChange("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key !== "Tab") {
      setIsOpen(true);
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < courts.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && courts[highlightedIndex]) {
          handleCourtSelect(courts[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (searchTerm.length >= minChars) {
      setIsOpen(true);
    }
  };

  const handleBlur = () => {
    // Delay closing to allow for clicks on dropdown items
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  const getCourtDisplayName = (court: Court) => {
    let display = court.name;
    if (showType) {
      display += ` (${court.type.replace("_", " ").toLowerCase()})`;
    }
    if (showLocation) {
      display += ` - ${court.city}, ${court.state}`;
    }
    return display;
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
              error ? "border-red-500 focus:ring-red-500" : "border-border"
            } ${disabled ? "bg-muted cursor-not-allowed" : ""}`}
          />

          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <Search className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && (courts.length > 0 || loading) && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Searching...
              </div>
            ) : courts.length > 0 ? (
              <ul>
                {courts.map((court, index) => (
                  <li key={court.id}>
                    <button
                      type="button"
                      onClick={() => handleCourtSelect(court)}
                      className={`w-full px-3 py-2 text-left hover:bg-muted ${
                        index === highlightedIndex
                          ? "bg-blue-50 dark:bg-blue-900"
                          : ""
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {court.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {getCourtDisplayName(court)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchTerm.length >= minChars ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No courts found
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                Type at least {minChars} characters to search
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
