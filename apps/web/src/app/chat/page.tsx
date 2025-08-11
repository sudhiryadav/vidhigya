"use client";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { MessageCircle, Plus, Search, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
}

interface Chat {
  id: string;
  participants: any[];
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

interface AssociatedUser {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [associatedUsers, setAssociatedUsers] = useState<AssociatedUser[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  useEffect(() => {
    fetchChats();
    fetchAssociatedUsers();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await apiClient.getChats();
      if (response && Array.isArray(response)) {
        setChats(response);
      } else {
        setChats([]);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssociatedUsers = async () => {
    try {
      const response = await apiClient.getAssociatedUsers();
      if (response && Array.isArray(response)) {
        setAssociatedUsers(response);
      } else {
        setAssociatedUsers([]);
      }
    } catch (error) {
      console.error("Error fetching associated users:", error);
      setAssociatedUsers([]);
    }
  };

  const startNewChat = async (userId: string) => {
    try {
      const response = await apiClient.startChatWithUser(userId);
      if (response && typeof response === "object" && "id" in response) {
        // Navigate to the new chat
        window.location.href = `/chat/${(response as any).id}`;
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat");
    }
  };

  const filteredChats = chats.filter((chat) => {
    const clientName =
      chat.participants.find((p: any) => p.id !== user?.id)?.name || "";
    return clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredAssociatedUsers = associatedUsers.filter((user) => {
    return user.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    // If it's today, show only time
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // If it's yesterday, show "Yesterday"
    if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }

    // If it's within the current month, show date and month
    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      return date.toLocaleDateString([], {
        day: "numeric",
        month: "short",
      });
    }

    // Otherwise show full date
    return date.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getClientName = (chat: Chat) => {
    return (
      chat.participants.find((p: any) => p.id !== user?.id)?.name || "Unknown"
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded mb-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Chat Conversations
        </h1>
        <p className="text-muted-foreground">
          Communicate with your clients in real-time
        </p>
        <div className="mt-3 p-3 bg-muted border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Use the floating chat bubble (bottom right)
            to chat from anywhere in the app!
          </p>
        </div>
      </div>

      {/* Search and New Chat Button */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowNewChat(!showNewChat)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* New Chat Section */}
      {showNewChat && (
        <div className="mb-6 p-4 bg-card rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Start New Chat
          </h3>
          {filteredAssociatedUsers.length === 0 ? (
            <p className="text-muted-foreground">
              No associated clients found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredAssociatedUsers.map((associatedUser) => (
                <div
                  key={associatedUser.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {associatedUser.name}
                      </p>
                      <p className="text-sm text-muted-foreground">Client</p>
                    </div>
                  </div>
                  <button
                    onClick={() => startNewChat(associatedUser.id)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Start Chat
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Existing Chats */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Recent Conversations
        </h3>
        {filteredChats.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No conversations yet
            </h3>
            <p className="text-muted-foreground">
              Start a conversation with your clients to see them here.
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const clientName = getClientName(chat);
            const isUnread = chat.unreadCount > 0;

            return (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                className="block p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`text-sm font-medium truncate ${
                          isUnread ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {clientName}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    {chat.lastMessage && (
                      <p
                        className={`text-sm truncate mt-1 ${
                          isUnread
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {chat.lastMessage.content}
                      </p>
                    )}

                    {isUnread && (
                      <div className="flex items-center mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {chat.unreadCount} new message
                          {chat.unreadCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
