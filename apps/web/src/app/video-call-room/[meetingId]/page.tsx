"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare,
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
import { useEffect, useRef, useState } from "react";

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

  // WebRTC refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // UI states
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showEndCallDialog, setShowEndCallDialog] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

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
      // Read pre-call settings from localStorage
      const preCallAudioEnabled =
        localStorage.getItem("preCallAudioEnabled") !== "false";
      const preCallVideoEnabled =
        localStorage.getItem("preCallVideoEnabled") !== "false";

      // Apply audio setting
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = preCallAudioEnabled;
        setIsAudioEnabled(preCallAudioEnabled);
        if (localVideoRef.current) {
          localVideoRef.current.muted = !preCallAudioEnabled;
        }
      }

      // Apply video setting
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = preCallVideoEnabled;
        setIsVideoEnabled(preCallVideoEnabled);
        if (localVideoRef.current) {
          if (preCallVideoEnabled) {
            localVideoRef.current.style.display = "block";
            localVideoRef.current.style.backgroundColor = "transparent";
          } else {
            localVideoRef.current.style.display = "block";
            localVideoRef.current.style.backgroundColor = "#1f2937";
            localVideoRef.current.style.backgroundImage = "none";
          }
        }
      }

      // Clear localStorage after applying settings
      localStorage.removeItem("preCallAudioEnabled");
      localStorage.removeItem("preCallVideoEnabled");
    }
  }, [localStream]);

  const initializeMedia = async () => {
    try {
      setMediaError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Store stream in ref for WebRTC
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Set local video stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebRTC peer connection
      initializePeerConnection(stream);
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setMediaError(
        "Unable to access camera and microphone. Please check permissions."
      );
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
      console.log("Received remote stream:", event.streams[0]);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates (for signaling)
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("ICE candidate generated:", event.candidate);
        // In a real implementation, this would be sent to the other peer via signaling server
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", peerConnection.connectionState);
    };

    // Store peer connection
    peerConnectionRef.current = peerConnection;

    // Simulate connection to another peer (for demo purposes)
    simulatePeerConnection();
  };

  // Function to update remote stream to reflect local track changes
  const updateRemoteStream = () => {
    if (localStreamRef.current && remoteStream) {
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
    console.log("Simulating peer connection...");

    // Simulate receiving a remote stream after a delay
    setTimeout(() => {
      updateRemoteStream();
      console.log("Simulated remote stream connected");
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

        console.log("Audio track enabled:", audioTrack.enabled);
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

        // Update video element to reflect video state
        if (localVideoRef.current) {
          if (videoTrack.enabled) {
            localVideoRef.current.style.display = "block";
            localVideoRef.current.style.backgroundColor = "transparent";
          } else {
            localVideoRef.current.style.display = "block";
            localVideoRef.current.style.backgroundColor = "#1f2937";
            localVideoRef.current.style.backgroundImage = "none";
          }
        }

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

        console.log("Video track enabled:", videoTrack.enabled);
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
    if (user?.role === "CLIENT") {
      router.push("/client/video-calls");
    } else {
      router.push("/lawyer/video-calls");
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
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative">
          {/* Main Video - Remote Participant */}
          <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
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
                  Waiting for participant...
                </p>
                <p className="text-gray-400">Meeting ID: {meetingId}</p>
              </div>
            )}
          </div>

          {/* Local Video - Picture in Picture */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {!isAudioEnabled && (
              <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                Muted
              </div>
            )}
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <VideoOff className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                  <p className="text-gray-400 text-xs">Camera Off</p>
                </div>
              </div>
            )}
          </div>

          {/* Screen Share Indicator */}
          {isScreenSharing && (
            <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
              Screen Sharing
            </div>
          )}
        </div>

        {/* Sidebar */}
        {(isChatOpen || isParticipantsOpen) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            {isChatOpen && (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Chat</h3>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          J
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          John Smith
                        </p>
                        <p className="text-gray-400 text-sm">
                          Hello! Can you hear me?
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 justify-end">
                      <div>
                        <p className="text-white text-sm font-medium">You</p>
                        <p className="text-gray-400 text-sm">
                          Yes, I can hear you clearly!
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          Y
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-gray-700">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isParticipantsOpen && (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-700">
                  <h3 className="text-white font-semibold">Participants (2)</h3>
                </div>
                <div className="flex-1 p-4 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">J</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">John Smith</p>
                        <p className="text-gray-400 text-sm">Host</p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <Mic className="w-4 h-4 text-green-500" />
                        <Video className="w-4 h-4 text-green-500" />
                      </div>
                    </div>
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
                  </div>
                </div>
              </div>
            )}
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
