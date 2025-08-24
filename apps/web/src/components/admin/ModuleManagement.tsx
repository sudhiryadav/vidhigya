"use client";

import { PermissionGate } from "@/components/permissions/PermissionGate";
import { ProtectedButton } from "@/components/permissions/ProtectedButton";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { apiClient } from "@/services/api";
import { CreateModuleForm, NavigationModule } from "@/types/modules";
import { PermissionAction, PermissionResource } from "@/types/permissions";
import { Practice } from "@/types/practices";
import {
  Building2,
  Edit,
  Eye,
  EyeOff,
  Globe,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function ModuleManagement() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [modules, setModules] = useState<NavigationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingModule, setEditingModule] = useState<NavigationModule | null>(
    null
  );
  const [createForm, setCreateForm] = useState<CreateModuleForm>({
    name: "",
    path: "",
    icon: "Settings",
    isActive: true,
    isVisible: true,
    order: 0,
    permissions: [],
  });

  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<string>("all");

  useEffect(() => {
    fetchModules();
    fetchPractices();
  }, [selectedPractice]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getModules(
        selectedPractice !== "all" ? selectedPractice : undefined
      );
      setModules(data as NavigationModule[]);
    } catch (error) {
      console.error("Error fetching modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPractices = async () => {
    try {
      const data = await apiClient.getUserPractices();
      setPractices(data);
    } catch (error) {
      console.error("Error fetching practices:", error);
    }
  };

  const handleCreateModule = async () => {
    try {
      const newModule = await apiClient.createModule({
        ...createForm,
        practiceId: createForm.practiceId || undefined,
      });
      setModules([...modules, newModule as NavigationModule]);
      setShowCreateForm(false);
      resetCreateForm();
    } catch (error) {
      console.error("Error creating module:", error);
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

    try {
      const updatedModule = await apiClient.updateModule(
        editingModule.id,
        editingModule
      );
      setModules(
        modules.map((m) => (m.id === updatedModule.id ? updatedModule : m))
      );
      setEditingModule(null);
    } catch (error) {
      console.error("Error updating module:", error);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module?")) return;

    try {
      await apiClient.deleteModule(moduleId);
      setModules(modules.filter((m) => m.id !== moduleId));
    } catch (error) {
      console.error("Error deleting module:", error);
    }
  };

  const handleToggleVisibility = async (moduleId: string) => {
    try {
      const updatedModule = await apiClient.toggleModuleVisibility(moduleId);
      setModules(
        modules.map((m) => (m.id === updatedModule.id ? updatedModule : m))
      );
    } catch (error) {
      console.error("Error toggling visibility:", error);
    }
  };

  const handleToggleActivation = async (moduleId: string) => {
    try {
      const updatedModule = await apiClient.toggleModuleActivation(moduleId);
      setModules(
        modules.map((m) => (m.id === updatedModule.id ? updatedModule : m))
      );
    } catch (error) {
      console.error("Error toggling activation:", error);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      path: "",
      icon: "Settings",
      isActive: true,
      isVisible: true,
      order: 0,
      permissions: [],
    });
  };

  const canManageModules = hasPermission(
    PermissionAction.MANAGE,
    PermissionResource.MODULE
  );
  const canCreateModules = hasPermission(
    PermissionAction.CREATE,
    PermissionResource.MODULE
  );
  const canUpdateModules = hasPermission(
    PermissionAction.UPDATE,
    PermissionResource.MODULE
  );
  const canDeleteModules = hasPermission(
    PermissionAction.DELETE,
    PermissionResource.MODULE
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Module Management
          </h1>
          <p className="text-muted-foreground">
            Manage navigation modules and features across the system
          </p>
        </div>

        <PermissionGate
          action={PermissionAction.CREATE}
          resource={PermissionResource.MODULE}
        >
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Module</span>
          </button>
        </PermissionGate>
      </div>

      {/* Practice Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-foreground">
          Filter by Practice:
        </label>
        <select
          value={selectedPractice}
          onChange={(e) => setSelectedPractice(e.target.value)}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="all">All Practices</option>
          {practices.map((practice) => (
            <option key={practice.id} value={practice.id}>
              {practice.name}
            </option>
          ))}
        </select>
      </div>

      {/* Create Module Form */}
      {showCreateForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Module</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Module Name
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="e.g., Case Management"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Path</label>
              <input
                type="text"
                value={createForm.path}
                onChange={(e) =>
                  setCreateForm({ ...createForm, path: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="e.g., /cases"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Icon</label>
              <input
                type="text"
                value={createForm.icon}
                onChange={(e) =>
                  setCreateForm({ ...createForm, icon: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                placeholder="e.g., Briefcase"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Order</label>
              <input
                type="number"
                value={createForm.order}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    order: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Practice</label>
              <select
                value={createForm.practiceId || ""}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    practiceId: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">System-wide</option>
                {practices.map((practice) => (
                  <option key={practice.id} value={practice.id}>
                    {practice.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, isActive: e.target.checked })
                  }
                  className="rounded border-border"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={createForm.isVisible}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      isVisible: e.target.checked,
                    })
                  }
                  className="rounded border-border"
                />
                <span className="text-sm">Visible</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowCreateForm(false);
                resetCreateForm();
              }}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateModule}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Module
            </button>
          </div>
        </div>
      )}

      {/* Modules List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Practice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modules.map((module) => (
                <tr key={module.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {module.practiceId ? (
                          <Building2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Globe className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {module.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {module.icon}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {module.path}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {module.practiceId ? "Practice-specific" : "System-wide"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          module.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {module.isActive ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          module.isVisible
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {module.isVisible ? "Visible" : "Hidden"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {module.order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <ProtectedButton
                        action={PermissionAction.UPDATE}
                        resource={PermissionResource.MODULE}
                        onClick={() => handleToggleVisibility(module.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title={module.isVisible ? "Hide Module" : "Show Module"}
                      >
                        {module.isVisible ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </ProtectedButton>

                      <ProtectedButton
                        action={PermissionAction.UPDATE}
                        resource={PermissionResource.MODULE}
                        onClick={() => handleToggleActivation(module.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title={
                          module.isActive
                            ? "Deactivate Module"
                            : "Activate Module"
                        }
                      >
                        {module.isActive ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </ProtectedButton>

                      <ProtectedButton
                        action={PermissionAction.UPDATE}
                        resource={PermissionResource.MODULE}
                        onClick={() => setEditingModule(module)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-md transition-colors"
                        title="Edit Module"
                      >
                        <Edit className="w-4 h-4" />
                      </ProtectedButton>

                      <ProtectedButton
                        action={PermissionAction.DELETE}
                        resource={PermissionResource.MODULE}
                        onClick={() => handleDeleteModule(module.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Module"
                      >
                        <Trash2 className="w-4 h-4" />
                      </ProtectedButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Module Modal */}
      {editingModule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Edit Module: {editingModule.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Module Name
                </label>
                <input
                  type="text"
                  value={editingModule.name}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Path</label>
                <input
                  type="text"
                  value={editingModule.path}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, path: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Icon</label>
                <input
                  type="text"
                  value={editingModule.icon}
                  onChange={(e) =>
                    setEditingModule({ ...editingModule, icon: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Order</label>
                <input
                  type="number"
                  value={editingModule.order}
                  onChange={(e) =>
                    setEditingModule({
                      ...editingModule,
                      order: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingModule(null)}
                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateModule}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Update Module
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
