"use client";

import { Input } from "@/components/ui/input";
import {
  Activity,
  AlertCircle,
  Briefcase,
  Building2,
  CheckCircle,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { PracticeMember, usePractice } from "../contexts/PracticeContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import ModalDialog from "./ui/ModalDialog";
import CustomSelect from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "./ui/ToastContainer";

interface PracticeDashboardProps {
  practiceId?: string;
}

interface MemberActivity {
  id: string;
  type:
    | "LOGIN"
    | "CASE_UPDATE"
    | "DOCUMENT_UPLOAD"
    | "CLIENT_UPDATE"
    | "BILLING_UPDATE";
  description: string;
  timestamp: string;
  memberId: string;
  memberName: string;
}

interface RolePermission {
  role: string;
  permissions: string[];
  description: string;
}

const ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: "OWNER",
    permissions: ["ALL"],
    description: "Full access to all practice features and settings",
  },
  {
    role: "PARTNER",
    permissions: [
      "MANAGE_CASES",
      "MANAGE_CLIENTS",
      "MANAGE_BILLING",
      "VIEW_REPORTS",
    ],
    description: "Can manage cases, clients, and billing with full access",
  },
  {
    role: "ASSOCIATE",
    permissions: ["VIEW_CASES", "EDIT_CASES", "VIEW_CLIENTS", "CREATE_BILLS"],
    description: "Can view and edit cases, view clients, and create bills",
  },
  {
    role: "PARALEGAL",
    permissions: [
      "VIEW_CASES",
      "VIEW_CLIENTS",
      "UPLOAD_DOCUMENTS",
      "VIEW_BILLING",
    ],
    description:
      "Can view cases and clients, upload documents, and view billing",
  },
  {
    role: "STAFF",
    permissions: ["VIEW_CASES", "VIEW_CLIENTS", "UPLOAD_DOCUMENTS"],
    description: "Basic access to view cases and clients, upload documents",
  },
];

