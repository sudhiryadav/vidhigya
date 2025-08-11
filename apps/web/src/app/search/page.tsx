"use client";

import DocumentQA from "@/components/DocumentQA";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Loader2,
  Quote,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SearchResult {
  score: number;
  content: string;
  filename: string;
  page_number?: number;
  chunk_index: number;
  document_id: string;
  file_type: string;
  document_title?: string;
  document_category?: string;
  uploaded_by?: string;
  uploaded_at?: string;
  start_char?: number;
  end_char?: number;
}

interface Document {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  category: string;
  status: string;
  createdAt: string;
  uploadedBy: {
    name: string;
    email: string;
  };
  case?: {
    title: string;
    caseNumber: string;
  };
}

interface DraftSection {
  id: string;
  title: string;
  content: string;
  citations: Citation[];
  createdAt: string;
}

interface Citation {
  id: string;
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  content: string;
  quote: string;
  createdAt: string;
}

export default function SearchPage() {
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<"search" | "qa">("qa");

  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(
    null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Search history for up arrow navigation
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Document viewer states
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentContent, setDocumentContent] = useState("");

  // Draft states
  const [drafts, setDrafts] = useState<DraftSection[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DraftSection | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const canAccessSearch = isLawyer || isClient;
  const canManageDrafts = isLawyer; // Only lawyers can manage drafts

  // Save search query to history
  const saveSearchHistory = (query: string) => {
    if (query.trim() && !searchHistory.includes(query.trim())) {
      setSearchHistory((prev) => [query.trim(), ...prev.slice(0, 9)]);
    }
  };

  // Handle search submission
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    saveSearchHistory(searchTerm);

    try {
      const results = await apiClient.searchDocuments(searchTerm, 50);
      setSearchResults(results as SearchResult[]);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle result click to view document
  const handleResultClick = async (result: SearchResult) => {
    try {
      const document = await apiClient.getDocument(result.document_id);
      setSelectedDocument(document as Document);
      setShowDocumentViewer(true);

      // Use content from search result
      setDocumentContent(result.content);
    } catch (error) {
      console.error("Failed to fetch document:", error);
    }
  };

  // Add search result to current draft
  const handleAddToDraft = (result: SearchResult) => {
    if (!currentDraft) return;

    const citation: Citation = {
      id: Date.now().toString(),
      documentId: result.document_id,
      documentTitle: result.document_title || result.filename,
      pageNumber: result.page_number,
      content: result.content,
      quote: result.content.substring(0, 100) + "...",
      createdAt: new Date().toISOString(),
    };

    setCurrentDraft((prev) => ({
      ...prev!,
      content: prev!.content + "\n\n" + result.content,
      citations: [...prev!.citations, citation],
    }));
  };

  // Create new draft
  const createNewDraft = () => {
    setDraftTitle("");
    setCurrentDraft({
      id: Date.now().toString(),
      title: "",
      content: "",
      citations: [],
      createdAt: new Date().toISOString(),
    });
    setShowDraftModal(true);
  };

  // Save draft
  const saveDraft = () => {
    if (!currentDraft || !draftTitle.trim()) return;

    const draftToSave = {
      ...currentDraft,
      title: draftTitle,
    };

    setDrafts((prev) => {
      const existingIndex = prev.findIndex((d) => d.id === draftToSave.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = draftToSave;
        return updated;
      } else {
        return [...prev, draftToSave];
      }
    });

    setShowDraftModal(false);
    setCurrentDraft(null);
    setDraftTitle("");
  };

  // Open existing draft
  const openDraft = (draft: DraftSection) => {
    setCurrentDraft(draft);
    setDraftTitle(draft.title);
    setShowDraftModal(true);
  };

  // Insert citation into draft
  const insertCitation = (citation: Citation) => {
    if (!currentDraft) return;

    const citationText = `[${citation.documentTitle}${citation.pageNumber ? `, p.${citation.pageNumber}` : ""}]`;
    setCurrentDraft((prev) => ({
      ...prev!,
      content: prev!.content + citationText,
    }));
  };

  // Download draft as text file
  const downloadDraft = (draft: DraftSection) => {
    const content = `Title: ${draft.title}\n\nContent:\n${draft.content}\n\nCitations:\n${draft.citations
      .map(
        (c) =>
          `- ${c.documentTitle}${c.pageNumber ? `, p.${c.pageNumber}` : ""}`
      )
      .join("\n")}`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter search results
  const filterResult = (result: SearchResult) => {
    if (
      categoryFilter !== "all" &&
      result.document_category !== categoryFilter
    ) {
      return false;
    }
    if (dateFilter !== "all") {
      const resultDate = new Date(result.uploaded_at || "");
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - resultDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (dateFilter) {
        case "today":
          return diffDays <= 1;
        case "week":
          return diffDays <= 7;
        case "month":
          return diffDays <= 30;
        default:
          return true;
      }
    }
    return true;
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Handle keyboard navigation for search history
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && e.ctrlKey) {
        e.preventDefault();
        setHistoryIndex((prev) => Math.min(prev + 1, searchHistory.length - 1));
      } else if (e.key === "ArrowDown" && e.ctrlKey) {
        e.preventDefault();
        setHistoryIndex((prev) => Math.max(prev - 1, -1));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchHistory.length]);

  // Update search term when navigating history
  useEffect(() => {
    if (historyIndex >= 0 && historyIndex < searchHistory.length) {
      setSearchTerm(searchHistory[historyIndex]);
    } else if (historyIndex === -1) {
      setSearchTerm("");
    }
  }, [historyIndex, searchHistory]);

  // If user doesn't have access to search, show access denied
  if (!canAccessSearch) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Access Denied
            </h1>
            <p className="text-muted-foreground">
              You don't have permission to access the search page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Document Search & AI Assistant
          </h1>
          <p className="mt-2 text-muted-foreground">
            Search through your documents and get AI-powered assistance
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("qa")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "qa"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                AI Assistant
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "search"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                Document Search
              </button>
            </nav>
          </div>
        </div>

        {/* AI Assistant Tab */}
        {activeTab === "qa" && (
          <div className="bg-card rounded-lg shadow-sm border border-border">
            <DocumentQA
              onDraftClick={openDraft}
              onNewDraftClick={createNewDraft}
            />
          </div>
        )}

        {/* Document Search Tab */}
        {activeTab === "search" && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search your documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    />
                    {searchHistory.length > 0 && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showFilters ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchTerm.trim()}
                  className="btn-primary flex items-center px-6 py-2"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Search
                </button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Category
                      </label>
                      <CustomSelect
                        options={[
                          { value: "all", label: "All Categories" },
                          {
                            value: "LEGAL_DOCUMENTS",
                            label: "Legal Documents",
                          },
                          { value: "CONTRACTS", label: "Contracts" },
                          { value: "COURT_FILINGS", label: "Court Filings" },
                          { value: "CORRESPONDENCE", label: "Correspondence" },
                        ]}
                        value={{
                          value: categoryFilter,
                          label:
                            categoryFilter === "all"
                              ? "All Categories"
                              : categoryFilter,
                        }}
                        onChange={(option) =>
                          setCategoryFilter(option?.value || "all")
                        }
                        placeholder="Select category"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Date
                      </label>
                      <CustomSelect
                        options={[
                          { value: "all", label: "All Time" },
                          { value: "today", label: "Today" },
                          { value: "week", label: "This Week" },
                          { value: "month", label: "This Month" },
                        ]}
                        value={{
                          value: dateFilter,
                          label: dateFilter === "all" ? "All Time" : dateFilter,
                        }}
                        onChange={(option) =>
                          setDateFilter(option?.value || "all")
                        }
                        placeholder="Select date"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-card rounded-lg shadow-sm border border-border">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    Search Results ({searchResults.filter(filterResult).length})
                  </h3>
                  <div className="space-y-4">
                    {searchResults.filter(filterResult).map((result, index) => (
                      <div
                        key={`${result.document_id}-${result.chunk_index}`}
                        className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {result.document_title || result.filename}
                              </span>
                              {result.page_number && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  (Page {result.page_number})
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {result.content}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>Score: {result.score.toFixed(2)}</span>
                              <span>•</span>
                              <span>{result.file_type}</span>
                              {result.uploaded_by && (
                                <>
                                  <span>•</span>
                                  <span>By: {result.uploaded_by}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleResultClick(result)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View Document"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {canManageDrafts && (
                              <button
                                onClick={() => handleAddToDraft(result)}
                                className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                title="Add to Draft"
                              >
                                <Quote className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => copyToClipboard(result.content)}
                              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                              title="Copy Content"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* No Results */}
            {searchResults.length === 0 && searchTerm && !searching && (
              <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No results found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Draft Modal */}
      {showDraftModal && currentDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {currentDraft.id ? "Edit Draft" : "New Draft"}
              </h3>
              <button
                onClick={() => setShowDraftModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  placeholder="Enter draft title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content
                </label>
                <textarea
                  value={currentDraft.content}
                  onChange={(e) =>
                    setCurrentDraft((prev) => ({
                      ...prev!,
                      content: e.target.value,
                    }))
                  }
                  rows={10}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  placeholder="Write your draft content here..."
                />
              </div>

              {currentDraft.citations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Citations ({currentDraft.citations.length})
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {currentDraft.citations.map((citation) => (
                      <div
                        key={citation.id}
                        className="flex items-center justify-between p-2 bg-muted rounded"
                      >
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {citation.documentTitle}
                          {citation.pageNumber && ` (p.${citation.pageNumber})`}
                        </span>
                        <button
                          onClick={() => insertCitation(citation)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          Insert
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDraftModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button onClick={saveDraft} className="btn-primary">
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedDocument.title}
              </h3>
              <button
                onClick={() => setShowDocumentViewer(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Type:</span>{" "}
                  {selectedDocument.fileType}
                </div>
                <div>
                  <span className="font-medium">Category:</span>{" "}
                  {selectedDocument.category}
                </div>
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  {selectedDocument.status}
                </div>
                <div>
                  <span className="font-medium">Uploaded:</span>{" "}
                  {new Date(selectedDocument.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Content Preview
                </h4>
                <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {documentContent || "Loading content..."}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drafts Sidebar */}
      {canManageDrafts && drafts.length > 0 && (
        <div className="fixed right-4 top-20 w-64 bg-card rounded-lg shadow-lg border border-border p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Drafts
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                onClick={() => openDraft(draft)}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {draft.title || "Untitled Draft"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(draft.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
