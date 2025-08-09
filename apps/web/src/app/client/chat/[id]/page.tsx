"use client";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { socketService } from "@/services/socket";
import { ArrowLeft, Send, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

interface Chat {
  id: string;
  participants: any[];
  messages: Message[];
}

export default function ClientChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const chatId = params.id as string;

  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChat();
    setupSocketConnection();
    setupEventListeners();

    return () => {
      socketService.leaveChat(chatId);
      cleanupEventListeners();
    };
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocketConnection = () => {
    const token = localStorage.getItem("token");
    if (token) {
      socketService.connect(token);
      socketService.joinChat(chatId);
    }
  };

  const setupEventListeners = () => {
    const handleNewMessage = (event: CustomEvent) => {
      if (event.detail.chatId === chatId) {
        setMessages((prev) => [...prev, event.detail.message]);
        socketService.markAsRead(chatId);
      }
    };

    const handleUserTyping = (event: CustomEvent) => {
      if (event.detail.chatId === chatId && event.detail.userId !== user?.id) {
        setIsTyping(event.detail.isTyping);
      }
    };

    const handleMessagesRead = (event: CustomEvent) => {
      if (event.detail.chatId === chatId) {
        // Update read status for messages
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            isRead: event.detail.userId === msg.senderId ? true : msg.isRead,
          }))
        );
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
    window.removeEventListener("newMessage", () => {});
    window.removeEventListener("userTyping", () => {});
    window.removeEventListener("messagesRead", () => {});
  };

  const fetchChat = async () => {
    try {
      const response = await apiClient.getChat(chatId);
      if (
        response &&
        typeof response === "object" &&
        "messages" in response &&
        "participants" in response
      ) {
        setChat(response as Chat);
        setMessages(response.messages as Message[]);
      } else {
        setChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error fetching chat:", error);
      toast.error("Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    try {
      // Send via Socket.IO for real-time delivery
      socketService.sendMessage(chatId, newMessage);

      // Optimistically add message to UI
      const tempMessage: Message = {
        id: Date.now().toString(),
        content: newMessage,
        senderId: user.id,
        createdAt: new Date().toISOString(),
        isRead: false,
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");

      // Stop typing indicator
      socketService.sendTypingStatus(chatId, false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Send typing status
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    socketService.sendTypingStatus(chatId, true);

    const timeout = setTimeout(() => {
      socketService.sendTypingStatus(chatId, false);
    }, 1000);

    setTypingTimeout(timeout);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getLawyerName = () => {
    if (!chat) return "Unknown";
    return (
      chat.participants.find((p: any) => p.id !== user?.id)?.name || "Unknown"
    );
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Chat not found
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          The chat you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/client/chat"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Chats
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/client/chat"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {getLawyerName()}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your Lawyer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.senderId === user?.id;

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage
                        ? "text-blue-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getLawyerName()} is typing&hellip;
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
