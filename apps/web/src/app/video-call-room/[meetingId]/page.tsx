"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertCircle,
  Maximize,
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  Share,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface VideoCallRoomProps {
  meetingId: string;
}

export default function VideoCallRoom() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
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
      setCallDuration((prev) => prev + 1);
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
  }, [localStream]);

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
      setParticipants(data.participants || []);
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
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
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
  const updateRemoteStream = () => {
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
      updateRemoteStream();
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
        const audioTrack = audioTracks[0];

        // Toggle the track enabled state - this affects the actual stream
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        // Update video element to reflect audio state
        if (localVideoRef.current) {
          localVideoRef.current.muted = !audioTrack.enabled;
        }

        // Update peer connection to reflect the change
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const audioSender = senders.find(
            (sender) => sender.track?.kind === "audio"
          );
          if (audioSender && audioSender.track) {
            audioSender.track.enabled = audioTrack.enabled;
          }
        }

        // Update remote stream to reflect the change immediately
        updateRemoteStream();
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const videoTrack = videoTracks[0];

        // Toggle the track enabled state - this affects the actual stream
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);

        // Update peer connection to reflect the change
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find(
            (sender) => sender.track?.kind === "video"
          );
          if (videoSender && videoSender.track) {
            videoSender.track.enabled = videoTrack.enabled;
          }
        }

        // Update remote stream to reflect the change immediately
        updateRemoteStream();
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
          }
        }

        setIsScreenSharing(true);
      } else {
        // Stop screen sharing and restore camera
        await initializeMedia();
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error("Error toggling screen share:", error);
    }
  };

  const handleEndCall = () => {
    setShowEndCallDialog(true);
  };

  const handleConfirmEndCall = () => {
    // Stop all media streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }

    if (user?.role === "CLIENT") {
      router.push("/client/video-calls");
    } else {
      router.push("/lawyer/video-calls");
    }
  };

  const handleLeaveCall = () => {
    // Cleanup media streams and peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Navigate back
    router.push("/lawyer/video-calls");
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

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Connecting to meeting...
          </h2>
          <p className="text-gray-400">Meeting ID: {meetingId}</p>
          {mediaError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{mediaError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-white">
            <h1 className="text-lg font-semibold">Video Call</h1>
            <p className="text-sm text-gray-400">Meeting ID: {meetingId}</p>
          </div>
          <div className="flex items-center space-x-2 text-white">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">{formatDuration(callDuration)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleVideo}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
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
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <Maximize className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
          >
            <Users className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media Error Display */}
      {mediaError && (
        <div className="bg-red-900/20 border border-red-500/50 px-6 py-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">{mediaError}</span>
            <button
              onClick={() => {
                setMediaError(null);
                initializeMedia();
              }}
              className="ml-auto text-red-400 hover:text-red-300 text-sm underline"
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
          {/* Main Video - Remote Participant */}
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                muted={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-white">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-12 h-12 text-gray-400" />
                </div>
                <p className="text-lg font-medium">
                  {participants.length > 1
                    ? "Waiting for other participants..."
                    : "Waiting for participants..."}
                </p>
                <p className="text-gray-400 mb-2">Meeting ID: {meetingId}</p>
                {callInfo && (
                  <div className="text-sm text-gray-400">
                    <p>Call: {callInfo.title}</p>
                    {callInfo.host && <p>Host: {callInfo.host.name}</p>}
                  </div>
                )}
                {participants.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">
                      Participants ({participants.length}):
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {participants.slice(0, 3).map((participant, index) => (
                        <div
                          key={participant.id}
                          className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-full"
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-white">
                            {participant.user.name}
                          </span>
                        </div>
                      ))}
                      {participants.length > 3 && (
                        <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-full">
                          <span className="text-xs text-white">
                            +{participants.length - 3} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Local Video - Picture in Picture */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={setLocalVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              onLoadedMetadata={() => {
                // Video metadata loaded
              }}
              onError={(e) => {
                console.error("Local video error:", e);
              }}
            />

            {/* Loading overlay */}
            {!localStream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <Video className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                  <p className="text-gray-400 text-xs">Loading camera...</p>
                </div>
              </div>
            )}

            {/* Audio mute indicator */}
            {!isAudioEnabled && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                Muted
              </div>
            )}

            {/* Video off indicator */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <VideoOff className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                  <p className="text-gray-400 text-xs">Camera Off</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {isParticipantsOpen && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-white font-semibold">
                  Participants ({participants.length + 1})
                </h3>
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-3">
                  {/* Current user */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">Y</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">You</p>
                      <p className="text-gray-400 text-sm">Participant</p>
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
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">
                          {participant.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">
                          {participant.user.name}
                        </p>
                        <p className="text-gray-400 text-sm">
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
      <div className="bg-gray-800 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleToggleAudio}
            className={`p-3 rounded-full ${
              isAudioEnabled
                ? "bg-gray-600 text-white hover:bg-gray-500"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6" />
            ) : (
              <MicOff className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={handleToggleVideo}
            className={`p-3 rounded-full ${
              isVideoEnabled
                ? "bg-gray-600 text-white hover:bg-gray-500"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={handleToggleScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-600 text-white hover:bg-gray-500"
            }`}
          >
            <Share className="w-6 h-6" />
          </button>

          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
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
