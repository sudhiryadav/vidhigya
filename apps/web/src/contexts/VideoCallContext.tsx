"use client";

import VideoCallControls from "@/components/VideoCallControls";
import VideoDisplay from "@/components/VideoDisplay";
import { Maximize, Minimize, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface VideoCallState {
  isActive: boolean;
  meetingId: string | null;
  title: string;
  isMinimized: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  participants: any[];
  isInVideoRoom: boolean; // Track if user is in video call room
}

interface VideoCallContextType {
  videoCallState: VideoCallState;
  startVideoCall: (meetingId: string, title: string) => Promise<void>;
  endVideoCall: () => void;
  toggleMinimize: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  updateLocalStream: (stream: MediaStream | null) => void;
  updateRemoteStream: (stream: MediaStream | null) => void;
  updateCallDuration: (duration: number) => void;
  updateParticipants: (participants: any[]) => void;
  setVideoRoomStatus: (isInRoom: boolean) => void;
  isCallActive: (meetingId: string) => boolean;
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(
  undefined
);

export function VideoCallProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [videoCallState, setVideoCallState] = useState<VideoCallState>({
    isActive: false,
    meetingId: null,
    title: "",
    isMinimized: false,
    isAudioEnabled: true,
    isVideoEnabled: true,
    localStream: null,
    remoteStream: null,
    callDuration: 0,
    participants: [],
    isInVideoRoom: false, // Initialize isInVideoRoom
  });

  // Load pre-call settings from localStorage
  useEffect(() => {
    const preCallAudioEnabled =
      localStorage.getItem("preCallAudioEnabled") !== "false";
    const preCallVideoEnabled =
      localStorage.getItem("preCallVideoEnabled") !== "false";

    setVideoCallState((prev) => ({
      ...prev,
      isAudioEnabled: preCallAudioEnabled,
      isVideoEnabled: preCallVideoEnabled,
    }));
  }, []);

  // Start call duration timer when call is active
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (videoCallState.isActive) {
      timer = setInterval(() => {
        setVideoCallState((prev) => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }));
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [videoCallState.isActive]);

  const startVideoCall = useCallback(
    async (meetingId: string, title: string) => {
      try {
        console.log("VideoCallContext: Starting video call", {
          meetingId,
          title,
        });

        // Check if we're already in this call - don't restart
        if (videoCallState.isActive && videoCallState.meetingId === meetingId) {
          console.log(
            "VideoCallContext: Already in this call, just navigating"
          );
          // Just navigate to video call room in the same window
          router.push(`/video-call-room/${meetingId}`);
          return;
        }

        // Navigate to video call room in the same window
        router.push(`/video-call-room/${meetingId}`);

        setVideoCallState((prev) => ({
          ...prev,
          isActive: true,
          meetingId,
          title,
          isMinimized: false,
          callDuration:
            prev.isActive && prev.meetingId === meetingId
              ? prev.callDuration
              : 0,
          isInVideoRoom: true, // Set isInVideoRoom to true when starting a call
        }));

        console.log("VideoCallContext: Video call state updated");
      } catch (error) {
        console.error("Error starting video call:", error);
      }
    },
    [
      router,
      videoCallState.isActive,
      videoCallState.meetingId,
      videoCallState.callDuration,
    ]
  );

  const endVideoCall = useCallback(() => {
    console.log("VideoCallContext: Ending video call");

    // Stop all media streams to release hardware
    if (videoCallState.localStream) {
      videoCallState.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped local track in context:", track.kind);
      });
    }

    if (videoCallState.remoteStream) {
      videoCallState.remoteStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped remote track in context:", track.kind);
      });
    }

    setVideoCallState((prev) => ({
      ...prev,
      isActive: false,
      meetingId: null,
      title: "",
      localStream: null,
      remoteStream: null,
      callDuration: 0,
      participants: [],
      isInVideoRoom: false, // Reset isInVideoRoom when ending a call
    }));
  }, [videoCallState.localStream, videoCallState.remoteStream]);

  const toggleMinimize = () => {
    setVideoCallState((prev) => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  };

  const toggleAudio = () => {
    setVideoCallState((prev) => ({
      ...prev,
      isAudioEnabled: !prev.isAudioEnabled,
    }));
  };

  const toggleVideo = () => {
    setVideoCallState((prev) => ({
      ...prev,
      isVideoEnabled: !prev.isVideoEnabled,
    }));
  };

  const updateLocalStream = useCallback((stream: MediaStream | null) => {
    setVideoCallState((prev) => ({
      ...prev,
      localStream: stream,
    }));
  }, []);

  const updateRemoteStream = useCallback((stream: MediaStream | null) => {
    setVideoCallState((prev) => ({
      ...prev,
      remoteStream: stream,
    }));
  }, []);

  const updateCallDuration = useCallback((duration: number) => {
    setVideoCallState((prev) => ({
      ...prev,
      callDuration: duration,
    }));
  }, []);

  const updateParticipants = useCallback((participants: any[]) => {
    setVideoCallState((prev) => ({
      ...prev,
      participants,
    }));
  }, []);

  const setVideoRoomStatus = useCallback((isInRoom: boolean) => {
    setVideoCallState((prev) => ({
      ...prev,
      isInVideoRoom: isInRoom,
    }));
  }, []);

  const isCallActive = useCallback(
    (meetingId: string) => {
      return videoCallState.isActive && videoCallState.meetingId === meetingId;
    },
    [videoCallState.isActive, videoCallState.meetingId]
  );

  const value = useMemo<VideoCallContextType>(
    () => ({
      videoCallState,
      startVideoCall,
      endVideoCall,
      toggleMinimize,
      toggleAudio,
      toggleVideo,
      updateLocalStream,
      updateRemoteStream,
      updateCallDuration,
      updateParticipants,
      setVideoRoomStatus,
      isCallActive,
    }),
    [
      videoCallState,
      startVideoCall,
      endVideoCall,
      toggleMinimize,
      toggleAudio,
      toggleVideo,
      updateLocalStream,
      updateRemoteStream,
      updateCallDuration,
      updateParticipants,
      setVideoRoomStatus,
      isCallActive,
    ]
  );

  return (
    <VideoCallContext.Provider value={value}>
      {children}
      <MiniVideoCallWindow />
    </VideoCallContext.Provider>
  );
}

