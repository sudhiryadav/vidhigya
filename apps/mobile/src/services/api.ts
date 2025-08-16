import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:3888",
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Token will be added by AuthContext
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      console.log("Unauthorized access");
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    profile: "/auth/profile",
    refresh: "/auth/refresh",
  },

  // Cases
  cases: {
    list: "/cases",
    create: "/cases",
    detail: (id: string) => `/cases/${id}`,
    update: (id: string) => `/cases/${id}`,
    delete: (id: string) => `/cases/${id}`,
    dashboard: "/cases/dashboard",
    notes: (id: string) => `/cases/${id}/notes`,
    createNote: (id: string) => `/cases/${id}/notes`,
    updateNote: (noteId: string) => `/cases/notes/${noteId}`,
    deleteNote: (noteId: string) => `/cases/notes/${noteId}`,
    clients: "/cases/clients/all",
    clientDetail: (clientId: string) => `/cases/clients/${clientId}`,
  },

  // Documents
  documents: {
    list: "/documents",
    create: "/documents",
    detail: (id: string) => `/documents/${id}`,
    update: (id: string) => `/documents/${id}`,
    delete: (id: string) => `/documents/${id}`,
    byCategory: (category: string) => `/documents/category/${category}`,
    byStatus: (status: string) => `/documents/status/${status}`,
  },

  // Billing
  billing: {
    list: "/billing",
    create: "/billing",
    detail: (id: string) => `/billing/${id}`,
    update: (id: string) => `/billing/${id}`,
    delete: (id: string) => `/billing/${id}`,
    stats: "/billing/stats",
    overdue: "/billing/overdue",
    markPaid: (id: string) => `/billing/${id}/mark-paid`,
  },
};