export const PracticeDashboard: React.FC<PracticeDashboardProps> = ({
  practiceId,
}) => {
  const {
    currentPractice,
    practiceStats,
    isLoading,
    error,
    addMember,
    updateMemberRole,
    removeMember,
    getPracticeStats,
  } = usePractice();

  const { showSuccess, showError } = useToast();

  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
  const [showMemberDetailsDialog, setShowMemberDetailsDialog] = useState(false);
  const [showRoleInfoDialog, setShowRoleInfoDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<PracticeMember | null>(
    null
  );
  const [newMemberData, setNewMemberData] = useState({
    email: "",
    role: "ASSOCIATE",
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [memberActivities, setMemberActivities] = useState<MemberActivity[]>(
    []
  );

  const fetchMemberActivities = useCallback(async () => {
    // Mock data for member activities
    const mockActivities: MemberActivity[] = [
      {
        id: "1",
        type: "LOGIN",
        description: "Logged into the system",
        timestamp: new Date().toISOString(),
        memberId: "member-1",
        memberName: "Sarah Wilson",
      },
      {
        id: "2",
        type: "CASE_UPDATE",
        description: "Updated case: Smith vs. Johnson",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        memberId: "member-2",
        memberName: "Michael Johnson",
      },
      {
        id: "3",
        type: "DOCUMENT_UPLOAD",
        description: "Uploaded contract document",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        memberId: "member-1",
        memberName: "Sarah Wilson",
      },
    ];
    setMemberActivities(mockActivities);
  }, []);

  useEffect(() => {
    if (currentPractice?.id) {
      getPracticeStats(currentPractice.id);
      fetchMemberActivities();
    }
  }, [currentPractice?.id, getPracticeStats, fetchMemberActivities]);

  const handleAddMember = async () => {
    if (!currentPractice) return;

    if (
      !newMemberData.email ||
      !newMemberData.firstName ||
      !newMemberData.lastName
    ) {
      showError("Please fill in all required fields");
      return;
    }

    try {
      await addMember(currentPractice.id, newMemberData);
      setShowAddMemberDialog(false);
      setNewMemberData({
        email: "",
        role: "ASSOCIATE",
        firstName: "",
        lastName: "",
        phone: "",
        department: "",
      });
      showSuccess("Member added successfully");
    } catch (error: any) {
      showError(error.message || "Failed to add member");
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    if (!currentPractice) return;

    try {
      await updateMemberRole(currentPractice.id, memberId, newRole);
      setShowEditMemberDialog(false);
      setSelectedMember(null);
      showSuccess("Member role updated successfully");
    } catch (error: any) {
      showError(error.message || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentPractice) return;

    if (
      confirm(
        "Are you sure you want to remove this member? This action cannot be undone."
      )
    ) {
      try {
        await removeMember(currentPractice.id, memberId);
        showSuccess("Member removed successfully");
      } catch (error: any) {
        showError(error.message || "Failed to remove member");
      }
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "LOGIN":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "CASE_UPDATE":
        return <Briefcase className="w-4 h-4 text-blue-500" />;
      case "DOCUMENT_UPLOAD":
        return <FileText className="w-4 h-4 text-purple-500" />;
      case "CLIENT_UPDATE":
        return <Users className="w-4 h-4 text-orange-500" />;
      case "BILLING_UPDATE":
        return <DollarSign className="w-4 h-4 text-green-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "PARTNER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "ASSOCIATE":
        return "bg-green-100 text-green-800 border-green-200";
      case "PARALEGAL":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "STAFF":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredMembers =
    currentPractice?.members?.filter((member) => {
      const matchesSearch =
        member.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === "" || member.role === roleFilter;

      return matchesSearch && matchesRole;
    }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-foreground">
            Error loading practice
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!currentPractice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">
            No practice selected
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Please select a practice to view the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {currentPractice.name}
              </h1>
              <p className="text-muted-foreground mt-2">
                {currentPractice.description || "Practice Management Dashboard"}
              </p>
              <div className="flex items-center mt-2 space-x-4">
                <Badge
                  variant="outline"
                  className={getRoleColor(currentPractice.practiceType)}
                >
                  {currentPractice.practiceType}
                </Badge>
                {currentPractice.firm?.name && (
                  <span className="text-sm text-muted-foreground">
                    Firm: {currentPractice.firm.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowRoleInfoDialog(true)}
              >
                <Shield className="w-4 h-4 mr-2" />
                Role Info
              </Button>
              <Button onClick={() => setShowAddMemberDialog(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Member
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {practiceStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Members
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {currentPractice.members?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Briefcase className="w-8 h-8 text-green-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Cases
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {practiceStats?.caseCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-purple-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Clients
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {practiceStats?.clientCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="w-8 h-8 text-orange-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Documents
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {practiceStats?.documentCount || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Practice Information</CardTitle>
                  <CardDescription>
                    Basic practice details and settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Practice Type
                      </Label>
                      <p className="text-foreground">
                        {currentPractice.practiceType}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Total Members
                      </Label>
                      <p className="text-foreground">
                        {currentPractice.members?.length || 0}
                      </p>
                    </div>
                    {currentPractice.firm?.name && (
                      <>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Firm Name
                          </Label>
                          <p className="text-foreground">
                            {currentPractice.firm.name}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">
                            Firm Address
                          </Label>
                          <p className="text-foreground">
                            {currentPractice.firm.address || "Not specified"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Case
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add New Client
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Create Bill
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Practice Members</CardTitle>
                    <CardDescription>
                      Manage your team members and their roles
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddMemberDialog(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search members by name, email, or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                  >
                    <option value="">All Roles</option>
                    <option value="OWNER">Owner</option>
                    <option value="PARTNER">Partner</option>
                    <option value="ASSOCIATE">Associate</option>
                    <option value="PARALEGAL">Paralegal</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>

                {/* Members List */}
                <div className="space-y-4">
                  {filteredMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-medium text-foreground">
                        No members found
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {searchTerm || roleFilter
                          ? "Try adjusting your search criteria."
                          : "Get started by adding your first team member."}
                      </p>
                    </div>
                  ) : (
                    filteredMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-foreground">
                                {member.user.name}
                              </h4>
                              <Badge
                                variant="outline"
                                className={getRoleColor(member.role)}
                              >
                                {member.role}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setShowMemberDetailsDialog(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setShowEditMemberDialog(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {member.role !== "OWNER" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Member Activity</CardTitle>
                <CardDescription>
                  Recent activities and updates from team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {memberActivities.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-medium text-foreground">
                        No recent activity
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Activity will appear here as members use the system.
                      </p>
                    </div>
                  ) : (
                    memberActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-4 p-3 border border-border rounded-lg"
                      >
                        {getActivityIcon(activity.type)}
                        <div className="flex-1">
                          <p className="text-sm text-foreground">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {activity.memberName} •{" "}
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Overview</CardTitle>
                <CardDescription>Manage your practice clients</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Client management features will be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Member Dialog */}
        <ModalDialog
          isOpen={showAddMemberDialog}
          onClose={() => setShowAddMemberDialog(false)}
          header={
            <div>
              <h3 className="text-lg font-semibold">Add New Member</h3>
              <p className="text-sm text-muted-foreground">
                Invite a new team member to your practice.
              </p>
            </div>
          }
          footer={
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddMemberDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddMember}>Add Member</Button>
            </div>
          }
          maxWidth="lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first-name">First Name *</Label>
              <Input
                id="first-name"
                value={newMemberData.firstName}
                onChange={(e) =>
                  setNewMemberData({
                    ...newMemberData,
                    firstName: e.target.value,
                  })
                }
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="last-name">Last Name *</Label>
              <Input
                id="last-name"
                value={newMemberData.lastName}
                onChange={(e) =>
                  setNewMemberData({
                    ...newMemberData,
                    lastName: e.target.value,
                  })
                }
                placeholder="Enter last name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newMemberData.email}
                onChange={(e) =>
                  setNewMemberData({ ...newMemberData, email: e.target.value })
                }
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newMemberData.phone}
                onChange={(e) =>
                  setNewMemberData({ ...newMemberData, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <CustomSelect
                value={{ value: newMemberData.role, label: newMemberData.role }}
                onChange={(option) =>
                  option &&
                  setNewMemberData({ ...newMemberData, role: option.value })
                }
                options={[
                  { value: "PARTNER", label: "Partner" },
                  { value: "ASSOCIATE", label: "Associate" },
                  { value: "PARALEGAL", label: "Paralegal" },
                  { value: "STAFF", label: "Staff" },
                ]}
                placeholder="Select role"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={newMemberData.department}
                onChange={(e) =>
                  setNewMemberData({
                    ...newMemberData,
                    department: e.target.value,
                  })
                }
                placeholder="Enter department"
              />
            </div>
          </div>
        </ModalDialog>

        {/* Edit Member Dialog */}
        <ModalDialog
          isOpen={showEditMemberDialog}
          onClose={() => setShowEditMemberDialog(false)}
          header={
            <div>
              <h3 className="text-lg font-semibold">Edit Member Role</h3>
              <p className="text-sm text-muted-foreground">
                Update the role for {selectedMember?.user.name}.
              </p>
            </div>
          }
          footer={
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowEditMemberDialog(false)}
              >
                Cancel
              </Button>
            </div>
          }
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <CustomSelect
                value={{
                  value: selectedMember?.role || "",
                  label: selectedMember?.role || "",
                }}
                onChange={(option) => {
                  if (selectedMember && option) {
                    handleUpdateMemberRole(selectedMember.id, option.value);
                  }
                }}
                options={[
                  { value: "PARTNER", label: "Partner" },
                  { value: "ASSOCIATE", label: "Associate" },
                  { value: "PARALEGAL", label: "Paralegal" },
                  { value: "STAFF", label: "Staff" },
                ]}
                placeholder="Select role"
              />
            </div>
          </div>
        </ModalDialog>

        {/* Member Details Dialog */}
        <ModalDialog
          isOpen={showMemberDetailsDialog}
          onClose={() => setShowMemberDetailsDialog(false)}
          header={
            <div>
              <h3 className="text-lg font-semibold">Member Details</h3>
              <p className="text-sm text-muted-foreground">
                Information about {selectedMember?.user.name}.
              </p>
            </div>
          }
          footer={
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowMemberDetailsDialog(false)}
              >
                Close
              </Button>
            </div>
          }
          maxWidth="lg"
        >
          {selectedMember && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Name
                  </Label>
                  <p className="text-foreground">{selectedMember.user.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Email
                  </Label>
                  <p className="text-foreground">{selectedMember.user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Role
                  </Label>
                  <Badge
                    variant="outline"
                    className={getRoleColor(selectedMember.role)}
                  >
                    {selectedMember.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Joined
                  </Label>
                  <p className="text-foreground">
                    Member since {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ModalDialog>

        {/* Role Info Dialog */}
        <ModalDialog
          isOpen={showRoleInfoDialog}
          onClose={() => setShowRoleInfoDialog(false)}
          header={
            <div>
              <h3 className="text-lg font-semibold">Role Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Understanding different roles and their permissions in your
                practice.
              </p>
            </div>
          }
          footer={
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRoleInfoDialog(false)}
              >
                Close
              </Button>
            </div>
          }
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {ROLE_PERMISSIONS.map((roleInfo) => (
              <div
                key={roleInfo.role}
                className="border border-border rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">
                    {roleInfo.role}
                  </h4>
                  <Badge
                    variant="outline"
                    className={getRoleColor(roleInfo.role)}
                  >
                    {roleInfo.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {roleInfo.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {roleInfo.permissions.map((permission) => (
                    <Badge
                      key={permission}
                      variant="secondary"
                      className="text-xs"
                    >
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ModalDialog>
      </div>
    </div>
  );
};
