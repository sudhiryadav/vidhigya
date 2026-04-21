"use client";

import { AccessDenied } from "@/components/AccessDenied";
import DocumentQA from "@/components/DocumentQA";
import DocumentViewer from "@/components/DocumentViewer";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  type DocumentSearchHit,
  extractDocumentSearchHits,
  formatSearchHitScore,
} from "@/utils/documentSearchHits";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  Loader2,
  Quote,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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

const TAB_STORAGE_KEY = "vidhigya_search_page_tab_v2";

export default function SearchPage() {
  const { user } = useAuth();

  // Tab state (default: AI Assistant; optional remembered choice)
  const [activeTab, setActiveTab] = useState<"search" | "qa">("qa");

  // Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DocumentSearchHit[]>([]);
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
  const [viewerInitialPage, setViewerInitialPage] = useState<
    number | undefined
  >();

  // Draft states
  const [drafts, setDrafts] = useState<DraftSection[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DraftSection | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDrawerOpen, setDraftDrawerOpen] = useState(false);

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const canAccessSearch = isLawyer || isClient;
  const canManageDrafts = isLawyer; // Only lawyers can manage drafts

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY);
      if (saved === "qa" || saved === "search") {
        setActiveTab(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

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
      const raw = await apiClient.searchDocuments(searchTerm, 50);
      setSearchResults(extractDocumentSearchHits(raw));
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle result click to view document
  const handleResultClick = async (result: DocumentSearchHit) => {
    try {
      const document = (await apiClient.getDocument(
        result.document_id,
      )) as Document;
      setSelectedDocument(document);
      setViewerInitialPage(
        result.page_number != null && result.page_number > 0
          ? result.page_number
          : undefined,
      );
      setShowDocumentViewer(true);
    } catch (error) {
      console.error("Failed to fetch document:", error);
    }
  };

  // Add search result to current draft (creates an in-memory draft if none is active)
  const handleAddToDraft = (result: DocumentSearchHit) => {
    const excerpt = result.content ?? "";
    const citationId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setCurrentDraft((prev) => {
      const base: DraftSection =
        prev ??
        ({
          id: `${Date.now()}`,
          title: "",
          content: "",
          citations: [],
          createdAt: new Date().toISOString(),
        } satisfies DraftSection);

      const citation: Citation = {
        id: citationId,
        documentId: result.document_id,
        documentTitle:
          result.document_title || result.filename || "Document",
        pageNumber: result.page_number,
        content: excerpt,
        quote: `${excerpt.slice(0, 100)}${excerpt.length > 100 ? "…" : ""}`,
        createdAt: new Date().toISOString(),
      };

      const nextContent = base.content
        ? `${base.content}\n\n${excerpt}`
        : excerpt;

      return {
        ...base,
        content: nextContent,
        citations: [...base.citations, citation],
      };
    });

    toast.success("Passage added to draft");
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
    setDraftDrawerOpen(true);
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
    // Keep the saved draft active so "add to draft" from search keeps appending
    setCurrentDraft(draftToSave);
    setDraftTitle(draftToSave.title);
  };

  // Open existing draft
  const openDraft = (draft: DraftSection) => {
    setCurrentDraft(draft);
    setDraftTitle(draft.title);
    setDraftDrawerOpen(true);
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
  const filterResult = (result: DocumentSearchHit) => {
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
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Text copied to clipboard");
    } catch {
      toast.error("Could not copy text");
    }
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

  const currentDraftSaved =
    currentDraft != null &&
    drafts.some((d) => d.id === currentDraft.id);

  const showDraftSidebar =
    canManageDrafts &&
    (drafts.length > 0 ||
      (currentDraft != null &&
        (currentDraft.citations.length > 0 ||
          currentDraft.content.trim().length > 0)));

  const showUnsavedCurrent =
    currentDraft != null &&
    !currentDraftSaved &&
    (currentDraft.citations.length > 0 ||
      currentDraft.content.trim().length > 0);

  const openCurrentDraft = () => {
    if (!currentDraft) return;
    setDraftTitle(currentDraft.title ? currentDraft.title : draftTitle);
    setDraftDrawerOpen(true);
    setShowDraftModal(true);
  };

  const toggleDraftDrawer = () => {
    setDraftDrawerOpen((open) => !open);
  };

  const startNewDraft = () => {
    if (
      currentDraft &&
      !drafts.some((d) => d.id === currentDraft.id) &&
      (currentDraft.citations.length > 0 || currentDraft.content.trim())
    ) {
      const ok = window.confirm(
        "Discard the current unsaved draft and start a new one?",
      );
      if (!ok) return;
    }
    createNewDraft();
  };

  // If user doesn't have access to search, show access denied
  if (!canAccessSearch) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to access the search page."
      />
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden">
      <div className="mx-auto flex h-full min-h-0 max-w-7xl flex-col px-4 py-8 pt-16 sm:px-6 md:pt-8 lg:px-8">
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
        <div className="mb-6 flex-shrink-0">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8">
              <button
                type="button"
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
                type="button"
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

        {/* Document Search Tab */}
        {activeTab === "search" && (
          <div className="flex flex-1 flex-col gap-6 min-h-0 overflow-hidden">
            {/* Active draft hint (esp. before first save — sidebar lists unsaved draft too) */}
            {canManageDrafts && showUnsavedCurrent && (
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-sm text-foreground">
                  You have an unsaved draft with{" "}
                  {currentDraft!.citations.length} passage
                  {currentDraft!.citations.length === 1 ? "" : "s"} — open it
                  to add a title and save.
                </p>
                <button
                  type="button"
                  onClick={openCurrentDraft}
                  className="btn-primary shrink-0 px-4 py-2 text-sm"
                >
                  Open draft
                </button>
              </div>
            )}

            {/* Search Bar */}
            <div className="shrink-0 bg-card rounded-lg shadow-sm border border-border p-6">
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

            {/* Search Results — flex-1 so the list fills space down to the bottom of the viewport */}
            {searchResults.length > 0 && (
              <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card shadow-sm">
                <div className="min-h-0 flex-1 overflow-y-auto p-6">
                  <h3 className="mb-4 text-lg font-medium text-foreground">
                    Search Results ({searchResults.filter(filterResult).length})
                  </h3>
                  <div className="space-y-4">
                    {searchResults.filter(filterResult).map((result, index) => (
                      <div
                        key={`${result.document_id}-${index}`}
                        className="p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="font-medium text-foreground">
                                {result.document_title ||
                                  result.filename ||
                                  "Document"}
                              </span>
                              {result.page_number != null &&
                                result.page_number > 0 && (
                                  <span className="text-sm text-muted-foreground">
                                    (Page {result.page_number})
                                  </span>
                                )}
                            </div>
                            {(result.page_number != null &&
                              result.page_number > 0) ||
                            (result.start_char != null &&
                              result.end_char != null) ? (
                              <p className="text-xs text-muted-foreground mb-2">
                                <span className="font-medium text-foreground">
                                  Source:{" "}
                                </span>
                                {result.page_number != null &&
                                result.page_number > 0 ? (
                                  <>Page {result.page_number}</>
                                ) : (
                                  <>Matched excerpt</>
                                )}
                                {result.start_char != null &&
                                result.end_char != null ? (
                                  <>
                                    {" "}
                                    · characters {result.start_char}–
                                    {result.end_char}
                                  </>
                                ) : null}
                              </p>
                            ) : null}
                            <p className="text-sm text-muted-foreground mb-2 break-words">
                              {result.content ?? "(No excerpt)"}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                              <span>
                                Score: {formatSearchHitScore(result.score)}
                              </span>
                              {result.file_type ? (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span>{result.file_type}</span>
                                </>
                              ) : null}
                              {result.uploaded_by ? (
                                <>
                                  <span aria-hidden="true">•</span>
                                  <span>By: {result.uploaded_by}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              type="button"
                              onClick={() => handleResultClick(result)}
                              className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Open document in viewer"
                              aria-label="Open document in viewer"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {canManageDrafts && (
                              <button
                                type="button"
                                onClick={() => handleAddToDraft(result)}
                                className="cursor-pointer text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                title="Add this passage to your draft"
                                aria-label="Add this passage to your draft"
                              >
                                <Quote className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(result.content ?? "")
                              }
                              className="cursor-pointer text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                              title="Copy passage to clipboard"
                              aria-label="Copy passage to clipboard"
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
              <div className="shrink-0 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No results found
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === "qa" && (
          <div className="flex-1 bg-card rounded-lg shadow-sm border border-border overflow-hidden min-h-0">
            <DocumentQA />
          </div>
        )}
      </div>

      {/* Draft Modal */}
      {showDraftModal && currentDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">
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

      {showDocumentViewer && selectedDocument ? (
        <DocumentViewer
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          fileType={selectedDocument.fileType}
          initialPage={viewerInitialPage}
          onClose={() => {
            setShowDocumentViewer(false);
            setSelectedDocument(null);
            setViewerInitialPage(undefined);
          }}
        />
      ) : null}

      {/* Slide-out drafts drawer: top-aligned; panel width animates (toggle always clickable) */}
      {canManageDrafts && activeTab === "search" && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end pt-14 md:pt-6">
          <div className="pointer-events-auto flex max-h-[min(32rem,calc(100vh-6rem))] flex-row items-start gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0">
            <div
              id="draft-drawer-panel"
              className={`min-h-0 overflow-hidden transition-[max-width] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] motion-reduce:transition-none motion-reduce:duration-0 ${draftDrawerOpen ? "max-w-[min(18rem,calc(100vw-5rem))]" : "max-w-0"}`}
            >
              <div className="flex h-full min-h-0 w-[min(18rem,calc(100vw-5rem))] flex-col rounded-l-xl border border-border bg-card shadow-xl dark:border-border">
                <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                  <h4 className="shrink-0 text-base font-semibold tracking-tight text-foreground">
                    Drafts
                  </h4>
                  {showDraftSidebar ? (
                    <>
                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
                        {showUnsavedCurrent && (
                          <button
                            type="button"
                            onClick={openCurrentDraft}
                            className="w-full rounded-md border border-primary/40 bg-primary/10 p-2 text-left transition-colors hover:bg-primary/15"
                          >
                            <div className="text-xs font-medium uppercase tracking-wide text-primary">
                              Not saved yet
                            </div>
                            <div className="truncate text-sm font-medium text-foreground">
                              {draftTitle.trim() ||
                                currentDraft!.title.trim() ||
                                "Untitled draft"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {currentDraft!.citations.length} passage
                              {currentDraft!.citations.length === 1 ? "" : "s"}{" "}
                              ·{" "}
                              {new Date(
                                currentDraft!.createdAt,
                              ).toLocaleDateString()}
                            </div>
                          </button>
                        )}
                        {drafts.map((draft) => (
                          <button
                            key={draft.id}
                            type="button"
                            onClick={() => openDraft(draft)}
                            className="w-full rounded-md bg-muted p-2 text-left transition-colors hover:bg-muted/80"
                          >
                            <div className="truncate text-sm font-medium text-foreground">
                              {draft.title || "Untitled Draft"}
                              {currentDraft?.id === draft.id ? (
                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                  (active)
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(draft.createdAt).toLocaleDateString()}
                            </div>
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={startNewDraft}
                        className="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        New draft
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm leading-snug text-muted-foreground">
                        No drafts yet. Use the quote icon on a result to add
                        passages, or start a new draft.
                      </p>
                      <button
                        type="button"
                        onClick={startNewDraft}
                        className="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        New draft
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleDraftDrawer}
              aria-expanded={draftDrawerOpen}
              aria-controls="draft-drawer-panel"
              aria-label={
                draftDrawerOpen
                  ? "Drafts — close panel"
                  : "Drafts — open passage workspace"
              }
              title={
                draftDrawerOpen
                  ? "Drafts — Click to hide the drafts list"
                  : "Drafts — Click to open your drafts and passages"
              }
              className={`flex h-10 min-w-[2.75rem] shrink-0 flex-col items-center justify-center bg-teal-500/22 px-1 text-teal-900 shadow-md shadow-teal-900/15 transition-[clip-path,background-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)] hover:bg-teal-500/32 hover:shadow-lg motion-reduce:transition-none dark:bg-teal-600/26 dark:text-teal-50 dark:shadow-teal-950/50 dark:hover:bg-teal-600/38 ${
                draftDrawerOpen
                  ? "[clip-path:polygon(0_0,0_100%,68%_100%,100%_50%,68%_0)]"
                  : "[clip-path:polygon(100%_0,100%_100%,32%_100%,0_50%,32%_0)]"
              }`}
            >
              {draftDrawerOpen ? (
                <ChevronRight
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                  strokeWidth={2.25}
                />
              ) : (
                <ChevronLeft
                  className="h-4 w-4 shrink-0"
                  aria-hidden
                  strokeWidth={2.25}
                />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
