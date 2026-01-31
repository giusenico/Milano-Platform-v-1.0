import React from 'react'
import { ChevronRight } from 'lucide-react'

/**
 * Data Category Button - Apple-inspired minimal button
 */
const DataCategoryButton = ({
    icon: Icon,
    label,
    sublabel,
    color,
    onClick,
    isActive = false,
    badge
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 rounded-xl 
                transition-all duration-150 ease-out group
                border ${isActive
                ? 'bg-surface-elevated border-white/10'
                : 'bg-surface-card border-white/[0.06] hover:bg-surface-elevated hover:border-white/10'
            }
                active:scale-[0.98]`}
    >
        <div
            className={`p-2 rounded-lg transition-transform duration-150
                  ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}
            style={{ backgroundColor: 'var(--color-accent-muted)' }}
        >
            <Icon size={16} style={{ color: 'var(--color-accent)' }} />
        </div>
        <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
                <span className={`text-sm font-medium transition-colors duration-150
                         ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                    {label}
                </span>
                {badge && (
                    <span className="px-1.5 py-0.5 rounded bg-accent-subtle text-accent text-2xs font-semibold">
                        {badge}
                    </span>
                )}
            </div>
            {sublabel && (
                <span className="text-xs text-text-tertiary">{sublabel}</span>
            )}
        </div>
        <ChevronRight
            size={14}
            className={`text-text-tertiary transition-all duration-150
                  ${isActive ? 'text-text-secondary translate-x-0.5' : 'group-hover:text-text-secondary group-hover:translate-x-0.5'}`}
        />
    </button>
)

export default DataCategoryButton
