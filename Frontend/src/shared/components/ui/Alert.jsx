import React from "react";
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from "lucide-react";

/**
 * Alert Component - Healthcare-grade feedback system
 * 
 * States: success, error, warning, info
 * Features: Dismissible, with icon, clear messaging
 */
export function Alert({ 
  type = "info", 
  title, 
  message, 
  onDismiss,
  className = "" 
}) {
  const config = {
    success: {
      icon: CheckCircle2,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-800",
      iconColor: "text-emerald-600"
    },
    error: {
      icon: XCircle,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      textColor: "text-red-800",
      iconColor: "text-red-600"
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-800",
      iconColor: "text-amber-600"
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-800",
      iconColor: "text-blue-600"
    }
  };

  const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[type];

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-lg border ${bgColor} ${borderColor} ${className}`}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`text-sm font-semibold ${textColor} mb-1`}>
            {title}
          </h4>
        )}
        <p className={`text-sm ${textColor}`}>
          {message}
        </p>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`${iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;
