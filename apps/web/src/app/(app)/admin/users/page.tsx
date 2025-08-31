"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { userProfileSchema } from "@/lib/validation";
import { apiClient } from "@/services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Edit,
  Lock,
  Phone,
  Search,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  primaryPracticeId?: string;
  practices?: Array<{
    practice?: {
      id: string;
      name: string;
      practiceType: string;
    };
    isActive: boolean;
  }>;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  password?: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const resolver = yupResolver(userProfileSchema) as unknown as Resolver<
    UserFormData,
    unknown
  >;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UserFormData>({
    resolver,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "LAWYER",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      let data;
      if (user?.role === "SUPER_ADMIN") {
        data = await apiClient.getAllUsers();
      } else {
        data = await apiClient.getPracticeUsers();
      }
      setUsers(data as User[]);
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (data: UserFormData) => {
    try {
      await apiClient.createUser({
        ...data,
        password: data.password || "defaultPassword123",
        role: data.role as any,
      });
      toast.success("User created successfully");
      setShowCreateModal(false);
      reset();
      fetchUsers();
    } catch (error) {
      toast.error("Failed to create user");
    }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!selectedUser) return;
    try {
      await apiClient.updateUser(selectedUser.id, {
        ...data,
        role: data.role as any,
      });
      toast.success("User updated successfully");
      setShowEditModal(false);
      setSelectedUser(null);
      reset();
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword.trim()) return;
    try {
      await apiClient.resetUserPassword(selectedUser.id, newPassword);
      toast.success("Password reset successfully");
      setShowPasswordResetModal(false);
      setSelectedUser(null);
      setNewPassword("");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to reset password");
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await apiClient.reactivateUser(userId);
        toast.success("User reactivated successfully");
      } else {
        await apiClient.deactivateUser(userId);
        toast.success("User deactivated successfully");
      }
      fetchUsers();
    } catch (error) {
      toast.error(`Failed to ${isActive ? "reactivate" : "deactivate"} user`);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
    });
    setShowEditModal(true);
  };

  const openPasswordResetModal = (user: User) => {
    setSelectedUser(user);
    setShowPasswordResetModal(true);
  };

  const openDeleteConfirm = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "ADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "LAWYER":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "ASSOCIATE":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400";
      case "PARALEGAL":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "CLIENT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <button
              onClick={() => window.history.back()}
              className="hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <span>•</span>
            <span>Admin</span>
            <span>•</span>
            <span className="text-foreground font-medium">User Management</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground mt-2">
            {user?.role === "SUPER_ADMIN"
              ? "Manage all users across all practices"
              : "Manage users within your practice"}
          </p>
        </div>

        {/* Quick Help */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                What you can do here:
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>View all users</strong> in your practice (or all practices if you're a Super Admin)</li>
                  <li><strong>Edit user information</strong> including names, emails, and phone numbers</li>
                  <li><strong>Reset user passwords</strong> when they forget their credentials</li>
                  <li><strong>Activate/deactivate users</strong> to manage access</li>
                  <li><strong>Create new users</strong> and assign them to your practice</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lawyers</p>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.role === "LAWYER").length}
                </p>
              </div>
              <User className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clients</p>
                <p className="text-2xl font-bold text-foreground">
                  {users.filter(u => u.role === "CLIENT").length}
                </p>
              </div>
              <Users className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>

                {/* Search and Actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <User className="h-4 w-4" />
            Add User
          </button>
        </div>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Practice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {user.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {user.practices?.[0]?.practice?.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {user.isActive ? (
                          <>
                            <UserCheck className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit user"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openPasswordResetModal(user)}
                          className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                          title="Reset password"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleToggleUserStatus(user.id, !user.isActive)
                          }
                          className={`${
                            user.isActive
                              ? "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              : "text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          }`}
                          title={
                            user.isActive ? "Deactivate user" : "Activate user"
                          }
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Create New User</h2>
              <form
                onSubmit={handleSubmit(handleCreateUser)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    {...register("name")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone
                  </label>
                  <input
                    {...register("phone")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    {...register("role")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="LAWYER">Lawyer</option>
                    <option value="ASSOCIATE">Associate</option>
                    <option value="PARALEGAL">Paralegal</option>
                    <option value="CLIENT">Client</option>
                    {user?.role === "SUPER_ADMIN" && (
                      <>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="Leave blank for default password"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Edit User</h2>
              <form
                onSubmit={handleSubmit(handleUpdateUser)}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    {...register("name")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone
                  </label>
                  <input
                    {...register("phone")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    {...register("role")}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="LAWYER">Lawyer</option>
                    <option value="ASSOCIATE">Associate</option>
                    <option value="PARALEGAL">Paralegal</option>
                    <option value="CLIENT">Client</option>
                    {user?.role === "SUPER_ADMIN" && (
                      <>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordResetModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Reset Password</h2>
              <p className="text-muted-foreground mb-4">
                Enter a new password for {selectedUser.name}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPasswordResetModal(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordReset}
                    disabled={!newPassword.trim()}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
