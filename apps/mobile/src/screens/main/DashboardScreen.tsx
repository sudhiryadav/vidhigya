import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { api, endpoints } from "../../services/api";

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  pendingCases: number;
  closedCases: number;
  upcomingHearings: Array<{
    id: string;
    caseNumber: string;
    title: string;
    nextHearingDate: string;
    client: {
      name: string;
    };
  }>;
  overdueBills: Array<{
    id: string;
    amount: number;
    description: string;
    dueDate: string;
    case: {
      caseNumber: string;
      title: string;
    };
  }>;
}

const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get(endpoints.cases.dashboard);
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const StatCard = ({
    title,
    value,
    color,
  }: {
    title: string;
    value: number;
    color: string;
  }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
    </View>
  );

  const QuickActionCard = ({
    title,
    subtitle,
    onPress,
  }: {
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
    >
      <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
        {title}
      </Text>
      <Text
        style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: theme.colors.text }]}>
          Welcome back, {user?.name}!
        </Text>
        <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
          {new Date().toLocaleDateString()}
        </Text>
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Case Overview
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Cases"
              value={stats.totalCases}
              color={theme.colors.primary}
            />
            <StatCard
              title="Active Cases"
              value={stats.activeCases}
              color={theme.colors.success}
            />
            <StatCard
              title="Pending Cases"
              value={stats.pendingCases}
              color={theme.colors.warning}
            />
            <StatCard
              title="Closed Cases"
              value={stats.closedCases}
              color={theme.colors.secondary}
            />
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Quick Actions
        </Text>
        <View style={styles.actionsGrid}>
          <QuickActionCard
            title="Create Case"
            subtitle="Start a new legal case"
            onPress={() =>
              Alert.alert("Create Case", "Navigate to create case screen")
            }
          />
          <QuickActionCard
            title="Upload Document"
            subtitle="Add documents to cases"
            onPress={() =>
              Alert.alert(
                "Upload Document",
                "Navigate to upload document screen"
              )
            }
          />
          <QuickActionCard
            title="Create Bill"
            subtitle="Generate new invoice"
            onPress={() =>
              Alert.alert("Create Bill", "Navigate to create bill screen")
            }
          />
          <QuickActionCard
            title="Add Client"
            subtitle="Register new client"
            onPress={() =>
              Alert.alert("Add Client", "Navigate to add client screen")
            }
          />
        </View>
      </View>

      {/* Upcoming Hearings */}
      {stats?.upcomingHearings && stats.upcomingHearings.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Upcoming Hearings
          </Text>
          {stats.upcomingHearings.map((hearing) => (
            <View
              key={hearing.id}
              style={[
                styles.hearingCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.hearingTitle, { color: theme.colors.text }]}>
                {hearing.title}
              </Text>
              <Text
                style={[
                  styles.hearingCase,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Case: {hearing.caseNumber}
              </Text>
              <Text
                style={[
                  styles.hearingClient,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Client: {hearing.client.name}
              </Text>
              <Text
                style={[styles.hearingDate, { color: theme.colors.primary }]}
              >
                {new Date(hearing.nextHearingDate).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Overdue Bills */}
      {stats?.overdueBills && stats.overdueBills.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
            Overdue Bills
          </Text>
          {stats.overdueBills.map((bill) => (
            <View
              key={bill.id}
              style={[
                styles.billCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text style={[styles.billTitle, { color: theme.colors.text }]}>
                {bill.description}
              </Text>
              <Text
                style={[styles.billCase, { color: theme.colors.textSecondary }]}
              >
                Case: {bill.case.caseNumber}
              </Text>
              <Text style={[styles.billAmount, { color: theme.colors.error }]}>
                ${bill.amount.toLocaleString()}
              </Text>
              <Text
                style={[styles.billDate, { color: theme.colors.textSecondary }]}
              >
                Due: {new Date(bill.dueDate).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 10,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: "center",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
  },
  hearingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  hearingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  hearingCase: {
    fontSize: 14,
    marginBottom: 2,
  },
  hearingClient: {
    fontSize: 14,
    marginBottom: 4,
  },
  hearingDate: {
    fontSize: 14,
    fontWeight: "600",
  },
  billCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  billCase: {
    fontSize: 14,
    marginBottom: 2,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  billDate: {
    fontSize: 14,
  },
});

export default DashboardScreen;
