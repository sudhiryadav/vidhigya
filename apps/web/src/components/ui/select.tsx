"use client";

import React from "react";
import Select, {
  components,
  DropdownIndicatorProps,
  GroupBase,
  OptionProps,
  Props as SelectProps,
  SingleValueProps,
} from "react-select";

export interface SelectOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

interface CustomSelectProps
  extends Omit<
    SelectProps<SelectOption, false, GroupBase<SelectOption>>,
    "options"
  > {
  options: SelectOption[];
  placeholder?: string;
  isSearchable?: boolean;
  isClearable?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

const CustomSelect = ({
  options,
  placeholder = "Select an option...",
  isSearchable = true,
  isClearable = false,
  isLoading = false,
  isDisabled = false,
  error,
  label,
  required = false,
  className = "",
  ...props
}: CustomSelectProps) => {
  // Custom components for consistent styling
  const DropdownIndicator = (
    props: DropdownIndicatorProps<SelectOption, false, GroupBase<SelectOption>>
  ) => (
    <components.DropdownIndicator {...props}>
      <svg
        className="w-4 h-4 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </components.DropdownIndicator>
  );

  const Option = (
    props: OptionProps<SelectOption, false, GroupBase<SelectOption>>
  ) => (
    <components.Option {...props}>
      <div className="py-1">
        <div className="text-sm font-medium text-foreground">
          {props.data.label}
        </div>
      </div>
    </components.Option>
  );

  const SingleValue = (
    props: SingleValueProps<SelectOption, false, GroupBase<SelectOption>>
  ) => (
    <components.SingleValue {...props}>
      <div className="text-sm text-foreground">{props.data.label}</div>
    </components.SingleValue>
  );

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Select
        options={options}
        placeholder={placeholder}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isLoading={isLoading}
        isDisabled={isDisabled}
        components={{
          DropdownIndicator,
          Option,
          SingleValue,
        }}
        className="react-select-container"
        classNamePrefix="react-select"
        styles={{
          control: (provided, state) => ({
            ...provided,
            backgroundColor: "var(--tw-bg-opacity, 1)",
            borderColor: error
              ? "#ef4444"
              : state.isFocused
                ? "#3b82f6"
                : "hsl(var(--border))",
            borderWidth: "1px",
            borderRadius: "0.5rem",
            boxShadow: state.isFocused
              ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
              : "none",
            minHeight: "42px",
            cursor: "pointer",
            transition: "all 0.15s ease-in-out",
            "&:hover": {
              borderColor: error ? "#ef4444" : "hsl(var(--border))",
            },
          }),
          menu: (provided) => ({
            ...provided,
            backgroundColor: "var(--tw-bg-opacity, 1)",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 9999,
          }),
          option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected
              ? "#3b82f6"
              : state.isFocused
                ? "hsl(var(--muted))"
                : "transparent",
            color: state.isSelected
              ? "hsl(var(--background))"
              : "hsl(var(--foreground))",
            cursor: "pointer",
            transition: "all 0.15s ease-in-out",
            "&:hover": {
              backgroundColor: state.isSelected
                ? "#3b82f6"
                : "hsl(var(--muted))",
              color: state.isSelected
                ? "hsl(var(--background))"
                : "hsl(var(--foreground))",
            },
          }),
          singleValue: (provided) => ({
            ...provided,
            color: "hsl(var(--foreground))",
          }),
          placeholder: (provided) => ({
            ...provided,
            color: "hsl(var(--muted-foreground))",
          }),
          input: (provided) => ({
            ...provided,
            color: "hsl(var(--foreground))",
          }),
          indicatorSeparator: (provided) => ({
            ...provided,
            backgroundColor: "hsl(var(--border))",
          }),
          loadingIndicator: (provided) => ({
            ...provided,
            color: "#3b82f6",
          }),
        }}
        {...props}
      />

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default CustomSelect;

// Additional exports for compatibility with new usage patterns
export { CustomSelect as Select };
export const SelectTrigger = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span>{placeholder}</span>
);
export const SelectContent = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
export const SelectItem = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);
