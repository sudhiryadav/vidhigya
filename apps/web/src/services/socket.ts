import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  isRead: boolean;
}

interface ChatNotification {
  chatId: string;
  message: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
  senderName: string;
}

interface VideoCallNotification {
  type: "VIDEO_CALL_INSTANT" | "VIDEO_CALL_STARTED";
  title: string;
  message: string;
  meetingId: string;
  meetingUrl: string;
  callId: string;
  hostName: string;
  callTitle: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private connectionId = Math.random().toString(36).substr(2, 9);
  private processingNotifications = new Set<string>(); // Track notifications being processed

  connect(token: string) {
    if (this.socket?.connected) {
      console.log(
        `[${this.connectionId}] Socket already connected, skipping connection`
      );
      return;
    }

    // If we have a socket but it's not connected, disconnect it first
    if (this.socket && !this.socket.connected) {
      console.log(
        `[${this.connectionId}] Disconnecting existing socket before reconnecting`
      );
      this.socket.disconnect();
      this.socket = null;
    }

    console.log(
      `[${this.connectionId}] Connecting to socket with token:`,
      token ? "present" : "missing"
    );

    this.socket = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected successfully");
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
      this.handleReconnect();
    });

    this.socket.on("error", (error) => {
      toast.error(error.message || "Chat connection error");
    });

    this.socket.on("chat_notification", (notification: ChatNotification) => {
      this.handleChatNotification(notification);
    });

    this.socket.on(
      "video_call_notification",
      (notification: VideoCallNotification) => {
        this.handleVideoCallNotification(notification);
      }
    );

    this.socket.on(
      "new_message",
      (data: { chatId: string; message: ChatMessage }) => {
        console.log(
          `[${this.connectionId}] Socket received new_message event:`,
          data
        );
        this.handleNewMessage(data);
      }
    );

    this.socket.on(
      "user_typing",
      (data: { chatId: string; userId: string; isTyping: boolean }) => {
        this.handleUserTyping(data);
      }
    );

    this.socket.on(
      "messages_read",
      (data: { chatId: string; userId: string }) => {
        this.handleMessagesRead(data);
      }
    );

    this.socket.on("joined_chat", (data: { chatId: string }) => {
      // Chat joined successfully
    });

    this.socket.on("left_chat", (data: { chatId: string }) => {
      // Chat left successfully
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, 1000 * this.reconnectAttempts);
    }
  }

  private handleChatNotification(notification: ChatNotification) {
    console.log(`[${this.connectionId}] Handling chat notification:`, {
      chatId: notification.chatId,
      messageId: notification.message.id,
      senderName: notification.senderName,
      content: notification.message.content.substring(0, 30) + "...",
    });

    const currentPath = window.location.pathname;
    const isOnChatPage =
      currentPath.includes("/chat/") ||
      currentPath.includes("/lawyer/chat/") ||
      currentPath.includes("/client/chat/");

    // Check if chat bubble is minimized (we'll use a custom event to check this)
    const isChatBubbleMinimized = !document.querySelector(
      '[data-chat-bubble-expanded="true"]'
    );

    console.log(`[${this.connectionId}] Toast conditions:`, {
      isOnChatPage,
      isChatBubbleMinimized,
      shouldShowToast: !isOnChatPage && isChatBubbleMinimized,
    });

    // Only show toast if not on chat page AND chat bubble is minimized
    // Also check if we haven't already shown a toast for this message
    if (!isOnChatPage && isChatBubbleMinimized) {
      // Use a more robust deduplication key with timestamp
      const toastKey = `toast-${notification.chatId}-${notification.message.senderId}-${notification.message.content.substring(0, 20)}-${Date.now()}`;

      console.log(`[${this.connectionId}] Checking toast key:`, toastKey);

      // Check if we're already processing this notification
      if (this.processingNotifications.has(toastKey)) {
        console.log(
          `[${this.connectionId}] Already processing this notification, skipping`
        );
        return;
      }

      // Check if we've shown a toast for this exact message recently (within 5 seconds)
      const recentToastKey = `recent-toast-${notification.chatId}-${notification.message.id}`;
      if (localStorage.getItem(recentToastKey)) {
        console.log(
          `[${this.connectionId}] Recent toast already shown for this message, skipping`
        );
        return;
      }

      // Mark this notification as being processed
      this.processingNotifications.add(toastKey);

      const senderName = notification.senderName || "Someone";
      const message = `New message from ${senderName}: ${notification.message.content.substring(0, 50)}${notification.message.content.length > 50 ? "..." : ""}`;

      console.log(`[${this.connectionId}] Showing toast:`, message);

      toast.success(message, {
        duration: 5000,
        id: toastKey, // Use unique ID to prevent duplicate toasts
      });

      // Mark that we've shown a toast for this message recently
      localStorage.setItem(recentToastKey, "true");

      // Clean up the recent toast key after 5 seconds
      setTimeout(() => {
        localStorage.removeItem(recentToastKey);
        console.log(
          `[${this.connectionId}] Cleaned up recent toast key:`,
          recentToastKey
        );
      }, 5000);

      // Clean up the processing flag after 10 seconds
      setTimeout(() => {
        this.processingNotifications.delete(toastKey);
        console.log(
          `[${this.connectionId}] Cleaned up processing flag:`,
          toastKey
        );
      }, 10000);

      // Add click handler to the toast element
      setTimeout(() => {
        const toastElement =
          document.querySelector(`[data-testid="toast-${toastKey}"]`) ||
          document.querySelector(".react-hot-toast");
        if (toastElement) {
          toastElement.addEventListener("click", () => {
            // Dispatch event to open chat bubble
            window.dispatchEvent(new CustomEvent("openChatBubble"));

            // Navigate to chat if not on chat page
            if (!isOnChatPage) {
              const chatPath = currentPath.includes("/lawyer/")
                ? `/lawyer/chat/${notification.chatId}`
                : `/client/chat/${notification.chatId}`;
              window.location.href = chatPath;
            }
          });
        }
      }, 100);
    } else {
      console.log(
        `[${this.connectionId}] Not showing toast - conditions not met`
      );
    }
  }

  private handleVideoCallNotification(notification: VideoCallNotification) {
    console.log(`[${this.connectionId}] Handling video call notification:`, {
      type: notification.type,
      callId: notification.callId,
      meetingId: notification.meetingId,
      hostName: notification.hostName,
    });

    const currentPath = window.location.pathname;
    const isOnVideoCallPage = currentPath.includes("/video-call-room/");

    // Don't show toast if user is already in the video call room
    if (isOnVideoCallPage) {
      console.log(
        `[${this.connectionId}] Not showing video call toast - user is in video call room`
      );
      return;
    }

    // Create a unique toast key for this notification
    const toastKey = `video-call-toast-${notification.callId}-${Date.now()}`;

    // Check if we're already processing this notification
    if (this.processingNotifications.has(toastKey)) {
      console.log(
        `[${this.connectionId}] Already processing this video call notification, skipping`
      );
      return;
    }

    // Mark this notification as being processed
    this.processingNotifications.add(toastKey);

    // Create a simple toast with join link
    const message = `${notification.hostName} has started a video call: ${notification.callTitle}`;

    toast.success(message, {
      duration: Infinity, // Toast will not auto-close
      id: toastKey,
    });

    // Add click handler to the toast element after a short delay
    setTimeout(() => {
      const toastElement =
        document.querySelector(`[data-testid="toast-${toastKey}"]`) ||
        document.querySelector(".react-hot-toast");
      if (toastElement) {
        const htmlElement = toastElement as HTMLElement;
        htmlElement.addEventListener("click", () => {
          // Store pre-call settings
          localStorage.setItem("preCallAudioEnabled", "true");
          localStorage.setItem("preCallVideoEnabled", "true");

          // Navigate to video call room
          window.open(`/video-call-room/${notification.meetingId}`, "_blank");
          toast.dismiss(toastKey);
        });

        // Add a visual indicator that it's clickable
        htmlElement.style.cursor = "pointer";
        htmlElement.title = "Click to join the video call";
      }
    }, 100);

    // Clean up the processing flag after 30 seconds
    setTimeout(() => {
      this.processingNotifications.delete(toastKey);
      console.log(
        `[${this.connectionId}] Cleaned up video call notification processing flag:`,
        toastKey
      );
    }, 30000);
  }

  private handleNewMessage(data: { chatId: string; message: ChatMessage }) {
    console.log("Received new message:", data);
    // This will be handled by the chat components
    const event = new CustomEvent("newMessage", { detail: data });
    console.log("Dispatching newMessage event:", event);
    window.dispatchEvent(event);
  }

  private handleUserTyping(data: {
    chatId: string;
    userId: string;
    isTyping: boolean;
  }) {
    // This will be handled by the chat components
    window.dispatchEvent(new CustomEvent("userTyping", { detail: data }));
  }

  private handleMessagesRead(data: { chatId: string; userId: string }) {
    // This will be handled by the chat components
    window.dispatchEvent(new CustomEvent("messagesRead", { detail: data }));
  }

  joinChat(chatId: string) {
    if (!this.socket?.connected) {
      console.error("Socket not connected, cannot join chat");
      return;
    }
    console.log("Joining chat room:", chatId);
    this.socket.emit("join_chat", { chatId });
  }

  joinPersonalRoom(userId: string) {
    if (!this.socket?.connected) {
      console.error("Socket not connected, cannot join personal room");
      return;
    }
    console.log("Joining personal room for user:", userId);
    this.socket.emit("join_personal_room", { userId });
  }

  leaveChat(chatId: string) {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit("leave_chat", { chatId });
  }

  sendMessage(chatId: string, content: string, type = "text") {
    if (!this.socket?.connected) {
      console.error("Socket not connected, cannot send message");
      return;
    }
    console.log("Emitting send_message:", { chatId, content, type });
    this.socket.emit("send_message", { chatId, content, type });
  }

  markAsRead(chatId: string) {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit("mark_as_read", { chatId });
  }

  sendTypingStatus(chatId: string, isTyping: boolean) {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit("typing", { chatId, isTyping });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Create a singleton instance
export const socketService = new SocketService();

// Prevent multiple instances
let isInitialized = false;
export const initializeSocketService = () => {
  if (!isInitialized) {
    console.log("Initializing socket service singleton");
    isInitialized = true;
  }
  return socketService;
};
