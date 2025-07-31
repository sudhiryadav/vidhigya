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
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiClient } from "../../utils/apiClient";

interface ClientDocument {
  id: string;
  title: string;
  description: string;
  fileType: string;
  fileSize: number;
  category: string;
  status: string;
  createdAt: string;
  case: {
    id: string;
    caseNumber: string;
    title: string;
  };
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ClientDocumentsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get("/client-portal/documents");
      setDocuments(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return "image";
    if (fileType.startsWith("video/")) return "videocam";
    if (fileType.startsWith("audio/")) return "musical-notes";
    if (fileType.includes("pdf")) return "document-text";
    return "document";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return theme.colors.success;
      case "review":
        return theme.colors.warning;
      case "draft":
        return theme.colors.text;
      case "filed":
        return theme.colors.primary;
      case "archived":
        return theme.colors.secondary;
      default:
        return theme.colors.text;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "contract":
        return theme.colors.primary;
      case "agreement":
        return theme.colors.success;
      case "petition":
        return theme.colors.error;
      case "affidavit":
        return theme.colors.warning;
      case "evidence":
        return theme.colors.secondary;
      case "court_order":
        return theme.colors.info;
      case "legal_opinion":
        return theme.colors.purple;
      default:
        return theme.colors.text;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.case.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      doc.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesStatus =
      selectedStatus === "all" ||
      doc.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = Array.from(new Set(documents.map((doc) => doc.category)));
  const statuses = Array.from(new Set(documents.map((doc) => doc.status)));

  const DocumentCard = ({ document }: { document: ClientDocument }) => (
    <View
      style={[styles.documentCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.documentHeader}>
        <View style={styles.documentIcon}>
          <Ionicons
            name={getFileIcon(document.fileType) as any}
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.documentInfo}>
          <Text style={[styles.documentTitle, { color: theme.colors.text }]}>
            {document.title}
          </Text>
          <Text
            style={[styles.documentSize, { color: theme.colors.textSecondary }]}
          >
            {formatFileSize(document.fileSize)}
          </Text>
        </View>
      </View>

      {document.description && (
        <Text
          style={[
            styles.documentDescription,
            { color: theme.colors.textSecondary },
          ]}
        >
          {document.description}
        </Text>
      )}

      <View style={styles.documentDetails}>
        <View style={styles.detailRow}>
          <Ionicons
            name="calendar"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            {formatDate(document.createdAt)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="person"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            Uploaded by {document.uploadedBy.name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            Case:{" "}
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {document.case.caseNumber}
            </Text>
          </Text>
        </View>
      </View>

      <View style={styles.tagsContainer}>
        <View
          style={[
            styles.tag,
            { backgroundColor: getCategoryColor(document.category) + "20" },
          ]}
        >
          <Text
            style={[
              styles.tagText,
              { color: getCategoryColor(document.category) },
            ]}
          >
            {document.category
              .replace(/_/g, " ")
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </Text>
        </View>
        <View
          style={[
            styles.tag,
            { backgroundColor: getStatusColor(document.status) + "20" },
          ]}
        >
          <Text
            style={[styles.tagText, { color: getStatusColor(document.status) }]}
          >
            {document.status.replace(/\b\w/g, (l) => l.toUpperCase())}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.viewButton,
            { borderColor: theme.colors.border },
          ]}
          onPress={() =>
            Alert.alert(
              "View Document",
              "View functionality will be implemented"
            )
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
              "Download Document",
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
            Documents
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading documents...
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
            Documents
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
            onPress={fetchDocuments}
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
          Documents
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
              placeholder="Search documents..."
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
                Category:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedCategory === "all" && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedCategory("all")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedCategory === "all"
                            ? "white"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.filterChip,
                      selectedCategory === category && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color:
                            selectedCategory === category
                              ? "white"
                              : theme.colors.text,
                        },
                      ]}
                    >
                      {category
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
            {filteredDocuments.length} document
            {filteredDocuments.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="document-text"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No documents found
            </Text>
            <Text
              style={[
                styles.emptyMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {searchTerm ||
              selectedCategory !== "all" ||
              selectedStatus !== "all"
                ? "Try adjusting your filters to see more results."
                : "Documents will appear here once they are uploaded to your cases."}
            </Text>
          </View>
        ) : (
          <View style={styles.documentsList}>
            {filteredDocuments.map((document) => (
              <DocumentCard key={document.id} document={document} />
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
    minWidth: 60,
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
  documentsList: {
    padding: 16,
  },
  documentCard: {
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
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  documentSize: {
    fontSize: 14,
  },
  documentDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  documentDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionButtons: {
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
