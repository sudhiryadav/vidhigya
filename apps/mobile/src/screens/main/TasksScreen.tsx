import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { api, endpoints } from "../../services/api";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
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

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  completionRate: number;
}

const TasksScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "my-tasks" | "overdue">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const fetchTasksData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockTasks: Task[] = [
        {
          id: "1",
          title: "Review Smith case documents",
          description:
            "Review all submitted documents for the Smith property dispute case",
          status: "PENDING",
          priority: "HIGH",
          dueDate: "2024-02-20T00:00:00.000Z",
          createdAt: "2024-02-15T00:00:00.000Z",
          createdBy: {
            id: "1",
            name: "John Lawyer",
            email: "lawyer@vidhigya.com",
          },
          assignedTo: {
            id: "2",
            name: "Sarah Associate",
            email: "sarah@vidhigya.com",
          },
          case: {
            id: "1",
            caseNumber: "CASE-2024-001",
            title: "Smith vs Johnson - Property Dispute",
          },
        },
        {
          id: "2",
          title: "Prepare court filing for employment case",
          description:
            "Prepare and file the initial court documents for the employment discrimination case",
          status: "IN_PROGRESS",
          priority: "URGENT",
          dueDate: "2024-02-18T00:00:00.000Z",
          createdAt: "2024-02-14T00:00:00.000Z",
          createdBy: {
            id: "1",
            name: "John Lawyer",
            email: "lawyer@vidhigya.com",
          },
          case: {
            id: "2",
            caseNumber: "CASE-2024-002",
            title: "Employment Discrimination Case",
          },
        },
        {
          id: "3",
          title: "Client meeting preparation",
          description: "Prepare agenda and documents for client meeting",
          status: "COMPLETED",
          priority: "MEDIUM",
          dueDate: "2024-02-16T00:00:00.000Z",
          completedAt: "2024-02-16T10:00:00.000Z",
          createdAt: "2024-02-13T00:00:00.000Z",
          createdBy: {
            id: "1",
            name: "John Lawyer",
            email: "lawyer@vidhigya.com",
          },
          case: {
            id: "3",
            caseNumber: "CASE-2024-003",
            title: "Contract Review Case",
          },
        },
        {
          id: "4",
          title: "Research case law for property dispute",
          description: "Research relevant case law and precedents",
          status: "PENDING",
          priority: "LOW",
          dueDate: "2024-02-25T00:00:00.000Z",
          createdAt: "2024-02-15T00:00:00.000Z",
          createdBy: {
            id: "1",
            name: "John Lawyer",
            email: "lawyer@vidhigya.com",
          },
        },
      ];

      const mockStats: TaskStats = {
        totalTasks: 24,
        completedTasks: 8,
        pendingTasks: 12,
        overdueTasks: 3,
        highPriorityTasks: 5,
        completionRate: 33.3,
      };

      setTasks(mockTasks);
      setStats(mockStats);
    } catch (error) {
      console.error("Error fetching tasks data:", error);
      Alert.alert("Error", "Failed to load tasks data");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTasksData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTasksData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return theme.colors.success;
      case "IN_PROGRESS":
        return theme.colors.primary;
      case "PENDING":
        return theme.colors.warning;
      case "CANCELLED":
        return theme.colors.error;
      default:
        return theme.colors.secondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return theme.colors.error;
      case "HIGH":
        return theme.colors.warning;
      case "MEDIUM":
        return theme.colors.info;
      case "LOW":
        return theme.colors.success;
      default:
        return theme.colors.secondary;
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || task.priority === priorityFilter;

    let matchesView = true;
    if (viewMode === "my-tasks") {
      matchesView = task.assignedTo?.id === "2"; // Mock current user ID
    } else if (viewMode === "overdue") {
      matchesView = isOverdue(task.dueDate);
    }

    return matchesStatus && matchesPriority && matchesView;
  });

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Mock API call - replace with actual API call
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus as Task["status"],
              completedAt:
                newStatus === "COMPLETED"
                  ? new Date().toISOString()
                  : undefined,
            }
          : task
      )
    );
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      style={[styles.taskCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => Alert.alert("Task Details", item.title)}
    >
      <View style={styles.taskHeader}>
        <TouchableOpacity
          onPress={() =>
            handleStatusChange(
              item.id,
              item.status === "COMPLETED" ? "PENDING" : "COMPLETED"
            )
          }
          style={styles.checkbox}
        >
          <Text
            style={[
              styles.checkboxText,
              {
                color:
                  item.status === "COMPLETED"
                    ? theme.colors.success
                    : theme.colors.textSecondary,
              },
            ]}
          >
            {item.status === "COMPLETED" ? "☑" : "☐"}
          </Text>
        </TouchableOpacity>
        <View style={styles.taskInfo}>
          <Text
            style={[
              styles.taskTitle,
              { color: theme.colors.text },
              item.status === "COMPLETED" && styles.completedTask,
            ]}
          >
            {item.title}
          </Text>
          {item.description && (
            <Text
              style={[
                styles.taskDescription,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.description}
            </Text>
          )}
          <View style={styles.taskMeta}>
            {item.dueDate && (
              <Text
                style={[styles.taskDate, { color: theme.colors.textSecondary }]}
              >
                📅 {formatDate(item.dueDate)}
                {isOverdue(item.dueDate) && item.status !== "COMPLETED" && (
                  <Text
                    style={[styles.overdueText, { color: theme.colors.error }]}
                  >
                    {" "}
                    (Overdue)
                  </Text>
                )}
              </Text>
            )}
            {item.assignedTo && (
              <Text
                style={[
                  styles.taskAssignee,
                  { color: theme.colors.textSecondary },
                ]}
              >
                👤 {item.assignedTo.name}
              </Text>
            )}
            {item.case && (
              <Text style={[styles.taskCase, { color: theme.colors.primary }]}>
                📋 {item.case.caseNumber}
              </Text>
            )}
          </View>
        </View>
      </View>
      <View style={styles.taskBadges}>
        <View
          style={[
            styles.badge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.badgeText, { color: getStatusColor(item.status) }]}
          >
            {item.status}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: getPriorityColor(item.priority) + "20" },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: getPriorityColor(item.priority) },
            ]}
          >
            {item.priority}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const StatCard = ({
    title,
    value,
    color,
  }: {
    title: string;
    value: number | string;
    color: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Tasks</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Manage your tasks and assignments
        </Text>
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.statsContainer}>
          <StatCard
            title="Total"
            value={stats.totalTasks}
            color={theme.colors.primary}
          />
          <StatCard
            title="Completed"
            value={stats.completedTasks}
            color={theme.colors.success}
          />
          <StatCard
            title="Overdue"
            value={stats.overdueTasks}
            color={theme.colors.error}
          />
          <StatCard
            title="Rate"
            value={`${stats.completionRate.toFixed(1)}%`}
            color={theme.colors.info}
          />
        </View>
      )}

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "all" && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setViewMode("all")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === "all" ? "white" : theme.colors.text },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "my-tasks" && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setViewMode("my-tasks")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === "my-tasks" ? "white" : theme.colors.text },
            ]}
          >
            My Tasks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "overdue" && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setViewMode("overdue")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === "overdue" ? "white" : theme.colors.text },
            ]}
          >
            Overdue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
            Status:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === "all" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setStatusFilter("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: statusFilter === "all" ? "white" : theme.colors.text,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === "PENDING" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setStatusFilter("PENDING")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      statusFilter === "PENDING" ? "white" : theme.colors.text,
                  },
                ]}
              >
                Pending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === "IN_PROGRESS" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setStatusFilter("IN_PROGRESS")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      statusFilter === "IN_PROGRESS"
                        ? "white"
                        : theme.colors.text,
                  },
                ]}
              >
                In Progress
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                statusFilter === "COMPLETED" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setStatusFilter("COMPLETED")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      statusFilter === "COMPLETED"
                        ? "white"
                        : theme.colors.text,
                  },
                ]}
              >
                Completed
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
            Priority:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                priorityFilter === "all" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setPriorityFilter("all")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      priorityFilter === "all" ? "white" : theme.colors.text,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                priorityFilter === "URGENT" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setPriorityFilter("URGENT")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      priorityFilter === "URGENT" ? "white" : theme.colors.text,
                  },
                ]}
              >
                Urgent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                priorityFilter === "HIGH" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setPriorityFilter("HIGH")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      priorityFilter === "HIGH" ? "white" : theme.colors.text,
                  },
                ]}
              >
                High
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                priorityFilter === "MEDIUM" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setPriorityFilter("MEDIUM")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      priorityFilter === "MEDIUM" ? "white" : theme.colors.text,
                  },
                ]}
              >
                Medium
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterChip,
                priorityFilter === "LOW" && {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={() => setPriorityFilter("LOW")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color:
                      priorityFilter === "LOW" ? "white" : theme.colors.text,
                  },
                ]}
              >
                Low
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
        onPress={() =>
          Alert.alert("Add Task", "Task creation form would appear here")
        }
      >
        <Text style={styles.addButtonText}>Add New Task</Text>
      </TouchableOpacity>

      {/* Tasks List */}
      <View style={styles.tasksContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {viewMode === "all"
            ? "All Tasks"
            : viewMode === "my-tasks"
              ? "My Tasks"
              : "Overdue Tasks"}
        </Text>
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyStateText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No tasks found
              </Text>
            </View>
          }
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: "center",
  },
  viewToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  filtersContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  addButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  tasksContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  taskCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 18,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  completedTask: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    gap: 4,
  },
  taskDate: {
    fontSize: 12,
  },
  overdueText: {
    fontWeight: "600",
  },
  taskAssignee: {
    fontSize: 12,
  },
  taskCase: {
    fontSize: 12,
    fontWeight: "500",
  },
  taskBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: "center",
  },
});

export default TasksScreen;
