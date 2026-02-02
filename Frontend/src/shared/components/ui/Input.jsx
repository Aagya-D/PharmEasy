import React from "react";

/**
 * Reusable Input component with validation styling
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.error - Error message to display
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.hint - Helper text below input
 */
export function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  hint,
  ...props
}) {
  const inputId = props.id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="mb-lg">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[var(--color-text-primary)] mb-2"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full p-4 text-base rounded-lg transition-all font-[var(--font-family-base)] ${
          error
            ? "border border-[var(--color-error)]"
            : "border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(8,145,178,0.1)]"
        } ${
          disabled
            ? "bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]"
            : "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]"
        } focus:outline-none`}
        {...props}
      />

      {error && (
        <p
          className="text-sm text-[var(--color-error)] mt-2"
          role="alert"
        >
          {error}
        </p>
      )}

      {hint && !error && (
        <p
          className="text-sm text-[var(--color-text-tertiary)] mt-2"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export default Input;
