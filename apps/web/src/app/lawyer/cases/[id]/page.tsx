"use client";

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
  Mail,
  Phone,
  Plus,
  Trash2,
  Upload,
  User,
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

  useEffect(() => {
    if (params.id) {
      fetchCaseDetails();
    }
  }, [params.id]);

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
    if (!newNote.trim()) return;

    try {
      await apiClient.createCaseNote(params.id as string, {
        content: newNote,
        type: "GENERAL",
      });
      setNewNote("");
      fetchCaseDetails(); // Refresh to get the new note
    } catch (error) {
      console.error("Error adding note:", error);
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
      ON_HOLD: { color: "bg-gray-100 text-gray-800", icon: XCircle },
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
      LOW: "bg-gray-100 text-gray-800",
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
      month: "long",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Case not found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The case you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <button
            onClick={() => router.push("/lawyer/cases")}
            className="btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/lawyer/cases")}
                className="btn-outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {caseData.caseNumber}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {caseData.title}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(caseData.status)}
              {getPriorityBadge(caseData.priority)}
              <button className="btn-primary">
                <Edit className="w-4 h-4 mr-2" />
                Edit Case
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview" },
              { id: "documents", label: "Documents" },
              { id: "notes", label: "Notes" },
              { id: "tasks", label: "Tasks" },
              { id: "timeline", label: "Timeline" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {activeTab === "overview" && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Case Information */}
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Case Information
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Category
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.category.replace("_", " ")}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Court
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.court || "Not specified"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Judge
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.judge || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Filing Date
                        </label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                          {caseData.filingDate
                            ? formatDate(caseData.filingDate)
                            : "Not filed"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Client Information
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {caseData.client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {caseData.client.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Client
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4 mr-2" />
                        {caseData.client.email}
                      </div>
                      {caseData.client.phone && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Phone className="w-4 h-4 mr-2" />
                          {caseData.client.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Lawyer */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 mt-6">
                    Assigned Lawyer
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {caseData.assignedLawyer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {caseData.assignedLawyer.name}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Assigned Lawyer
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4 mr-2" />
                      {caseData.assignedLawyer.email}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Documents ({caseData.documents.length})
                </h3>
                <button className="btn-primary flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </button>
              </div>

              {caseData.documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No documents uploaded
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400">
                    Upload documents related to this case
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {caseData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {doc.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {doc.category} • {formatFileSize(doc.fileSize)} •{" "}
                            {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Case Notes ({caseData.notes.length})
                </h3>
              </div>

              {/* Add Note */}
              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this case..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Note
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-4">
                {caseData.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {note.type}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-900 dark:text-white mb-2">
                      {note.content}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <User className="w-4 h-4 mr-1" />
                      {note.user.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Related Tasks
                </h3>
                <button className="btn-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </button>
              </div>
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  Tasks functionality will be implemented in the next phase
                </p>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Case Timeline
              </h3>
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  Timeline functionality will be implemented in the next phase
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
