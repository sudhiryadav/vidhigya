"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import CustomSelect from "@/components/ui/select";
import LoadingOverlay from "@/components/LoadingOverlay";
import {
  FormFieldWrapper,
  ValidatedInput,
} from "@/components/ui/ValidationMessage";
import { userProfileSchema } from "@/lib/validation";
import { apiClient } from "@/services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Calendar,
  Edit,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface Lawyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface LawyerFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export default function LawyersManagement() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);

  const resolver = yupResolver(userProfileSchema) as unknown as Resolver<
    LawyerFormData,
    unknown
  >;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LawyerFormData>({
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
    fetchLawyers();
  }, []);

  const fetchLawyers = async () => {
    try {
      const data = await apiClient.getLawyers();
      setLawyers(data as Lawyer[]);
    } catch {
      toast.error("Failed to fetch lawyers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLawyer = async (data: LawyerFormData) => {
    try {
      await apiClient.createLawyer({
        ...data,
        password: "defaultPassword123", // This should be handled properly in a real app
        role: data.role as "LAWYER" | "ASSOCIATE" | "PARALEGAL",
      });
      toast.success("Lawyer created successfully");
      setShowCreateModal(false);
      reset();
      fetchLawyers();
    } catch {
      toast.error("Failed to create lawyer");
    }
  };

  const handleUpdateLawyer = async (data: LawyerFormData) => {
    if (!selectedLawyer) return;
    try {
      await apiClient.updateLawyer(selectedLawyer.id, {
        ...data,
        role: data.role as "LAWYER" | "ASSOCIATE" | "PARALEGAL",
      });
      toast.success("Lawyer updated successfully");
      setShowEditModal(false);
      setSelectedLawyer(null);
      reset();
      fetchLawyers();
    } catch {
      toast.error("Failed to update lawyer");
    }
  };

  const handleDeleteLawyer = async () => {
    if (!selectedLawyer) return;
    try {
      await apiClient.deleteLawyer(selectedLawyer.id);
      toast.success("Lawyer deleted successfully");
      setShowDeleteConfirm(false);
      setSelectedLawyer(null);
      fetchLawyers();
    } catch {
      toast.error("Failed to delete lawyer");
    }
  };

  const openEditModal = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    reset({
      name: lawyer.name,
      email: lawyer.email,
      phone: lawyer.phone,
      role: lawyer.role,
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowDeleteConfirm(true);
  };

  const filteredLawyers = lawyers.filter(
    (lawyer) =>
      lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lawyer.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Lawyers Management
          </h1>
          <p className="text-muted-foreground">
            Manage lawyer accounts and permissions
          </p>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search lawyers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="w-5 h-5" />
            <span>Add Lawyer</span>
          </button>
        </div>

        {/* Lawyers Table */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Lawyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredLawyers.map((lawyer) => (
                  <tr key={lawyer.id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {lawyer.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {lawyer.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{lawyer.email}</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{lawyer.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400">
                        {lawyer.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>
                          {new Date(lawyer.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(lawyer)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(lawyer)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Lawyer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Add New Lawyer
              </h3>
              <form
                onSubmit={handleSubmit(handleCreateLawyer)}
                className="space-y-3"
              >
                <ValidatedInput
                  label="Name"
                  required
                  error={errors.name}
                  register={register}
                  name="name"
                  placeholder="Enter lawyer name"
                />
                <ValidatedInput
                  label="Email"
                  required
                  error={errors.email}
                  register={register}
                  name="email"
                  type="email"
                  placeholder="Enter email address"
                />
                <ValidatedInput
                  label="Phone"
                  required
                  error={errors.phone}
                  register={register}
                  name="phone"
                  type="tel"
                  placeholder="Enter phone number"
                />
                <FormFieldWrapper label="Role" required error={errors.role}>
                  <CustomSelect
                    value={{
                      value: watch("role"),
                      label:
                        watch("role") === "LAWYER"
                          ? "Lawyer"
                          : watch("role") === "ASSOCIATE"
                            ? "Associate"
                            : "Paralegal",
                    }}
                    onChange={(option) =>
                      setValue("role", option?.value || "LAWYER")
                    }
                    options={[
                      { value: "LAWYER", label: "Lawyer" },
                      { value: "ASSOCIATE", label: "Associate" },
                      { value: "PARALEGAL", label: "Paralegal" },
                    ]}
                    placeholder="Select role..."
                    className={errors.role ? "border-red-500" : ""}
                  />
                </FormFieldWrapper>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      reset();
                    }}
                    className="px-4 py-2 text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={false}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Lawyer Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Edit Lawyer
              </h3>
              <form
                onSubmit={handleSubmit(handleUpdateLawyer)}
                className="space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? "border-red-500" : "border-border"
                    }`}
                    placeholder="Enter lawyer name"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? "border-red-500" : "border-border"
                    }`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    {...register("phone")}
                    className={`w-full px-3 py-2 border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.phone ? "border-red-500" : "border-border"
                    }`}
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={{
                      value: watch("role"),
                      label:
                        watch("role") === "LAWYER"
                          ? "Lawyer"
                          : watch("role") === "ASSOCIATE"
                            ? "Associate"
                            : "Paralegal",
                    }}
                    onChange={(option) =>
                      setValue("role", option?.value || "LAWYER")
                    }
                    options={[
                      { value: "LAWYER", label: "Lawyer" },
                      { value: "ASSOCIATE", label: "Associate" },
                      { value: "PARALEGAL", label: "Paralegal" },
                    ]}
                    placeholder="Select role..."
                    className={errors.role ? "border-red-500" : ""}
                  />
                  {errors.role && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.role.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedLawyer(null);
                      reset();
                    }}
                    className="px-4 py-2 text-muted-foreground hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={false}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteLawyer}
          title="Delete Lawyer"
          message={`Are you sure you want to delete ${selectedLawyer?.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      </div>
    </div>
  );
}
