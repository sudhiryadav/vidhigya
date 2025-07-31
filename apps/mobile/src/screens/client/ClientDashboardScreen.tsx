import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiClient } from "../../utils/apiClient";

interface ClientStats {
  totalCases: number;
  activeCases: number;
  totalDocuments: number;
  totalBills: number;
  unpaidBills: number;
  upcomingEvents: number;
}

interface ClientCase {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  category: string;
  assignedLawyer: {
    id: string;
    name: string;
    email: string;
  };
  updatedAt: string;
}

interface ClientDocument {
  id: string;
  title: string;
  fileType: string;
  status: string;
  createdAt: string;
  case: {
    id: string;
    caseNumber: string;
  };
}

interface ClientBill {
  id: string;
  title: string;
  amount: number;
  status: string;
  dueDate: string;
  case: {
    id: string;
    caseNumber: string;
  };
}

export default function ClientDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [recentCases, setRecentCases] = useState<ClientCase[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<ClientDocument[]>([]);
  const [recentBills, setRecentBills] = useState<ClientBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const statsResponse = await apiClient.get("/client-portal/dashboard");
      setStats(statsResponse.data);

      // Fetch recent cases
      const casesResponse = await apiClient.get("/client-portal/cases");
      setRecentCases(casesResponse.data.slice(0, 3));

      // Fetch recent documents
      const documentsResponse = await apiClient.get("/client-portal/documents");
      setRecentDocuments(documentsResponse.data.slice(0, 3));

      // Fetch recent bills
      const billsResponse = await apiClient.get("/client-portal/billing");
      setRecentBills(billsResponse.data.slice(0, 3));
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
      case "active":
      case "pending":
        return "#f59e0b";
      case "completed":
      case "closed":
      case "paid":
        return "#10b981";
      case "overdue":
      case "cancelled":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
  }: {
    title: string;
    value: number;
    icon: string;
    color: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );

  const QuickActionButton = ({
    title,
    icon,
    onPress,
    color,
  }: {
    title: string;
    icon: string;
    onPress: () => void;
    color: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.quickActionButton,
        { backgroundColor: theme.colors.surface },
      ]}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading dashboard...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            Error Loading Dashboard
          </Text>
          <Text
            style={[styles.errorMessage, { color: theme.colors.textSecondary }]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={fetchDashboardData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Client Dashboard
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Welcome back, {user?.name}!
        </Text>
      </View>

      {/* Stats Grid */}
      {stats && (
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Cases"
            value={stats.totalCases}
            icon="briefcase"
            color="#3b82f6"
          />
          <StatCard
            title="Active Cases"
            value={stats.activeCases}
            icon="trending-up"
            color="#10b981"
          />
          <StatCard
            title="Documents"
            value={stats.totalDocuments}
            icon="document-text"
            color="#8b5cf6"
          />
          <StatCard
            title="Upcoming Events"
            value={stats.upcomingEvents}
            icon="calendar"
            color="#f59e0b"
          />
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Quick Actions
        </Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionButton
            title="View Documents"
            icon="document-text"
            color="#3b82f6"
            onPress={() => navigation.navigate("ClientDocuments" as never)}
          />
          <QuickActionButton
            title="View Bills"
            icon="card"
            color="#10b981"
            onPress={() => navigation.navigate("ClientBilling" as never)}
          />
          <QuickActionButton
            title="View Calendar"
            icon="calendar"
            color="#f59e0b"
            onPress={() => navigation.navigate("ClientEvents" as never)}
          />
          <QuickActionButton
            title="Contact Lawyer"
            icon="people"
            color="#8b5cf6"
            onPress={() => navigation.navigate("ClientChat" as never)}
          />
        </View>
      </View>

      {/* Recent Cases */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Cases
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("ClientCases" as never)}
          >
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>
        {recentCases.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="briefcase"
              size={32}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.textSecondary },
              ]}
            >
              No cases found
            </Text>
          </View>
        ) : (
          recentCases.map((case_) => (
            <TouchableOpacity
              key={case_.id}
              style={[
                styles.caseCard,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={() =>
                navigation.navigate(
                  "ClientCaseDetail" as never,
                  { caseId: case_.id } as never
                )
              }
            >
              <View style={styles.caseHeader}>
                <Text
                  style={[styles.caseTitle, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {case_.title}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(case_.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(case_.status) },
                    ]}
                  >
                    {case_.status.replace("_", " ")}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.caseNumber,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {case_.caseNumber}
              </Text>
              <Text
                style={[
                  styles.caseLawyer,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Lawyer: {case_.assignedLawyer.name}
              </Text>
              <Text
                style={[styles.caseDate, { color: theme.colors.textSecondary }]}
              >
                Updated {formatDate(case_.updatedAt)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Documents */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Documents
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("ClientDocuments" as never)}
          >
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>
        {recentDocuments.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="document-text"
              size={32}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.textSecondary },
              ]}
            >
              No documents found
            </Text>
          </View>
        ) : (
          recentDocuments.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={[
                styles.documentCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.documentHeader}>
                <Ionicons
                  name="document-text"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.documentTitle, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {doc.title}
                </Text>
                <Text
                  style={[
                    styles.documentType,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {doc.fileType.toUpperCase()}
                </Text>
              </View>
              <Text
                style={[
                  styles.documentCase,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {doc.case.caseNumber}
              </Text>
              <Text
                style={[
                  styles.documentDate,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Uploaded {formatDate(doc.createdAt)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Bills */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Bills
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("ClientBilling" as never)}
          >
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>
        {recentBills.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="card"
              size={32}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.emptyStateText,
                { color: theme.colors.textSecondary },
              ]}
            >
              No bills found
            </Text>
          </View>
        ) : (
          recentBills.map((bill) => (
            <TouchableOpacity
              key={bill.id}
              style={[
                styles.billCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.billHeader}>
                <Text
                  style={[styles.billTitle, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {bill.title}
                </Text>
                <Text style={[styles.billAmount, { color: theme.colors.text }]}>
                  {formatCurrency(bill.amount)}
                </Text>
              </View>
              <Text
                style={[styles.billCase, { color: theme.colors.textSecondary }]}
              >
                {bill.case.caseNumber}
              </Text>
              <View style={styles.billFooter}>
                <Text
                  style={[
                    styles.billDate,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  Due {formatDate(bill.dueDate)}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(bill.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(bill.status) },
                    ]}
                  >
                    {bill.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Billing Summary */}
      {stats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Billing Summary
          </Text>
          <View
            style={[
              styles.billingSummary,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.billingRow}>
              <Text
                style={[
                  styles.billingLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Total Bills
              </Text>
              <Text style={[styles.billingValue, { color: theme.colors.text }]}>
                {stats.totalBills}
              </Text>
            </View>
            <View style={styles.billingRow}>
              <Text
                style={[
                  styles.billingLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Unpaid Bills
              </Text>
              <Text style={[styles.billingValue, { color: "#ef4444" }]}>
                {stats.unpaidBills}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.viewAllBillsButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => navigation.navigate("ClientBilling" as never)}
            >
              <Text style={styles.viewAllBillsButtonText}>View All Bills</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: "1%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionButton: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  caseCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  caseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  caseTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  caseNumber: {
    fontSize: 14,
    marginBottom: 4,
  },
  caseLawyer: {
    fontSize: 14,
    marginBottom: 4,
  },
  caseDate: {
    fontSize: 12,
  },
  documentCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 8,
  },
  documentType: {
    fontSize: 12,
    fontWeight: "500",
  },
  documentCase: {
    fontSize: 14,
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 12,
  },
  billCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  billCase: {
    fontSize: 14,
    marginBottom: 8,
  },
  billFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  billDate: {
    fontSize: 12,
  },
  emptyState: {
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 14,
    marginTop: 8,
  },
  billingSummary: {
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  billingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  billingLabel: {
    fontSize: 14,
  },
  billingValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  viewAllBillsButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  viewAllBillsButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});
