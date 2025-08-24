"use client";

import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { useEffect, useState } from "react";

interface ProfilePictureProps {
  userId?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showName?: boolean;
  src?: string | null;
}

export default function ProfilePicture({
  userId,
  name,
  size = "md",
  className = "",
  showName = false,
  src,
}: ProfilePictureProps) {
  const { user, fetchAvatar } = useAuth();
  const [imageError, setImageError] = useState(false);
  const currentUserId = userId || user?.id;
  const displayName = name || user?.name || "User";

  // Fetch avatar if not available and we have a user ID
  useEffect(() => {
    if (currentUserId && !user?.avatarBase64 && !src) {
      fetchAvatar(currentUserId);
    }
  }, [currentUserId, user?.avatarBase64, src, fetchAvatar]);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Priority: src prop > avatarBase64 > null
  const avatarUrl = src || user?.avatarBase64 || null;
  const shouldShowImage = avatarUrl && !imageError;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground overflow-hidden`}
      >
        {shouldShowImage ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={parseInt(sizeClasses[size].split(" ")[0].slice(2))}
            height={parseInt(sizeClasses[size].split(" ")[0].slice(2))}
            className="w-full h-full object-cover"
            onError={() => {
              setImageError(true);
            }}
          />
        ) : (
          <span>{getInitials(displayName)}</span>
        )}
      </div>
      {showName && (
        <span className="font-medium text-foreground">{displayName}</span>
      )}
    </div>
  );
}
