"use client";

import { CaseList } from "@/components/ecourts/CaseList";
import { CaseSearchForm } from "@/components/ecourts/CaseSearchForm";
import { ecourtsService } from "@/services/ecourts";
import {
  APIResponse,
  Case,
  SearchCasesRequest,
  SearchCasesResponse,
} from "@/types/ecourts";
import { AlertCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CaseSearchPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const router = useRouter();

  const handleSearch = async (request: SearchCasesRequest) => {
    setIsLoading(true);
    setError(null);
    setSearchPerformed(true);

    try {
      const response: APIResponse<SearchCasesResponse> =
        await ecourtsService.searchCases(request);

      if (response.success && response.data) {
        setCases(response.data.cases);
        setTotalResults(response.data.total);
        setCurrentPage(response.data.page);
        setHasMore(response.data.hasMore);
      } else {
        setError(response.error?.message || "Failed to search cases");
        setCases([]);
        setTotalResults(0);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Case search error:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setCases([]);
      setTotalResults(0);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaseSelect = (caseNumber: string) => {
    // Handle case selection if needed
    console.log("Selected case:", caseNumber);
  };

  const handleViewDetails = (caseNumber: string) => {
    router.push(`/ecourts/cases/${encodeURIComponent(caseNumber)}`);
  };

  const handleLoadMore = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      // This would need to be implemented to load more results
      // For now, we'll just show a message
      console.log("Load more functionality to be implemented");
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Case Search
          </h1>
          <p className="text-muted-foreground">
            Search for cases in the eCourts database using various criteria
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <CaseSearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchPerformed && (
          <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                <Search className="w-5 h-5" />
                Search Results
              </h2>
              {totalResults > 0 && (
                <div className="text-sm text-muted-foreground">
                  {totalResults} case{totalResults !== 1 ? "s" : ""} found
                </div>
              )}
            </div>

            <CaseList
              cases={cases}
              isLoading={isLoading}
              onCaseSelect={handleCaseSelect}
              onViewDetails={handleViewDetails}
            />

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="rounded-md border border-transparent bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
            <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium text-foreground">
              Start Your Search
            </h3>
            <p className="text-muted-foreground">
              Use the search form above to find cases in the eCourts database.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
