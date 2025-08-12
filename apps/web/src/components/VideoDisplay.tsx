"use client";

import { Video } from "lucide-react";
import { useEffect, useRef } from "react";

interface VideoDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  variant?: "main" | "mini";
  showLocalOverlay?: boolean;
  showWaitingMessage?: boolean;
  className?: string;
}

export default function VideoDisplay({
  localStream,
  remoteStream,
  variant = "main",
  showLocalOverlay = true,
  showWaitingMessage = true,
  className = "",
}: VideoDisplayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const isMini = variant === "mini";

  // Update local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.load();
    }
  }, [localStream]);

  // Update remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.load();
    }
  }, [remoteStream]);

  if (isMini) {
    // Mini variant - compact layout for floating window
    return (
      <div className={`relative bg-muted rounded overflow-hidden ${className}`}>
        {/* Main Video (Remote) */}
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Video className="w-6 h-6 mx-auto mb-1" />
              <p className="text-xs">Waiting...</p>
            </div>
          </div>
        )}

        {/* Local Video Overlay (small corner) */}
        {showLocalOverlay && localStream && (
          <div className="absolute top-1 right-1 w-16 h-12 bg-muted rounded overflow-hidden border border-border">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    );
  }

  // Main variant - full layout for video call room
  return (
    <div className={`relative bg-card ${className}`}>
      {/* Main Video (Remote) */}
      <div className="w-full h-full flex items-center justify-center">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center text-foreground">
            <div className="w-32 h-32 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">
              Waiting for other participants...
            </p>
            {showWaitingMessage && (
              <p className="text-muted-foreground mt-2">
                The call will begin when participants join
              </p>
            )}
          </div>
        )}
      </div>

      {/* Local Video Overlay (larger corner) */}
      {showLocalOverlay && localStream && (
        <div className="absolute top-4 right-4 w-32 h-24 bg-muted rounded overflow-hidden border border-border shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
