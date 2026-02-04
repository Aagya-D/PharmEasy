import React from "react";
import { AlertCircle } from "lucide-react";

/**
 * Input Component - Healthcare-grade form field
 * 
 * States: default, focus, error, disabled, success
 * Features: Label, hint text, error messages, required indicator
 * Accessibility: Full ARIA support, keyboard navigation
 * 
 * @param {Object} props
 * @param {string} props.label - Input label
 * @param {string} props.type - Input type (text, email, password, tel, etc.)
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Input value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.error - Error message to display
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.required - Required field indicator
 * @param {string} props.hint - Helper text below input
 * @param {React.ReactNode} props.icon - Leading icon component
 */
export function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  inputRef,
  error,
  disabled = false,
  required = false,
  hint,
  icon,
  className = "",
  ...props
}) {
  const inputId = props.id || label?.toLowerCase().replace(/\s+/g, "-");
  const hasError = Boolean(error);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          ref={inputRef}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={`
            w-full px-4 py-2.5 text-base rounded-lg border transition-all
            ${icon ? "pl-10" : ""}
            ${hasError 
              ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200" 
              : "border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            }
            ${disabled 
              ? "bg-slate-50 text-slate-500 cursor-not-allowed" 
              : "bg-white text-slate-900"
            }
            focus:outline-none
            placeholder:text-slate-400
          `}
          {...props}
        />

        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle size={18} />
          </div>
        )}
      </div>

      {hasError && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-red-600 mt-2 flex items-start gap-1"
          role="alert"
        >
          <span>{error}</span>
        </p>
      )}

      {hint && !hasError && (
        <p
          id={`${inputId}-hint`}
          className="text-sm text-slate-500 mt-2"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * TextArea Component - Multi-line text input
 */
export function TextArea({
  label,
  placeholder,
  value,
  onChange,
  inputRef,
  error,
  disabled = false,
  required = false,
  hint,
  rows = 4,
  className = "",
  ...props
}) {
  const inputId = props.id || label?.toLowerCase().replace(/\s+/g, "-");
  const hasError = Boolean(error);

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-2"
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>
      )}

      <textarea
        id={inputId}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        ref={inputRef}
        disabled={disabled}
        required={required}
        rows={rows}
        aria-invalid={hasError}
        aria-describedby={
          hasError ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        className={`
          w-full px-4 py-2.5 text-base rounded-lg border transition-all resize-none
          ${hasError 
            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200" 
            : "border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          }
          ${disabled 
            ? "bg-slate-50 text-slate-500 cursor-not-allowed" 
            : "bg-white text-slate-900"
          }
          focus:outline-none
          placeholder:text-slate-400
        `}
        {...props}
      />

      {hasError && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-red-600 mt-2"
          role="alert"
        >
          {error}
        </p>
      )}

      {hint && !hasError && (
        <p
          id={`${inputId}-hint`}
          className="text-sm text-slate-500 mt-2"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export default Input;
