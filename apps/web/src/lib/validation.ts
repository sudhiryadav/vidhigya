import * as yup from "yup";

// Common validation schemas
export const documentUploadSchema = yup
  .object({
    title: yup
      .string()
      .required("Document title is required")
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be less than 100 characters"),
    description: yup
      .string()
      .optional()
      .max(500, "Description must be less than 500 characters"),
    category: yup.string().required("Category is required"),
    status: yup.string().required("Status is required"),
    caseId: yup.string().required("Case is required"),
  })
  .required();

export const userProfileSchema = yup
  .object({
    name: yup
      .string()
      .required("Name is required")
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: yup
      .string()
      .required("Email is required")
      .email("Please enter a valid email address"),
    phone: yup
      .string()
      .required("Phone number is required")
      .matches(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"),
  })
  .required();

export const caseFormSchema = yup
  .object({
    title: yup
      .string()
      .required("Case title is required")
      .min(5, "Title must be at least 5 characters")
      .max(100, "Title must be less than 100 characters"),
    description: yup
      .string()
      .required("Description is required")
      .min(20, "Description must be at least 20 characters")
      .max(1000, "Description must be less than 1000 characters"),
    category: yup.string().required("Category is required"),
    priority: yup.string().required("Priority is required"),
    clientId: yup.string().required("Client is required"),
  })
  .required();

export const billingFormSchema = yup
  .object({
    amount: yup
      .number()
      .required("Amount is required")
      .positive("Amount must be positive")
      .min(0.01, "Amount must be at least $0.01"),
    description: yup
      .string()
      .required("Description is required")
      .min(10, "Description must be at least 10 characters"),
    type: yup.string().required("Bill type is required"),
    clientId: yup.string().required("Client is required"),
    caseId: yup.string().optional(),
    dueDate: yup.date().required("Due date is required"),
  })
  .required();

export const taskFormSchema = yup
  .object({
    title: yup
      .string()
      .required("Task title is required")
      .min(5, "Title must be at least 5 characters")
      .max(100, "Title must be less than 100 characters"),
    description: yup
      .string()
      .required("Description is required")
      .min(10, "Description must be at least 10 characters"),
    priority: yup.string().required("Priority is required"),
    status: yup.string().required("Status is required"),
    dueDate: yup.date().required("Due date is required"),
    assignedTo: yup.string().required("Assignee is required"),
  })
  .required();

export const clientFormSchema = yup
  .object({
    name: yup
      .string()
      .required("Client name is required")
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be less than 50 characters"),
    email: yup
      .string()
      .required("Email is required")
      .email("Please enter a valid email address"),
    phone: yup
      .string()
      .required("Phone number is required")
      .matches(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"),
    address: yup
      .string()
      .required("Address is required")
      .min(10, "Address must be at least 10 characters"),
  })
  .required();

export const settingsFormSchema = yup
  .object({
    language: yup.string().required("Language is required"),
    timezone: yup.string().required("Timezone is required"),
    dateFormat: yup.string().required("Date format is required"),
    theme: yup.string().required("Theme is required"),
  })
  .required();

export const courtFormSchema = yup
  .object({
    name: yup
      .string()
      .required("Court name is required")
      .min(3, "Court name must be at least 3 characters")
      .max(100, "Court name must be less than 100 characters"),
    type: yup.string().required("Court type is required"),
    address: yup
      .string()
      .required("Address is required")
      .min(10, "Address must be at least 10 characters"),
    city: yup
      .string()
      .required("City is required")
      .min(2, "City must be at least 2 characters"),
    state: yup.string().required("State is required"),
    country: yup.string().required("Country is required"),
    pincode: yup
      .string()
      .matches(/^\d{6}$/, "Pincode must be 6 digits")
      .nullable()
      .optional(),
    phone: yup
      .string()
      .matches(/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number")
      .nullable()
      .optional(),
    email: yup
      .string()
      .email("Please enter a valid email address")
      .nullable()
      .optional(),
    website: yup.string().url("Please enter a valid URL").nullable().optional(),
    jurisdiction: yup.string().nullable().optional(),
    isActive: yup.boolean().required("Active status is required"),
  })
  .required();

// Common validation patterns
export const patterns = {
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  password:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
};

// Instant call validation schema
export const instantCallSchema = yup
  .object({
    title: yup
      .string()
      .required("Title is required")
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be less than 100 characters"),
    description: yup
      .string()
      .max(500, "Description must be less than 500 characters"),
    caseId: yup.string().optional(),
    participantIds: yup
      .array()
      .of(yup.string().required())
      .min(1, "At least one participant is required")
      .required("Participants are required"),
  })
  .required();

// Login validation schema
export const loginSchema = yup
  .object({
    email: yup
      .string()
      .required("Email is required")
      .email("Please enter a valid email address"),
    password: yup
      .string()
      .required("Password is required")
      .min(1, "Password is required"),
  })
  .required();

// Join meeting validation schema
export const joinMeetingSchema = yup
  .object({
    meetingId: yup
      .string()
      .required("Meeting ID is required")
      .min(3, "Meeting ID must be at least 3 characters")
      .max(50, "Meeting ID must be less than 50 characters"),
  })
  .required();

// Event validation schema
export const eventSchema = yup
  .object({
    title: yup
      .string()
      .required("Event title is required")
      .min(3, "Title must be at least 3 characters")
      .max(100, "Title must be less than 100 characters"),
    description: yup
      .string()
      .max(500, "Description must be less than 500 characters"),
    startTime: yup.date().required("Start time is required"),
    endTime: yup
      .date()
      .required("End time is required")
      .min(yup.ref("startTime"), "End time must be after start time"),
    type: yup.string().required("Event type is required"),
    caseId: yup.string().optional(),
    clientId: yup.string().optional(),
  })
  .required();

// Common error messages
export const errorMessages = {
  required: "This field is required",
  email: "Please enter a valid email address",
  phone: "Please enter a valid phone number",
  minLength: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) =>
    `${field} must be less than ${max} characters`,
  positive: "Value must be positive",
  url: "Please enter a valid URL",
};
