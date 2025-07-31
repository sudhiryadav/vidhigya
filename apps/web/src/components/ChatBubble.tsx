import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { apiClient } from "@/services/api";
import { socketService } from "@/services/socket";
import {
  ArrowLeft,
  Maximize2,
  MessageCircle,
  Minimize2,
  Search,
  Send,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

// Global variable to track active instance
let activeChatBubbleInstance: string | null = null;

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
  avatar?: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

export default function ChatBubble() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  // Generate unique component ID
  const componentId = Math.random().toString(36).substr(2, 9);

  // All useState hooks grouped together
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [view, setView] = useState<"list" | "chat">(() => {
    const savedView = localStorage.getItem("chatBubbleView") as "list" | "chat";
    return savedView || "list";
  });
  const [chats, setChats] = useState<Chat[]>([]);
  const [associatedUsers, setAssociatedUsers] = useState<AssociatedUser[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(() => {
    const savedChatId = localStorage.getItem("chatBubbleSelectedChatId");
    return savedChatId ? ({ id: savedChatId } as Chat) : null;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isActiveInstance, setIsActiveInstance] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // All useRef hooks grouped together
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if on chat page
  const isOnChatPage =
    pathname.includes("/chat/") ||
    pathname.includes("/lawyer/chat/") ||
    pathname.includes("/client/chat/");

  // Check if on auth pages (login, register)
  const isOnAuthPage =
    pathname.includes("/login") || pathname.includes("/register");

  // All useEffect hooks grouped together - MUST be before any conditional returns
  useEffect(() => {
    console.log(
      `ChatBubble component ${componentId} created for user:`,
      user?.id
    );
  }, [componentId, user?.id]);

  // Handle active instance management
  useEffect(() => {
    if (user && isAuthenticated) {
      // If another instance is already active, don't activate this one
      if (
        activeChatBubbleInstance &&
        activeChatBubbleInstance !== componentId
      ) {
        console.log(
          `[${componentId}] Another ChatBubble instance is already active:`,
          activeChatBubbleInstance
        );
        setIsActiveInstance(false);
        return;
      }

      // If no instance is active, activate this one
      if (!activeChatBubbleInstance) {
        activeChatBubbleInstance = componentId;
        setIsActiveInstance(true);
        console.log(
          `[${componentId}] ChatBubble instance activated for user:`,
          user.id
        );
      }

      return () => {
        // Only clear the active instance if this is the one that was active
        if (activeChatBubbleInstance === componentId) {
          activeChatBubbleInstance = null;
          console.log(
            `[${componentId}] ChatBubble instance destroyed for user:`,
            user.id
          );
          // Clear localStorage when component unmounts
          localStorage.removeItem("chatBubbleView");
          localStorage.removeItem("chatBubbleSelectedChatId");
        }
      };
    }
  }, [user, isAuthenticated, componentId]);

  // Handle rendering logic
  useEffect(() => {
    const shouldRenderComponent =
      !isOnChatPage &&
      !isOnAuthPage &&
      !!user &&
      isAuthenticated &&
      isActiveInstance;
    setShouldRender(shouldRenderComponent);

    if (!shouldRenderComponent) {
      console.log("ChatBubble not rendering:", {
        isOnChatPage,
        isOnAuthPage,
        hasUser: !!user,
        isAuthenticated,
        pathname,
        user: user?.id,
        componentId,
        isActiveInstance,
      });
    } else {
      console.log(
        `[${componentId}] ChatBubble rendering for user:`,
        user.id,
        "on pathname:",
        pathname
      );
    }
  }, [
    isOnChatPage,
    isOnAuthPage,
    user,
    isAuthenticated,
    isActiveInstance,
    componentId,
    pathname,
  ]);

  // Handle open chat bubble event
  useEffect(() => {
    const handleOpenChatBubble = () => {
      setIsMinimized(false);
      setIsExpanded(true);
    };

    window.addEventListener("openChatBubble", handleOpenChatBubble);
    return () => {
      window.removeEventListener("openChatBubble", handleOpenChatBubble);
    };
  }, []);

  // Socket connection and data fetching
  useEffect(() => {
    if (!isOnChatPage && user && isAuthenticated && shouldRender) {
      const token = localStorage.getItem("token");
      console.log("Token available:", !!token);
      if (token) {
        console.log(
          `[${componentId}] Connecting to socket from ChatBubble for user:`,
          user.id
        );
        socketService.connect(token);

        setTimeout(() => {
          console.log("Checking socket connection status...");
          if (socketService.isSocketConnected()) {
            console.log("Joining personal room for user:", user.id);
            socketService.joinPersonalRoom(user.id);
          } else {
            console.log("Socket not connected after 1 second");
          }
        }, 1000);
      } else {
        console.log("No token available for socket connection");
      }

      fetchChats();
      fetchAssociatedUsers();
    }
  }, [isOnChatPage, user, isAuthenticated, shouldRender]); // Removed componentId from dependencies

  // Global event listener for new messages
  useEffect(() => {
    if (!shouldRender) return;

    console.log(
      `[${componentId}] Setting up global event listener for user:`,
      user?.id
    );

    const handleGlobalNewMessage = (event: CustomEvent) => {
      console.log(`[${componentId}] Global new message received:`, {
        chatId: event.detail.chatId,
        currentView: view,
        selectedChatId: selectedChat?.id,
        messageSenderId: event.detail.message.senderId,
        currentUserId: user?.id,
        componentId: componentId,
      });

      if (view !== "chat" || selectedChat?.id !== event.detail.chatId) {
        console.log(
          `[${componentId}] Updating unread count for chat:`,
          event.detail.chatId
        );
        console.log(
          `[${componentId}] Current chats:`,
          chats.map((c) => ({ id: c.id, unread: c.unreadCount }))
        );

        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) =>
            chat.id === event.detail.chatId
              ? {
                  ...chat,
                  lastMessage: event.detail.message,
                  unreadCount:
                    event.detail.message.senderId === user?.id
                      ? chat.unreadCount
                      : chat.unreadCount + 1,
                }
              : chat
          );
          console.log(
            `[${componentId}] Updated chats:`,
            updatedChats.map((c) => ({ id: c.id, unread: c.unreadCount }))
          );
          // Deduplicate to prevent duplicate keys
          return updatedChats.filter(
            (chat, index, self) =>
              index === self.findIndex((c) => c.id === chat.id)
          );
        });
      } else {
        console.log(
          `[${componentId}] Not updating unread count - chat is currently focused`
        );
      }
    };

    window.addEventListener(
      "newMessage",
      handleGlobalNewMessage as EventListener
    );

    return () => {
      console.log(
        `[${componentId}] Removing global event listener for user:`,
        user?.id
      );
      window.removeEventListener(
        "newMessage",
        handleGlobalNewMessage as EventListener
      );
    };
  }, [user, view, selectedChat, componentId, shouldRender]); // Removed chats from dependencies

  // Chat-specific effects
  useEffect(() => {
    if (
      view === "chat" &&
      selectedChat &&
      user &&
      isAuthenticated &&
      shouldRender
    ) {
      fetchMessages();
      setupSocketConnection();
      setupEventListeners();
    }

    return () => {
      if (view === "chat" && selectedChat) {
        cleanupEventListeners();
      }
    };
  }, [selectedChat, view, user, isAuthenticated, shouldRender]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (view === "chat" && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, view]);

  // Don't render if still loading or not authenticated
  if (loading || !isAuthenticated) {
    return null;
  }

  // Debug indicator - removed for production

  // Don't render if conditions are not met
  if (!shouldRender) {
    return null;
  }

  // Helper functions
  const getBubbleSize = () => {
    if (isMaximized) return "w-96 h-[600px]";
    if (isExpanded) return "w-80 h-96";
    return "w-12 h-12";
  };

  const getUnreadCount = () => {
    const total = chats.reduce(
      (total, chat) => total + (chat.unreadCount || 0),
      0
    );
    console.log(
      "Total unread count:",
      total,
      "Chats:",
      chats.map((c) => ({
        id: c.id,
        unread: c.unreadCount,
        name: getParticipantName(c),
      }))
    );
    return total;
  };

  const debugState = () => {
    console.log(`[${componentId}] ChatBubble state:`, {
      isMinimized,
      isExpanded,
      isMaximized,
      unreadCount: getUnreadCount(),
      chatsCount: chats.length,
    });
  };

  const setupSocketConnection = () => {
    const token = localStorage.getItem("token");
    if (token) {
      socketService.connect(token);
      if (selectedChat) {
        console.log("Joining chat:", selectedChat.id);
        socketService.joinChat(selectedChat.id);
      }
    }
  };

  const setupEventListeners = () => {
    const handleNewMessage = (event: CustomEvent) => {
      if (event.detail.chatId === selectedChat?.id) {
        setMessages((prev) => [...prev, event.detail.message]);

        if (event.detail.message.senderId !== user?.id) {
          socketService.markAsRead(selectedChat!.id);
        }

        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === event.detail.chatId
              ? {
                  ...chat,
                  lastMessage: event.detail.message,
                  unreadCount:
                    event.detail.message.senderId === user?.id
                      ? chat.unreadCount
                      : 0,
                }
              : chat
          )
        );
      }
    };

    const handleUserTyping = (event: CustomEvent) => {
      if (
        event.detail.chatId === selectedChat?.id &&
        event.detail.userId !== user?.id
      ) {
        setIsTyping(event.detail.isTyping);
      }
    };

    const handleMessagesRead = (event: CustomEvent) => {
      if (event.detail.chatId === selectedChat?.id) {
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            isRead: event.detail.userId === msg.senderId ? true : msg.isRead,
          }))
        );

        if (event.detail.userId === user?.id) {
          setChats((prevChats) =>
            prevChats.map((chat) =>
              chat.id === event.detail.chatId
                ? { ...chat, unreadCount: 0 }
                : chat
            )
          );
        }
      }
    };

    window.addEventListener("newMessage", handleNewMessage as EventListener);
    window.addEventListener("userTyping", handleUserTyping as EventListener);
    window.addEventListener(
      "messagesRead",
      handleMessagesRead as EventListener
    );

    return () => {
      window.removeEventListener(
        "newMessage",
        handleNewMessage as EventListener
      );
      window.removeEventListener(
        "userTyping",
        handleUserTyping as EventListener
      );
      window.removeEventListener(
        "messagesRead",
        handleMessagesRead as EventListener
      );
    };
  };

  const cleanupEventListeners = () => {
    // Event listeners are cleaned up in setupEventListeners return function
  };

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      const data = (await apiClient.getChats()) as Chat[];

      // Log original data to check for duplicates
      const chatIds = data.map((chat) => chat.id);
      const duplicateIds = chatIds.filter(
        (id, index) => chatIds.indexOf(id) !== index
      );
      if (duplicateIds.length > 0) {
        console.warn("Found duplicate chat IDs:", duplicateIds);
      }

      // Deduplicate chats by ID to prevent duplicate keys
      const uniqueChats = data.filter(
        (chat, index, self) => index === self.findIndex((c) => c.id === chat.id)
      );

      console.log(
        `Fetched ${data.length} chats, deduplicated to ${uniqueChats.length} unique chats`
      );
      setChats(uniqueChats);
    } catch (error) {
      console.error("Error fetching chats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssociatedUsers = async () => {
    try {
      const data = (await apiClient.getAssociatedUsers()) as AssociatedUser[];
      setAssociatedUsers(data);
    } catch (error) {
      console.error("Error fetching associated users:", error);
    }
  };

  const openChat = async (chat: Chat) => {
    setSelectedChat(chat);
    setView("chat");
    localStorage.setItem("chatBubbleView", "chat");
    localStorage.setItem("chatBubbleSelectedChatId", chat.id);
    setMessages([]);

    // Mark messages as read immediately
    socketService.markAsRead(chat.id);

    // Update local state to clear unread count - ensure no duplicates
    setChats((prevChats) => {
      const updatedChats = prevChats.map((c) =>
        c.id === chat.id ? { ...c, unreadCount: 0 } : c
      );
      // Deduplicate to prevent duplicate keys
      return updatedChats.filter(
        (chat, index, self) => index === self.findIndex((c) => c.id === chat.id)
      );
    });

    setTimeout(() => scrollToBottom(), 100);
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const data = (await apiClient.getChat(selectedChat.id)) as {
        messages: Message[];
      };
      setMessages(data.messages || []);

      // Mark messages as read when fetching
      if (data.messages && data.messages.length > 0) {
        socketService.markAsRead(selectedChat.id);

        // Update local state to clear unread count - ensure no duplicates
        setChats((prevChats) => {
          const updatedChats = prevChats.map((c) =>
            c.id === selectedChat.id ? { ...c, unreadCount: 0 } : c
          );
          // Deduplicate to prevent duplicate keys
          return updatedChats.filter(
            (chat, index, self) =>
              index === self.findIndex((c) => c.id === chat.id)
          );
        });
      }

      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sending) return;

    try {
      setSending(true);
      await apiClient.sendChatMessage(selectedChat.id, { content: newMessage });
      setNewMessage("");
      socketService.sendMessage(selectedChat.id, newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (selectedChat) {
      socketService.sendTypingStatus(selectedChat.id, true);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      const timeout = setTimeout(() => {
        socketService.sendTypingStatus(selectedChat!.id, false);
      }, 1000);
      setTypingTimeout(timeout);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop =
            messagesContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const startNewChat = async (userId: string) => {
    try {
      const newChat = (await apiClient.startChatWithUser(userId)) as Chat;
      setChats((prev) => [newChat, ...prev]);
      openChat(newChat);
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const goBackToList = () => {
    setView("list");
    setSelectedChat(null);
    localStorage.setItem("chatBubbleView", "list");
    localStorage.removeItem("chatBubbleSelectedChatId");
    setMessages([]);
  };

  const toggleBubble = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
      setIsMinimized(true);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const getParticipantName = (chat: Chat) => {
    const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.name || "Unknown User";
  };

  const getParticipantAvatar = (chat: Chat) => {
    const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.avatar || null;
  };

  const getParticipantInitials = (chat: Chat) => {
    const otherParticipant = chat.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.name?.charAt(0).toUpperCase() || "U";
  };

  const getMessageSenderAvatar = (message: Message) => {
    const sender = chats
      .flatMap((chat) => chat.participants)
      .find((p) => p.id === message.senderId);
    return sender?.avatar || null;
  };

  const getMessageSenderInitials = (message: Message) => {
    const sender = chats
      .flatMap((chat) => chat.participants)
      .find((p) => p.id === message.senderId);
    return sender?.name?.charAt(0).toUpperCase() || "U";
  };

  const getRoleDisplayName = (role: string) => {
    return role === "lawyer" ? "Lawyer" : "Client";
  };

  // Call debug state
  debugState();

  // Debug view state
  console.log(`[${componentId}] ChatBubble view state:`, {
    view,
    selectedChat: selectedChat?.id,
    isExpanded,
    isMinimized,
    isMaximized,
    shouldRender,
  });

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Minimized Bubble */}
      {isMinimized && (
        <button
          onClick={toggleBubble}
          className="relative bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-200 hover:scale-110"
        >
          <MessageCircle className="w-5 h-5" />
          {getUnreadCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {getUnreadCount() > 9 ? "9+" : getUnreadCount()}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Window */}
      {isExpanded && (
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 ${getBubbleSize()} flex flex-col overflow-hidden`}
          style={{ minHeight: isMaximized ? "600px" : "384px" }}
          data-chat-bubble-expanded="true"
        >
          {/* Header */}
          <div className="bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {view === "chat" && (
                <button
                  onClick={goBackToList}
                  className="text-white hover:text-gray-200 dark:hover:text-gray-300"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <h3 className="font-semibold">
                {view === "chat" && selectedChat
                  ? getParticipantName(selectedChat)
                  : "Chats"}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              {view === "chat" && (
                <button
                  onClick={toggleMaximize}
                  className="text-white hover:text-gray-200 dark:hover:text-gray-300"
                >
                  {isMaximized ? (
                    <Minimize2 size={16} />
                  ) : (
                    <Maximize2 size={16} />
                  )}
                </button>
              )}
              <button
                onClick={toggleBubble}
                className="text-white hover:text-gray-200 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {view === "list" && (
              <div className="flex-1 overflow-y-auto p-3">
                {isLoading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    Loading chats...
                  </div>
                ) : chats.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    No chats yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => openChat(chat)}
                        className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {getParticipantAvatar(chat) ? (
                              <img
                                src={getParticipantAvatar(chat)}
                                alt={getParticipantName(chat)}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.nextElementSibling?.classList.remove(
                                    "hidden"
                                  );
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center text-sm font-medium ${getParticipantAvatar(chat) ? "hidden" : ""}`}
                            >
                              {getParticipantInitials(chat)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-medium">
                              {getParticipantName(chat)}
                            </div>
                            {chat.lastMessage && (
                              <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {chat.lastMessage.content}
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0 text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {chat.lastMessage
                                ? formatTime(chat.lastMessage.createdAt)
                                : ""}
                            </div>
                            {chat.unreadCount > 0 && (
                              <div className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center mt-1 ml-auto">
                                {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show associated users for new chats */}
                {associatedUsers.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {user?.role === "LAWYER"
                        ? "Your Clients"
                        : "Your Lawyers"}
                    </div>

                    {/* Show search box if more than 5 users */}
                    {associatedUsers.length > 5 && (
                      <div className="mb-3">
                        <div className="relative">
                          <Search
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                            size={16}
                          />
                          <input
                            type="text"
                            placeholder={`Search ${user?.role === "LAWYER" ? "clients" : "lawyers"}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {associatedUsers
                        .filter((user) =>
                          user.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                        .map((associatedUser) => (
                          <div
                            key={associatedUser.id}
                            onClick={() => startNewChat(associatedUser.id)}
                            className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {associatedUser.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {associatedUser.name}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  {getRoleDisplayName(associatedUser.role)}
                                </div>
                              </div>
                              <div className="ml-auto">
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    associatedUser.isOnline
                                      ? "bg-green-500"
                                      : "bg-gray-400"
                                  }`}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === "chat" && selectedChat && (
              <>
                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
                >
                  {messages.map((message) => (
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
                          {getMessageSenderAvatar(message) ? (
                            <img
                              src={getMessageSenderAvatar(message)}
                              alt="Sender"
                              className="w-6 h-6 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  "hidden"
                                );
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-500 text-white flex items-center justify-center text-xs font-medium ${getMessageSenderAvatar(message) ? "hidden" : ""}`}
                          >
                            {getMessageSenderInitials(message)}
                          </div>
                        </div>
                      )}

                      <div
                        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                          message.senderId === user?.id
                            ? "bg-blue-600 dark:bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        <div className="text-sm">{message.content}</div>
                        <div
                          className={`text-[10px] mt-1 ${
                            message.senderId === user?.id
                              ? "text-blue-100"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 px-3 py-2 rounded-lg">
                        <div className="text-sm">Typing...</div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input - Fixed at bottom */}
                <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                  <div className="flex space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={16} />
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
