"use client";

import { CourtList } from "@/components/ecourts/CourtList";
import { CourtSearchForm } from "@/components/ecourts/CourtSearchForm";
import { ecourtsService } from "@/services/ecourts";
import {
  APIResponse,
  Court,
  SearchCourtsRequest,
  SearchCourtsResponse,
} from "@/types/ecourts";
import { AlertCircle, Building2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CourtSearchPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const router = useRouter();

  const handleSearch = async (request: SearchCourtsRequest) => {
    setIsLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const response: APIResponse<SearchCourtsResponse> =
        await ecourtsService.searchCourts(request);

      if (response.success && response.data) {
        setCourts(response.data.courts);
        setTotalResults(response.data.total);
        setCurrentPage(response.data.page);
        setHasMore(response.data.hasMore);
      } else {
        setError(response.error?.message || "Failed to search courts");
        setCourts([]);
        setTotalResults(0);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Court search error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setCourts([]);
      setTotalResults(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourtSelect = (courtId: string) => {
    // Handle court selection if needed
    console.log("Selected court:", courtId);
  };

  const handleViewDetails = (courtId: string) => {
    router.push(`/ecourts/courts/${encodeURIComponent(courtId)}`);
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      // This would need to be implemented to load more results
      // For now, we'll just show a message
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Court Search
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Search for courts in the eCourts database by location, type, or name
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <CourtSearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <div className="border border-red-200 text-red-800 bg-red-50 dark:border-red-800 dark:text-red-200 dark:bg-red-900/20 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchPerformed && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Results
              </h2>
              {totalResults > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {totalResults} court{totalResults !== 1 ? "s" : ""} found
                </div>
              )}
            </div>

            <CourtList
              courts={courts}
              isLoading={isLoading}
              onCourtSelect={handleCourtSelect}
              onViewDetails={handleViewDetails}
            />

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Search Performed State */}
        {!searchPerformed && (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Start Your Search
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Use the search form above to find courts in the eCourts database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
