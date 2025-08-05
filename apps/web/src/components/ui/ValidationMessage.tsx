import { AlertCircle } from "lucide-react";
import React from "react";
import { FieldError } from "react-hook-form";

interface ValidationMessageProps {
  error?: FieldError;
  className?: string;
  showIcon?: boolean;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  error,
  className = "",
  showIcon = true,
}) => {
  if (!error) return null;

  return (
    <div className={`relative ${className}`}>
      <div className="absolute top-full left-0 right-0 z-20 mt-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
        <div className="flex items-start space-x-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 shadow-lg max-w-sm backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
          {showIcon && (
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed font-medium">
            {error.message}
          </p>
        </div>
        {/* Arrow pointing up */}
        <div className="absolute -top-2 left-6 w-3 h-3 bg-red-50 dark:bg-red-900/30 border-l border-t border-red-200 dark:border-red-700 transform rotate-45"></div>
      </div>
    </div>
  );
};

// Enhanced form field wrapper that automatically handles validation positioning
interface FormFieldWrapperProps {
  label: string;
  required?: boolean;
  error?: FieldError;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}

export const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  label,
  required = false,
  error,
  children,
  className = "",
  labelClassName = "",
}) => {
  return (
    <div className={`relative mb-2 ${className}`}>
      <label
        className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${labelClassName}`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {children}
        <ValidationMessage error={error} />
      </div>
    </div>
  );
};

// Enhanced input field with built-in validation
interface ValidatedInputProps {
  label: string;
  required?: boolean;
  error?: FieldError;
  register: any;
  name: string;
  type?: string;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  label,
  required = false,
  error,
  register,
  name,
  type = "text",
  placeholder,
  className = "",
  rows,
}) => {
  const inputClassName = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
    error
      ? "border-red-500 ring-red-500"
      : "border-gray-300 dark:border-gray-600"
  } ${className}`;

  return (
    <FormFieldWrapper label={label} required={required} error={error}>
      {type === "textarea" ? (
        <textarea
          {...register(name)}
          rows={rows || 4}
          className={inputClassName}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          {...register(name)}
          className={inputClassName}
          placeholder={placeholder}
        />
      )}
    </FormFieldWrapper>
  );
};

// Enhanced select field with built-in validation
interface ValidatedSelectProps {
  label: string;
  required?: boolean;
  error?: FieldError;
  value: { value: string; label: string };
  onChange: (option: { value: string; label: string } | null) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
  label,
  required = false,
  error,
  value,
  onChange,
  options,
  placeholder,
  className = "",
}) => {
  return (
    <FormFieldWrapper label={label} required={required} error={error}>
      <div className={`${error ? "border-red-500" : ""} ${className}`}>
        <select
          value={value.value}
          onChange={(e) => {
            const option = options.find((opt) => opt.value === e.target.value);
            onChange(option || null);
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors duration-200 ${
            error
              ? "border-red-500 ring-red-500"
              : "border-gray-300 dark:border-gray-600"
          }`}
        >
          <option value="">{placeholder || "Select an option"}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </FormFieldWrapper>
  );
};
