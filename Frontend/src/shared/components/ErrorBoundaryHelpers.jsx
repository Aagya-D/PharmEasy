import React from "react";
import ErrorBoundary from "./ErrorBoundary";

/**
 * PageErrorBoundary - Specialized error boundary for page-level components
 * 
 * Wraps entire page components with error handling and provides
 * page-specific error messages.
 * 
 * Usage:
 * <PageErrorBoundary pageName="Pharmacy Onboarding">
 *   <PharmacyOnboarding />
 * </PageErrorBoundary>
 */
export function PageErrorBoundary({ children, pageName, onReset, onError }) {
  const errorMessage = pageName
    ? `Failed to load ${pageName}. Please refresh the page or contact support if the problem persists.`
    : "Failed to load this page. Please try again.";

  return (
    <ErrorBoundary
      errorMessage={errorMessage}
      onReset={onReset}
      onError={(error, errorInfo) => {
        // Log to console with page context
        console.error(`[${pageName || "Page"}] Error:`, error);
        console.error("Error Info:", errorInfo);
        
        // Call parent error handler if provided
        if (onError) {
          onError(error, errorInfo);
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * ComponentErrorBoundary - Lightweight error boundary for smaller components
 * 
 * Displays inline error message without full-page fallback.
 * Useful for isolating errors in specific UI sections.
 * 
 * Usage:
 * <ComponentErrorBoundary componentName="User Profile Widget">
 *   <ProfileWidget />
 * </ComponentErrorBoundary>
 */
export function ComponentErrorBoundary({ children, componentName }) {
  const fallback = (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-800">
        <strong>Error:</strong> {componentName || "This component"} failed to load.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 text-xs text-red-600 underline hover:text-red-800"
      >
        Reload page
      </button>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
