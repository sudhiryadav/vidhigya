"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { usePractice } from "@/contexts/PracticeContext";
import { apiClient } from "@/services/api";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  Lock,
  Mail,
  Phone,
  Search,
  Shield,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  primaryPracticeId?: string;
  practices?: Array<{
    practiceId: string;
    practiceRole: string;
  }>;
}

interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  role: string;
  password: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  password?: string;
}

interface PracticeSubscriptionSettings {
  plan: string;
  seatLimit: number;
  activeMembers: number;
  availableSeats: number;
}

export default function AdminUsersPage() {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
  const { user: currentUser } = useAuth();
  const { currentPractice } = usePractice();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] =
    useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [subscriptionSettings, setSubscriptionSettings] =
    useState<PracticeSubscriptionSettings | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    name: "",
    email: "",
    phone: "",
    role: "LAWYER",
    password: "",
  });

  const [editForm, setEditForm] = useState<UpdateUserData>({
    name: "",
    email: "",
    phone: "",
    role: "",
    password: "",
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    email: "",
    message: "",
  });
  const [createErrors, setCreateErrors] = useState<
    Partial<Record<"name" | "email" | "password" | "phone", string>>
  >({});

  // Load users based on current user's role
  useEffect(() => {
    loadUsers();
    loadSubscriptionSettings();
  }, [currentUser?.role]);

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.phone && user.phone.includes(searchTerm))
      );
    }

    if (roleFilter) {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    if (statusFilter) {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((user) => user.isActive === isActive);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      let userList: User[] = [];

      if (currentUser?.role === "SUPER_ADMIN") {
        // Super admin can see all users
        const response = await apiClient.getAllUsers();
        userList = response as User[];
      } else if (
        currentUser?.role === "ADMIN" ||
        currentUser?.role === "LAWYER"
      ) {
        // Firm owner and lawyers can see users in their practice
        const response = await apiClient.getPracticeUsers();
        userList = response as User[];
      }

      setUsers(userList);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionSettings = async () => {
    try {
      if (currentUser?.role !== "ADMIN" && currentUser?.role !== "LAWYER") {
        setSubscriptionSettings(null);
        return;
      }

      const subscriptionResponse =
        (await apiClient.getPracticeSubscriptionSettings()) as
          | PracticeSubscriptionSettings
          | null;
      if (subscriptionResponse) {
        setSubscriptionSettings(subscriptionResponse);
      }
    } catch {
      setSubscriptionSettings(null);
    }
  };

  const handleCreateUser = async () => {
    try {
      const nextErrors: Partial<
        Record<"name" | "email" | "password" | "phone", string>
      > =
        {};
      if (!createForm.name.trim()) nextErrors.name = "Name is required";
      if (!createForm.email.trim()) {
        nextErrors.email = "Email is required";
      } else if (!emailRegex.test(createForm.email.trim())) {
        nextErrors.email = "Please enter a valid email address";
      }
      if (!createForm.password.trim()) {
        nextErrors.password = "Password is required";
      } else if (createForm.password.length < 8) {
        nextErrors.password = "Password must be at least 8 characters long";
      }
      if (createForm.phone?.trim() && !phoneRegex.test(createForm.phone.trim())) {
        nextErrors.phone = "Please enter a valid phone number";
      }
      if (Object.keys(nextErrors).length > 0) {
        setCreateErrors(nextErrors);
        return;
      }
      setCreateErrors({});

      await apiClient.createUser(createForm);
      toast.success("User created successfully");
      setIsCreateModalOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        role: "LAWYER",
        password: "",
      });
      setCreateErrors({});
      loadUsers();
      loadSubscriptionSettings();
    } catch (error) {
      console.error("Failed to create user:", error);
      toast.error("Failed to create user");
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const updateData: UpdateUserData = {};
      if (editForm.name && editForm.name !== selectedUser.name) {
        updateData.name = editForm.name;
      }
      if (editForm.email && editForm.email !== selectedUser.email) {
        updateData.email = editForm.email;
      }
      if (
        editForm.phone !== undefined &&
        editForm.phone !== selectedUser.phone
      ) {
        updateData.phone = editForm.phone;
      }
      if (editForm.role && editForm.role !== selectedUser.role) {
        updateData.role = editForm.role;
      }
      if (editForm.password) {
        updateData.password = editForm.password;
      }

      if (Object.keys(updateData).length === 0) {
        toast.error("No changes to update");
        return;
      }

      await apiClient.updateUser(selectedUser.id, updateData);
      toast.success("User updated successfully");
      setIsEditModalOpen(false);
      setEditForm({
        name: "",
        email: "",
        phone: "",
        role: "",
        password: "",
      });
      loadUsers();
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    try {
      // Generate a random password for the user
      const newPassword = Math.random().toString(36).slice(-8);
      await apiClient.resetUserPassword(selectedUser.id, newPassword);
      toast.success(
        "Password reset successfully. New password sent to user's email."
      );
      setIsResetPasswordModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error("Failed to reset password:", error);
      toast.error("Failed to reset password");
    }
  };

  const handleDeactivateUser = async () => {
    if (!selectedUser) return;

    try {
      await apiClient.deactivateUser(selectedUser.id);
      toast.success(
        "User deactivated successfully. They will no longer be able to login."
      );
      setIsDeactivateModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error("Failed to deactivate user:", error);
      toast.error("Failed to deactivate user");
    }
  };

  const handleReactivateUser = async () => {
    if (!selectedUser) return;

    try {
      await apiClient.reactivateUser(selectedUser.id);
      toast.success("User reactivated successfully. They can now login again.");
      setIsReactivateModalOpen(false);
      loadUsers();
    } catch (error) {
      console.error("Failed to reactivate user:", error);
      toast.error("Failed to reactivate user");
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      password: "",
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setResetPasswordForm({
      email: user.email,
      message: `Hello ${user.name},\n\nYour password has been reset. Please check your email for the new password.\n\nBest regards,\n${currentPractice?.name || "Your Law Firm"}`,
    });
    setIsResetPasswordModalOpen(true);
  };

  const openDeactivateModal = (user: User) => {
    setSelectedUser(user);
    setIsDeactivateModalOpen(true);
  };

  const openReactivateModal = (user: User) => {
    setSelectedUser(user);
    setIsReactivateModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const roleColors: { [key: string]: string } = {
      SUPER_ADMIN:
        "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      LAWYER:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      ASSOCIATE:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      PARALEGAL:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
    };

    return (
      roleColors[role] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
        <XCircle className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const getPrimaryPracticeRole = (user: User) => {
    if (!user.practices || user.practices.length === 0) {
      return null;
    }

    if (user.primaryPracticeId) {
      const primaryPractice = user.practices.find(
        (practice) => practice.practiceId === user.primaryPracticeId
      );
      if (primaryPractice?.practiceRole) {
        return primaryPractice.practiceRole;
      }
    }

    return user.practices[0]?.practiceRole ?? null;
  };

  const getPrimaryPracticeId = (user: User) => {
    if (user.primaryPracticeId) {
      return user.primaryPracticeId;
    }

    return user.practices?.[0]?.practiceId ?? null;
  };

  const getPracticeRoleBadge = (practiceRole?: string | null) => {
    if (!practiceRole) {
      return (
        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
          N/A
        </Badge>
      );
    }

    const normalizedPracticeRole = practiceRole.toUpperCase();
    const roleColors: { [key: string]: string } = {
      OWNER:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400",
      ADMIN:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      MEMBER:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      ASSOCIATE:
        "bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400",
    };

    return (
      <Badge
        className={
          roleColors[normalizedPracticeRole] ||
          "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
        }
      >
        {normalizedPracticeRole.replace("_", " ")}
      </Badge>
    );
  };

  const hasNoAvailableSeats =
    !!subscriptionSettings && subscriptionSettings.availableSeats <= 0;

  const groupedUsersForSuperAdmin = (() => {
    if (currentUser?.role !== "SUPER_ADMIN") {
      return [];
    }

    const groupedByPractice = new Map<string, User[]>();
    const unassignedUsers: User[] = [];

    filteredUsers.forEach((user) => {
      const practiceId = getPrimaryPracticeId(user);
      if (!practiceId) {
        unassignedUsers.push(user);
        return;
      }

      const practiceUsers = groupedByPractice.get(practiceId) || [];
      practiceUsers.push(user);
      groupedByPractice.set(practiceId, practiceUsers);
    });

    const groups: Array<{
      key: string;
      title: string;
      owner: User;
      members: User[];
    }> = [];

    groupedByPractice.forEach((practiceUsers, practiceId) => {
      const ownerIndex = practiceUsers.findIndex(
        (user) => getPrimaryPracticeRole(user)?.toUpperCase() === "OWNER"
      );

      if (ownerIndex >= 0) {
        const owner = practiceUsers[ownerIndex];
        const members = practiceUsers.filter((user) => user.id !== owner.id);
        groups.push({
          key: `practice-${practiceId}`,
          title: `${owner.name}'s Team`,
          owner,
          members,
        });
        return;
      }

      const fallbackOwner = practiceUsers[0];
      groups.push({
        key: `practice-${practiceId}`,
        title: `Practice ${practiceId.slice(0, 8)}`,
        owner: fallbackOwner,
        members: practiceUsers.filter((user) => user.id !== fallbackOwner.id),
      });
    });

    unassignedUsers.forEach((user) => {
      groups.push({
        key: `unassigned-${user.id}`,
        title: "Unassigned User",
        owner: user,
        members: [],
      });
    });

    return groups.sort((a, b) => a.title.localeCompare(b.title));
  })();

  const renderActions = (user: User) => (
    <div className="flex items-center justify-end space-x-2">
      <button
        onClick={() => openViewModal(user)}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
        title="View Details"
      >
        <Eye className="w-4 h-4" />
      </button>
      {(currentUser?.role === "ADMIN" || currentUser?.role === "LAWYER") && (
        <>
          <button
            onClick={() => openEditModal(user)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
            title="Edit User"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => openResetPasswordModal(user)}
            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
            title="Reset Password"
          >
            <Lock className="w-4 h-4" />
          </button>
          {user.isActive ? (
            <button
              onClick={() => openDeactivateModal(user)}
              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
              title="Deactivate"
            >
              <XCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => openReactivateModal(user)}
              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
              title="Reactivate"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage users and their permissions in your practice
          </p>
          {subscriptionSettings && (
            <div className="mt-2 flex items-center gap-2">
              <Badge
                className={
                  subscriptionSettings.availableSeats <= 0
                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                }
              >
                Seats Left: {subscriptionSettings.availableSeats}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {subscriptionSettings.activeMembers}/
                {subscriptionSettings.seatLimit} in use ({subscriptionSettings.plan}
                )
              </span>
            </div>
          )}
        </div>
        {(currentUser?.role === "ADMIN" || currentUser?.role === "LAWYER") && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="LAWYER">Lawyer</option>
                <option value="ASSOCIATE">Associate</option>
                <option value="PARALEGAL">Paralegal</option>
              </select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setRoleFilter("");
                  setStatusFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({filteredUsers.length} of {users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Practice Position
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <AlertCircle className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No users found</p>
                        {searchTerm || roleFilter || statusFilter ? (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearchTerm("");
                              setRoleFilter("");
                              setStatusFilter("");
                            }}
                          >
                            Clear filters
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : currentUser?.role === "SUPER_ADMIN" ? (
                  groupedUsersForSuperAdmin.flatMap((group) => {
                    const isCollapsed = collapsedGroups[group.key] ?? false;
                    const hasMembers = group.members.length > 0;
                    const rows = [
                      <tr
                        key={`owner-${group.key}`}
                        className="bg-muted/40 hover:bg-muted/60"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2 text-left">
                            {hasMembers ? (
                              <button
                                onClick={() =>
                                  setCollapsedGroups((prev) => ({
                                    ...prev,
                                    [group.key]: !isCollapsed,
                                  }))
                                }
                                className="text-muted-foreground"
                                aria-label={
                                  isCollapsed
                                    ? "Expand team members"
                                    : "Collapse team members"
                                }
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 h-4" />
                            )}
                            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium">
                                {group.owner.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {group.owner.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {group.title}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span>{group.owner.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {group.owner.phone ? (
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span>{group.owner.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getRoleBadge(group.owner.role)}>
                            <Shield className="w-3 h-3 mr-1" />
                            {group.owner.role.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPracticeRoleBadge(
                            getPrimaryPracticeRole(group.owner) || "OWNER"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(group.owner.isActive)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {renderActions(group.owner)}
                        </td>
                      </tr>,
                    ];

                    if (hasMembers && !isCollapsed) {
                      rows.push(
                        ...group.members.map((user) => (
                          <tr key={user.id} className="hover:bg-muted">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3 pl-8">
                                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="font-medium">{user.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span>{user.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.phone ? (
                                <div className="flex items-center space-x-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span>{user.phone}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getRoleBadge(user.role)}>
                                <Shield className="w-3 h-3 mr-1" />
                                {user.role.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getPracticeRoleBadge(getPrimaryPracticeRole(user))}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(user.isActive)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {renderActions(user)}
                            </td>
                          </tr>
                        ))
                      );
                    }

                    return rows;
                  })
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.phone ? (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getRoleBadge(user.role)}>
                          <Shield className="w-3 h-3 mr-1" />
                          {user.role.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPracticeRoleBadge(getPrimaryPracticeRole(user))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.isActive)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {renderActions(user)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add New User</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="create-name">Name *</Label>
                  <Input
                    id="create-name"
                    value={createForm.name}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, name: e.target.value });
                      if (createErrors.name && e.target.value.trim()) {
                        setCreateErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    placeholder="Enter full name"
                    className={createErrors.name ? "border-red-500" : ""}
                  />
                  {createErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{createErrors.name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="create-email">Email *</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, email: e.target.value });
                      if (createErrors.email && e.target.value.trim()) {
                        setCreateErrors((prev) => ({ ...prev, email: undefined }));
                      }
                    }}
                    placeholder="Enter email address"
                    className={createErrors.email ? "border-red-500" : ""}
                  />
                  {createErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="create-phone">Phone</Label>
                  <Input
                    id="create-phone"
                    value={createForm.phone}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, phone: e.target.value });
                      if (createErrors.phone) {
                        setCreateErrors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                    placeholder="Enter phone number"
                    className={createErrors.phone ? "border-red-500" : ""}
                  />
                  {createErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="create-role">Role *</Label>
                  <select
                    id="create-role"
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="LAWYER">Lawyer</option>
                    <option value="ASSOCIATE">Associate</option>
                    <option value="PARALEGAL">Paralegal</option>
                  </select>
                </div>
                {subscriptionSettings && (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-sm font-medium text-foreground">
                      Plan: {subscriptionSettings.plan}
                    </p>
                    <p className="text-sm text-foreground">
                      Seats: {subscriptionSettings.activeMembers}/
                      {subscriptionSettings.seatLimit} used
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        hasNoAvailableSeats
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      Remaining seats: {subscriptionSettings.availableSeats}
                    </p>
                    {hasNoAvailableSeats && (
                      <p className="text-xs mt-2 text-red-600 dark:text-red-400">
                        No seats available. Increase seat limit in admin settings
                        before adding users.
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="create-password">Password *</Label>
                  <Input
                    id="create-password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => {
                      setCreateForm({ ...createForm, password: e.target.value });
                      if (createErrors.password && e.target.value.trim()) {
                        setCreateErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter password"
                    className={createErrors.password ? "border-red-500" : ""}
                  />
                  {createErrors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {createErrors.password}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    className="flex-1"
                    disabled={hasNoAvailableSeats}
                  >
                    Create User
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Edit User</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <select
                    id="edit-role"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="LAWYER">Lawyer</option>
                    <option value="ASSOCIATE">Associate</option>
                    <option value="PARALEGAL">Paralegal</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-password">
                    New Password (leave blank to keep current)
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    placeholder="Enter new password"
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateUser} className="flex-1">
                    Update User
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {isViewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">User Details</h2>
              {selectedUser && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {selectedUser.name}
                      </h3>
                      <Badge className={getRoleBadge(selectedUser.role)}>
                        {selectedUser.role.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedUser.email}</span>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedUser.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Practice Position:{" "}
                        {getPrimaryPracticeRole(selectedUser)?.replace("_", " ") ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedUser.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span>
                        Status: {selectedUser.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsViewModalOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPasswordModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Reset User Password
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    value={resetPasswordForm.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="reset-message">Message (optional)</Label>
                  <Textarea
                    id="reset-message"
                    value={resetPasswordForm.message}
                    onChange={(e) =>
                      setResetPasswordForm({
                        ...resetPasswordForm,
                        message: e.target.value,
                      })
                    }
                    placeholder="Custom message for the user"
                    rows={4}
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsResetPasswordModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleResetPassword} className="flex-1">
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate User Modal */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Deactivate User</h2>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to deactivate {selectedUser?.name}? This
                will prevent them from logging into the system and accessing any
                features.
              </p>
              <div className="flex space-x-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsDeactivateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeactivateUser}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reactivate User Modal */}
      {isReactivateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl border border-border max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Reactivate User</h2>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to reactivate {selectedUser?.name}? This
                will restore their ability to login and access the system.
              </p>
              <div className="flex space-x-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsReactivateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReactivateUser}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Reactivate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
