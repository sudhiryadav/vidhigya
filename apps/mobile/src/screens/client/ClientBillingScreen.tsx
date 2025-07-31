import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiClient } from "../../utils/apiClient";

interface ClientBill {
  id: string;
  description: string;
  amount: number;
  billType: string;
  status: string;
  dueDate: string;
  createdAt: string;
  case: {
    id: string;
    caseNumber: string;
    title: string;
  };
}

export default function ClientBillingScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [bills, setBills] = useState<ClientBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get("/client-portal/billing");
      setBills(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return theme.colors.success;
      case "pending":
        return theme.colors.warning;
      case "overdue":
        return theme.colors.error;
      case "cancelled":
        return theme.colors.text;
      default:
        return theme.colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "overdue":
        return "alert-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "time";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "consultation":
        return theme.colors.primary;
      case "court_appearance":
        return theme.colors.secondary;
      case "document_preparation":
        return theme.colors.success;
      case "research":
        return theme.colors.warning;
      case "other":
        return theme.colors.text;
      default:
        return theme.colors.text;
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
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.case.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.case.title.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedType === "all" ||
      bill.billType.toLowerCase() === selectedType.toLowerCase();
    const matchesStatus =
      selectedStatus === "all" ||
      bill.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  const billTypes = Array.from(new Set(bills.map((bill) => bill.billType)));
  const statuses = Array.from(new Set(bills.map((bill) => bill.status)));

  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const paidAmount = bills
    .filter((bill) => bill.status.toLowerCase() === "paid")
    .reduce((sum, bill) => sum + bill.amount, 0);
  const pendingAmount = bills
    .filter((bill) => bill.status.toLowerCase() === "pending")
    .reduce((sum, bill) => sum + bill.amount, 0);
  const overdueAmount = bills
    .filter((bill) => bill.status.toLowerCase() === "overdue")
    .reduce((sum, bill) => sum + bill.amount, 0);

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
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>
        {formatCurrency(value)}
      </Text>
    </View>
  );

  const BillCard = ({ bill }: { bill: ClientBill }) => (
    <View style={[styles.billCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.billHeader}>
        <View style={styles.billInfo}>
          <Text style={[styles.billDescription, { color: theme.colors.text }]}>
            {bill.description}
          </Text>
          <View style={styles.billMeta}>
            <Text style={[styles.billAmount, { color: theme.colors.text }]}>
              {formatCurrency(bill.amount)}
            </Text>
            <View
              style={[
                styles.billTypeTag,
                { backgroundColor: getTypeColor(bill.billType) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.billTypeText,
                  { color: getTypeColor(bill.billType) },
                ]}
              >
                {bill.billType
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.billStatus}>
          <Ionicons
            name={getStatusIcon(bill.status) as any}
            size={20}
            color={getStatusColor(bill.status)}
          />
        </View>
      </View>

      <View style={styles.billDetails}>
        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Case:
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {bill.case.caseNumber} - {bill.case.title}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Due Date:
          </Text>
          <Text
            style={[
              styles.detailValue,
              {
                color:
                  isOverdue(bill.dueDate) &&
                  bill.status.toLowerCase() !== "paid"
                    ? theme.colors.error
                    : theme.colors.text,
              },
            ]}
          >
            {formatDate(bill.dueDate)}
            {isOverdue(bill.dueDate) &&
              bill.status.toLowerCase() !== "paid" && (
                <Text
                  style={[styles.overdueText, { color: theme.colors.error }]}
                >
                  {" "}
                  (Overdue)
                </Text>
              )}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailLabel, { color: theme.colors.textSecondary }]}
          >
            Status:
          </Text>
          <View
            style={[
              styles.statusTag,
              { backgroundColor: getStatusColor(bill.status) + "20" },
            ]}
          >
            <Ionicons
              name={getStatusIcon(bill.status) as any}
              size={14}
              color={getStatusColor(bill.status)}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(bill.status) },
              ]}
            >
              {bill.status.replace(/\b\w/g, (l) => l.toUpperCase())}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.billActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.viewButton,
            { borderColor: theme.colors.border },
          ]}
          onPress={() =>
            Alert.alert("View Bill", "View functionality will be implemented")
          }
        >
          <Ionicons name="eye" size={16} color={theme.colors.text} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
            View
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.downloadButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() =>
            Alert.alert(
              "Download Bill",
              "Download functionality will be implemented"
            )
          }
        >
          <Ionicons name="download" size={16} color="white" />
          <Text style={[styles.actionButtonText, { color: "white" }]}>
            Download
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Billing
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading billing records...
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Billing
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            Error
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
            onPress={fetchBills}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Billing
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total Amount"
            value={totalAmount}
            icon="cash"
            color={theme.colors.primary}
          />
          <StatCard
            title="Paid"
            value={paidAmount}
            icon="checkmark-circle"
            color={theme.colors.success}
          />
          <StatCard
            title="Pending"
            value={pendingAmount}
            icon="time"
            color={theme.colors.warning}
          />
          <StatCard
            title="Overdue"
            value={overdueAmount}
            icon="alert-circle"
            color={theme.colors.error}
          />
        </View>

        {/* Search and Filters */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search bills..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text
                style={[
                  styles.filterLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Type:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedType === "all" && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedType("all")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedType === "all" ? "white" : theme.colors.text,
                      },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {billTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      selectedType === type && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color:
                            selectedType === type ? "white" : theme.colors.text,
                        },
                      ]}
                    >
                      {type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <Text
                style={[
                  styles.filterLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Status:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedStatus === "all" && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedStatus("all")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedStatus === "all"
                            ? "white"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {statuses.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      selectedStatus === status && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color:
                            selectedStatus === status
                              ? "white"
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {status.replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <Text
            style={[styles.resultsCount, { color: theme.colors.textSecondary }]}
          >
            {filteredBills.length} bill{filteredBills.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Bills List */}
        {filteredBills.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="card"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No bills found
            </Text>
            <Text
              style={[
                styles.emptyMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {searchTerm || selectedType !== "all" || selectedStatus !== "all"
                ? "Try adjusting your filters to see more results."
                : "Billing records will appear here once they are created for your cases."}
            </Text>
          </View>
        ) : (
          <View style={styles.billsList}>
            {filteredBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
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
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
    minWidth: 50,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#f3f4f6",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  resultsCount: {
    fontSize: 14,
    textAlign: "right",
  },
  billsList: {
    padding: 16,
  },
  billCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  billInfo: {
    flex: 1,
  },
  billDescription: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  billMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  billAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  billTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  billTypeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  billStatus: {
    marginLeft: 12,
  },
  billDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  overdueText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  billActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewButton: {
    backgroundColor: "transparent",
  },
  downloadButton: {
    borderColor: "transparent",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
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
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
