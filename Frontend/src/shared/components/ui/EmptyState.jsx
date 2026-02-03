import React from "react";
import { Package, Search, FileX, AlertCircle } from "lucide-react";

/**
 * EmptyState Component - Clear feedback when no data exists
 * 
 * States: no-data, no-results, no-access, error
 * Features: Icon, title, description, optional action
 */
export function EmptyState({ 
  type = "no-data",
  title,
  description,
  action,
  className = "" 
}) {
  const config = {
    "no-data": {
      icon: Package,
      defaultTitle: "No Data Available",
      defaultDescription: "There's nothing to display here yet."
    },
    "no-results": {
      icon: Search,
      defaultTitle: "No Results Found",
      defaultDescription: "Try adjusting your search or filters."
    },
    "no-access": {
      icon: FileX,
      defaultTitle: "No Access",
      defaultDescription: "You don't have permission to view this content."
    },
    "error": {
      icon: AlertCircle,
      defaultTitle: "Something Went Wrong",
      defaultDescription: "We couldn't load this content. Please try again."
    }
  };

  const { icon: Icon, defaultTitle, defaultDescription } = config[type];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        {title || defaultTitle}
      </h3>
      
      <p className="text-sm text-slate-600 max-w-sm mb-6">
        {description || defaultDescription}
      </p>

      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
