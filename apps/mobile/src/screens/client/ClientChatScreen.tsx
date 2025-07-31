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
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  timestamp: string;
  isRead: boolean;
}

interface ChatConversation {
  id: string;
  title: string;
  participants: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

export default function ClientChatScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, we'll create mock data since chat backend isn't implemented yet
      const mockConversations: ChatConversation[] = [
        {
          id: "1",
          title: "Case Discussion - Property Dispute",
          participants: [
            { id: "1", name: "John Smith", role: "CLIENT" },
            { id: "2", name: "Sarah Johnson", role: "LAWYER" },
          ],
          lastMessage: {
            id: "1",
            content:
              "I've reviewed the documents you sent. We should discuss the next steps.",
            senderId: "2",
            senderName: "Sarah Johnson",
            senderRole: "LAWYER",
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            isRead: false,
          },
          unreadCount: 1,
        },
        {
          id: "2",
          title: "Contract Review - Employment Case",
          participants: [
            { id: "1", name: "John Smith", role: "CLIENT" },
            { id: "3", name: "Michael Brown", role: "LAWYER" },
          ],
          lastMessage: {
            id: "2",
            content:
              "The contract looks good. I'll send you the final version tomorrow.",
            senderId: "3",
            senderName: "Michael Brown",
            senderRole: "LAWYER",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            isRead: true,
          },
          unreadCount: 0,
        },
        {
          id: "3",
          title: "General Support",
          participants: [
            { id: "1", name: "John Smith", role: "CLIENT" },
            { id: "4", name: "Support Team", role: "ADMIN" },
          ],
          lastMessage: {
            id: "3",
            content:
              "Thank you for your inquiry. We'll get back to you within 24 hours.",
            senderId: "4",
            senderName: "Support Team",
            senderRole: "ADMIN",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            isRead: true,
          },
          unreadCount: 0,
        },
      ];

      setConversations(mockConversations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const handleStartNewChat = () => {
    Alert.alert(
      "New Chat",
      "This feature will allow you to start a new conversation with your lawyer or support team.",
      [{ text: "OK" }]
    );
  };

  const handleOpenConversation = (conversation: ChatConversation) => {
    Alert.alert(
      "Open Chat",
      `This would open the conversation: "${conversation.title}"`,
      [{ text: "OK" }]
    );
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
            Chat
          </Text>
          <TouchableOpacity onPress={handleStartNewChat}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading conversations...
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
            Chat
          </Text>
          <TouchableOpacity onPress={handleStartNewChat}>
            <Ionicons name="add" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
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
            onPress={fetchConversations}
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
          Chat
        </Text>
        <TouchableOpacity onPress={handleStartNewChat}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Message */}
        <View
          style={[
            styles.welcomeCard,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Ionicons name="chatbubbles" size={32} color={theme.colors.primary} />
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
            Welcome to Chat
          </Text>
          <Text
            style={[
              styles.welcomeMessage,
              { color: theme.colors.textSecondary },
            ]}
          >
            Connect with your lawyers and get real-time updates on your cases.
          </Text>
        </View>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No conversations yet
            </Text>
            <Text
              style={[
                styles.emptyMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              Start a conversation with your lawyer to discuss your cases.
            </Text>
            <TouchableOpacity
              style={[
                styles.startChatButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleStartNewChat}
            >
              <Text style={styles.startChatButtonText}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.conversationsList}>
            {conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={[
                  styles.conversationCard,
                  { backgroundColor: theme.colors.surface },
                ]}
                onPress={() => handleOpenConversation(conversation)}
              >
                <View style={styles.conversationHeader}>
                  <View style={styles.conversationInfo}>
                    <Text
                      style={[
                        styles.conversationTitle,
                        { color: theme.colors.text },
                      ]}
                    >
                      {conversation.title}
                    </Text>
                    <Text
                      style={[
                        styles.conversationParticipants,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {conversation.participants
                        .filter((p) => p.id !== user?.id)
                        .map((p) => p.name)
                        .join(", ")}
                    </Text>
                  </View>
                  <View style={styles.conversationMeta}>
                    {conversation.lastMessage && (
                      <Text
                        style={[
                          styles.lastMessageTime,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {formatTime(conversation.lastMessage.timestamp)}
                      </Text>
                    )}
                    {conversation.unreadCount > 0 && (
                      <View
                        style={[
                          styles.unreadBadge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Text style={styles.unreadBadgeText}>
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {conversation.lastMessage && (
                  <View style={styles.lastMessageContainer}>
                    <Text
                      style={[
                        styles.lastMessageText,
                        {
                          color:
                            conversation.unreadCount > 0
                              ? theme.colors.text
                              : theme.colors.textSecondary,
                          fontWeight:
                            conversation.unreadCount > 0 ? "500" : "400",
                        },
                      ]}
                      numberOfLines={2}
                    >
                      {conversation.lastMessage.senderName}:{" "}
                      {conversation.lastMessage.content}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View
          style={[
            styles.quickActionsCard,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            style={[styles.quickActionsTitle, { color: theme.colors.text }]}
          >
            Quick Actions
          </Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                { backgroundColor: theme.colors.primary + "20" },
              ]}
              onPress={handleStartNewChat}
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.quickActionText,
                  { color: theme.colors.primary },
                ]}
              >
                New Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionButton,
                { backgroundColor: theme.colors.success + "20" },
              ]}
              onPress={() => Alert.alert("Support", "Contact support team")}
            >
              <Ionicons
                name="help-circle"
                size={24}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.quickActionText,
                  { color: theme.colors.success },
                ]}
              >
                Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  welcomeCard: {
    margin: 16,
    padding: 20,
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
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  welcomeMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  conversationsList: {
    paddingHorizontal: 16,
  },
  conversationCard: {
    marginBottom: 12,
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
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  conversationParticipants: {
    fontSize: 14,
  },
  conversationMeta: {
    alignItems: "flex-end",
  },
  lastMessageTime: {
    fontSize: 12,
    marginBottom: 4,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  lastMessageContainer: {
    marginTop: 4,
  },
  lastMessageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  emptyContainer: {
    margin: 16,
    padding: 32,
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
    marginBottom: 24,
  },
  startChatButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startChatButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  quickActionsCard: {
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
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
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
