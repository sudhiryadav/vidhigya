"use client";

import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { usePermissions } from "../contexts/PermissionContext";
import { usePractice } from "../contexts/PracticeContext";
import { PermissionAction, PermissionResource } from "../types/permissions";
import LoadingOverlay from "./LoadingOverlay";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import ModalDialog from "./ui/ModalDialog";
import CustomSelect from "./ui/select";
import { Textarea } from "./ui/textarea";
import { useToast } from "./ui/ToastContainer";

export default function PracticeSelector() {
  const { user } = useAuth();
  const {
    currentPractice,
    setCurrentPractice,
    userPractices,
    isLoading,
    createPractice,
  } = usePractice();
  const { hasPermission } = usePermissions();
  const { showSuccess, showError } = useToast();

  // Safe permission check with fallback
  const canCreatePractice = (() => {
    try {
      return hasPermission(
        PermissionAction.CREATE,
        PermissionResource.PRACTICE
      );
    } catch (error) {
      console.warn(
        "Permission context not available, allowing practice creation:",
        error
      );
      return true; // Fallback: allow creation
    }
  })();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPracticeData, setNewPracticeData] = useState({
    name: "",
    description: "",
    practiceType: "INDIVIDUAL" as "INDIVIDUAL" | "FIRM" | "MIXED",
    firmName: "",
    firmAddress: "",
    firmPhone: "",
    firmEmail: "",
  });

  const handlePracticeChange = (practiceId: string) => {
    const practice = userPractices.find((p) => p.id === practiceId);
    if (practice) {
      setCurrentPractice(practice);
    }
  };

  const handleCreatePractice = async () => {
    try {
      await createPractice(newPracticeData);
      setShowCreateDialog(false);
      setNewPracticeData({
        name: "",
        description: "",
        practiceType: "INDIVIDUAL",
        firmName: "",
        firmAddress: "",
        firmPhone: "",
        firmEmail: "",
      });
      showSuccess("Practice created successfully");
    } catch (error: any) {
      showError(error.message || "Failed to create practice");
    }
  };

  const getPracticeIcon = (type: string) => {
    switch (type) {
      case "FIRM":
        return <Building2 className="w-4 h-4" />;
      case "MIXED":
        return <Building2 className="w-4 h-4" />;
      default:
        return <Building2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <LoadingOverlay
        isVisible={isLoading}
        title="Loading Practices"
        message="Please wait while we fetch your practice information..."
        absolute={false}
      />
      {!isLoading && (
        <CustomSelect
          value={
            currentPractice
              ? { value: currentPractice.id, label: currentPractice.name }
              : undefined
          }
          onChange={(option) => option && handlePracticeChange(option.value)}
          options={userPractices.map((practice) => ({
            value: practice.id,
            label: (
              <div className="flex items-center space-x-2">
                {getPracticeIcon(practice.practiceType)}
                <span>{practice.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({practice.practiceType})
                </span>
              </div>
            ) as any,
          }))}
          placeholder="Select Practice"
          className="w-48"
        />
      )}

      {userPractices.length === 0 && canCreatePractice && (
        <>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Practice
          </Button>

          <ModalDialog
            isOpen={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            header={
              <div>
                <h3 className="text-lg font-semibold">Create New Practice</h3>
                <p className="text-sm text-gray-600">
                  Set up your legal practice or join an existing firm.
                </p>
              </div>
            }
            footer={
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePractice}
                  disabled={!newPracticeData.name.trim()}
                >
                  Create Practice
                </Button>
              </div>
            }
            maxWidth="md"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Practice Name *</Label>
                <Input
                  id="name"
                  placeholder="My Legal Practice"
                  value={newPracticeData.name}
                  onChange={(e) =>
                    setNewPracticeData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your practice"
                  value={newPracticeData.description}
                  onChange={(e) =>
                    setNewPracticeData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="practiceType">Practice Type *</Label>
                <CustomSelect
                  value={{
                    value: newPracticeData.practiceType,
                    label: newPracticeData.practiceType,
                  }}
                  onChange={(option) =>
                    setNewPracticeData((prev) => ({
                      ...prev,
                      practiceType: option?.value as
                        | "INDIVIDUAL"
                        | "FIRM"
                        | "MIXED",
                    }))
                  }
                  options={[
                    { value: "INDIVIDUAL", label: "Individual Practice" },
                    { value: "FIRM", label: "Law Firm" },
                    { value: "MIXED", label: "Mixed Practice" },
                  ]}
                  placeholder="Select practice type"
                />
              </div>

              {(newPracticeData.practiceType === "FIRM" ||
                newPracticeData.practiceType === "MIXED") && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium">Firm Details (Optional)</h4>

                  <div>
                    <Label htmlFor="firmName">Firm Name</Label>
                    <Input
                      id="firmName"
                      placeholder="Firm Name"
                      value={newPracticeData.firmName}
                      onChange={(e) =>
                        setNewPracticeData((prev) => ({
                          ...prev,
                          firmName: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="firmAddress">Firm Address</Label>
                    <Textarea
                      id="firmAddress"
                      placeholder="Firm Address"
                      value={newPracticeData.firmAddress}
                      onChange={(e) =>
                        setNewPracticeData((prev) => ({
                          ...prev,
                          firmAddress: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firmPhone">Firm Phone</Label>
                      <Input
                        id="firmPhone"
                        placeholder="Phone Number"
                        value={newPracticeData.firmPhone}
                        onChange={(e) =>
                          setNewPracticeData((prev) => ({
                            ...prev,
                            firmPhone: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="firmEmail">Firm Email</Label>
                      <Input
                        id="firmEmail"
                        type="email"
                        placeholder="firm@example.com"
                        value={newPracticeData.firmEmail}
                        onChange={(e) =>
                          setNewPracticeData((prev) => ({
                            ...prev,
                            firmEmail: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ModalDialog>
        </>
      )}

      {userPractices.length > 0 && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>

          <ModalDialog
            isOpen={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            header={
              <div>
                <h3 className="text-lg font-semibold">
                  Create Additional Practice
                </h3>
                <p className="text-sm text-gray-600">
                  Create another practice or join an existing firm.
                </p>
              </div>
            }
            footer={
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePractice}
                  disabled={!newPracticeData.name.trim()}
                >
                  Create Practice
                </Button>
              </div>
            }
            maxWidth="md"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Practice Name *</Label>
                <Input
                  id="name"
                  placeholder="My Legal Practice"
                  value={newPracticeData.name}
                  onChange={(e) =>
                    setNewPracticeData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your practice"
                  value={newPracticeData.description}
                  onChange={(e) =>
                    setNewPracticeData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <Label htmlFor="practiceType">Practice Type *</Label>
                <CustomSelect
                  value={{
                    value: newPracticeData.practiceType,
                    label: newPracticeData.practiceType,
                  }}
                  onChange={(option) =>
                    setNewPracticeData((prev) => ({
                      ...prev,
                      practiceType: option?.value as
                        | "INDIVIDUAL"
                        | "FIRM"
                        | "MIXED",
                    }))
                  }
                  options={[
                    { value: "INDIVIDUAL", label: "Individual Practice" },
                    { value: "FIRM", label: "Law Firm" },
                    { value: "MIXED", label: "Mixed Practice" },
                  ]}
                  placeholder="Select practice type"
                />
              </div>
            </div>
          </ModalDialog>
        </>
      )}
    </div>
  );
}
