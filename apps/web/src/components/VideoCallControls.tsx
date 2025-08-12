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
        className={`${buttonSize} rounded-full transition-colors ${
          isAudioEnabled
            ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
            : "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
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
        className={`${buttonSize} rounded-full transition-colors ${
          isVideoEnabled
            ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400"
            : "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
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
          className={`${buttonSize} bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors`}
          title="End call"
        >
          <PhoneOff className={iconSize} />
        </button>
      )}
    </div>
  );
}
