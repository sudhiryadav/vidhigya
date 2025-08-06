"use client";

import DocumentQA from "@/components/DocumentQA";
import DocumentSearchSidebar from "@/components/DocumentSearchSidebar";
import CustomSelect from "@/components/ui/select";
import { apiClient } from "@/services/api";
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Filter,
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

export default function LawyerSearchPage() {
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

  // Document viewer states
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentContent, setDocumentContent] = useState("");

  // Draft states
  const [drafts, setDrafts] = useState<DraftSection[]>([]);
  const [currentDraft, setCurrentDraft] = useState<DraftSection | null>(null);
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  // Citation states
  const [citations, setCitations] = useState<Citation[]>([]);
  const [showCitationManager, setShowCitationManager] = useState(false);

  // Load drafts from localStorage on mount
  useEffect(() => {
    const savedDrafts = localStorage.getItem("lawyer_drafts");
    if (savedDrafts) {
      setDrafts(JSON.parse(savedDrafts));
    }
  }, []);

  // Save drafts to localStorage whenever drafts change
  useEffect(() => {
    localStorage.setItem("lawyer_drafts", JSON.stringify(drafts));
  }, [drafts]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setSearching(true);
    try {
      const results = await apiClient.searchDocuments(searchTerm, 10);
      setSearchResults(results.results || []);
    } catch (error) {
      console.error("Error searching documents:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    setSelectedResult(result);
    try {
      // Fetch full document details
      const document = (await apiClient.getDocument(
        result.document_id
      )) as Document;
      setSelectedDocument(document);
      setShowDocumentViewer(true);
    } catch (error) {
      console.error("Error fetching document:", error);
    }
  };

  const handleAddToDraft = (result: SearchResult) => {
    const citation: Citation = {
      id: Date.now().toString(),
      documentId: result.document_id,
      documentTitle: result.document_title || result.filename,
      pageNumber: result.page_number,
      content: result.content,
      quote: result.content.substring(0, 100) + "...",
      createdAt: new Date().toISOString(),
    };

    setCitations([...citations, citation]);
  };

  const createNewDraft = () => {
    const newDraft: DraftSection = {
      id: Date.now().toString(),
      title: "New Legal Draft",
      content: "",
      citations: [...citations],
      createdAt: new Date().toISOString(),
    };

    setCurrentDraft(newDraft);
    setDraftTitle(newDraft.title);
    setDraftContent(newDraft.content);
    setShowDraftEditor(true);
    setCitations([]); // Clear citations for new draft
  };

  const saveDraft = () => {
    if (!currentDraft) return;

    const updatedDraft: DraftSection = {
      ...currentDraft,
      title: draftTitle,
      content: draftContent,
      citations: citations,
    };

    const existingIndex = drafts.findIndex((d) => d.id === currentDraft.id);
    if (existingIndex >= 0) {
      const updatedDrafts = [...drafts];
      updatedDrafts[existingIndex] = updatedDraft;
      setDrafts(updatedDrafts);
    } else {
      setDrafts([...drafts, updatedDraft]);
    }

    setShowDraftEditor(false);
    setCurrentDraft(null);
  };

  const openDraft = (draft: DraftSection) => {
    setCurrentDraft(draft);
    setDraftTitle(draft.title);
    setDraftContent(draft.content);
    setCitations(draft.citations);
    setShowDraftEditor(true);
  };

  const insertCitation = (citation: Citation) => {
    const citationText = `[${citation.documentTitle}${citation.pageNumber ? `, p.${citation.pageNumber}` : ""}]`;
    const cursorPos =
      (document.getElementById("draft-content") as HTMLTextAreaElement)
        ?.selectionStart || 0;
    const newContent =
      draftContent.slice(0, cursorPos) +
      citationText +
      draftContent.slice(cursorPos);
    setDraftContent(newContent);
  };

  const downloadDraft = (draft: DraftSection) => {
    const content = `# ${draft.title}\n\n${draft.content}\n\n## Citations\n\n${draft.citations
      .map(
        (c) =>
          `- ${c.documentTitle}${c.pageNumber ? ` (p.${c.pageNumber})` : ""}: "${c.quote}"`
      )
      .join("\n")}`;

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterResult = (result: SearchResult) => {
    if (categoryFilter !== "all" && result.document_category !== categoryFilter)
      return false;
    if (dateFilter !== "all") {
      const uploadDate = new Date(result.uploaded_at || "");
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (dateFilter === "week" && diffDays > 7) return false;
      if (dateFilter === "month" && diffDays > 30) return false;
      if (dateFilter === "year" && diffDays > 365) return false;
    }
    return true;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Content copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy content: ", err);
      });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Document AI Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Ask questions about your documents and get AI-powered answers, or
            search through your legal documents
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("qa")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "qa"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <span>AI Assistant</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "search"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>Document Search</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === "qa" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AI Q&A Panel */}
            <div className="lg:col-span-2">
              <DocumentQA
                className="h-[600px]"
                drafts={drafts}
                onDraftClick={openDraft}
                onNewDraftClick={createNewDraft}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Search Panel */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search legal documents, cases, contracts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching || !searchTerm.trim()}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {searching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Search"
                      )}
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                    {showFilters ? (
                      <ChevronUp className="w-4 h-4 ml-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-1" />
                    )}
                  </button>

                  {showFilters && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Category
                        </label>
                        <CustomSelect
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
                          options={[
                            { value: "all", label: "All Categories" },
                            { value: "CONTRACT", label: "Contracts" },
                            { value: "PETITION", label: "Petitions" },
                            { value: "AFFIDAVIT", label: "Affidavits" },
                            { value: "NOTICE", label: "Notices" },
                            { value: "ORDER", label: "Orders" },
                          ]}
                          placeholder="Select category..."
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Date Range
                        </label>
                        <CustomSelect
                          value={{
                            value: dateFilter,
                            label:
                              dateFilter === "all"
                                ? "All Time"
                                : dateFilter === "week"
                                  ? "Last Week"
                                  : dateFilter === "month"
                                    ? "Last Month"
                                    : "Last Year",
                          }}
                          onChange={(option) =>
                            setDateFilter(option?.value || "all")
                          }
                          options={[
                            { value: "all", label: "All Time" },
                            { value: "week", label: "Last Week" },
                            { value: "month", label: "Last Month" },
                            { value: "year", label: "Last Year" },
                          ]}
                          placeholder="Select date range..."
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                <div className="space-y-4">
                  {searchResults.length === 0 && !searching ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>Search for documents to get started</p>
                    </div>
                  ) : (
                    searchResults.filter(filterResult).map((result, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {result.document_title || result.filename}
                              </h3>
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                Score: {Math.round(result.score * 100)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {result.content.substring(0, 200)}...
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                              <span>Category: {result.document_category}</span>
                              {result.page_number && (
                                <span>Page: {result.page_number}</span>
                              )}
                              <span>Type: {result.file_type}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToDraft(result);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Add to draft"
                            >
                              <Quote className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(result.content);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Copy content"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <DocumentSearchSidebar
                onSuggestionClick={(suggestion) => {
                  if (
                    suggestion.includes("Ask AI Assistant") ||
                    suggestion.includes("Get AI-powered answers")
                  ) {
                    setActiveTab("qa");
                  } else if (suggestion.includes("Open draft:")) {
                    // Handle draft opening
                    console.log("Opening draft:", suggestion);
                  } else {
                    // Handle other suggestions
                    console.log("Suggestion:", suggestion);
                  }
                }}
                onUploadClick={() => window.open("/lawyer/documents", "_blank")}
                onDraftClick={openDraft}
                onNewDraftClick={createNewDraft}
                drafts={drafts}
              />
            </div>
          </div>
        )}

        {/* Document Viewer Modal */}
        {showDocumentViewer && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedDocument.title}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(documentContent)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDocumentViewer(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">
                  {documentContent}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Draft Editor Modal */}
        {showDraftEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-3/4 flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Draft title..."
                  className="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-none outline-none flex-1"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={saveDraft}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowDraftEditor(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <textarea
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Write your draft content..."
                  className="w-full h-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
