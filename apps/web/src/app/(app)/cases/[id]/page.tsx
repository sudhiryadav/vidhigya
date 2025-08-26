"use client";

import { AccessDenied } from "@/components/AccessDenied";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  court?: string;
  judge?: string;
  opposingParty?: string;
  opposingLawyer?: string;
  filingDate?: string;
  nextHearingDate?: string;
  estimatedCompletionDate?: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assignedLawyer: {
    id: string;
    name: string;
    email: string;
  };
  documents: Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    type: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  }>;
}

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const canManageCase = isLawyer; // Only lawyers can manage cases
  const canViewCase = isLawyer || isClient; // Both lawyers and clients can view

  useEffect(() => {
    if (params.id && canViewCase) {
      fetchCaseDetails();
    }
  }, [params.id, canViewCase]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCase(params.id as string);
      setCaseData(data as Case);
    } catch (error) {
      console.error("Error fetching case details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !caseData) return;
    try {
      await apiClient.createCaseNote(caseData.id, {
        content: newNote,
        type: "GENERAL",
      });
      setNewNote("");
      fetchCaseDetails();
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await apiClient.updateCase(caseData!.id, { status: newStatus });
      fetchCaseDetails();
    } catch (error) {
      console.error("Error updating case status:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OPEN: { color: "bg-blue-100 text-blue-800", icon: Clock },
      IN_PROGRESS: {
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertTriangle,
      },
      CLOSED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      ON_HOLD: { color: "bg-muted text-muted-foreground", icon: XCircle },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.OPEN;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status.replace("_", " ")}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      LOW: "bg-muted text-muted-foreground",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-red-100 text-red-800",
      URGENT: "bg-purple-100 text-purple-800",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityConfig[priority as keyof typeof priorityConfig]}`}
      >
        {priority}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Access denied for unauthorized users
  if (!canViewCase) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to access this case."
      />
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingOverlay
          isVisible={loading}
          title="Loading Case"
          message="Please wait while we fetch your case data..."
          absolute
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Case Not Found
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              The case you're looking for could not be found.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay
        isVisible={loading}
        title="Loading Case"
        message="Please wait while we fetch your case data..."
        absolute
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/cases")}
                className="btn-outline flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Cases
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {caseData.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Case Number: {caseData.caseNumber}
                </p>
              </div>
            </div>
            {canManageCase && (
              <div className="flex items-center space-x-3">
                <button className="btn-outline flex items-center">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Case
                </button>
                <button className="btn-outline flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Case Status and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Status
            </h3>
            <div className="flex items-center justify-between">
              {getStatusBadge(caseData.status)}
              {canManageCase && (
                <select
                  value={caseData.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="ml-2 px-3 py-1 border border-border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="CLOSED">Closed</option>
                </select>
              )}
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Priority
            </h3>
            {getPriorityBadge(caseData.priority)}
          </div>

          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Category
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              {caseData.category.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              {["overview", "documents", "notes", "timeline"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Case Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {caseData.description}
                      </p>
                    </div>
                    {caseData.court && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Court
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.court}
                        </p>
                      </div>
                    )}
                    {caseData.judge && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Judge
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.judge}
                        </p>
                      </div>
                    )}
                    {caseData.opposingParty && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Opposing Party
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.opposingParty}
                        </p>
                      </div>
                    )}
                    {caseData.opposingLawyer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Opposing Lawyer
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.opposingLawyer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Key Dates
                  </h3>
                  <div className="space-y-4">
                    {caseData.filingDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Filing Date
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {formatDate(caseData.filingDate)}
                        </p>
                      </div>
                    )}
                    {caseData.nextHearingDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Next Hearing
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {formatDate(caseData.nextHearingDate)}
                        </p>
                      </div>
                    )}
                    {caseData.estimatedCompletionDate && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Estimated Completion
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {formatDate(caseData.estimatedCompletionDate)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Documents
                  </h3>
                  {canManageCase && (
                    <button className="btn-primary flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Document
                    </button>
                  )}
                </div>
                {caseData.documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No documents uploaded yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {caseData.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-muted rounded-lg p-4 border border-border"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {doc.title}
                            </h4>
                            <div className="flex items-center space-x-2 mb-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {doc.category}
                              </p>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  doc.status === "PROCESSED"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : doc.status === "PROCESSING" ||
                                        doc.status === "UPLOADED"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                }`}
                              >
                                {doc.status.replace("_", " ")}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatFileSize(doc.fileSize)} •{" "}
                              {formatDate(doc.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                              <Eye className="w-4 h-4" />
                            </button>
                            {(doc.status === "PROCESSED" ||
                              doc.status === "APPROVED") && (
                              <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            {canManageCase &&
                              !["PROCESSING", "UPLOADED", "PENDING"].includes(
                                doc.status
                              ) && (
                                <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === "notes" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Notes
                  </h3>
                  {canManageCase && (
                    <button className="btn-primary flex items-center">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Note
                    </button>
                  )}
                </div>
                {canManageCase && (
                  <div className="mb-6">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a new note..."
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                )}
                {caseData.notes.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No notes added yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {caseData.notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-muted rounded-lg p-4 border border-border"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-white mb-2">
                              {note.content}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                              <span>{note.user.name}</span>
                              <span>{formatDate(note.createdAt)}</span>
                              <span className="capitalize">{note.type}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === "timeline" && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Case Timeline
                </h3>
                <div className="space-y-4">
                  {caseData.filingDate && (
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Case Filed
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(caseData.filingDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  {caseData.nextHearingDate && (
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-3 h-3 bg-yellow-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Next Hearing Scheduled
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(caseData.nextHearingDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  {caseData.estimatedCompletionDate && (
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-3 h-3 bg-purple-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Estimated Completion
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(caseData.estimatedCompletionDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
