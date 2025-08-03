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

const CustomSelect: React.FC<CustomSelectProps> = ({
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
}) => {
  // Custom components for consistent styling
  const DropdownIndicator = (
    props: DropdownIndicatorProps<SelectOption, false, GroupBase<SelectOption>>
  ) => (
    <components.DropdownIndicator {...props}>
      <svg
        className="w-4 h-4 text-gray-400"
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
        <div className="text-sm font-medium text-gray-900 dark:text-white">
          {props.data.label}
        </div>
      </div>
    </components.Option>
  );

  const SingleValue = (
    props: SingleValueProps<SelectOption, false, GroupBase<SelectOption>>
  ) => (
    <components.SingleValue {...props}>
      <div className="text-sm text-gray-900 dark:text-white">
        {props.data.label}
      </div>
    </components.SingleValue>
  );

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  : "#d1d5db",
              borderWidth: "1px",
              borderRadius: "0.5rem",
              boxShadow: state.isFocused
                ? "0 0 0 2px rgba(59, 130, 246, 0.5)"
                : "none",
              minHeight: "42px",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              "&:hover": {
                borderColor: error ? "#ef4444" : "#9ca3af",
              },
            }),
          menu: (provided) => ({
            ...provided,
            backgroundColor: "var(--tw-bg-opacity, 1)",
            border: "1px solid #e5e7eb",
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
                  ? "#f3f4f6"
                  : "transparent",
              color: state.isSelected ? "#ffffff" : "#374151",
              cursor: "pointer",
              transition: "all 0.15s ease-in-out",
              "&:hover": {
                backgroundColor: state.isSelected ? "#3b82f6" : "#f3f4f6",
              },
            }),
          singleValue: (provided) => ({
            ...provided,
            color: "#374151",
          }),
          placeholder: (provided) => ({
            ...provided,
            color: "#9ca3af",
          }),
          input: (provided) => ({
            ...provided,
            color: "#374151",
          }),
          indicatorSeparator: (provided) => ({
            ...provided,
            backgroundColor: "#d1d5db",
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

export { CustomSelect as default };
