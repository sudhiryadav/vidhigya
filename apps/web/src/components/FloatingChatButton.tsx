"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiClient } from "@/services/api";
import { getSocketService } from "@/services/socket";
import {
  Maximize2,
  MessageSquare,
  Minimize2,
  Search,
  Send,
  User,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface Chat {
  id: string;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

interface AssociatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FloatingChatButtonProps {
  className?: string;
}

export default function FloatingChatButton({
  className = "",
}: FloatingChatButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // Chat states
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const [activeTab, setActiveTab] = useState<"recent" | "new">("recent");
  const [chats, setChats] = useState<Chat[]>([]);
  const [associatedUsers, setAssociatedUsers] = useState<AssociatedUser[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      fetchChats();
      fetchUsers();
      setActiveTab("recent"); // Reset to recent tab when expanding

      // Set up periodic refresh to keep chats in sync with backend
      const interval = setInterval(() => {
        fetchChats();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  // Global event listener for new messages to update unread count
  useEffect(() => {
    if (!isExpanded) return;

    const handleGlobalNewMessage = (event: CustomEvent) => {
      const { message, chatId } = event.detail;

      if (message && chatId && message.senderId !== user?.id) {
        // Update unread count for the chat
        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) =>
            chat.id === chatId
              ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
              : chat
          );
          return updatedChats;
        });
      }
    };

    window.addEventListener(
      "newMessage",
      handleGlobalNewMessage as EventListener
    );
    return () => {
      window.removeEventListener(
        "newMessage",
        handleGlobalNewMessage as EventListener
      );
    };
  }, [isExpanded, user?.id]);

  useEffect(() => {
    if (view === "chat" && selectedChat && user) {
      fetchMessages();
      const cleanup = setupSocketConnection();

      // Ensure user joins their personal room to receive messages
      if (getSocketService().isSocketConnected()) {
        getSocketService().joinPersonalRoom(user.id);
      } else {
        const token = localStorage.getItem("token");
        if (token) {
          getSocketService().connect(token);
          setTimeout(() => {
            if (getSocketService().isSocketConnected()) {
              getSocketService().joinPersonalRoom(user.id);
            }
          }, 1000);
        }
      }

      return cleanup;
    }
  }, [selectedChat, view, user]);

  useEffect(() => {
    if (view === "chat" && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, view]);

  // Update selectedChat when chats state changes to maintain consistency
  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find((chat) => chat.id === selectedChat.id);
      if (updatedChat && updatedChat.unreadCount !== selectedChat.unreadCount) {
        setSelectedChat(updatedChat);
      }
    }
  }, [chats, selectedChat]);

  // Check if on chat page or auth pages
  const isOnChatPage =
    pathname.includes("/chat/") || pathname.includes("/chat/");
  const isOnAuthPage =
    pathname.includes("/login") || pathname.includes("/register");

  // Don't render if on chat page, auth pages, or not authenticated
  if (isOnChatPage || isOnAuthPage || !isAuthenticated) {
    return null;
  }

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getChats();
      if (response && Array.isArray(response)) {
        setChats(response);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Use the associated users endpoint that returns appropriate users based on role
      const response = await apiClient.getAssociatedUsers();
      if (response && Array.isArray(response)) {
        setAssociatedUsers(response);
      }
    } catch (error) {
      console.error("Error fetching associated users:", error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const data = await apiClient.getChat(selectedChat.id);
      if (data && typeof data === "object" && "messages" in data) {
        const messages = data.messages as Message[];
        setMessages(messages || []);
        // Mark messages as read
        if (messages && messages.length > 0) {
          try {
            // Mark as read in backend
            const response = await apiClient.markChatAsRead(selectedChat.id);
            if (
              response &&
              typeof response === "object" &&
              "success" in response &&
              response.success
            ) {
              // Also notify socket service
              getSocketService().markAsRead(selectedChat.id);
              // Update local state to clear unread count
              setChats((prevChats) =>
                prevChats.map((c) =>
                  c.id === selectedChat.id ? { ...c, unreadCount: 0 } : c
                )
              );
            }
          } catch (error) {
            console.error("Error marking chat as read:", error);
            // Still update local state even if backend call fails
            setChats((prevChats) =>
              prevChats.map((c) =>
                c.id === selectedChat.id ? { ...c, unreadCount: 0 } : c
              )
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const setupSocketConnection = () => {
    if (!selectedChat) return;

    const handleNewMessage = async (event: CustomEvent) => {
      const { message } = event.detail;
      if (message && message.chatId === selectedChat.id) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === message.id)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              senderName: message.senderName || "Unknown",
              type: message.type || "TEXT",
              isRead: false,
              createdAt: new Date(message.createdAt),
            },
          ];
        });

        // Mark the chat as read when a message is received and chat is open
        if (selectedChat && message.senderId !== user?.id) {
          try {
            // Mark as read in backend
            const response = await apiClient.markChatAsRead(selectedChat.id);
            if (
              response &&
              typeof response === "object" &&
              "success" in response &&
              response.success
            ) {
              // Update local state
              setChats((prevChats) =>
                prevChats.map((chat) =>
                  chat.id === selectedChat.id
                    ? { ...chat, unreadCount: 0 }
                    : chat
                )
              );
            }
          } catch (error) {
            console.error("Error marking chat as read:", error);
            // Still update local state even if backend call fails
            setChats((prevChats) =>
              prevChats.map((chat) =>
                chat.id === selectedChat.id ? { ...chat, unreadCount: 0 } : chat
              )
            );
          }
        }
      }
    };

    window.addEventListener(
      "newMessage",
      handleNewMessage as unknown as EventListener
    );

    // Return cleanup function
    return () => {
      window.removeEventListener(
        "newMessage",
        handleNewMessage as unknown as EventListener
      );
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

    try {
      setSending(true);

      // Use the selected chat ID directly since it's already constructed correctly
      const chatId = selectedChat.id;

      // Send via socket if connected
      if (getSocketService().isSocketConnected()) {
        getSocketService().sendMessage(chatId, newMessage, "TEXT");

        // Add message to local state immediately
        const tempMessage = {
          id: `temp-${Date.now()}`,
          content: newMessage,
          senderId: user?.id || "",
          senderName: user?.name || "You",
          type: "TEXT",
          isRead: false,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, tempMessage]);
        setNewMessage("");
      } else {
        // Fallback to REST API
        await apiClient.sendChatMessage(chatId, {
          content: newMessage,
          type: "TEXT",
        });
        setNewMessage("");
        fetchMessages(); // Refresh messages
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getParticipantName = (chat: Chat) => {
    // Extract the other participant's ID from the chat ID
    if (chat.id && user) {
      const [user1Id, user2Id] = chat.id.split("-");
      const otherUserId = user1Id === user.id ? user2Id : user1Id;
      const participant = associatedUsers.find((u) => u.id === otherUserId);
      return participant ? participant.name : "Chat Participant";
    }
    return "Chat Participant";
  };

  const getUnreadCount = () => {
    // If we have chats loaded, count chats with unread messages; otherwise return 0
    if (chats.length > 0) {
      return chats.filter((chat) => (chat.unreadCount || 0) > 0).length;
    }
    return 0;
  };

  const getBubbleSize = () => {
    if (isMaximized) return "w-96 h-[600px]";
    if (isExpanded) return "w-80 h-96";
    return "w-12 h-12";
  };

  const toggleBubble = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setView("list");
      setSelectedChat(null);
      setMessages([]);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const startNewChat = (userId: string) => {
    const selectedUser = associatedUsers.find((u) => u.id === userId);
    if (selectedUser && user) {
      // Create chat ID in the format: "currentUserId-selectedUserId"
      const chatId = `${user.id}-${selectedUser.id}`;
      setSelectedChat({ id: chatId, unreadCount: 0 });
      setView("chat");

      // Ensure user joins their personal room to receive messages
      if (getSocketService().isSocketConnected()) {
        getSocketService().joinPersonalRoom(user.id);
      } else {
        const token = localStorage.getItem("token");
        if (token) {
          getSocketService().connect(token);
          setTimeout(() => {
            if (getSocketService().isSocketConnected()) {
              getSocketService().joinPersonalRoom(user.id);
            }
          }, 1000);
        }
      }
    }
  };

  const renderUsersList = () => {
    if (isLoading) {
      return (
        <div className="text-center text-muted-foreground py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm">Loading users...</p>
        </div>
      );
    }

    if (associatedUsers.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-4">
          <User className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50 dark:text-muted-foreground/30" />
          <p className="text-sm">No users found</p>
        </div>
      );
    }

    const filteredUsers = associatedUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredUsers.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-4">
          <Search className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50 dark:text-muted-foreground/30" />
          <p className="text-sm">No users match your search</p>
        </div>
      );
    }

    return filteredUsers.map((user) => (
      <button
        key={user.id}
        onClick={() => startNewChat(user.id)}
        className={`w-full text-left p-3 rounded-lg transition-colors ${
          resolvedTheme === "dark"
            ? "hover:bg-gray-800 text-white"
            : "hover:bg-gray-100 text-gray-900"
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <User
              className={`w-4 h-4 ${
                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium truncate ${
                resolvedTheme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {user.name}
            </p>
            <p
              className={`text-xs truncate ${
                resolvedTheme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {user.email}
            </p>
            <p
              className={`text-xs truncate ${
                resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {user.role}
            </p>
          </div>
        </div>
      </button>
    ));
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Minimized Chat Button */}
      {!isExpanded && (
        <button
          key={`chat-button-${getUnreadCount()}`}
          onClick={toggleBubble}
          className={`relative rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            resolvedTheme === "dark"
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25"
          }`}
          title="Open Chat"
        >
          <MessageSquare className="h-6 w-6" />
          {(() => {
            const unreadCount = getUnreadCount();
            return unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium shadow-lg">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null;
          })()}
        </button>
      )}

      {/* Expanded Chat Window */}
      {isExpanded && (
        <div
          className={`rounded-lg shadow-xl border ${getBubbleSize()} flex flex-col overflow-hidden backdrop-blur-sm ${
            resolvedTheme === "dark"
              ? "bg-gray-900 border-gray-700 shadow-gray-900/50"
              : "bg-white border-gray-200 shadow-gray-900/20"
          }`}
          style={{ minHeight: isMaximized ? "600px" : "384px" }}
        >
          {/* Header */}
          <div
            className={`px-4 py-3 flex items-center justify-between shadow-sm ${
              resolvedTheme === "dark"
                ? "bg-gray-800 text-white border-b border-gray-700"
                : "bg-blue-600 text-white border-b border-blue-500"
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">
                {view === "list"
                  ? user?.role === "CLIENT"
                    ? "Chat with Lawyers"
                    : "Chat with Clients"
                  : "Chat"}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={toggleMaximize}
                className={`p-1 rounded transition-colors ${
                  resolvedTheme === "dark"
                    ? "hover:bg-gray-700 text-gray-300 hover:text-white"
                    : "hover:bg-blue-700 text-blue-100 hover:text-white"
                }`}
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                {isMaximized ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={toggleBubble}
                className={`p-1 rounded transition-colors ${
                  resolvedTheme === "dark"
                    ? "hover:bg-gray-700 text-gray-300 hover:text-white"
                    : "hover:bg-blue-700 text-blue-100 hover:text-white"
                }`}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {view === "list" && (
              <>
                {/* Tabs */}
                <div className="flex border-b border-border">
                  <button
                    onClick={() => setActiveTab("recent")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "recent"
                        ? resolvedTheme === "dark"
                          ? "text-blue-400 border-b-2 border-blue-400 bg-gray-800/50"
                          : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                        : resolvedTheme === "dark"
                          ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800/30"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    Recent Chats
                    {/* {chats.length > 0 && (
                      <span className="ml-2 bg-gray-600 text-white text-xs rounded-full px-2 py-0.5">
                        {chats.length}
                      </span>
                    )} */}
                  </button>
                  <button
                    onClick={() => setActiveTab("new")}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === "new"
                        ? resolvedTheme === "dark"
                          ? "text-blue-400 border-b-2 border-blue-400 bg-gray-800/50"
                          : "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                        : resolvedTheme === "dark"
                          ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800/30"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    New Chat
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === "recent" && (
                  <div className="flex-1 overflow-y-auto">
                    {chats.length > 0 ? (
                      <div className="p-3 space-y-2">
                        {chats.map((chat) => (
                          <button
                            key={chat.id}
                            onClick={async () => {
                              try {
                                // Mark chat as read in backend
                                const response = await apiClient.markChatAsRead(
                                  chat.id
                                );

                                if (
                                  response &&
                                  typeof response === "object" &&
                                  "success" in response &&
                                  response.success
                                ) {
                                  // Mark chat as read by setting unreadCount to 0
                                  const updatedChat = {
                                    ...chat,
                                    unreadCount: 0,
                                  };
                                  setSelectedChat(updatedChat);
                                  setView("chat");
                                  setChats((prevChats) =>
                                    prevChats.map((c) =>
                                      c.id === chat.id ? updatedChat : c
                                    )
                                  );

                                  // Refresh chats list to ensure backend sync
                                  setTimeout(() => {
                                    fetchChats();
                                  }, 100);
                                } else {
                                  console.error(
                                    "Backend returned error:",
                                    response
                                  );
                                  // Still open the chat even if marking as read fails
                                  setSelectedChat(chat);
                                  setView("chat");
                                }
                              } catch (error) {
                                console.error(
                                  "Error marking chat as read:",
                                  error
                                );
                                // Still open the chat even if marking as read fails
                                setSelectedChat(chat);
                                setView("chat");
                              }
                            }}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              resolvedTheme === "dark"
                                ? "hover:bg-gray-800 text-white"
                                : "hover:bg-gray-100 text-gray-900"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    resolvedTheme === "dark"
                                      ? "bg-gray-700"
                                      : "bg-gray-200"
                                  }`}
                                >
                                  <User
                                    className={`w-4 h-4 ${
                                      resolvedTheme === "dark"
                                        ? "text-gray-400"
                                        : "text-gray-600"
                                    }`}
                                  />
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-medium truncate">
                                    {getParticipantName(chat)}
                                  </p>
                                  {chat.lastMessage && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {chat.lastMessage.content}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {chat.unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                                  {chat.unreadCount > 9
                                    ? "9+"
                                    : chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => router.push("/chat")}
                          className="w-full p-2 text-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          View All Chats
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center text-muted-foreground">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50 dark:text-muted-foreground/30" />
                          <p className="text-sm">No recent chats</p>
                          <p className="text-xs mt-1">
                            Start a new conversation to begin chatting
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "new" && (
                  <div className="flex-1 overflow-y-auto">
                    {/* Start New Chat Section */}
                    <div className="px-3 py-2 border-b border-border">
                      <h3 className="text-sm font-medium text-foreground">
                        Start New Chat
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {user?.role === "CLIENT"
                          ? "Chat with your assigned lawyers"
                          : "Chat with your assigned clients"}
                      </p>
                    </div>

                    {/* Search - Only show if there are multiple users */}
                    {associatedUsers.length > 1 && (
                      <div className="p-3 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <input
                            type="text"
                            placeholder={`Search ${user?.role === "CLIENT" ? "lawyers" : "clients"}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors ${
                              resolvedTheme === "dark"
                                ? "bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                                : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Associated Users List - Only show if there are multiple users */}
                    {associatedUsers.length > 1 && (
                      <>
                        <div className="px-3 py-2 border-b border-border">
                          <h3 className="text-sm font-medium text-foreground">
                            {user?.role === "CLIENT"
                              ? "Your Lawyers"
                              : "Your Clients"}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {user?.role === "CLIENT"
                              ? "Start a chat with any of your lawyers"
                              : "Start a chat with any of your clients"}
                          </p>
                        </div>
                        <div className="p-3 space-y-2">{renderUsersList()}</div>
                      </>
                    )}

                    {/* Show message when there's only one associated user */}
                    {associatedUsers.length === 1 && (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center text-muted-foreground">
                          <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50 dark:text-muted-foreground/30" />
                          <p className="text-sm">
                            {user?.role === "CLIENT"
                              ? "You have one lawyer assigned. Start chatting!"
                              : "You have one client assigned. Start chatting!"}
                          </p>
                          <button
                            onClick={() => startNewChat(associatedUsers[0].id)}
                            className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Start Chat
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show message when there are no associated users */}
                    {associatedUsers.length === 0 && (
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center text-muted-foreground">
                          <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50 dark:text-muted-foreground/30" />
                          <p className="text-sm">
                            {user?.role === "CLIENT"
                              ? "No lawyers assigned yet"
                              : "No clients assigned yet"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {view === "chat" && selectedChat && (
              <>
                {/* Chat Header */}
                <div
                  className={`p-3 border-b ${
                    resolvedTheme === "dark"
                      ? "border-gray-700 bg-gray-800/50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <button
                    onClick={() => {
                      setView("list");
                      setSelectedChat(null);
                      setMessages([]);
                      setActiveTab("recent"); // Reset to recent tab when going back
                    }}
                    className={`text-sm mb-2 transition-colors ${
                      resolvedTheme === "dark"
                        ? "text-gray-400 hover:text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    ← Back to chats
                  </button>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        resolvedTheme === "dark" ? "bg-gray-700" : "bg-gray-200"
                      }`}
                    >
                      <User
                        className={`w-3 h-3 ${
                          resolvedTheme === "dark"
                            ? "text-gray-400"
                            : "text-gray-600"
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        resolvedTheme === "dark"
                          ? "text-white"
                          : "text-gray-900"
                      }`}
                    >
                      {getParticipantName(selectedChat)}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
                >
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50 dark:text-muted-foreground/30" />
                      <p className="text-sm">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex items-end space-x-2 ${
                          message.senderId === user?.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.senderId !== user?.id && (
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-muted-foreground" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm ${
                            message.senderId === user?.id
                              ? resolvedTheme === "dark"
                                ? "bg-blue-600 text-white shadow-blue-500/25"
                                : "bg-blue-600 text-white shadow-blue-500/25"
                              : resolvedTheme === "dark"
                                ? "bg-gray-700 text-white shadow-gray-600/25"
                                : "bg-gray-100 text-gray-900 shadow-gray-200/25"
                          }`}
                        >
                          <div className="text-sm">{message.content}</div>
                          <div
                            className={`text-[10px] mt-1 ${
                              message.senderId === user?.id
                                ? "text-blue-100"
                                : resolvedTheme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-500"
                            }`}
                          >
                            {formatTime(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-3 border-t border-border">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors ${
                        resolvedTheme === "dark"
                          ? "bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
                          : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                      }`}
                      disabled={sending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sending}
                      className={`px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                        resolvedTheme === "dark"
                          ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-offset-gray-900"
                          : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-offset-white"
                      }`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