// Mini Video Call Window Component
function MiniVideoCallWindow() {
  const {
    videoCallState,
    toggleMinimize,
    toggleAudio,
    toggleVideo,
    endVideoCall,
  } = useContext(VideoCallContext)!;
  const router = useRouter();

  // Don't render if call is not active
  if (!videoCallState.isActive) {
    return null;
  }

  // Don't render if user is in the main video call room (maximized view)
  if (videoCallState.isInVideoRoom) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMaximize = () => {
    if (videoCallState.meetingId) {
      // Just navigate to the video room without restarting the call
      router.push(`/video-call-room/${videoCallState.meetingId}`);
    }
  };

  return (
    <div
      className={`mini-video-call-window ${videoCallState.isMinimized ? "minimized" : "expanded"}`}
    >
      {videoCallState.isMinimized ? (
        // Minimized state - just show a small button
        <button
          onClick={toggleMinimize}
          className="w-16 h-16 bg-orange-600 hover:bg-orange-700 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110"
          title="Expand video call"
        >
          <Video className="w-6 h-6" />
        </button>
      ) : (
        // Expanded state - show mini video call window
        <div className="w-full h-full bg-card border border-border rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-orange-600 text-white px-3 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Video className="w-4 h-4" />
              <span className="text-sm font-medium truncate">
                {videoCallState.title}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMinimize}
                className="p-1 hover:bg-orange-700 rounded transition-colors"
                title="Minimize"
              >
                <Minimize className="w-3 h-3" />
              </button>
              <button
                onClick={handleMaximize}
                className="p-1 hover:bg-orange-700 rounded transition-colors"
                title="Maximize"
              >
                <Maximize className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Video Area */}
          <div className="flex-1 relative min-h-0">
            <VideoDisplay
              localStream={videoCallState.localStream}
              remoteStream={videoCallState.remoteStream}
              variant="mini"
              showLocalOverlay={true}
              showWaitingMessage={false}
              className="w-full h-full"
            />

            {/* Call Duration */}
            <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
              {formatDuration(videoCallState.callDuration)}
            </div>
          </div>

          {/* Controls - Ensure they're always visible */}
          <div className="px-3 py-2 flex-shrink-0 border-t border-border">
            <VideoCallControls
              isAudioEnabled={videoCallState.isAudioEnabled}
              isVideoEnabled={videoCallState.isVideoEnabled}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onEndCall={endVideoCall}
              variant="mini"
              showEndCall={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (context === undefined) {
    throw new Error("useVideoCall must be used within a VideoCallProvider");
  }
  return context;
}
