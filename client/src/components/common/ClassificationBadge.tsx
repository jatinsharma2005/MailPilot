import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  Clock,
  UserCheck,
  MinusCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { ClassificationType } from '../../types/index.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { api } from '../../services/api.js';

interface Props {
  classification: ClassificationType;
  emailId?: string;
  interactive?: boolean;
  onClassificationChange?: (newClassification: ClassificationType) => void;
  className?: string;
  dropdownAlign?: 'left' | 'right';
}

const CLASSIFICATION_OPTIONS: Array<{
  value: ClassificationType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  colors: {
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
}> = [
  {
    value: 'ASSISTANT_TO_REPLY',
    label: 'Assistant to Reply',
    description: 'Requires executive assistant coordination or reply draft',
    icon: Clock,
    colors: {
      bg: 'bg-[#EAF2EC]',
      text: 'text-[#234E39]',
      border: 'border-[#D0E2D5]',
      dot: 'bg-[#234E39]',
    },
  },
  {
    value: 'CLIENT_TO_REPLY',
    label: 'Client to Reply',
    description: 'Strategic decision or executive sign-off required from client',
    icon: UserCheck,
    colors: {
      bg: 'bg-[#FDF6EC]',
      text: 'text-[#B7833D]',
      border: 'border-[#F3E2C8]',
      dot: 'bg-[#B7833D]',
    },
  },
  {
    value: 'NO_REPLY_NEEDED',
    label: 'No Reply Needed',
    description: 'Automated notification, receipt, newsletter, or closed loop',
    icon: MinusCircle,
    colors: {
      bg: 'bg-[#EFEEE8]',
      text: 'text-[#777970]',
      border: 'border-[#E6E5DE]',
      dot: 'bg-[#777970]',
    },
  },
  {
    value: 'NEEDS_REVIEW',
    label: 'Needs Review',
    description: 'Ambiguous context requiring review before routing',
    icon: HelpCircle,
    colors: {
      bg: 'bg-[#FBEBE9]',
      text: 'text-[#B75C52]',
      border: 'border-[#F5D5D1]',
      dot: 'bg-[#B75C52]',
    },
  },
];

export const ClassificationBadge: React.FC<Props> = ({
  classification,
  emailId,
  interactive = true,
  onClassificationChange,
  className = '',
  dropdownAlign = 'left',
}) => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<ClassificationType>(classification);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync prop changes
  useEffect(() => {
    setCurrentClass(classification);
  }, [classification]);

  // Check role authorization: Only ASSISTANT and ADMIN can edit
  const isAuthorized =
    interactive &&
    Boolean(emailId) &&
    (user?.role === 'ASSISTANT' || user?.role === 'ADMIN');

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const activeOption =
    CLASSIFICATION_OPTIONS.find((opt) => opt.value === currentClass) ||
    CLASSIFICATION_OPTIONS[2]; // Default to NO_REPLY_NEEDED if not matched

  const handleSelect = async (e: React.MouseEvent, newClass: ClassificationType) => {
    e.stopPropagation();
    e.preventDefault();
    if (newClass === currentClass || loading || !emailId) {
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const previous = currentClass;
    setCurrentClass(newClass);

    try {
      await api.patch(`/emails/${emailId}/classification`, {
        classification: newClass,
        reason: 'Manual adjustment via interactive classification dropdown',
      });
      if (onClassificationChange) {
        onClassificationChange(newClass);
      }
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to update classification:', err);
      // Revert optimistic update
      setCurrentClass(previous);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthorized || loading) return;
    setIsOpen((prev) => !prev);
  };

  // If not interactive or client role, render as clean read-only badge
  if (!isAuthorized) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${activeOption.colors.bg} ${activeOption.colors.text} ${activeOption.colors.border} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${activeOption.colors.dot}`} />
        <span>{activeOption.label}</span>
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={loading}
        title="Click to change classification"
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer hover:shadow-2xs hover:scale-[1.02] focus:outline-none focus:ring-1 focus:ring-[#234E39]/40 ${
          activeOption.colors.bg
        } ${activeOption.colors.text} ${activeOption.colors.border} ${
          isOpen ? 'ring-2 ring-[#234E39]/30 shadow-subtle' : ''
        } ${className}`}
      >
        {loading ? (
          <Loader2 size={11} className="animate-spin shrink-0" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeOption.colors.dot}`} />
        )}
        <span className="truncate">{activeOption.label}</span>
        <ChevronDown
          size={11}
          className={`shrink-0 transition-transform duration-200 opacity-70 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Compact Dropdown Popover */}
      {isOpen && (
        <div
          role="menu"
          className={`absolute z-50 mt-1.5 w-64 rounded-2xl bg-white border border-border-main shadow-xl p-1.5 animate-fadeIn ${
            dropdownAlign === 'right' ? 'right-0' : 'left-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 border-b border-border-main/60 mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
              Change Classification
            </p>
          </div>

          <div className="space-y-1">
            {CLASSIFICATION_OPTIONS.map((opt) => {
              const isSelected = opt.value === currentClass;
              const IconComp = opt.icon;

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(e) => handleSelect(e, opt.value)}
                  className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FAF9F5] border border-border-main/70'
                      : 'hover:bg-[#FAF9F5] border border-transparent'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${opt.colors.bg} ${opt.colors.text}`}
                  >
                    <IconComp size={13} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-text-primary' : 'text-text-primary/90'
                        }`}
                      >
                        {opt.label}
                      </span>
                      {isSelected && (
                        <Check size={13} className="text-[#234E39] shrink-0 font-bold" />
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary leading-tight mt-0.5 line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
