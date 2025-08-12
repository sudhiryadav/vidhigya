"use client";

import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

interface VideoCallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  variant?: "main" | "mini";
  showEndCall?: boolean;
}

export default function VideoCallControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  variant = "main",
  showEndCall = true,
}: VideoCallControlsProps) {
  const isMini = variant === "mini";
  const buttonSize = isMini ? "w-8 h-8" : "w-10 h-10";
  const iconSize = isMini ? "w-4 h-4" : "w-5 h-5";

  return (
    <div
      className={`flex items-center justify-center space-x-2 ${isMini ? "p-2" : "p-4"}`}
    >
      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        className={`${buttonSize} rounded-full transition-all duration-200 hover:scale-110 ${
          isAudioEnabled
            ? "text-green-500 hover:text-green-400 hover:bg-green-500/10"
            : "text-red-500 hover:text-red-400 hover:bg-red-500/10"
        }`}
        title={isAudioEnabled ? "Mute" : "Unmute"}
      >
        {isAudioEnabled ? (
          <Mic className={iconSize} />
        ) : (
          <MicOff className={iconSize} />
        )}
      </button>

      {/* Video Toggle */}
      <button
        onClick={onToggleVideo}
        className={`${buttonSize} rounded-full transition-all duration-200 hover:scale-110 ${
          isVideoEnabled
            ? "text-green-500 hover:text-green-400 hover:bg-green-500/10"
            : "text-red-500 hover:text-red-400 hover:bg-red-500/10"
        }`}
        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? (
          <Video className={iconSize} />
        ) : (
          <VideoOff className={iconSize} />
        )}
      </button>

      {/* End Call Button */}
      {showEndCall && (
        <button
          onClick={onEndCall}
          className={`${buttonSize} text-red-500 rounded-full hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 hover:scale-110`}
          title="End call"
        >
          <PhoneOff className={iconSize} />
        </button>
      )}
    </div>
  );
}
