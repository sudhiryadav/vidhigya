"use client";

import DocumentSearchSidebar from "@/components/DocumentSearchSidebar";
import ModalDialog from "@/components/ui/ModalDialog";
import { apiClient } from "@/services/api";
import {
  Bot,
  Cloud,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface QAMessage {
  id: string;
  type: "question" | "answer";
  content: string;
  timestamp: Date;
  question?: string; // Store the original question for feedback
  sources?: Array<{
    document_id: string;
    document_title: string;
    page_number?: number;
    content: string;
    score: number;
    start_char?: number;
    end_char?: number;
  }>;
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

interface DocumentQAProps {
  className?: string;
  drafts?: DraftSection[];
  onDraftClick?: (draft: DraftSection) => void;
  onNewDraftClick?: () => void;
}

interface WordCloudOverlayProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

// Curated Suggestions Component
function CuratedSuggestions({
  suggestions,
  onSuggestionClick,
}: {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No suggestions available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((suggestion, index) => (
          <button
            key={`suggestion-${index}`}
            onClick={() => onSuggestionClick(suggestion)}
            className="text-left p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/20 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
          >
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-white">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed text-sm">
                  {suggestion}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Click for instant answer
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function WordCloudOverlay({
  suggestions,
  onSuggestionClick,
  onClose,
  isLoading,
}: WordCloudOverlayProps) {
  return (
    <ModalDialog
      isOpen={true}
      onClose={onClose}
      header={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Click any word or suggestion to get instant answers
            </p>
          </div>
        </div>
      }
      maxWidth="4xl"
      maxHeight="80vh"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <div className="relative min-h-[400px]">
        {/* Curated Suggestions */}
        <div className="relative w-full mb-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-xl p-4">
          <CuratedSuggestions
            suggestions={suggestions}
            onSuggestionClick={onSuggestionClick}
          />
        </div>

        {/* Full Suggestions List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            All Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion)}
                disabled={isLoading}
                className="text-left p-4 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-medium text-white">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                      {suggestion}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Get AI-powered answer instantly
                    </p>
                  </div>
                  <div className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-0.5">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}

interface DocumentViewerProps {
  documentId: string;
  documentTitle: string;
  highlightedText?: string;
  startChar?: number;
  endChar?: number;
  onClose: () => void;
}

function DocumentViewer({
  documentId,
  documentTitle,
  highlightedText,
  startChar,
  endChar,
  onClose,
}: DocumentViewerProps) {
  const [documentContent, setDocumentContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch document content when component mounts
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        console.log("Fetching document:", documentId);
        const document = (await apiClient.getDocument(documentId)) as any;
        console.log("Document received:", {
          id: document.id,
          title: document.title,
          contentLength: document.content?.length || 0,
          hasContent: !!document.content,
        });

        if (document.content) {
          setDocumentContent(document.content);
        } else {
          setError("Document content not available");
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load document content");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId]);

  const highlightText = (content: string, start?: number, end?: number) => {
    if (!start || !end || start >= end || start >= content.length) {
      return content;
    }

    const before = content.substring(0, start);
    const highlighted = content.substring(start, end);
    const after = content.substring(end);

    return (
      <>
        {before}
        <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {highlighted}
        </mark>
        {after}
      </>
    );
  };

  const handleOpenInNewWindow = async () => {
    try {
      // Get the document download URL from the backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      // Get the blob and create a download link
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = documentTitle;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error("Error opening document:", error);
      toast.error("Failed to open document");
    }
  };

  const header = (
    <div className="flex items-center space-x-3">
      <FileText className="w-5 h-5 text-blue-600" />
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {documentTitle}
        </h3>
        {highlightedText && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Highlighted: "{highlightedText.substring(0, 50)}..."
          </p>
        )}
      </div>
    </div>
  );

  const footer = documentId && (
    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
      <span>Document ID: {documentId}</span>
      <span>Preview Mode</span>
    </div>
  );

  return (
    <ModalDialog
      isOpen={true}
      onClose={onClose}
      header={header}
      footer={footer}
      maxWidth="6xl"
      maxHeight="90vh"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      {/* Commenting out the download button for now */}
      {/* <div className="flex items-center justify-end space-x-2 mb-4">
        <button
          onClick={handleOpenInNewWindow}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title="Download document"
        >
          <Download className="w-4 h-4" />
        </button>
      </div> */}

      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading document preview...
          </span>
        </div>
      ) : error ? (
        <div className="text-center text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap text-gray-900 dark:text-white text-sm">
            {startChar && endChar ? (
              // Show preview around the highlighted source
              <div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-4">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    📍 Source Preview
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-300">
                    Showing the relevant section from the document
                  </p>
                </div>

                {/* Show context before the highlight */}
                {startChar > 200 && (
                  <div className="text-gray-500 dark:text-gray-400 mb-2">
                    <p className="text-xs italic">
                      ...{" "}
                      {documentContent.substring(startChar - 200, startChar)}
                    </p>
                  </div>
                )}

                {/* Show the highlighted source */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-3">
                  {highlightText(documentContent, startChar, endChar)}
                </div>

                {/* Show context after the highlight */}
                {endChar < documentContent.length - 200 && (
                  <div className="text-gray-500 dark:text-gray-400">
                    <p className="text-xs italic">
                      {documentContent.substring(endChar, endChar + 200)} ...
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Document Info:</strong>{" "}
                    {documentContent.length.toLocaleString()} characters total
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Source Position:</strong> Characters {startChar}-
                    {endChar}
                  </p>
                </div>
              </div>
            ) : (
              // Fallback: show first 500 characters if no highlighting data
              <div>
                <div className="bg-gray-50 dark:bg-gray-800 border-l-4 border-gray-400 p-4 mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📄 Document Preview
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Showing first 500 characters (no specific source location
                    available)
                  </p>
                </div>

                <div className="whitespace-pre-wrap">
                  {documentContent.substring(0, 500)}
                  {documentContent.length > 500 && (
                    <span className="text-gray-500 dark:text-gray-400">
                      ...
                    </span>
                  )}
                </div>

                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Document Length:</strong>{" "}
                    {documentContent.length.toLocaleString()} characters
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </ModalDialog>
  );
}

export default function DocumentQA({
  className = "",
  drafts = [],
  onDraftClick,
  onNewDraftClick,
}: DocumentQAProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWordCloudOverlay, setShowWordCloudOverlay] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{
    documentId: string;
    documentTitle: string;
    fileType: string;
    highlightedText?: string;
    startChar?: number;
    endChar?: number;
  } | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Search history for up arrow navigation
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempInput, setTempInput] = useState("");

  // Load chat history from localStorage and backend
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        // // Load from localStorage first (for immediate display)
        // const savedMessages = localStorage.getItem("documentQA_messages");
        // if (savedMessages) {
        //   const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
        //     ...msg,
        //     timestamp: new Date(msg.timestamp),
        //   }));
        //   setMessages(parsedMessages);
        // }

        // Load initial batch from backend (first 20 messages)
        await loadMoreMessages(1);
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    };

    loadChatHistory();
  }, []);

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("documentQA_searchHistory");
    if (savedHistory) {
      try {
        const history = JSON.parse(savedHistory);
        setSearchHistory(history);
      } catch (error) {
        console.error("Error loading search history:", error);
      }
    }
  }, []);

  // Load more messages function
  const loadMoreMessages = async (page: number = currentPage + 1) => {
    try {
      setIsLoadingHistory(true);
      const response = await apiClient.getDocumentQueryHistory(page, 20);
      if (response && response.length > 0) {
        const backendMessages = response
          .map((query: any) => ({
            id: query.id,
            type: "question" as const,
            content: query.question,
            timestamp: new Date(query.createdAt),
            sources: query.sources || undefined,
          }))
          .concat(
            response.map((query: any) => ({
              id: `${query.id}_answer`,
              type: "answer" as const,
              content: query.answer,
              timestamp: new Date(query.createdAt),
              question: query.question,
              sources: query.sources || undefined,
            }))
          )
          .sort(
            (a: any, b: any) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

        if (page === 1) {
          // First load - replace messages
          setMessages(backendMessages);
          setChatHistory(response);
          localStorage.setItem(
            "documentQA_messages",
            JSON.stringify(backendMessages)
          );
        } else {
          // Load more - prepend to existing messages
          setMessages((prev) => {
            const newMessages = [...backendMessages, ...prev];
            localStorage.setItem(
              "documentQA_messages",
              JSON.stringify(newMessages)
            );
            return newMessages;
          });
          setChatHistory((prev) => [...response, ...prev]);
        }

        setCurrentPage(page);
        setHasMoreMessages(response.length === 20); // If we got less than 20, no more messages
      } else {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const response = await apiClient.getAIUsageAnalytics();
      setAnalytics(response);
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save search history to localStorage
  const saveSearchHistory = (query: string) => {
    if (!query.trim()) return;

    const newHistory = [
      query,
      ...searchHistory.filter((item) => item !== query),
    ].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem(
      "documentQA_searchHistory",
      JSON.stringify(newHistory)
    );
  };

  // Helper function to build conversation history from messages
  const buildConversationHistory = () => {
    const conversationHistory = [];
    for (let i = 0; i < messages.length; i += 2) {
      const questionMsg = messages[i];
      const answerMsg = messages[i + 1];

      if (questionMsg?.type === "question" && answerMsg?.type === "answer") {
        conversationHistory.push({
          question: questionMsg.content,
          answer: answerMsg.content,
          timestamp: questionMsg.timestamp.toISOString(),
        });
      }
    }
    return conversationHistory;
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    // Save to search history
    saveSearchHistory(question);

    // Add user message immediately
    const userMessage: QAMessage = {
      id: Date.now().toString(),
      type: "question",
      content: question,
      timestamp: new Date(),
    };

    // Add user message to chat immediately
    setMessages((prev) => [...prev, userMessage]);

    // Clear the input immediately
    const currentQuestion = question;
    setQuestion("");
    setContext("");
    setHistoryIndex(-1); // Reset history index

    setIsLoading(true);
    setError(null);

    try {
      const conversationHistory = buildConversationHistory();
      const response = await apiClient.queryDocuments(
        currentQuestion,
        context,
        10,
        conversationHistory
      );

      const aiMessage: QAMessage = {
        id: (Date.now() + 1).toString(),
        type: "answer",
        content: response.answer,
        timestamp: new Date(),
        question: currentQuestion, // Store the question for feedback
        sources: response.sources,
      };

      // Add AI response to chat
      setMessages((prev) => {
        const newMessages = [...prev, aiMessage];
        // Save to localStorage
        localStorage.setItem(
          "documentQA_messages",
          JSON.stringify(newMessages)
        );
        return newMessages;
      });
    } catch (err) {
      console.error("Error asking question:", err);
      setError(err instanceof Error ? err.message : "Failed to get answer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (searchHistory.length > 0) {
        // Navigate up in history (most recent first)
        const newIndex =
          historyIndex < searchHistory.length - 1
            ? historyIndex + 1
            : historyIndex;
        setHistoryIndex(newIndex);
        setQuestion(searchHistory[newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        // Navigate down in history
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setQuestion(newIndex >= 0 ? searchHistory[newIndex] : "");
      } else if (historyIndex === 0) {
        // Clear input when reaching the end
        setHistoryIndex(-1);
        setQuestion("");
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const clearChat = () => {
    setMessages([]);
    setContext("");
  };

  const handleFeedback = async (
    messageId: string,
    feedback: "positive" | "negative"
  ) => {
    // Find the message to get question and answer
    const message = messages.find((m) => m.id === messageId);

    if (message && message.type === "answer") {
      try {
        const feedbackData = {
          messageId,
          feedback,
          question: message.question || "Unknown question",
          answer: message.content,
        };

        // Submit feedback to backend
        await apiClient.submitFeedback(feedbackData);

        // Show success toast
        const feedbackText =
          feedback === "positive"
            ? "Thank you for your feedback! 👍"
            : "Thank you for your feedback! We'll work to improve. 👎";
        toast.success(feedbackText);

        console.log("Feedback submitted successfully:", feedbackData);
      } catch (error) {
        console.error("Failed to submit feedback:", error);
        toast.error("Failed to submit feedback. Please try again.");
      }
    } else {
      toast.error("Unable to submit feedback. Please try again.");
    }
  };

  const openDocumentViewer = (source: NonNullable<QAMessage["sources"]>[0]) => {
    setSelectedDocument({
      documentId: source.document_id,
      documentTitle: source.document_title,
      fileType: "document", // Assuming all sources are documents for now
      highlightedText: source.content,
      startChar: source.start_char,
      endChar: source.end_char,
    });
  };

  const handleSuggestedQuestionClick = async (suggestion: string) => {
    // Close the overlay
    setShowWordCloudOverlay(false);

    // Save to search history
    saveSearchHistory(suggestion);

    // Create the question message and add it immediately
    const questionMessage: QAMessage = {
      id: Date.now().toString(),
      type: "question",
      content: suggestion,
      timestamp: new Date(),
    };

    // Add user message to chat immediately
    setMessages((prev) => [...prev, questionMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = buildConversationHistory();
      const response = await apiClient.queryDocuments(
        suggestion,
        context,
        10,
        conversationHistory
      );

      const answerMessage: QAMessage = {
        id: (Date.now() + 1).toString(),
        type: "answer",
        content: response.answer,
        timestamp: new Date(),
        question: suggestion, // Store the question for feedback
        sources: response.sources,
      };

      // Add AI response to chat
      setMessages((prev) => [...prev, answerMessage]);
      // Show success message
      console.log("Answer generated successfully!");
    } catch (error) {
      console.error("Error asking question:", error);
      // Show error message
      console.error("Failed to get answer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "Create a draft for a contract dispute case",
    "What are the key legal precedents in this case?",
    "Generate a summary of the main arguments",
    "What documents support the plaintiff's position?",
    "Draft a response to the opposing party's claims",
    "What are the potential legal risks in this case?",
    "Analyze the strength of our legal position",
    "Identify any missing evidence or documents",
    "Create a timeline of key events from the documents",
    "Summarize the financial implications of this case",
    "What are the key deadlines and filing requirements?",
    "Generate a list of potential witnesses and their relevance",
  ];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
        {/* Main Chat Area */}
        <div className="lg:col-span-4 h-full">
          <div
            className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
          >
            {/* Header - Fixed */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Bot className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Document AI Assistant
                </h2>
                {buildConversationHistory().length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Context: {buildConversationHistory().length} Q&A
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    await loadAnalytics();
                    setShowAnalytics(true);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Analytics</span>
                </button>
                <button
                  onClick={clearChat}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Context Input - Hidden but keeping structure */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 hidden">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Context (Optional)
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Provide additional context for your questions (e.g., case details, specific requirements)..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                rows={2}
              />
            </div>

            {/* Messages - Scrollable Area */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(156, 163, 175, 0.5) transparent",
              }}
            >
              {/* Load Previous Messages Button */}
              {hasMoreMessages && (
                <div className="flex justify-center">
                  <button
                    onClick={() => loadMoreMessages()}
                    disabled={isLoadingHistory}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingHistory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {isLoadingHistory
                        ? "Loading..."
                        : "Load Previous Messages"}
                    </span>
                  </button>
                </div>
              )}
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>
                    Ask questions about your documents to get AI-powered answers
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "question" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === "question"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === "question" ? (
                          <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Bot className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>

                          {message.type === "answer" &&
                            message.sources &&
                            message.sources.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 hidden">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                  Sources:
                                </p>
                                <div className="space-y-1">
                                  {message.sources
                                    .slice(0, 3)
                                    .map((source, index) => (
                                      <button
                                        key={index}
                                        onClick={() =>
                                          openDocumentViewer(source)
                                        }
                                        className="w-full text-left text-xs bg-gray-200 dark:bg-gray-600 rounded p-2 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors cursor-pointer"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <p className="font-medium">
                                              {source.document_title}
                                            </p>
                                            {source.page_number && (
                                              <p className="text-gray-500">
                                                Page {source.page_number}
                                              </p>
                                            )}
                                            <p className="text-gray-600 dark:text-gray-300 mt-1">
                                              {source.content ? (
                                                source.start_char &&
                                                source.end_char ? (
                                                  <>
                                                    {source.content.substring(
                                                      0,
                                                      source.start_char
                                                    )}
                                                    <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
                                                      {source.content.substring(
                                                        source.start_char,
                                                        source.end_char
                                                      )}
                                                    </mark>
                                                    {source.content.substring(
                                                      source.end_char,
                                                      Math.min(
                                                        source.end_char + 50,
                                                        source.content.length
                                                      )
                                                    )}
                                                    {source.content.length >
                                                    source.end_char + 50
                                                      ? "..."
                                                      : ""}
                                                  </>
                                                ) : (
                                                  `${source.content.substring(0, 100)}...`
                                                )
                                              ) : (
                                                "Content not available"
                                              )}
                                            </p>
                                          </div>
                                          <FileText className="w-3 h-3 text-gray-400 ml-2" />
                                        </div>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {message.type === "answer" && (
                            <>
                              <button
                                onClick={() =>
                                  handleFeedback(message.id, "positive")
                                }
                                className="text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                                title="This answer was helpful"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() =>
                                  handleFeedback(message.id, "negative")
                                }
                                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                                title="This answer was not helpful"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {/* Scroll to bottom reference */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Fixed Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask a question about your documents..."
                    className="w-full p-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    rows={1}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleAskQuestion}
                    disabled={isLoading || !question.trim()}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Press Enter to send, Shift+Enter for new line, ↑/↓ to browse
                history
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 hidden">
          <DocumentSearchSidebar
            onSuggestionClick={handleSuggestedQuestionClick}
            onUploadClick={() => window.open("/lawyer/documents", "_blank")}
            onDraftClick={onDraftClick}
            onNewDraftClick={onNewDraftClick}
            drafts={drafts}
          />
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          documentId={selectedDocument.documentId}
          documentTitle={selectedDocument.documentTitle}
          highlightedText={selectedDocument.highlightedText}
          startChar={selectedDocument.startChar}
          endChar={selectedDocument.endChar}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <ModalDialog
          isOpen={showAnalytics}
          onClose={() => setShowAnalytics(false)}
          header={
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Assistant Analytics
              </h3>
            </div>
          }
          maxWidth="4xl"
          maxHeight="80vh"
        >
          <div className="space-y-6">
            {analytics ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Total Queries
                    </h4>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {analytics.totalQueries}
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                      Avg Response Time
                    </h4>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {analytics.avgResponseTime}ms
                    </p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      Query Types
                    </h4>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {analytics.queriesByType?.length || 0}
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Daily Usage
                    </h4>
                    <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      {analytics.dailyUsage?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Query Types Breakdown */}
                {analytics.queriesByType &&
                  analytics.queriesByType.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Query Types
                      </h4>
                      <div className="space-y-2">
                        {analytics.queriesByType.map(
                          (type: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between items-center"
                            >
                              <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                                {type.type.replace(/_/g, " ").toLowerCase()}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {type.count}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Recent Activity */}
                {chatHistory && chatHistory.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Recent Queries
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {chatHistory.slice(0, 10).map((query: any) => (
                        <div
                          key={query.id}
                          className="border-l-4 border-blue-500 pl-4"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {query.question}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(query.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Loading analytics...
                </p>
              </div>
            )}
          </div>
        </ModalDialog>
      )}

      {/* Word Cloud Overlay */}
      {showWordCloudOverlay && (
        <WordCloudOverlay
          suggestions={suggestedQuestions}
          onSuggestionClick={handleSuggestedQuestionClick}
          onClose={() => setShowWordCloudOverlay(false)}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
