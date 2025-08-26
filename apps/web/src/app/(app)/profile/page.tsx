"use client";

import ProfilePage from "@/components/ProfilePage";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePageWrapper() {
  const { user, isAuthenticated } = useAuth();

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  // Determine user type and appropriate title/subtitle
  let userType: "lawyer" | "client" = "client";
  let title = "My Profile";
  let subtitle = "Manage your profile and account settings";

  if (isLawyer) {
    userType = "lawyer";
    title = "Lawyer Profile";
    subtitle = "Manage your professional profile and account settings";
  } else if (isClient) {
    userType = "client";
    title = "Client Profile";
    subtitle = "Manage your profile and account settings";
  } else if (isAdmin) {
    userType = "lawyer"; // Admin can use lawyer profile type for now
    title = "Admin Profile";
    subtitle = "Manage your administrative profile and account settings";
  }

  return <ProfilePage userType={userType} title={title} subtitle={subtitle} />;
}
