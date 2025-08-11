"use client";

import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { courtFormSchema } from "@/lib/validation";
import { apiClient } from "@/services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Building2,
  Edit,
  Eye,
  Filter,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

interface Court {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
  phone?: string;
  email?: string;
  website?: string;
  jurisdiction?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  cases?: Array<{
    id: string;
    caseNumber: string;
    title: string;
    status: string;
    category: string;
    createdAt: string;
  }>;
}

interface CourtType {
  value: string;
  label: string;
}

type CourtFormData = yup.InferType<typeof courtFormSchema>;

const courtTypes: CourtType[] = [
  { value: "SUPREME_COURT", label: "Supreme Court" },
  { value: "HIGH_COURT", label: "High Court" },
  { value: "DISTRICT_COURT", label: "District Court" },
  { value: "SESSIONS_COURT", label: "Sessions Court" },
  { value: "MAGISTRATE_COURT", label: "Magistrate Court" },
  { value: "FAMILY_COURT", label: "Family Court" },
  { value: "LABOR_COURT", label: "Labor Court" },
  { value: "CONSUMER_COURT", label: "Consumer Court" },
  { value: "TRIBUNAL", label: "Tribunal" },
  { value: "SPECIAL_COURT", label: "Special Court" },
  { value: "OTHER", label: "Other" },
];

