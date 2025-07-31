"use client";

import { apiClient } from "@/services/api";
import {
  Bot,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Send,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface QAMessage {
  id: string;
  type: "question" | "answer";
  content: string;
  timestamp: Date;
  sources?: Array<{
    document_id: string;
    document_title: string;
    page_number?: number;
    content: string;
    score: number;
    start_char?: number;
    end_char?: number;
  }>;
  confidence?: number;
}

interface DocumentQAProps {
  className?: string;
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
        const document = await apiClient.getDocument(documentId);
        setDocumentContent(
          (document as any).content || "Document content not available"
        );
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                window.open(`/lawyer/documents/${documentId}`, "_blank")
              }
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Open full document"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                Loading document...
              </span>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                {highlightText(documentContent, startChar, endChar)}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Document ID: {documentId}</span>
            {startChar && endChar && (
              <span>
                Highlighted text position: {startChar}-{endChar}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentQA({ className = "" }: DocumentQAProps) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<{
    documentId: string;
    documentTitle: string;
    fileType: string;
  } | null>(null);

  const handleAskQuestion = async () => {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.queryDocuments(
        question,
        "qa",
        context,
        10
      );

      const newMessage: QAMessage = {
        id: Date.now().toString(),
        type: "question",
        content: question,
        timestamp: new Date(),
      };

      const aiMessage: QAMessage = {
        id: (Date.now() + 1).toString(),
        type: "answer",
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
      };

      setMessages((prev) => [...prev, newMessage, aiMessage]);
      setQuestion("");
      setContext("");
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
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    console.log("Copied to clipboard!");
  };

  const clearChat = () => {
    setMessages([]);
    setContext("");
  };

  const openDocumentViewer = (source: NonNullable<QAMessage["sources"]>[0]) => {
    setSelectedDocument({
      documentId: source.document_id,
      documentTitle: source.document_title,
      fileType: "document", // Assuming all sources are documents for now
    });
  };

  const handleSuggestedQuestionClick = async (suggestion: string) => {
    // Set the question in the input
    setQuestion(suggestion);

    // Create the question message
    const questionMessage: QAMessage = {
      id: Date.now().toString(),
      type: "question",
      content: suggestion,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, questionMessage]);
    setIsLoading(true);

    try {
      const response = await apiClient.askDocumentQuestion(suggestion, context);

      const answerMessage: QAMessage = {
        id: (Date.now() + 1).toString(),
        type: "answer",
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
        confidence: response.confidence,
      };

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
      <div
        className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Document AI Assistant
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {showSuggestions ? "Hide" : "Show"} Suggestions
            </button>
            <button
              onClick={clearChat}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Context Input */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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

        {/* Suggested Questions */}
        {showSuggestions && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {messages.length === 0
                ? "Quick Start - Click any suggestion to get an instant answer:"
                : "Quick Actions - Click for instant answers:"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedQuestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestionClick(suggestion)}
                  disabled={isLoading}
                  className="text-left p-3 text-sm bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-start space-x-2">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                        {suggestion}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Click to get AI-powered answer
                      </p>
                    </div>
                    <div className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-0.5">
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
            {messages.length === 0 && (
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                💡 These suggestions help you get started quickly. You can also
                type your own questions below.
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              Sources:
                            </p>
                            <div className="space-y-1">
                              {message.sources
                                .slice(0, 3)
                                .map((source, index) => (
                                  <button
                                    key={index}
                                    onClick={() => openDocumentViewer(source)}
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
                                          {source.content.substring(0, 100)}...
                                        </p>
                                      </div>
                                      <FileText className="w-3 h-3 text-gray-400 ml-2" />
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                      {message.type === "answer" && message.confidence && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Confidence: {Math.round(message.confidence * 100)}%
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
                          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
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
                    Generating answer...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
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
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          documentId={selectedDocument.documentId}
          documentTitle={selectedDocument.documentTitle}
          highlightedText={undefined} // No highlighted text in this context
          startChar={undefined}
          endChar={undefined}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </>
  );
}
