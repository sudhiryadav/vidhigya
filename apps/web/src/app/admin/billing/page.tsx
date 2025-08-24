"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CustomSelect from "@/components/ui/select";
import { useToast } from "@/components/ui/ToastContainer";
import { apiClient } from "@/services/api";
import {
  AlertCircle,
  Calendar,
  DollarSign,
  Download,
  Eye,
  Search,
  TrendingUp,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BillingRecord {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string;
  client: string;
  clientEmail: string;
  createdDate: string;
  paidDate?: string;
}

export default function AdminBillingPage() {
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadBillingRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [billingRecords, searchTerm, statusFilter, dateRange]);

  const loadBillingRecords = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAdminBillingRecords();
      setBillingRecords(response as BillingRecord[]);
    } catch (error) {
      console.error("Failed to load billing records:", error);
      showError("Failed to load billing records");
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = billingRecords;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (record) =>
          record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.clientEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((record) => record.status === statusFilter);
    }

    // Date range filter
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((record) => {
        const createdDate = new Date(record.createdDate);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        return createdDate >= start && createdDate <= end;
      });
    }

    setFilteredRecords(filtered);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  const handleDateRangeChange = (field: "start" | "end", value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateRange({ start: "", end: "" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "OVERDUE":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "CANCELLED":
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateStats = () => {
    const total = billingRecords.length;
    const paid = billingRecords.filter((r) => r.status === "PAID").length;
    const pending = billingRecords.filter((r) => r.status === "PENDING").length;
    const overdue = billingRecords.filter((r) => r.status === "OVERDUE").length;

    const totalRevenue = billingRecords
      .filter((r) => r.status === "PAID")
      .reduce((sum, r) => sum + r.amount, 0);

    const pendingAmount = billingRecords
      .filter((r) => r.status === "PENDING")
      .reduce((sum, r) => sum + r.amount, 0);

    return {
      total,
      paid,
      pending,
      overdue,
      totalRevenue,
      pendingAmount,
    };
  };

  const stats = calculateStats();

  return (
    <div className="container mx-auto px-4 py-8">
      <LoadingOverlay
        isVisible={loading}
        title="Loading Billing Records"
        message="Please wait while we fetch billing information..."
        absolute={false}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Billing Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all billing records and payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
          <Button onClick={loadBillingRecords}>Refresh</Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search billing records..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <CustomSelect
                value={{
                  value: statusFilter,
                  label: statusFilter === "all" ? "All Statuses" : statusFilter,
                }}
                onChange={(option) =>
                  option && handleStatusFilter(option.value)
                }
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "PAID", label: "Paid" },
                  { value: "PENDING", label: "Pending" },
                  { value: "OVERDUE", label: "Overdue" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
                placeholder="Select status"
              />
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.start}
                onChange={(e) => handleDateRangeChange("start", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange("end", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(stats.pendingAmount)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Billing Records ({filteredRecords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Due Date
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Created Date
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border hover:bg-accent/50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {record.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {record.id}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground">
                        {formatCurrency(record.amount)}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={`text-xs ${getStatusColor(record.status)}`}
                      >
                        {record.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {record.client}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.clientEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {record.dueDate
                            ? formatDate(record.dueDate)
                            : "No due date"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {formatDate(record.createdDate)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No billing records found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