export default function CourtsManagementPage() {
  const { user } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null);
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    fetchCourts();
    fetchStates();
  }, []);

  const fetchCourts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCourts();
      setCourts(response as Court[]);
    } catch (error) {
      console.error("Error fetching courts:", error);
      toast.error("Failed to fetch courts");
    } finally {
      setLoading(false);
    }
  };

  const fetchStates = async () => {
    try {
      const response = await apiClient.getCourtStates();
      setStates(response as string[]);
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      let response;

      if (searchTerm) {
        response = await apiClient.searchCourts(searchTerm);
      } else {
        const filters: Record<string, string> = {};
        if (selectedType) filters.type = selectedType;
        if (selectedState) filters.state = selectedState;
        response = await apiClient.getCourts(filters);
      }

      setCourts(response as Court[]);
    } catch (error) {
      console.error("Error searching courts:", error);
      toast.error("Failed to search courts");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourt = async () => {
    if (!courtToDelete) return;

    try {
      await apiClient.deleteCourt(courtToDelete.id);
      toast.success("Court deleted successfully");
      setShowDeleteModal(false);
      setCourtToDelete(null);
      fetchCourts();
    } catch (error) {
      console.error("Error deleting court:", error);
      toast.error("Failed to delete court");
    }
  };

  const getCourtTypeLabel = (type: string) => {
    const courtType = courtTypes.find((ct) => ct.value === type);
    return courtType?.label || type;
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "text-green-600" : "text-red-600";
  };

  const filteredCourts = courts.filter((court) => {
    const matchesSearch =
      court.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      court.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      court.state.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || court.type === selectedType;
    const matchesState = !selectedState || court.state === selectedState;
    return matchesSearch && matchesType && matchesState;
  });

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Access Denied
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Only super admins can access court management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Court Management</h1>
        <p className="text-gray-600">Manage all courts in the system</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search courts by name, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>

          <button
            onClick={() => {
              setSelectedCourt({} as Court);
              setShowCourtModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Court
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CustomSelect
              value={{
                value: selectedType,
                label: selectedType
                  ? courtTypes.find((type) => type.value === selectedType)
                      ?.label || selectedType
                  : "All Court Types",
              }}
              onChange={(option) => setSelectedType(option?.value || "")}
              options={[{ value: "", label: "All Court Types" }, ...courtTypes]}
              placeholder="Select court type..."
              className="w-full"
            />

            <CustomSelect
              value={{
                value: selectedState,
                label: selectedState || "All States",
              }}
              onChange={(option) => setSelectedState(option?.value || "")}
              options={[
                { value: "", label: "All States" },
                ...states.map((state) => ({ value: state, label: state })),
              ]}
              placeholder="Select state..."
              className="w-full"
            />

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
            >
              Apply Filters
            </button>
          </div>
        )}
      </div>

      {/* Courts List */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading courts...</p>
          </div>
        ) : filteredCourts.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No courts found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedType || selectedState
                ? "Try adjusting your search criteria."
                : "Get started by adding a new court."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Court
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCourts.map((court) => (
                  <tr key={court.id} className="hover:bg-muted">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {court.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {court.jurisdiction}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getCourtTypeLabel(court.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {court.city}
                          </div>
                          <div className="text-sm text-gray-500">
                            {court.state}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {court.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            {court.phone}
                          </div>
                        )}
                        {court.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-3 w-3 mr-1" />
                            {court.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(court.isActive)}`}
                      >
                        {court.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCourt(court);
                            setShowCourtModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCourt(court);
                            setShowCourtModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCourtToDelete(court);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Court Details Modal */}
      {showCourtModal && selectedCourt && (
        <CourtModal
          court={selectedCourt}
          onClose={() => {
            setShowCourtModal(false);
            setSelectedCourt(null);
          }}
          onSave={() => {
            setShowCourtModal(false);
            setSelectedCourt(null);
            fetchCourts();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && courtToDelete && (
        <DeleteModal
          court={courtToDelete}
          onClose={() => {
            setShowDeleteModal(false);
            setCourtToDelete(null);
          }}
          onConfirm={handleDeleteCourt}
        />
      )}
    </div>
  );
}

// Court Modal Component
function CourtModal({
  court,
  onClose,
  onSave,
}: {
  court: Court;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!court.id;

  const resolver = yupResolver(courtFormSchema) as unknown as Resolver<
    CourtFormData,
    unknown
  >;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CourtFormData>({
    resolver,
    defaultValues: {
      name: court.name || undefined,
      type: court.type || undefined,
      address: court.address || undefined,
      city: court.city || undefined,
      state: court.state || undefined,
      country: court.country || "India",
      pincode: court.pincode || undefined,
      phone: court.phone || undefined,
      email: court.email || undefined,
      website: court.website || undefined,
      jurisdiction: court.jurisdiction || undefined,
      isActive: court.isActive !== undefined ? court.isActive : true,
    },
    mode: "onSubmit",
  });

  const onSubmit = async (data: CourtFormData) => {
    setLoading(true);

    try {
      if (isEditing) {
        await apiClient.updateCourt(court.id, data);
        toast.success("Court updated successfully");
      } else {
        await apiClient.createCourt(data);
        toast.success("Court created successfully");
      }
      onSave();
    } catch (error) {
      console.error("Error saving court:", error);
      toast.error(
        isEditing ? "Failed to update court" : "Failed to create court"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? "Edit Court" : "Add New Court"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Court Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("name")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter court name"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Court Type <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                value={{
                  value: watch("type"),
                  label: watch("type")
                    ? courtTypes.find((type) => type.value === watch("type"))
                        ?.label || watch("type")
                    : "",
                }}
                onChange={(option) => setValue("type", option?.value || "")}
                options={courtTypes}
                placeholder="Select court type..."
                className={errors.type ? "border-red-500" : ""}
              />
              {errors.type && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("address")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.address ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter complete address"
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("city")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.city ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter city name"
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.city.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("state")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.state ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter state name"
              />
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.state.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("country")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.country ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter country name"
              />
              {errors.country && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.country.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("pincode")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.pincode ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter 6-digit pincode"
              />
              {errors.pincode && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.pincode.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register("phone")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.phone ? "border-red-500" : "border-gray-300"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                {...register("email")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? "border-red-500" : "border-gray-300"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                {...register("website")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.website ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter website URL"
              />
              {errors.website && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.website.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jurisdiction <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register("jurisdiction")}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.jurisdiction ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="Enter jurisdiction"
              />
              {errors.jurisdiction && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.jurisdiction.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isEditing
                  ? "Update Court"
                  : "Create Court"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Modal Component
function DeleteModal({
  court,
  onClose,
  onConfirm,
}: {
  court: Court;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Delete Court</h2>
        <p className="mb-6">
          Are you sure you want to delete{" "}
          <span className="font-bold">{court.name}</span>?
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="mr-3 px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
