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
          style={{
            display: "block",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text-primary)",
            marginBottom: "var(--spacing-xs)",
          }}
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
        style={{
          width: "100%",
          padding: "var(--spacing-md)",
          fontSize: "var(--font-size-base)",
          border: error
            ? "1px solid var(--color-error)"
            : "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          transition:
            "border-color var(--transition-fast), box-shadow var(--transition-fast)",
          backgroundColor: disabled
            ? "var(--color-bg-secondary)"
            : "var(--color-bg-primary)",
          color: disabled
            ? "var(--color-text-tertiary)"
            : "var(--color-text-primary)",
          fontFamily: "var(--font-family-base)",
        }}
        onFocus={(e) => {
          if (!error && !disabled) {
            e.target.style.borderColor = "var(--color-primary)";
            e.target.style.boxShadow = "0 0 0 3px rgba(8, 145, 178, 0.1)";
          }
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error
            ? "var(--color-error)"
            : "var(--color-border)";
          e.target.style.boxShadow = "none";
        }}
        {...props}
      />

      {error && (
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-error)",
            marginTop: "var(--spacing-xs)",
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      {hint && !error && (
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-tertiary)",
            marginTop: "var(--spacing-xs)",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export default Input;
