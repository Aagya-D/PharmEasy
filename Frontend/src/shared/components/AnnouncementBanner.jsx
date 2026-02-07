import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import contentService from '../../core/services/content.service';

/**
 * AnnouncementBanner Component
 * Displays high-priority system announcements at the top of dashboards
 * 
 * @param {string} targetRole - The user role to filter announcements (PATIENT, PHARMACY, ADMIN)
 * @param {string} className - Additional CSS classes
 */
export function AnnouncementBanner({ targetRole, className = '' }) {
  const [announcement, setAnnouncement] = useState(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnnouncement();
  }, [targetRole]);

  const loadAnnouncement = async () => {
    try {
      setIsLoading(true);
      const response = await contentService.getHighPriorityAnnouncement(targetRole);
      if (response.success && response.data) {
        // Check if user has dismissed this announcement in this session
        const dismissedId = sessionStorage.getItem('dismissedAnnouncement');
        if (dismissedId !== response.data.id) {
          setAnnouncement(response.data);
          setIsVisible(true);
        }
      }
    } catch (err) {
      console.error("[ANNOUNCEMENT BANNER] Error loading announcement:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store dismissed announcement ID in session storage
    if (announcement) {
      sessionStorage.setItem('dismissedAnnouncement', announcement.id);
    }
  };

  // Don't render if loading, no announcement, or dismissed
  if (isLoading || !announcement || !isVisible) {
    return null;
  }

  // Determine icon and colors based on type
  const getTypeConfig = (type) => {
    switch (type) {
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-300',
          iconColor: 'text-yellow-600',
          textColor: 'text-yellow-900',
        };
      case 'error':
      case 'critical':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-300',
          iconColor: 'text-red-600',
          textColor: 'text-red-900',
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-300',
          iconColor: 'text-green-600',
          textColor: 'text-green-900',
        };
      case 'info':
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-300',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-900',
        };
    }
  };

  const config = getTypeConfig(announcement.type);
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded-lg shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor} mt-0.5`}>
          <Icon size={24} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className={`font-bold text-lg ${config.textColor} mb-1`}>
                {announcement.title}
              </h3>
              <p className={`text-sm ${config.textColor} leading-relaxed`}>
                {announcement.message}
              </p>
              {announcement.priority === 'high' && (
                <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  High Priority
                </span>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className={`flex-shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`}
              aria-label="Dismiss announcement"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnnouncementBanner;
