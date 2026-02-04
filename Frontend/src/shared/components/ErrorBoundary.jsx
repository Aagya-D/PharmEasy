import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/Button";

/**
 * ErrorBoundary - Production-grade error boundary component
 * 
 * Catches runtime errors in child components and displays a fallback UI
 * instead of crashing the entire application.
 * 
 * Features:
 * - Catches errors during rendering, in lifecycle methods, and constructors
 * - Logs error details to console (can be extended to send to error tracking service)
 * - Provides retry functionality to recover from errors
 * - Clean, user-friendly fallback UI
 * - Shows detailed error info in development mode only
 * - Tracks error count to warn users of persistent issues
 * 
 * Props:
 * @param {React.ReactNode} children - Components to protect with error boundary
 * @param {React.ReactNode} [fallback] - Custom fallback UI to show on error (optional)
 * @param {string} [errorMessage] - Custom error message to display (optional)
 * @param {function} [onError] - Callback function called when error is caught (error, errorInfo) => void
 * @param {function} [onReset] - Callback function called when user clicks retry button
 * 
 * Usage Examples:
 * 
 * 1. Basic usage with default fallback:
 *    <ErrorBoundary>
 *      <YourComponent />
 *    </ErrorBoundary>
 * 
 * 2. With custom error message:
 *    <ErrorBoundary errorMessage="Failed to load user profile. Please try again.">
 *      <UserProfile />
 *    </ErrorBoundary>
 * 
 * 3. With custom fallback UI:
 *    <ErrorBoundary fallback={<CustomErrorPage />}>
 *      <ComplexComponent />
 *    </ErrorBoundary>
 * 
 * 4. With error logging callback:
 *    <ErrorBoundary 
 *      onError={(error, errorInfo) => {
 *        logToService(error, errorInfo);
 *      }}
 *      onReset={() => {
 *        resetApplicationState();
 *      }}
 *    >
 *      <CriticalComponent />
 *    </ErrorBoundary>
 * 
 * @class ErrorBoundary
 * @extends {React.Component}
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Update state with error details
    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Optional: Send error to logging service
    // Example: logErrorToService(error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    // Clear error state and attempt to recover
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call optional reset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided by parent
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
              Something went wrong
            </h1>

            {/* Message */}
            <p className="text-slate-600 text-center mb-6">
              {this.props.errorMessage || 
                "We encountered an unexpected error. Please try again or return to the home page."}
            </p>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <summary className="text-sm font-semibold text-slate-700 cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 mb-1">Error:</p>
                    <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto">
                      {this.state.error.toString()}
                    </pre>
                  </div>
                  {this.state.errorInfo && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 mb-1">Stack Trace:</p>
                      <pre className="text-xs text-slate-700 bg-slate-100 p-2 rounded overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReset}
                variant="primary"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>

            {/* Error count warning (multiple failures) */}
            {this.state.errorCount > 1 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 text-center">
                  <strong>Note:</strong> This error occurred {this.state.errorCount} times. 
                  Consider refreshing the page or contacting support if the problem persists.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
