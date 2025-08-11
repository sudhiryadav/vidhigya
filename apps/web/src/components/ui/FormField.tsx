import React from "react";
import { FieldError } from "react-hook-form";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: FieldError;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  children,
  className = "",
}) => {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
};

interface InputFieldProps {
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

export const InputField: React.FC<InputFieldProps> = ({
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
  const inputClassName = `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
    error ? "border-red-500" : "border-border"
  } ${className}`;

  return (
    <FormField label={label} required={required} error={error}>
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
    </FormField>
  );
};

interface SelectFieldProps {
  label: string;
  required?: boolean;
  error?: FieldError;
  value: { value: string; label: string };
  onChange: (option: { value: string; label: string } | null) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
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
    <FormField label={label} required={required} error={error}>
      <div className={`${error ? "border-red-500" : ""} ${className}`}>
        <select
          value={value.value}
          onChange={(e) => {
            const option = options.find((opt) => opt.value === e.target.value);
            onChange(option || null);
          }}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
        >
          <option value="">{placeholder || "Select an option"}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </FormField>
  );
};
