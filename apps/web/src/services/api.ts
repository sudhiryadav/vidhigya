import { Practice } from "../types/practices";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        if (response.status === 401) {
          // Don't redirect for login/register endpoints - let them handle errors
          if (endpoint === "/auth/login" || endpoint === "/auth/register") {
            // Get the response text first, then try to parse as JSON
            const errorText = await response.text();
            let errorMessage = "Authentication failed";

            if (errorText) {
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
              } catch (parseError) {
                // If JSON parsing fails, use the raw text or default message
                errorMessage = errorText || errorMessage;
              }
            }

            throw new Error(errorMessage);
          }

          // Handle unauthorized access for other endpoints
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }
          throw new Error("Unauthorized");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone?: string;
  }) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    // JWT tokens are stateless, so no backend logout is needed
    // The frontend will clear the token and user data
    // This method exists for API consistency but doesn't make backend calls
    return Promise.resolve();
  }

  async forgotPassword(email: string) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async uploadAvatar(file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async removeAvatar(): Promise<any> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${API_BASE_URL}/auth/avatar`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getAvatar(userId: string): Promise<Blob> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${API_BASE_URL}/auth/avatar/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  // System Settings endpoints
  async getSystemSettings() {
    try {
      const response = await this.request("/system-settings/structured");
      return response || null;
    } catch (error) {
      console.error("Error fetching system settings:", error);
      return null;
    }
  }

  async updateSystemSetting(key: string, value: string) {
    return this.request(`/system-settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    });
  }

  async updateMultipleSystemSettings(
    updates: Array<{ key: string; value: string }>
  ) {
    return this.request("/system-settings/bulk-update", {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  async getMaintenanceStatus() {
    return this.request("/system-settings/maintenance/status");
  }

  async getSessionTimeout() {
    return this.request("/system-settings/security/session-timeout");
  }

  async getPasswordPolicy() {
    return this.request("/system-settings/security/password-policy");
  }

  // Admin endpoints
  async getSystemStats() {
    return this.request("/admin/stats");
  }

  async getRecentActivity(limit = 10) {
    return this.request(`/admin/recent-activity?limit=${limit}`);
  }

  async getUserRecentActivity(limit = 10) {
    return this.request(`/cases/recent-activity?limit=${limit}`);
  }

  async getLawyers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    // For calendar events, use the calendar/users endpoint that doesn't require admin privileges
    if (!filters || Object.keys(filters).length === 0) {
      return this.request("/calendar/users");
    }

    // For admin purposes, use the admin endpoint
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.role) params.append("role", filters.role);
    if (filters?.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());

    return this.request(`/admin/lawyers?${params.toString()}`);
  }

  async createLawyer(data: {
    name: string;
    email: string;
    password: string;
    role: "LAWYER" | "ASSOCIATE" | "PARALEGAL";
    phone?: string;
    specialization?: string;
  }) {
    return this.request("/admin/lawyers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateLawyer(
    id: string,
    data: {
      name?: string;
      email?: string;
      role?: "LAWYER" | "ASSOCIATE" | "PARALEGAL";
      phone?: string;
      isActive?: boolean;
    }
  ) {
    return this.request(`/admin/lawyers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteLawyer(id: string) {
    return this.request(`/admin/lawyers/${id}`, {
      method: "DELETE",
    });
  }

  // User Management endpoints
  async getAllUsers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
    practiceId?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.role) params.append("role", filters.role);
    if (filters?.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());
    if (filters?.practiceId) params.append("practiceId", filters.practiceId);

    return this.request(`/admin/users?${params.toString()}`);
  }

  async getPracticeUsers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.role) params.append("role", filters.role);
    if (filters?.isActive !== undefined)
      params.append("isActive", filters.isActive.toString());

    return this.request(`/practice/users?${params.toString()}`);
  }

  async updateUser(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      isActive?: boolean;
      role?: string;
      password?: string;
    }
  ) {
    // Use practice endpoint for firm owners, admin endpoint for super admins
    return this.request(`/practice/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async resetUserPassword(id: string, newPassword: string) {
    // Use practice endpoint for firm owners, admin endpoint for super admins
    return this.request(`/practice/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password: newPassword }),
    });
  }

  async deactivateUser(id: string) {
    // Use practice endpoint for firm owners, admin endpoint for super admins
    return this.request(`/practice/users/${id}/deactivate`, {
      method: "PATCH",
    });
  }

  async reactivateUser(id: string) {
    // Use practice endpoint for firm owners, admin endpoint for super admins
    return this.request(`/practice/users/${id}/reactivate`, {
      method: "PATCH",
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
  }) {
    // Use practice endpoint for firm owners, admin endpoint for super admins
    return this.request("/practice/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // New admin endpoints for admin pages
  async getAdminDocuments(filters?: {
    search?: string;
    status?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    return this.request(`/admin/documents?${params.toString()}`);
  }

  async getAdminBillingRecords(filters?: {
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    return this.request(`/admin/billing?${params.toString()}`);
  }

  async getAdminAnalytics() {
    return this.request("/admin/analytics");
  }

  async getAdminReports() {
    return this.request("/admin/reports");
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request("/cases/dashboard");
  }

  async getPracticeDashboardStats() {
    return this.request("/cases/practice-dashboard");
  }

  async getUpcomingHearings() {
    return this.request("/calendar/upcoming");
  }

  async getOverdueBills() {
    return this.request("/cases/overdue-bills");
  }

  // Cases endpoints
  async getCases(filters?: {
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.search) params.append("search", filters.search);

    return this.request(`/cases?${params.toString()}`);
  }

  async getCase(id: string) {
    return this.request(`/cases/${id}`);
  }

  // Case Management
  async createCase(caseData: {
    caseNumber: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    courtId?: string;
    judge?: string;
    opposingParty?: string;
    opposingLawyer?: string;
    filingDate?: string;
    nextHearingDate?: string;
    estimatedCompletionDate?: string;
    clientId: string;
    assignedLawyerId: string;
  }) {
    return this.request("/cases", {
      method: "POST",
      body: JSON.stringify(caseData),
    });
  }

  async updateCase(
    id: string,
    caseData: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      category?: string;
      courtId?: string;
      judge?: string;
      opposingParty?: string;
      opposingLawyer?: string;
      filingDate?: string;
      nextHearingDate?: string;
      estimatedCompletionDate?: string;
      assignedLawyerId?: string;
    }
  ) {
    return this.request(`/cases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(caseData),
    });
  }

  async deleteCase(id: string) {
    return this.request(`/cases/${id}`, {
      method: "DELETE",
    });
  }

  async createCaseNote(
    caseId: string,
    data: {
      content: string;
      type: string;
    }
  ) {
    return this.request(`/cases/${caseId}/notes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getCaseNotes(caseId: string) {
    return this.request(`/cases/${caseId}/notes`);
  }

  // Tasks endpoints
  async getTasks(filters?: {
    status?: string;
    priority?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.search) params.append("search", filters.search);

    return this.request(`/tasks?${params.toString()}`);
  }

  async getTask(id: string) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    caseId?: string;
    assignedToId?: string;
  }) {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      dueDate?: string;
      caseId?: string;
      assignedToId?: string;
      completedAt?: string;
    }
  ) {
    return this.request(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, {
      method: "DELETE",
    });
  }

  // Calendar endpoints
  async getCalendarEvents(filters?: {
    startDate?: string;
    endDate?: string;
    eventType?: string;
    caseId?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.eventType) params.append("eventType", filters.eventType);
    if (filters?.caseId) params.append("caseId", filters.caseId);

    return this.request(`/calendar?${params.toString()}`);
  }

  // Google Calendar Integration
  async getGoogleAuthUrl() {
    const response = await this.request<{ authUrl: string }>(
      "/calendar/google/auth-url"
    );
    return response;
  }

  async connectGoogleCalendar(code: string) {
    return this.request("/calendar/google/connect", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  async syncGoogleCalendar() {
    return this.request("/calendar/google/sync", {
      method: "POST",
    });
  }

  async getCalendarEvent(id: string) {
    return this.request(`/calendar/${id}`);
  }

  async createCalendarEvent(data: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    eventType: string;
    isAllDay?: boolean;
    isRecurring?: boolean;
    recurrenceRule?: string;
    caseId?: string;
    clientId?: string;
    participantIds?: string[];
  }) {
    return this.request("/calendar", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCalendarEvent(
    id: string,
    data: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      eventType?: string;
      isAllDay?: boolean;
      isRecurring?: boolean;
      recurrenceRule?: string;
      caseId?: string;
      clientId?: string;
    }
  ) {
    return this.request(`/calendar/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteCalendarEvent(id: string) {
    return this.request(`/calendar/${id}`, {
      method: "DELETE",
    });
  }

  // Documents endpoints
  async getDocuments(caseId?: string) {
    const params = caseId ? `?caseId=${caseId}` : "";
    return this.request(`/documents${params}`);
  }

  async uploadDocument(data: FormData) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/upload`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: data,
    });

    if (!response.ok) {
      let message = `Upload failed (${response.status})`;
      try {
        const errBody = (await response.json()) as {
          message?: string | string[];
        };
        if (typeof errBody?.message === "string") {
          message = errBody.message;
        } else if (Array.isArray(errBody?.message)) {
          message = errBody.message.join(", ");
        }
      } catch {
        // response may not be JSON
      }
      throw new Error(message);
    }

    return response.json();
  }

  async searchDocuments(query: string, limit: number = 10): Promise<any> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const response = await fetch(`${API_BASE_URL}/documents/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      throw new Error("Failed to search documents");
    }

    return response.json();
  }

  async queryDocuments(
    query: string,
    context?: string,
    limit: number = 10
    // conversationHistory is now handled by the backend automatically
  ): Promise<any> {
    return this.request("/documents/query", {
      method: "POST",
      body: JSON.stringify({ query, context, limit }),
    });
  }

  async submitFeedback(feedbackData: {
    messageId: string;
    feedback: "positive" | "negative";
    question: string;
    answer: string;
  }): Promise<any> {
    return this.request("/feedback", {
      method: "POST",
      body: JSON.stringify(feedbackData),
    });
  }

  async getFeedbackStats(): Promise<any> {
    return this.request("/feedback/stats/my");
  }

  // Reports endpoints
  async getDashboardReport(
    period: "week" | "month" | "quarter" = "month"
  ): Promise<any> {
    return this.request(`/reports/dashboard?period=${period}`);
  }

  async getAIUsageAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return this.request(`/reports/ai-usage?${params.toString()}`);
  }

  async getDocumentQueryHistory(
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    return this.request(`/documents/query-history?${params.toString()}`);
  }

  async clearDocumentQueryHistory(): Promise<any> {
    return this.request("/documents/query-history", {
      method: "DELETE",
    });
  }

  async getFeedbackAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return this.request(`/reports/feedback?${params.toString()}`);
  }

  async getProductivityMetrics(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return this.request(`/reports/productivity?${params.toString()}`);
  }

  async getCaseSpecificAnalytics(caseId: string): Promise<any> {
    return this.request(`/reports/case/${caseId}`);
  }

  // Billing endpoints
  async getBills(filters?: { status?: string; clientId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.clientId) params.append("clientId", filters.clientId);

    return this.request(`/billing?${params.toString()}`);
  }

  async createBill(data: {
    amount: number;
    currency?: string;
    description: string;
    billType: string;
    clientId?: string;
    caseId?: string;
    dueDate: string;
    practiceId?: string;
  }) {
    return this.request("/billing", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBill(
    id: string,
    data: {
      amount?: number;
      currency?: string;
      description?: string;
      billType?: string;
      status?: string;
      dueDate?: string;
      caseId?: string;
    }
  ) {
    return this.request(`/billing/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteBill(id: string) {
    return this.request(`/billing/${id}`, {
      method: "DELETE",
    });
  }

  // Client portal endpoints
  async getClientDashboard() {
    return this.request("/client-portal/dashboard");
  }

  async getClientDashboardStats() {
    return this.request("/client-portal/dashboard");
  }

  async getClientCases() {
    return this.request("/client-portal/cases");
  }

  async getClientDocuments() {
    return this.request("/client-portal/documents");
  }

  async getClientBills() {
    return this.request("/client-portal/bills");
  }

  // Clients endpoints
  async getClients() {
    return this.request("/clients");
  }

  async getClientDetails(clientId: string) {
    return this.request(`/cases/clients/${clientId}`);
  }

  async createClient(
    practiceId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      address?: string;
    }
  ) {
    return this.request(`/clients/${practiceId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateClient(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      isActive?: boolean;
    }
  ) {
    return this.request(`/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string) {
    return this.request(`/clients/${id}`, {
      method: "DELETE",
    });
  }

  // Document endpoints (additional methods)
  async getDocument(id: string) {
    return this.request(`/documents/${id}`);
  }

  async deleteDocument(id: string) {
    return this.request(`/documents/${id}`, {
      method: "DELETE",
    });
  }

  async getDocumentStatus(aiDocumentId: string) {
    return this.request(`/documents/status/${aiDocumentId}`, {
      method: "GET",
    });
  }

  async retryDocumentProcessing(documentId: string): Promise<unknown> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${documentId}/retry-processing`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const errBody = (await response.json()) as {
          message?: string | string[];
        };
        if (typeof errBody?.message === "string") {
          message = errBody.message;
        } else if (Array.isArray(errBody?.message)) {
          message = errBody.message.join(", ");
        }
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }

    return response.json();
  }

  async downloadDocument(id: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${id}/download`;

    const response = await fetch(url, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // The backend redirects to a signed URL, so we need to follow the redirect
    if (response.redirected) {
      // Open the signed URL in a new tab/window
      window.open(response.url, "_blank");
      return { success: true, url: response.url };
    }

    // If no redirect, return the blob
    return response.blob();
  }

  openDocumentDownload(id: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${id}/download`;

    if (token) {
      // For authenticated requests, fetch the file and trigger download
      fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (response.ok) {
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get(
              "Content-Disposition"
            );

            let filename = "document";
            if (contentDisposition) {
              // Try multiple patterns to extract filename
              let filenameMatch =
                contentDisposition.match(/filename="([^"]+)"/);
              if (!filenameMatch) {
                filenameMatch = contentDisposition.match(/filename=([^;]+)/);
              }
              if (!filenameMatch) {
                filenameMatch = contentDisposition.match(
                  /filename\*=UTF-8''([^;]+)/
                );
              }
              if (!filenameMatch) {
                // Try without quotes
                filenameMatch = contentDisposition.match(/filename=([^;]+)/);
              }

              if (filenameMatch) {
                filename = decodeURIComponent(filenameMatch[1]);
              } else {
                // Fallback: try to get filename from URL or use a default
                const urlParts = response.url.split("/");
                const lastPart = urlParts[urlParts.length - 1];
                if (lastPart && lastPart.includes(".")) {
                  filename = lastPart;
                }
              }
            } else {
            }

            // Convert response to blob and download
            return response.blob().then((blob) => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              link.style.display = "none";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            });
          } else {
            console.error("Download failed with status:", response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        })
        .catch((error) => {
          console.error("Error downloading document:", error);
          throw error;
        });
    } else {
      // For unauthenticated requests, create a temporary link
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.click();
    }
  }

  // Alternative download method that opens the URL directly
  downloadDocumentDirect(id: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${id}/download`;

    if (token) {
      // Create a temporary link with the download URL
      const link = document.createElement("a");
      link.href = url;
      link.download = ""; // Let the server set the filename
      link.target = "_blank";

      // Add authorization header via a custom approach
      // This will open the URL in a new tab, and the browser will handle the download
      const downloadUrl = `${url}?token=${encodeURIComponent(token)}`;
      link.href = downloadUrl;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For unauthenticated requests, just open the URL
      window.open(url, "_blank");
    }
  }

  // Simple download method that should work better
  downloadDocumentSimple(id: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${id}/download`;

    // Create a form to submit the download request
    const form = document.createElement("form");
    form.method = "GET";
    form.action = url;
    form.target = "_blank";

    if (token) {
      const tokenInput = document.createElement("input");
      tokenInput.type = "hidden";
      tokenInput.name = "token";
      tokenInput.value = token;
      form.appendChild(tokenInput);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

  // Most reliable download method - direct link approach
  downloadDocumentReliable(id: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${id}/download`;

    if (token) {
      // Use fetch to get the file with proper headers, then trigger download
      fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (response.ok) {
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get(
              "Content-Disposition"
            );
            let filename = "document";

            if (contentDisposition) {
              const filenameMatch =
                contentDisposition.match(/filename="([^"]+)"/);
              if (filenameMatch) {
                filename = decodeURIComponent(filenameMatch[1]);
              }
            } else {
            }

            // Convert to blob and download
            return response.blob().then((blob) => {
              // Create a blob with the correct filename
              const file = new File([blob], filename, { type: blob.type });
              const url = window.URL.createObjectURL(file);

              const link = document.createElement("a");
              link.href = url;
              link.download = filename;
              link.style.display = "none";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            });
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        })
        .catch((error) => {
          console.error("Error downloading document:", error);
          throw error;
        });
    } else {
      // For unauthenticated requests, just open the URL
      window.open(url, "_blank");
    }
  }

  // Alternative method that should work better with filename preservation
  downloadDocumentWithFilename(id: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${id}/download`;

    if (token) {
      // Create a temporary iframe to handle the download
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;

      // Add authorization header via a custom approach
      const downloadUrl = `${url}?token=${encodeURIComponent(token)}`;
      iframe.src = downloadUrl;

      document.body.appendChild(iframe);

      // Remove the iframe after a short delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    } else {
      // For unauthenticated requests, just open the URL
      window.open(url, "_blank");
    }
  }

  // Direct download method that opens URL in new tab
  downloadDocumentDirectTab(id: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/documents/${id}/download`;

    if (token) {
      // For authenticated requests, we need to handle this differently
      // Let's try opening in a new tab which should preserve the filename
      const newWindow = window.open(url, "_blank");

      // If the window doesn't open (due to popup blocker), fall back to fetch method
      if (!newWindow) {
        this.downloadDocumentReliable(id);
      }
    } else {
      // For unauthenticated requests, just open the URL
      window.open(url, "_blank");
    }
  }

  // Notifications endpoints
  async getNotifications(filters?: { isRead?: boolean; type?: string }) {
    const params = new URLSearchParams();
    if (filters?.isRead !== undefined)
      params.append("isRead", filters.isRead.toString());
    if (filters?.type) params.append("type", filters.type);

    return this.request(`/notifications?${params.toString()}`);
  }

  async getUnreadNotificationCount() {
    return this.request("/notifications/unread-count");
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: "PATCH",
    });
  }

  async markAllNotificationsAsRead() {
    return this.request("/notifications/mark-all-read", {
      method: "PATCH",
    });
  }

  async deleteNotification(id: string) {
    return this.request(`/notifications/${id}`, {
      method: "DELETE",
    });
  }

  // Video Calls endpoints
  async getVideoCalls(filters?: {
    status?: string;
    caseId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.caseId) params.append("caseId", filters.caseId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);

    return this.request(`/video-calls?${params.toString()}`);
  }

  async getUpcomingVideoCalls(days = 7) {
    return this.request(`/video-calls/upcoming?days=${days}`);
  }

  async getVideoCall(id: string) {
    return this.request(`/video-calls/${id}`);
  }

  async getVideoCallByMeetingId(meetingId: string) {
    return this.request(`/video-calls/meeting/${meetingId}`);
  }

  async createVideoCall(data: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    caseId?: string;
    participantIds?: string[];
  }) {
    // Filter out empty caseId to avoid foreign key constraint issues
    const videoCallData = {
      ...data,
      // Only include caseId if it's not empty
      ...(data.caseId && data.caseId.trim() !== "" && { caseId: data.caseId }),
    };

    return this.request("/video-calls", {
      method: "POST",
      body: JSON.stringify(videoCallData),
    });
  }

  async startInstantCall(data: {
    title: string;
    description?: string;
    caseId?: string;
    participantIds?: string[];
  }) {
    // Filter out empty caseId to avoid foreign key constraint issues
    const instantCallData = {
      ...data,
      startTime: new Date().toISOString(),
      // Only include caseId if it's not empty
      ...(data.caseId && data.caseId.trim() !== "" && { caseId: data.caseId }),
    };

    return this.request("/video-calls/instant", {
      method: "POST",
      body: JSON.stringify(instantCallData),
    });
  }

  async updateVideoCall(
    id: string,
    data: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      status?: string;
    }
  ) {
    return this.request(`/video-calls/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async deleteVideoCall(id: string) {
    return this.request(`/video-calls/${id}`, {
      method: "DELETE",
    });
  }

  async joinVideoCall(data: { meetingId: string; participantId: string }) {
    return this.request("/video-calls/join", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async leaveVideoCall(meetingId: string) {
    return this.request(`/video-calls/leave/${meetingId}`, {
      method: "PATCH",
    });
  }

  async endVideoCall(id: string) {
    return this.request(`/video-calls/${id}/end`, {
      method: "PATCH",
    });
  }

  async sendVideoCallNotification(callId: string) {
    return this.request(`/video-calls/${callId}/notify`, {
      method: "POST",
    });
  }

  async sendVideoCallStartedNotification(callId: string) {
    return this.request(`/video-calls/${callId}/notify-started`, {
      method: "POST",
    });
  }

  // User Settings endpoints
  async getUserSettings() {
    return this.request("/user-settings");
  }

  async updateUserSettings(data: {
    currency?: string;
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    smsNotifications?: boolean;
    caseUpdates?: boolean;
    billingAlerts?: boolean;
    calendarReminders?: boolean;
    profileVisibility?: string;
    dataSharing?: boolean;
    twoFactorAuth?: boolean;
    language?: string;
    timezone?: string;
    dateFormat?: string;
    theme?: string;
    // Admin settings
    maintenanceMode?: boolean;
    debugMode?: boolean;
    autoBackup?: boolean;
    dataRetention?: string;
    sessionTimeout?: string;
    passwordPolicy?: string;
    ipWhitelist?: string;
    auditLogging?: boolean;
    systemAlerts?: boolean;
    userActivity?: boolean;
    securityEvents?: boolean;
    backupNotifications?: boolean;
    emailProvider?: string;
    smsProvider?: string;
    storageProvider?: string;
    analyticsEnabled?: boolean;
  }) {
    return this.request("/user-settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getDefaultCurrency() {
    return this.request("/user-settings/default-currency");
  }

  // Chat methods
  async getChats() {
    return this.request("/chats");
  }

  async getChat(chatId: string) {
    return this.request(`/chats/${chatId}`);
  }

  async getAssociatedUsers() {
    return this.request("/chats/associated-users");
  }

  async startChatWithUser(userId: string) {
    return this.request(`/chats/start-chat/${userId}`, {
      method: "POST",
    });
  }

  async markChatAsRead(chatId: string) {
    return this.request(`/chats/${chatId}/read`, {
      method: "PATCH",
    });
  }

  async sendChatMessage(
    chatId: string,
    data: { content: string; type?: string }
  ) {
    return this.request(`/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteChat(chatId: string) {
    return this.request(`/chats/${chatId}`, {
      method: "DELETE",
    });
  }

  // Practice Management
  async getPractices() {
    return this.request("/practices");
  }

  async getPractice(id: string) {
    return this.request(`/practices/${id}`);
  }

  async createPractice(data: any) {
    return this.request("/practices", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePractice(id: string, data: any) {
    return this.request(`/practices/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePractice(id: string) {
    return this.request(`/practices/${id}`, {
      method: "DELETE",
    });
  }

  async addPracticeMember(practiceId: string, data: any) {
    return this.request(`/practices/${practiceId}/members`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePracticeMember(practiceId: string, memberId: string, data: any) {
    return this.request(`/practices/${practiceId}/members/${memberId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async removePracticeMember(practiceId: string, memberId: string) {
    return this.request(`/practices/${practiceId}/members/${memberId}`, {
      method: "DELETE",
    });
  }

  async getPracticeStats(practiceId: string) {
    return this.request(`/practices/${practiceId}/stats`);
  }

  // Permission methods
  async getCurrentUserPermissions(): Promise<unknown> {
    return this.request("/permissions/me");
  }

  // Practice endpoints
  async getUserPractices(): Promise<Practice[]> {
    return this.request("/practices");
  }

  async getUserPermissions(userId: string): Promise<unknown> {
    return this.request(`/permissions/user/${userId}`);
  }

  async checkPermission(permissionCheck: any): Promise<unknown> {
    return this.request("/permissions/check", {
      method: "POST",
      body: JSON.stringify(permissionCheck),
    });
  }

  async checkBatchPermissions(checks: any[]): Promise<unknown> {
    return this.request("/permissions/check-batch", {
      method: "POST",
      body: JSON.stringify({ checks }),
    });
  }

  async canAccessPractice(practiceId: string): Promise<unknown> {
    return this.request(`/permissions/practice/${practiceId}/access`);
  }

  async getAuditLogs(filter: any = {}): Promise<unknown> {
    const queryParams = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return this.request(`/permissions/audit/logs?${queryParams.toString()}`);
  }

  async getPermissionStats(filter: any = {}): Promise<unknown> {
    const queryParams = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });

    return this.request(`/permissions/audit/stats?${queryParams.toString()}`);
  }

  async getFailedPermissionAttempts(
    userId?: string,
    limit?: number
  ): Promise<unknown> {
    const queryParams = new URLSearchParams();
    if (userId) queryParams.append("userId", userId);
    if (limit) queryParams.append("limit", String(limit));

    return this.request(
      `/permissions/audit/failures?${queryParams.toString()}`
    );
  }

  async getCacheStats(): Promise<unknown> {
    return this.request("/permissions/cache/stats");
  }

  async clearUserCache(userId: string): Promise<unknown> {
    return this.request(`/permissions/cache/user/${userId}`, {
      method: "DELETE",
    });
  }

  async clearPracticeCache(practiceId: string): Promise<unknown> {
    return this.request(`/permissions/cache/practice/${practiceId}`, {
      method: "DELETE",
    });
  }

  async clearAllCache(): Promise<unknown> {
    return this.request("/permissions/cache/all", {
      method: "DELETE",
    });
  }

  async cleanupAuditLogs(days?: number): Promise<unknown> {
    const queryParams = days ? `?days=${days}` : "";
    return this.request(`/permissions/audit/cleanup${queryParams}`, {
      method: "DELETE",
    });
  }

  async getPermissionMatrix(): Promise<unknown> {
    return this.request("/permissions/matrix");
  }

  async refreshPermissions(): Promise<unknown> {
    return this.request("/permissions/refresh", {
      method: "POST",
    });
  }
}

export const apiClient = new ApiClient();
