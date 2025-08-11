"use client";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { getSocketService } from "@/services/socket";
import { ArrowLeft, Send, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}

interface Participant {
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const chatId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatId) {
      loadChat();
    }
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for online status updates
  useEffect(() => {
    const handleUserStatusChange = (event: CustomEvent) => {
      const { userId, isOnline } = event.detail;

      // Update the participant's online status if it matches
      setParticipants((prev) =>
        prev.map((participant) =>
          participant.id === userId ? { ...participant, isOnline } : participant
        )
      );
    };

    // Add event listener for user status changes
    window.addEventListener(
      "userStatusChange",
      handleUserStatusChange as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "userStatusChange",
        handleUserStatusChange as EventListener
      );
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadChat = async () => {
    try {
      setLoading(true);
      console.log("Loading chat with ID:", chatId);
      const response = await apiClient.getChat(chatId);
      console.log("API response:", response);

      if (
        response &&
        typeof response === "object" &&
        "messages" in response &&
        "participants" in response
      ) {
        console.log("Setting messages:", response.messages);
        console.log("Setting participants:", response.participants);
        setMessages(response.messages as any[]);
        setParticipants(response.participants as any[]);
      } else {
        console.error("Invalid response format from API:", response);
        setMessages([]);
        setParticipants([]);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      setMessages([]);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time message updates
  useEffect(() => {
    // Check socket connection status
    console.log("Socket service available:", !!getSocketService());
    console.log("Socket connected:", getSocketService().isSocketConnected());
    console.log("Socket state:", getSocketService().getSocketState());

    // Try to reconnect if not connected
    if (!getSocketService().isSocketConnected()) {
      console.log("Socket not connected, attempting to reconnect...");
      const token = localStorage.getItem("token");
      if (token) {
        getSocketService().forceReconnect(token);
      }
    }

    // Global duplicate prevention - track processed message IDs
    if (!window.processedMessageIds) {
      window.processedMessageIds = new Set();
    }

    const handleNewMessage = (event: CustomEvent) => {
      console.log("=== CLIENT SIDE: Received newMessage event ===");
      console.log("Event detail:", event.detail);
      const { message } = event.detail;

      // Check if message belongs to this chat by comparing both possible chat ID formats
      const currentChatId = chatId;
      const messageChatId = message?.chatId;

      // Chat ID can be in two formats: "senderId-receiverId" or "receiverId-senderId"
      // We need to check if the message belongs to this chat regardless of the order
      const isMessageForThisChat =
        message &&
        messageChatId &&
        (messageChatId === currentChatId ||
          messageChatId === currentChatId.split("-").reverse().join("-"));

      console.log("Chat ID comparison:", {
        currentChatId,
        messageChatId,
        reversedCurrentChatId: currentChatId.split("-").reverse().join("-"),
        isMessageForThisChat,
      });

      // Only add the message if it belongs to this chat
      if (isMessageForThisChat) {
        console.log("Message belongs to this chat, processing...");

        // Ensure processedMessageIds is initialized
        if (!window.processedMessageIds) {
          window.processedMessageIds = new Set();
        }

        // Check if message was already processed globally
        if (window.processedMessageIds.has(message.id)) {
          console.log(
            "Message already processed globally, skipping:",
            message.id
          );
          return;
        }

        // Mark message as processed globally
        window.processedMessageIds.add(message.id);

        // Clean up old message IDs to prevent memory leaks
        if (window.processedMessageIds.size > 100) {
          const idsArray = Array.from(window.processedMessageIds);
          window.processedMessageIds.clear();
          idsArray
            .slice(-50)
            .forEach((id) => window.processedMessageIds.add(id));
        }

        setMessages((prev) => {
          // Check if message already exists in the current state
          if (prev.some((msg) => msg.id === message.id)) {
            console.log(
              "Message already exists in state, skipping:",
              message.id
            );
            return prev;
          }

          // Also check if it's a temporary message that should be replaced
          const existingTempIndex = prev.findIndex(
            (msg) =>
              msg.id.startsWith("temp") &&
              msg.content === message.content &&
              msg.senderId === message.senderId
          );

          if (existingTempIndex !== -1) {
            // Replace the temporary message
            console.log(
              "Replacing temporary message with real message:",
              message.id
            );
            const newMessages = [...prev];
            newMessages[existingTempIndex] = {
              ...newMessages[existingTempIndex],
              id: message.id,
              createdAt: new Date(message.createdAt),
            };
            return newMessages;
          }

          console.log("Adding new message to state:", message);
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
        console.log("=== CLIENT SIDE: newMessage processed successfully ===");
      } else {
        console.log("Message does not belong to this chat or is invalid:", {
          message,
          currentChatId,
          messageChatId,
          reversedCurrentChatId: currentChatId.split("-").reverse().join("-"),
          isMessageForThisChat,
        });
      }
    };

    const handleMessageSent = (event: CustomEvent) => {
      console.log("=== CLIENT SIDE: Received messageSent event ===");
      console.log("Event detail:", event.detail);
      const { message } = event.detail;

      // Replace temporary message with real message
      if (message && message.senderId === user?.id) {
        console.log(
          "Replacing temporary message with real message:",
          message.id
        );
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id.startsWith("temp")
              ? {
                  ...msg,
                  id: message.id,
                  createdAt: new Date(message.createdAt),
                }
              : msg
          )
        );
        console.log("=== CLIENT SIDE: messageSent processed successfully ===");
      } else {
        console.log("Message sent event not for current user or invalid:", {
          message,
          currentUserId: user?.id,
          messageSenderId: message?.senderId,
        });
      }
    };

    // Add event listeners
    window.addEventListener("newMessage", handleNewMessage as EventListener);
    window.addEventListener("messageSent", handleMessageSent as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener(
        "newMessage",
        handleNewMessage as EventListener
      );
      window.removeEventListener(
        "messageSent",
        handleMessageSent as EventListener
      );
    };
  }, [chatId, user?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    console.log("=== CLIENT SIDE: Starting message send process ===");
    console.log("Message content:", newMessage);
    console.log("Current user:", {
      id: user?.id,
      name: user?.name,
      role: user?.role,
      email: user?.email,
    });
    console.log("Chat ID from URL:", chatId);
    console.log("All participants:", participants);
    console.log("Current user ID:", user?.id);

    try {
      setSending(true);

      // Get the other participant's ID
      const otherParticipant = participants.find((p) => p.id !== user?.id);
      if (!otherParticipant) {
        console.error("ERROR: No other participant found!");
        console.error("Participants:", participants);
        console.error("Current user ID:", user?.id);
        toast.error("No participant found");
        return;
      }

      console.log("Other participant found:", otherParticipant);
      console.log("Socket service available:", !!getSocketService());
      console.log("Socket connected:", getSocketService().isSocketConnected());
      console.log("Socket state:", getSocketService().getSocketState());

      // Construct the chat ID in the format expected by the backend: "senderId-receiverId"
      const constructedChatId = `${user?.id}-${otherParticipant.id}`;
      console.log("Constructed chat ID:", constructedChatId);
      console.log("Expected format: senderId-receiverId");
      console.log("Actual format:", constructedChatId);

      // Send message via socket for real-time delivery
      if (getSocketService().isSocketConnected()) {
        console.log("=== SENDING VIA SOCKET ===");
        console.log(
          "Socket service state:",
          getSocketService().getSocketState()
        );
        console.log("Constructed chat ID for socket:", constructedChatId);

        // Log before calling sendMessage
        console.log("About to call getSocketService().sendMessage with:", {
          chatId: constructedChatId,
          content: newMessage,
          type: "TEXT",
        });

        getSocketService().sendMessage(constructedChatId, newMessage, "TEXT");

        console.log("sendMessage called successfully");

        // Add message to local state immediately for optimistic UI
        const tempMessage = {
          id: `temp-${Date.now()}`,
          content: newMessage,
          senderId: user?.id || "",
          senderName: user?.name || "You",
          type: "TEXT",
          isRead: false,
          createdAt: new Date(),
        };

        console.log("Adding temp message to local state:", tempMessage);
        setMessages((prev) => [...prev, tempMessage]);
        setNewMessage("");
        console.log("=== SOCKET SEND COMPLETED ===");
      } else {
        console.log("=== FALLING BACK TO REST API ===");
        console.log("Socket not connected, falling back to REST API");
        console.log(
          "Socket service state:",
          getSocketService().getSocketState()
        );
        console.log("Constructed chat ID for REST API:", constructedChatId);

        // Fallback to REST API if socket is not connected
        console.log("Calling apiClient.sendChatMessage with:", {
          chatId: constructedChatId,
          message: { content: newMessage, type: "TEXT" },
        });

        const message = await apiClient.sendChatMessage(constructedChatId, {
          content: newMessage,
          type: "TEXT",
        });

        console.log("REST API response:", message);

        if (message && typeof message === "object" && "id" in message) {
          console.log("REST API message added to state:", message);
          setMessages((prev) => [...prev, message as Message]);
          setNewMessage("");
        } else {
          console.error("REST API response invalid:", message);
        }
        console.log("=== REST API SEND COMPLETED ===");
      }
    } catch (error) {
      console.error("=== ERROR IN MESSAGE SENDING ===");
      console.error("Error details:", error);
      console.error(
        "Error message:",
        error instanceof Error ? error.message : "Unknown error"
      );
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      toast.error("Failed to send message");
    } finally {
      setSending(false);
      console.log("=== MESSAGE SEND PROCESS COMPLETED ===");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading chat...
          </p>
        </div>
      </div>
    );
  }

  const otherParticipant = participants.find((p) => p.id !== user?.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                {otherParticipant?.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                )}
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {otherParticipant?.name || "Unknown User"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {otherParticipant?.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-card rounded-lg shadow-sm border border-border h-[calc(100vh-200px)] flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderId === user?.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === user?.id
                        ? "bg-blue-600 text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.senderId === user?.id
                          ? "text-blue-100"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-6 border-t border-border">
            <div className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground resize-none"
                  rows={3}
                  disabled={sending}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? "Sending..." : "Send"}</span>
              </button>

              {/* Debug button for testing */}
              <button
                onClick={() => {
                  console.log("=== DEBUG: Test button clicked ===");
                  console.log("Current user:", user);
                  console.log("Participants:", participants);
                  console.log("Chat ID from URL:", chatId);
                  console.log("Socket service:", getSocketService());
                  console.log(
                    "Socket connected:",
                    getSocketService().isSocketConnected()
                  );
                  console.log(
                    "Socket state:",
                    getSocketService().getSocketState()
                  );
                  console.log(
                    "Window processedMessageIds:",
                    window.processedMessageIds
                  );
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                title="Debug info"
              >
                Debug
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
