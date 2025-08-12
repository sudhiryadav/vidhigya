"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import VideoCallControls from "@/components/VideoCallControls";
import VideoDisplay from "@/components/VideoDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { apiClient } from "@/services/api";
import {
  AlertCircle,
  Maximize,
  Mic,
  MicOff,
  Settings,
  Share,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function VideoCallRoom() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const {
    videoCallState,
    updateLocalStream,
    updateRemoteStream,
    updateCallDuration,
    updateParticipants,
    endVideoCall,
    setVideoRoomStatus,
  } = useVideoCall();
  const meetingId = params.meetingId as string;

  // Video/Audio refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // UI states
  const [isConnecting, setIsConnecting] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [showEndCallDialog, setShowEndCallDialog] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [callInfo, setCallInfo] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Set video room status when component mounts
  useEffect(() => {
    setVideoRoomStatus(true);

    // Check if we're already in an active call - don't restart if so
    if (videoCallState.isActive && videoCallState.meetingId === meetingId) {
      console.log("Already in active call, continuing...");
      // Don't reinitialize media if call is already active
      return;
    }

    // Only initialize if this is a new call
    initializeMedia();

    return () => {
      setVideoRoomStatus(false);
    };
  }, [
    setVideoRoomStatus,
    meetingId,
    videoCallState.isActive,
    videoCallState.meetingId,
  ]);

  // Add router event listener to ensure cleanup on navigation
  useEffect(() => {
    return () => {
      setVideoRoomStatus(false);
    };
  }, [setVideoRoomStatus]);

  // Callback ref to ensure video element is set when rendered
  const setLocalVideoRef = useCallback((element: HTMLVideoElement | null) => {
    if (element) {
      localVideoRef.current = element;

      // If we already have a stream, set it immediately
      if (localStreamRef.current) {
        element.srcObject = localStreamRef.current;
        element.load();
      }
    }
  }, []);

  // Callback ref for remote video element
  const setRemoteVideoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      if (element) {
        remoteVideoRef.current = element;

        // If we already have a remote stream, set it immediately
        if (remoteStream) {
          element.srcObject = remoteStream;
          element.load();
        }
      }
    },
    [remoteStream]
  );

  // Initialize video element when component mounts
  useEffect(() => {
    if (localVideoRef.current) {
      // Video element already available
    }
  }, []);

  // Main initialization effect
  useEffect(() => {
    initializeMedia();

    // Start call duration timer
    const timer = setInterval(() => {
      setCallDuration((prev) => {
        const newDuration = prev + 1;
        // Don't update global context here to avoid infinite re-renders
        return newDuration;
      });
    }, 1000);

    // Simulate connecting to video call
    const connectTimer = setTimeout(() => {
      setIsConnecting(false);
    }, 2000);

    // Fetch call information
    fetchCallInfo();

    return () => {
      clearInterval(timer);
      clearTimeout(connectTimer);
      // Cleanup media streams and peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);

  // Apply pre-call settings when media is initialized
  useEffect(() => {
    if (localStreamRef.current) {
      console.log("Applying pre-call settings...");

      // Read pre-call settings from localStorage
      const preCallAudioEnabled =
        localStorage.getItem("preCallAudioEnabled") !== "false";
      const preCallVideoEnabled =
        localStorage.getItem("preCallVideoEnabled") !== "false";

      console.log("Pre-call settings:", {
        preCallAudioEnabled,
        preCallVideoEnabled,
      });

      // Apply audio setting
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = preCallAudioEnabled;
        setIsAudioEnabled(preCallAudioEnabled);
        if (localVideoRef.current) {
          localVideoRef.current.muted = !preCallAudioEnabled;
        }
        console.log("Audio track enabled:", preCallAudioEnabled);
      }

      // Apply video setting
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = preCallVideoEnabled;
        setIsVideoEnabled(preCallVideoEnabled);
        console.log("Video track enabled:", preCallVideoEnabled);
      }

      // Clean up localStorage
      localStorage.removeItem("preCallAudioEnabled");
      localStorage.removeItem("preCallVideoEnabled");
    }
  }, [localStream]);

  // Update video element when localStream changes
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.load();

      // Update global context
      updateLocalStream(localStream);
    } else if (localStream && !localVideoRef.current) {
      // Retry after a short delay
      const retryInterval = setInterval(() => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.load();
          clearInterval(retryInterval);
        }
      }, 100);

      // Clear interval after 5 seconds to prevent infinite retries
      setTimeout(() => clearInterval(retryInterval), 5000);
    }
  }, [localStream, updateLocalStream]);

  // Update remote stream in global context only when it actually changes
  useEffect(() => {
    if (remoteStream) {
      updateRemoteStream(remoteStream);
    }
  }, [remoteStream, updateRemoteStream]);

  // Remove the problematic useEffect calls that were causing infinite loops
  // The global context will be updated when the component actually changes these values

  const initializeMedia = async () => {
    try {
      setMediaError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set the stream in ref and state
      localStreamRef.current = stream;
      setLocalStream(stream);
      // Update global context with local stream
      updateLocalStream(stream);

      // Wait a bit for the video element to be rendered
      setTimeout(() => {
        // Ensure video element exists and set the stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.load();

          // Ensure video loads
          localVideoRef.current.onloadedmetadata = () => {
            // Try to play the video
            localVideoRef.current
              ?.play()
              .then(() => {
                // Video started playing successfully
              })
              .catch((error) => {
                console.error("Failed to play video:", error);
              });
          };

          localVideoRef.current.onerror = (error) => {
            console.error("Local video error:", error);
            setMediaError("Failed to load local video");
          };
        } else {
          // Retry after a short delay
          setTimeout(() => {
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
              localVideoRef.current.load();
            }
          }, 100);
        }
      }, 50);

      initializePeerConnection(stream);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setMediaError(
        "Failed to access camera and microphone. Please check permissions."
      );
    }
  };

  const fetchCallInfo = async () => {
    try {
      const data = (await apiClient.getVideoCallByMeetingId(meetingId)) as any;
      setCallInfo(data);
      const newParticipants = data.participants || [];
      setParticipants(newParticipants);
      // Update global context with participants
      updateParticipants(newParticipants);
    } catch (error) {
      console.error("Error fetching call info:", error);
    }
  };

  const initializePeerConnection = (stream: MediaStream) => {
    // Create RTCPeerConnection with STUN servers for NAT traversal
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    // Add local stream tracks to peer connection
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      const newRemoteStream = event.streams[0];
      setRemoteStream(newRemoteStream);
      // Update global context with remote stream
      updateRemoteStream(newRemoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = newRemoteStream;
      }
    };

    // Handle ICE candidates (for signaling)
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real implementation, this would be sent to the other peer via signaling server
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      // Connection state changed
    };

    // Store peer connection
    peerConnectionRef.current = peerConnection;

    // Simulate connection to another peer (for demo purposes)
    simulatePeerConnection();
  };

  // Function to update remote stream to reflect local track changes
  const updateLocalRemoteStream = () => {
    if (localStreamRef.current) {
      // Create a new MediaStream with current track states
      const updatedRemoteStream = new MediaStream();

      // Add audio track with current enabled state
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0].clone();
        audioTrack.enabled = audioTracks[0].enabled;
        updatedRemoteStream.addTrack(audioTrack);
      }

      // Add video track with current enabled state
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0].clone();
        videoTrack.enabled = videoTracks[0].enabled;
        updatedRemoteStream.addTrack(videoTrack);
      }

      setRemoteStream(updatedRemoteStream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = updatedRemoteStream;
      }
    }
  };

  const simulatePeerConnection = async () => {
    // This is a simulation - in a real app, you'd have a signaling server
    // Simulate receiving a remote stream after a delay
    setTimeout(() => {
      updateLocalRemoteStream();
    }, 3000);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const newAudioEnabled = !isAudioEnabled;
        audioTracks[0].enabled = newAudioEnabled;
        setIsAudioEnabled(newAudioEnabled);

        if (localVideoRef.current) {
          localVideoRef.current.muted = !newAudioEnabled;
        }

        // Update global context with audio state
        // Note: We don't need to update the stream itself, just the state
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const newVideoEnabled = !isVideoEnabled;
        videoTracks[0].enabled = newVideoEnabled;
        setIsVideoEnabled(newVideoEnabled);

        // Update global context with video state
        // Note: We don't need to update the stream itself, just the state
      }
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        // Replace video track with screen share
        if (localStreamRef.current && peerConnectionRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          const screenTrack = screenStream.getVideoTracks()[0];

          if (videoTrack && screenTrack) {
            // Remove old video track from peer connection
            const senders = peerConnectionRef.current.getSenders();
            const videoSender = senders.find(
              (sender) => sender.track?.kind === "video"
            );
            if (videoSender) {
              videoSender.replaceTrack(screenTrack);
            }

            // Update local stream
            localStreamRef.current.removeTrack(videoTrack);
            localStreamRef.current.addTrack(screenTrack);

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }

            // Update global context with updated local stream
            updateLocalStream(localStreamRef.current);
          }
        }

        setIsScreenSharing(true);
      } else {
        // Stop screen sharing and restore camera
        await initializeMedia();
        setIsScreenSharing(false);

        // Note: initializeMedia already updates the global context
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
    }
  };

  const handleEndCall = () => {
    setShowEndCallDialog(true);
  };

  const handleConfirmEndCall = () => {
    // Stop all media streams properly
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped local track:", track.kind);
      });
      localStreamRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped local stream track:", track.kind);
      });
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped remote stream track:", track.kind);
      });
      setRemoteStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // End call in global context
    endVideoCall();

    // Navigate back to video calls page
    router.push("/video-calls");
  };

  const handleLeaveCall = () => {
    // Cleanup media streams and peer connection properly
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped local track on leave:", track.kind);
      });
      localStreamRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped local stream track on leave:", track.kind);
      });
      setLocalStream(null);
    }

    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped remote stream track on leave:", track.kind);
      });
      setRemoteStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Navigate back
    router.push("/video-calls");
  };

  const testCamera = async () => {
    try {
      console.log("Testing camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      console.log("Camera test successful:", stream.getVideoTracks());

      // Stop the test stream
      stream.getTracks().forEach((track) => track.stop());

      // Show success message
      alert("Camera test successful! Your camera is working properly.");
    } catch (error) {
      console.error("Camera test failed:", error);
      alert(
        "Camera test failed. Please check your camera permissions and try again."
      );
    }
  };

  const refreshVideo = () => {
    if (localStream) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.load();
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = localStream;
        remoteVideoRef.current.load();
      }
    } else {
      initializeMedia();
    }
  };

  const toggleFullscreen = () => {
    if (videoContainerRef.current) {
      if (!isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          videoContainerRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  // Update global context with call duration when component unmounts
  useEffect(() => {
    return () => {
      // Update global context with final duration when leaving
      if (callDuration > 0) {
        updateCallDuration(callDuration);
      }
    };
  }, [callDuration, updateCallDuration]);

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Connecting to meeting...
          </h2>
          <p className="text-muted-foreground">Meeting ID: {meetingId}</p>
          {mediaError && (
            <div className="mt-4 p-3 bg-destructive/20 border border-destructive/50 rounded-lg">
              <p className="text-destructive text-sm">{mediaError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-foreground">
            <h1 className="text-lg font-semibold">Video Call</h1>
            <p className="text-sm text-muted-foreground">
              Meeting ID: {meetingId}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">{formatDuration(callDuration)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleVideo}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <Maximize className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <Users className="w-5 h-5" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media Error Display */}
      {mediaError && (
        <div className="bg-destructive/20 border border-destructive/50 px-6 py-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <span className="text-destructive text-sm">{mediaError}</span>
            <button
              onClick={() => {
                setMediaError(null);
                initializeMedia();
              }}
              className="ml-auto text-destructive hover:text-destructive/80 text-sm underline transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex" ref={videoContainerRef}>
        {/* Video Area */}
        <div className="flex-1 relative">
          <VideoDisplay
            localStream={localStream}
            remoteStream={remoteStream}
            variant="main"
            showLocalOverlay={true}
            showWaitingMessage={true}
            className="w-full h-full"
          />

          {/* Meeting Info Overlay */}
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-foreground bg-card/80 backdrop-blur-sm rounded-lg p-6 max-w-md">
                <p className="text-muted-foreground mb-2">
                  Meeting ID: {meetingId}
                </p>
                {callInfo && (
                  <div className="text-sm text-muted-foreground">
                    <p>Call: {callInfo.title}</p>
                    {callInfo.host && <p>Host: {callInfo.host.name}</p>}
                  </div>
                )}
                {participants.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Participants ({participants.length}):
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {participants.slice(0, 3).map((participant, index) => (
                        <div
                          key={participant.id}
                          className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-full"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-foreground">
                            {participant.user.name}
                          </span>
                        </div>
                      ))}
                      {participants.length > 3 && (
                        <div className="flex items-center space-x-2 bg-muted px-3 py-1 rounded-full">
                          <span className="text-xs text-foreground">
                            +{participants.length - 3} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {isParticipantsOpen && (
          <div className="w-80 bg-muted border-l border-border">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-border">
                <h3 className="text-foreground font-semibold">
                  Participants ({participants.length + 1})
                </h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {/* Current user */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-medium">
                        Y
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground font-medium">You</p>
                      <p className="text-muted-foreground text-sm">
                        Participant
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {isAudioEnabled ? (
                        <Mic className="w-4 h-4 text-green-500" />
                      ) : (
                        <MicOff className="w-4 h-4 text-red-500" />
                      )}
                      {isVideoEnabled ? (
                        <Video className="w-4 h-4 text-green-500" />
                      ) : (
                        <VideoOff className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>

                  {/* Other participants */}
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                        <span className="text-secondary-foreground font-medium">
                          {participant.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground font-medium">
                          {participant.user.name}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {participant.id === callInfo?.hostId
                            ? "Host"
                            : "Participant"}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <Mic className="w-4 h-4 text-green-500" />
                        <Video className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-muted px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          {/* Common Video Call Controls */}
          <VideoCallControls
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            onToggleAudio={handleToggleAudio}
            onToggleVideo={handleToggleVideo}
            onEndCall={handleEndCall}
            variant="main"
            showEndCall={true}
          />

          {/* Screen Share Button */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            <Share className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* End Call Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showEndCallDialog}
        onClose={() => setShowEndCallDialog(false)}
        onConfirm={handleConfirmEndCall}
        title="End Call"
        message="Are you sure you want to end the call? This action cannot be undone."
        confirmText="End Call"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
