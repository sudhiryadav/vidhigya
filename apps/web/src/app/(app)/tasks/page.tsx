"use client";

import { AccessDenied } from "@/components/AccessDenied";
import LoadingOverlay from "@/components/LoadingOverlay";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect, { SelectOption } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  };
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  };
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    status: "PENDING",
    priority: "MEDIUM",
    dueDate: "",
    caseId: "",
    assignedToId: "",
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    status: "PENDING",
    priority: "MEDIUM",
    dueDate: "",
    caseId: "",
    assignedToId: "",
  });

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const canManageTasks = isLawyer;

  // Select options
  const statusOptions: SelectOption[] = [
    { value: "all", label: "All Status" },
    { value: "PENDING", label: "Pending" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const priorityOptions: SelectOption[] = [
    { value: "all", label: "All Priorities" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  const taskStatusOptions: SelectOption[] = [
    { value: "PENDING", label: "Pending" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const taskPriorityOptions: SelectOption[] = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  useEffect(() => {
    if (canManageTasks) {
      fetchTasks();
      fetchCases();
      fetchUsers();
    }
  }, [canManageTasks, searchTerm, statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTasks({
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        search: searchTerm || undefined,
      });
      setTasks(data as Task[]);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const data = await apiClient.getCases();
      setCases(data as Case[]);
    } catch (error) {
      console.error("Error fetching cases:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // For now, we'll extract users from tasks since we don't have a dedicated users endpoint
      const data = await apiClient.getTasks();
      const userMap = new Map();
      (data as any[]).forEach((task) => {
        if (task.assignedTo && !userMap.has(task.assignedTo.id)) {
          userMap.set(task.assignedTo.id, task.assignedTo);
        }
        if (!userMap.has(task.createdBy.id)) {
          userMap.set(task.createdBy.id, task.createdBy);
        }
      });
      setUsers(Array.from(userMap.values()));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createTask({
        title: createFormData.title,
        description: createFormData.description,
        status: createFormData.status,
        priority: createFormData.priority,
        dueDate: createFormData.dueDate || undefined,
        caseId: createFormData.caseId || undefined,
        assignedToId: createFormData.assignedToId || undefined,
      });
      setShowCreateModal(false);
      setCreateFormData({
        title: "",
        description: "",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: "",
        caseId: "",
        assignedToId: "",
      });
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const handleEditClick = (task: Task) => {
    setSelectedTask(task);
    setEditFormData({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      caseId: task.case?.id || "",
      assignedToId: task.assignedTo?.id || "",
    });
    setShowEditModal(true);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      await apiClient.updateTask(selectedTask.id, {
        title: editFormData.title,
        description: editFormData.description,
        status: editFormData.status,
        priority: editFormData.priority,
        dueDate: editFormData.dueDate || undefined,
        caseId: editFormData.caseId || undefined,
        assignedToId: editFormData.assignedToId || undefined,
      });
      setShowEditModal(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleViewClick = (task: Task) => {
    setSelectedTask(task);
    setShowViewModal(true);
  };

  const handleDeleteClick = (task: Task) => {
    setSelectedTask(task);
    setShowDeleteConfirm(true);
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    try {
      await apiClient.deleteTask(selectedTask.id);
      setShowDeleteConfirm(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiClient.updateTask(taskId, {
        status: newStatus,
        ...(newStatus === "COMPLETED" && {
          completedAt: new Date().toISOString(),
        }),
      });
      fetchTasks(); // Refresh the list
    } catch (error) {
      console.error("Error updating task status:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "bg-muted text-muted-foreground", icon: Clock },
      IN_PROGRESS: { color: "bg-blue-100 text-blue-800", icon: AlertTriangle },
      COMPLETED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      CANCELLED: { color: "bg-red-100 text-red-800", icon: XCircle },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
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

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description &&
        task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // If user doesn't have access to tasks, show access denied
  if (!canManageTasks) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to access the tasks management page."
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Tasks Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage and track all tasks and assignments
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Task
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-2 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tasks by title or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Status
                  </label>
                  <CustomSelect
                    options={statusOptions}
                    value={statusOptions.find(
                      (option) => option.value === statusFilter
                    )}
                    onChange={(selectedOption) =>
                      setStatusFilter(selectedOption?.value || "all")
                    }
                    placeholder="Select status"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <CustomSelect
                    options={priorityOptions}
                    value={priorityOptions.find(
                      (option) => option.value === priorityFilter
                    )}
                    onChange={(selectedOption) =>
                      setPriorityFilter(selectedOption?.value || "all")
                    }
                    placeholder="Select priority"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <LoadingOverlay
            isVisible={loading}
            title="Loading Tasks"
            message="Please wait while we fetch your tasks..."
            absolute={false}
          />

          {!loading && filteredTasks.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No tasks found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ||
                statusFilter !== "all" ||
                priorityFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first task"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[200px]">
                      Task
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[150px]">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[120px]">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[180px]">
                      Case
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider min-w-[100px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-muted">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-foreground break-words max-w-xs">
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 break-words max-w-xs">
                              {task.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Created: {formatDate(task.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground break-words max-w-xs">
                          {task.assignedTo?.name || "Unassigned"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 break-words max-w-xs">
                          {task.assignedTo?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CustomSelect
                          value={{
                            value: task.status,
                            label:
                              task.status === "PENDING"
                                ? "Pending"
                                : task.status === "IN_PROGRESS"
                                  ? "In Progress"
                                  : task.status === "COMPLETED"
                                    ? "Completed"
                                    : "Cancelled",
                          }}
                          onChange={(option) =>
                            handleStatusChange(
                              task.id,
                              option?.value || "PENDING"
                            )
                          }
                          options={[
                            { value: "PENDING", label: "Pending" },
                            { value: "IN_PROGRESS", label: "In Progress" },
                            { value: "COMPLETED", label: "Completed" },
                            { value: "CANCELLED", label: "Cancelled" },
                          ]}
                          placeholder="Select status..."
                          className="w-32"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPriorityBadge(task.priority)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {task.dueDate ? (
                          <div>
                            <div
                              className={
                                isOverdue(task.dueDate) &&
                                task.status !== "COMPLETED"
                                  ? "text-red-600"
                                  : ""
                              }
                            >
                              {formatDate(task.dueDate)}
                            </div>
                            {isOverdue(task.dueDate) &&
                              task.status !== "COMPLETED" && (
                                <div className="text-xs text-red-600">
                                  Overdue
                                </div>
                              )}
                          </div>
                        ) : (
                          "No due date"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {task.case ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {task.case.caseNumber}
                            </div>
                            <div className="text-xs break-words max-w-xs">
                              {task.case.title}
                            </div>
                          </div>
                        ) : (
                          "No case"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewClick(task)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(task)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(task)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <ModalDialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        header="Create New Task"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-task-form"
              className="btn-primary"
            >
              Create Task
            </button>
          </div>
        }
        maxWidth="2xl"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="create-task-form"
          onSubmit={handleCreateTask}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={createFormData.title}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    title: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assigned To
              </label>
              <CustomSelect
                options={[
                  { value: "", label: "Select assignee" },
                  ...users.map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`,
                  })),
                ]}
                value={[
                  { value: "", label: "Select assignee" },
                  ...users.map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`,
                  })),
                ].find(
                  (option) => option.value === createFormData.assignedToId
                )}
                onChange={(selectedOption) =>
                  setCreateFormData({
                    ...createFormData,
                    assignedToId: selectedOption?.value || "",
                  })
                }
                placeholder="Select assignee"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <CustomSelect
                options={taskStatusOptions}
                value={taskStatusOptions.find(
                  (option) => option.value === createFormData.status
                )}
                onChange={(selectedOption) =>
                  setCreateFormData({
                    ...createFormData,
                    status: selectedOption?.value || "PENDING",
                  })
                }
                placeholder="Select status"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority *
              </label>
              <CustomSelect
                options={taskPriorityOptions}
                value={taskPriorityOptions.find(
                  (option) => option.value === createFormData.priority
                )}
                onChange={(selectedOption) =>
                  setCreateFormData({
                    ...createFormData,
                    priority: selectedOption?.value || "MEDIUM",
                  })
                }
                placeholder="Select priority"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={createFormData.dueDate}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    dueDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Related Case
              </label>
              <CustomSelect
                options={[
                  { value: "", label: "Select case (optional)" },
                  ...cases.map((caseItem) => ({
                    value: caseItem.id,
                    label: `${caseItem.caseNumber} - ${caseItem.title}`,
                  })),
                ]}
                value={[
                  { value: "", label: "Select case (optional)" },
                  ...cases.map((caseItem) => ({
                    value: caseItem.id,
                    label: `${caseItem.caseNumber} - ${caseItem.title}`,
                  })),
                ].find((option) => option.value === createFormData.caseId)}
                onChange={(selectedOption) =>
                  setCreateFormData({
                    ...createFormData,
                    caseId: selectedOption?.value || "",
                  })
                }
                placeholder="Select case (optional)"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={createFormData.description}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter task description"
            />
          </div>
        </form>
      </ModalDialog>

      {/* Edit Task Modal */}
      <ModalDialog
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        header={`Edit Task: ${selectedTask?.title}`}
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" form="edit-task-form" className="btn-primary">
              Save Changes
            </button>
          </div>
        }
        maxWidth="2xl"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="edit-task-form"
          onSubmit={handleEditTask}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    title: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Assigned To
              </label>
              <CustomSelect
                options={[
                  { value: "", label: "Select assignee" },
                  ...users.map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`,
                  })),
                ]}
                value={[
                  { value: "", label: "Select assignee" },
                  ...users.map((user) => ({
                    value: user.id,
                    label: `${user.name} (${user.email})`,
                  })),
                ].find((option) => option.value === editFormData.assignedToId)}
                onChange={(selectedOption) =>
                  setEditFormData({
                    ...editFormData,
                    assignedToId: selectedOption?.value || "",
                  })
                }
                placeholder="Select assignee"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <CustomSelect
                options={taskStatusOptions}
                value={taskStatusOptions.find(
                  (option) => option.value === editFormData.status
                )}
                onChange={(selectedOption) =>
                  setEditFormData({
                    ...editFormData,
                    status: selectedOption?.value || "PENDING",
                  })
                }
                placeholder="Select status"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority *
              </label>
              <CustomSelect
                options={taskPriorityOptions}
                value={taskPriorityOptions.find(
                  (option) => option.value === editFormData.priority
                )}
                onChange={(selectedOption) =>
                  setEditFormData({
                    ...editFormData,
                    priority: selectedOption?.value || "MEDIUM",
                  })
                }
                placeholder="Select priority"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={editFormData.dueDate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    dueDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Related Case
              </label>
              <CustomSelect
                options={[
                  { value: "", label: "Select case (optional)" },
                  ...cases.map((caseItem) => ({
                    value: caseItem.id,
                    label: `${caseItem.caseNumber} - ${caseItem.title}`,
                  })),
                ]}
                value={[
                  { value: "", label: "Select case (optional)" },
                  ...cases.map((caseItem) => ({
                    value: caseItem.id,
                    label: `${caseItem.caseNumber} - ${caseItem.title}`,
                  })),
                ].find((option) => option.value === editFormData.caseId)}
                onChange={(selectedOption) =>
                  setEditFormData({
                    ...editFormData,
                    caseId: selectedOption?.value || "",
                  })
                }
                placeholder="Select case (optional)"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={editFormData.description}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter task description"
            />
          </div>
        </form>
      </ModalDialog>

      {/* View Task Modal */}
      <ModalDialog
        isOpen={showViewModal && !!selectedTask}
        onClose={() => setShowViewModal(false)}
        header={`Task Details: ${selectedTask?.title || ""}`}
        maxWidth="2xl"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Title:</p>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedTask.title}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Status:</p>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedTask.status}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Priority:</p>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedTask.priority}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Due Date:</p>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedTask.dueDate
                    ? formatDate(selectedTask.dueDate)
                    : "No due date"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Assigned To:
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedTask.assignedTo?.name || "Unassigned"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Created By:
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedTask.createdBy.name} ({selectedTask.createdBy.email})
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Created At:
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {formatDate(selectedTask.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Completed At:
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  {selectedTask.completedAt
                    ? formatDate(selectedTask.completedAt)
                    : "Not completed"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Description:
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                {selectedTask.description || "No description available."}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Case:</p>
              <p className="text-gray-500 dark:text-gray-400">
                {selectedTask.case ? (
                  <div>
                    <div className="font-medium text-foreground">
                      {selectedTask.case.caseNumber}
                    </div>
                    <div className="text-xs">{selectedTask.case.title}</div>
                  </div>
                ) : (
                  "No case"
                )}
              </p>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Delete Confirmation Modal */}
      <ModalDialog
        isOpen={showDeleteConfirm && !!selectedTask}
        onClose={() => setShowDeleteConfirm(false)}
        header="Confirm Deletion"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteTask}
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <div className="text-center">
          <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Are you sure you want to delete this task?
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This action cannot be undone. This will permanently delete the task
            "{selectedTask?.title}" and remove it from your tasks list.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
}
