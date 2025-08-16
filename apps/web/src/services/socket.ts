import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

// Extend Window interface to include socketServiceInstance
declare global {
  interface Window {
    socketServiceInstance?: SocketService;
    processedMessageIds?: Set<string>;
  }
}

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
  private processedMessages = new Set<string>(); // Track processed messages to prevent duplicates

  connect(token: string) {
    // Prevent multiple connections
    if (this.socket?.connected) {
      console.log(
        `[${this.connectionId}] Socket already connected, skipping connection`
      );
      return;
    }

    // Check if another instance is already connected
    if (window.socketServiceInstance && window.socketServiceInstance !== this) {
      console.log(
        `[${this.connectionId}] Another socket instance is already connected, using that one`
      );
      // Copy the connection state from the existing instance
      this.socket = window.socketServiceInstance.socket;
      this.isConnected = window.socketServiceInstance.isConnected;
      return;
    }

    // Check if there's already a global socket connection
    if (window.socketServiceInstance?.socket?.connected) {
      console.log(
        `[${this.connectionId}] Global socket already connected, using that one`
      );
      this.socket = window.socketServiceInstance.socket;
      this.isConnected = window.socketServiceInstance.isConnected;
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
    console.log(
      `[${this.connectionId}] Token length:`,
      token ? token.length : 0
    );
    console.log(
      `[${this.connectionId}] Token preview:`,
      token ? `${token.substring(0, 20)}...` : "none"
    );
    console.log(
      `[${this.connectionId}] API URL:`,
      process.env.NEXT_PUBLIC_API_URL
    );

    // Remove /api from the URL for socket connection
    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "");
    console.log(`[${this.connectionId}] Socket URL:`, socketUrl);

    // Check if backend is reachable
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then(() => {
        console.log(`[${this.connectionId}] Backend is reachable`);
      })
      .catch((error) => {
        console.error(`[${this.connectionId}] Backend not reachable:`, error);
      });

    this.socket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    // Mark this as the active instance
    window.socketServiceInstance = this;

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log(`[${this.connectionId}] Socket connected successfully`);
      console.log(`[${this.connectionId}] Socket ID:`, this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", () => {
      console.log(`[${this.connectionId}] Socket disconnected`);
      this.isConnected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error(`[${this.connectionId}] Socket connection error:`, error);
      this.handleReconnect();
    });

    this.socket.on("error", (error) => {
      console.error(`[${this.connectionId}] Socket error:`, error);
      toast.error(error.message || "Chat connection error");
    });

    // Listen for user online/offline status updates
    this.socket.on(
      "userOnline",
      (data: { userId: string; isOnline: boolean }) => {
        console.log(`User ${data.userId} is now online`);
        // Emit custom event for components to listen to
        window.dispatchEvent(
          new CustomEvent("userStatusChange", {
            detail: { userId: data.userId, isOnline: true },
          })
        );
      }
    );

    this.socket.on(
      "userOffline",
      (data: { userId: string; isOnline: boolean }) => {
        console.log(`User ${data.userId} is now offline`);
        // Emit custom event for components to listen to
        window.dispatchEvent(
          new CustomEvent("userStatusChange", {
            detail: { userId: data.userId, isOnline: false },
          })
        );
      }
    );

    this.socket.on("chat_notification", (notification: ChatNotification) => {
      this.handleChatNotification(notification);
    });

    this.socket.on(
      "video_call_notification",
      (notification: VideoCallNotification) => {
        this.handleVideoCallNotification(notification);
      }
    );

    this.socket.on("messageSent", (message: ChatMessage) => {
      console.log(
        `[${this.connectionId}] Socket received messageSent event:`,
        message
      );

      // Check if message was already processed
      if (this.processedMessages.has(message.id)) {
        console.log(
          `[${this.connectionId}] Message ${message.id} already processed, skipping`
        );
        return;
      }

      // Mark message as processed
      this.processedMessages.add(message.id);

      // Emit custom event for components to listen to
      window.dispatchEvent(
        new CustomEvent("messageSent", {
          detail: { message },
        })
      );
    });

    this.socket.on("newMessage", (message: ChatMessage) => {
      console.log(
        `[${this.connectionId}] Socket received new_message event:`,
        message
      );

      // Check if message was already processed
      if (this.processedMessages.has(message.id)) {
        console.log(
          `[${this.connectionId}] Message ${message.id} already processed, skipping`
        );
        return;
      }

      // Mark message as processed
      this.processedMessages.add(message.id);

      // Emit custom event for components to listen to
      window.dispatchEvent(
        new CustomEvent("newMessage", {
          detail: { message },
        })
      );
    });

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
    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: Received newMessage from backend ===`
    );
    console.log(`[${this.connectionId}] Data received:`, data);

    // Check if message was already processed
    if (this.processedMessages.has(data.message.id)) {
      console.log(
        `[${this.connectionId}] Message ${data.message.id} already processed, skipping`
      );
      return;
    }

    // Mark as processed
    this.processedMessages.add(data.message.id);
    console.log(
      `[${this.connectionId}] Message marked as processed:`,
      data.message.id
    );

    // This will be handled by the chat components
    const event = new CustomEvent("newMessage", { detail: data });
    console.log(`[${this.connectionId}] Dispatching newMessage event:`, event);
    window.dispatchEvent(event);
    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: newMessage event dispatched ===`
    );
  }

  private handleMessageSent(data: { chatId: string; message: ChatMessage }) {
    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: Received messageSent from backend ===`
    );
    console.log(`[${this.connectionId}] Data received:`, data);

    // Check if message was already processed
    if (this.processedMessages.has(data.message.id)) {
      console.log(
        `[${this.connectionId}] Message ${data.message.id} already processed, skipping`
      );
      return;
    }

    // Mark as processed
    this.processedMessages.add(data.message.id);
    console.log(
      `[${this.connectionId}] Message marked as processed:`,
      data.message.id
    );

    // This will be handled by the chat components
    const event = new CustomEvent("messageSent", { detail: data });
    console.log(`[${this.connectionId}] Dispatching messageSent event:`, event);
    window.dispatchEvent(event);
    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: messageSent event dispatched ===`
    );
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
      console.error(
        `[${this.connectionId}] ERROR: Socket not connected, cannot join personal room`
      );
      return;
    }
    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: Joining personal room ===`
    );
    console.log(`[${this.connectionId}] User ID:`, userId);
    console.log(`[${this.connectionId}] Room name: user_${userId}`);

    this.socket.emit("join_personal_room", { userId });
    console.log(`[${this.connectionId}] join_personal_room event emitted`);
    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: Personal room join completed ===`
    );
  }

  leaveChat(chatId: string) {
    if (!this.socket?.connected) {
      return;
    }
    this.socket.emit("leave_chat", { chatId });
  }

  sendMessage(chatId: string, content: string, type = "TEXT") {
    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: sendMessage called ===`
    );
    console.log(`[${this.connectionId}] Parameters:`, {
      chatId,
      content,
      type,
    });

    if (!this.socket?.connected) {
      console.error(
        `[${this.connectionId}] ERROR: Socket not connected, cannot send message`
      );
      console.error(`[${this.connectionId}] Socket state:`, {
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        socketId: this.socket?.id,
      });
      return;
    }

    // Parse chatId to get receiverId (chatId format: "senderId-receiverId")
    const [senderId, receiverId] = chatId.split("-");
    if (!senderId || !receiverId) {
      console.error(
        `[${this.connectionId}] ERROR: Invalid chatId format:`,
        chatId
      );
      console.error(
        `[${this.connectionId}] Expected format: "senderId-receiverId"`
      );
      console.error(`[${this.connectionId}] Parsed parts:`, {
        senderId,
        receiverId,
      });
      return;
    }

    console.log(`[${this.connectionId}] Chat ID parsed successfully:`, {
      originalChatId: chatId,
      parsedSenderId: senderId,
      parsedReceiverId: receiverId,
      content,
      type,
    });

    console.log(`[${this.connectionId}] Socket details:`, {
      socketConnected: this.socket.connected,
      socketId: this.socket.id,
    });

    console.log(`[${this.connectionId}] Emitting sendMessage event with:`, {
      content,
      receiverId,
      type,
    });

    try {
      this.socket.emit("sendMessage", { content, receiverId, type });
      console.log(
        `[${this.connectionId}] sendMessage event emitted successfully`
      );
    } catch (error) {
      console.error(
        `[${this.connectionId}] ERROR emitting sendMessage:`,
        error
      );
    }

    console.log(
      `[${this.connectionId}] === SOCKET SERVICE: sendMessage completed ===`
    );
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
    }
    this.isConnected = false;
    this.processedMessages.clear(); // Clear processed messages
  }

  // Clean up old processed messages (keep only last 100)
  private cleanupProcessedMessages() {
    if (this.processedMessages.size > 100) {
      const messagesArray = Array.from(this.processedMessages);
      this.processedMessages.clear();
      // Keep only the last 50 messages
      messagesArray.slice(-50).forEach((id) => this.processedMessages.add(id));
    }
  }

  isSocketConnected() {
    const connected = this.isConnected && this.socket?.connected;
    console.log(`[${this.connectionId}] isSocketConnected check:`, {
      isConnected: this.isConnected,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
      result: connected,
    });
    return connected;
  }

  // Check socket state directly
  getSocketState() {
    return {
      isConnected: this.isConnected,
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
    };
  }

  // Force reconnect
  forceReconnect(token: string) {
    console.log(`[${this.connectionId}] Force reconnecting...`);
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.connect(token);
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

    // Ensure only one instance exists
    if (
      window.socketServiceInstance &&
      window.socketServiceInstance !== socketService
    ) {
      console.log("Another socket instance found, replacing it");
      window.socketServiceInstance.disconnect();
    }
    window.socketServiceInstance = socketService;
  }
  return socketService;
};

// Export a function to get the singleton instance
export const getSocketService = () => {
  if (!isInitialized) {
    return initializeSocketService();
  }
  return socketService;
};
