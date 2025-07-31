import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
  clientCases: Array<{
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
  }>;
}

export default function ClientProfileScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get("/client-portal/profile");
      setProfile(response.data);
      setEditForm({
        name: response.data.name,
        phone: response.data.phone || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const handleSaveProfile = async () => {
    try {
      const response = await apiClient.patch(
        "/client-portal/profile",
        editForm
      );
      setProfile(response.data);
      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (err) {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return theme.colors.primary;
      case "in_progress":
        return theme.colors.warning;
      case "completed":
        return theme.colors.success;
      case "closed":
        return theme.colors.text;
      default:
        return theme.colors.text;
    }
  };

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
            Profile
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading profile...
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
            Profile
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
            onPress={fetchProfile}
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
          Profile
        </Text>
        <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
          <Ionicons
            name={isEditing ? "close" : "create"}
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View
          style={[
            styles.profileHeader,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.avatarContainer}>
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Ionicons name="person" size={40} color="white" />
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            {isEditing ? (
              <View style={styles.editForm}>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                  value={editForm.name}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, name: text })
                  }
                  placeholder="Full Name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                    },
                  ]}
                  value={editForm.phone}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, phone: text })
                  }
                  placeholder="Phone Number"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleSaveProfile}
                  >
                    <Text style={styles.editButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      { backgroundColor: theme.colors.border },
                    ]}
                    onPress={() => {
                      setIsEditing(false);
                      setEditForm({
                        name: profile?.name || "",
                        phone: profile?.phone || "",
                      });
                    }}
                  >
                    <Text
                      style={[
                        styles.editButtonText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text
                  style={[styles.profileName, { color: theme.colors.text }]}
                >
                  {profile?.name}
                </Text>
                <Text
                  style={[
                    styles.profileEmail,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {profile?.email}
                </Text>
                {profile?.phone && (
                  <Text
                    style={[
                      styles.profilePhone,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {profile.phone}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Account Information */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Account Information
          </Text>

          <View style={styles.infoRow}>
            <Text
              style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
            >
              Member Since
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {profile ? formatDate(profile.createdAt) : ""}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
            >
              Last Updated
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {profile ? formatDate(profile.updatedAt) : ""}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text
              style={[styles.infoLabel, { color: theme.colors.textSecondary }]}
            >
              Total Cases
            </Text>
            <Text style={[styles.infoValue, { color: theme.colors.text }]}>
              {profile?.clientCases.length || 0}
            </Text>
          </View>
        </View>

        {/* Recent Cases */}
        {profile?.clientCases && profile.clientCases.length > 0 && (
          <View
            style={[styles.section, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Recent Cases
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("ClientCases" as never)}
              >
                <Text
                  style={[styles.viewAllText, { color: theme.colors.primary }]}
                >
                  View All
                </Text>
              </TouchableOpacity>
            </View>

            {profile.clientCases.slice(0, 3).map((caseItem) => (
              <View key={caseItem.id} style={styles.caseItem}>
                <View style={styles.caseInfo}>
                  <Text
                    style={[styles.caseNumber, { color: theme.colors.text }]}
                  >
                    {caseItem.caseNumber}
                  </Text>
                  <Text
                    style={[
                      styles.caseTitle,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {caseItem.title}
                  </Text>
                  <Text
                    style={[
                      styles.caseLawyer,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Lawyer: {caseItem.assignedLawyer.name}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusTag,
                    { backgroundColor: getStatusColor(caseItem.status) + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(caseItem.status) },
                    ]}
                  >
                    {caseItem.status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Settings & Actions */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Settings & Actions
          </Text>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons
              name="notifications"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              Notification Settings
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              Privacy & Security
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons
              name="help-circle"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              Help & Support
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Ionicons
              name="document-text"
              size={20}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.actionText, { color: theme.colors.text }]}>
              Terms of Service
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={20} color="white" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
  profileHeader: {
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    alignItems: "center",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 16,
  },
  editForm: {
    width: "100%",
    alignItems: "center",
  },
  editInput: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  editButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  caseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  caseInfo: {
    flex: 1,
  },
  caseNumber: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  caseTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  caseLawyer: {
    fontSize: 12,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 16,
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
});
