"use client";

import { apiClient } from "@/services/api";
import {
  Clock,
  FileText,
  Lightbulb,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import DocumentUploadModal from "./DocumentUploadModal";

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

interface DocumentSearchSidebarProps {
  onSuggestionClick: (suggestion: string) => void;
  onUploadClick: () => void;
  onDraftClick?: (draft: DraftSection) => void;
  onNewDraftClick?: () => void;
  drafts?: DraftSection[];
  className?: string;
}

interface DraftDocument {
  id: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
}

interface RecentActivity {
  id: string;
  action: string;
  documentTitle: string;
  timestamp: string;
}

export default function DocumentSearchSidebar({
  onSuggestionClick,
  onUploadClick,
  onDraftClick,
  onNewDraftClick,
  drafts = [],
  className = "",
}: DocumentSearchSidebarProps) {
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const quickActions = [
    {
      title: "Search Documents",
      description: "Find specific documents",
      icon: Search,
      action: "Search for documents in your library",
    },
    {
      title: "Upload Documents",
      description: "Add new files",
      icon: Upload,
      action: "Upload new documents to your library",
    },
    {
      title: "View Analytics",
      description: "Usage insights",
      icon: TrendingUp,
      action: "View document usage analytics",
    },
    {
      title: "Quick Tips",
      description: "Helpful suggestions",
      icon: Lightbulb,
      action: "Get tips for better document management",
    },
  ];

  const suggestedQuestions = [
    "What are the key terms in this contract?",
    "Summarize the main points of this document",
    "Find similar cases or precedents",
    "What are the deadlines mentioned?",
    "Extract important dates and timelines",
    "What are the financial terms discussed?",
    "Find clauses related to termination",
    "What are the parties' obligations?",
  ];

  useEffect(() => {
    loadSidebarData();
  }, []);

  const loadSidebarData = async () => {
    try {
      setLoading(true);

      // Load draft documents
      const documents = await apiClient.getDocuments();
      const drafts = (documents as any[]).filter(
        (doc: any) => doc.status === "DRAFT"
      );
      setDraftDocuments(drafts.slice(0, 5)); // Show only 5 drafts

      // Load recent activity (mock data for now)
      const mockActivity: RecentActivity[] = [
        {
          id: "1",
          action: "Uploaded",
          documentTitle: "Contract Agreement.pdf",
          timestamp: "2 hours ago",
        },
        {
          id: "2",
          action: "Viewed",
          documentTitle: "Legal Brief.docx",
          timestamp: "4 hours ago",
        },
        {
          id: "3",
          action: "Searched",
          documentTitle: "Case Documents",
          timestamp: "1 day ago",
        },
      ];
      setRecentActivity(mockActivity);
    } catch (error) {
      console.error("Error loading sidebar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickActionClick = (action: string) => {
    switch (action) {
      case "Search for documents in your library":
        onSuggestionClick("Search for documents");
        break;
      case "Upload new documents to your library":
        // Show document upload modal
        setShowDocumentUploadModal(true);
        break;
      case "View document usage analytics":
        onSuggestionClick("Show analytics");
        break;
      case "Get tips for better document management":
        onSuggestionClick("Document management tips");
        break;
      default:
        onSuggestionClick(action);
    }
  };

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Draft Sections */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Draft Sections
          </h3>
          {onNewDraftClick && (
            <button
              onClick={onNewDraftClick}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <div className="text-center py-4">
              <FileText className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No draft sections
              </p>
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                onClick={() => onDraftClick?.(draft)}
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                  {draft.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {draft.content.substring(0, 100)}...
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{draft.citations.length} citations</span>
                  <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Draft Documents */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Draft Documents
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {draftDocuments.length} items
          </span>
        </div>

        {draftDocuments.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No draft documents
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {draftDocuments.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => onSuggestionClick(`Open draft: ${draft.title}`)}
              >
                <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {draft.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {draft.category} •{" "}
                    {new Date(draft.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="space-y-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickActionClick(action.action)}
              className="w-full flex items-center space-x-3 p-3 text-left bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <action.icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {action.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {action.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hidden">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Suggested Questions
        </h3>
        <div className="space-y-2">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(question)}
              className="w-full text-left p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
        <div className="space-y-3">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center space-x-3 p-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{activity.action}</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">
                    {activity.documentTitle}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showDocumentUploadModal}
        apiClient={apiClient}
        onClose={() => setShowDocumentUploadModal(false)}
      />
    </div>
  );
}
