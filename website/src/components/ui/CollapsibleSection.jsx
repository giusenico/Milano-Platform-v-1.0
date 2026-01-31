import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * CollapsibleSection - Apple-inspired collapsible category section
 * Similar to sidebar categories but expands inline to show data
 */
const CollapsibleSection = ({
    icon: Icon,
    label,
    sublabel,
    color = '#3b82f6',
    defaultOpen = false,
    badge,
    children,
    isEmpty = false
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    if (isEmpty) return null

    return (
        <div className="bg-surface-card rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-3 p-4 
                    transition-all duration-200 ease-out group
                    ${isOpen ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'}`}
            >
                <div
                    className="p-2.5 rounded-xl transition-all duration-200 group-hover:scale-105"
                    style={{ backgroundColor: `${color}15` }}
                >
                    <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                            {label}
                        </span>
                        {badge && (
                            <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ backgroundColor: `${color}20`, color }}
                            >
                                {badge}
                            </span>
                        )}
                    </div>
                    {sublabel && (
                        <span className="text-[11px] text-gray-500 truncate block">{sublabel}</span>
                    )}
                </div>
                <div 
                    className={`w-7 h-7 rounded-full bg-white/5 flex items-center justify-center 
                        transition-all duration-300 ${isOpen ? 'rotate-180 bg-white/10' : 'group-hover:bg-white/10'}`}
                >
                    <ChevronDown size={14} className="text-gray-400" />
                </div>
            </button>
            
            {/* Collapsible Content */}
            <div 
                className={`overflow-hidden transition-all duration-300 ease-out ${
                    isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-4 pt-0 animate-apple-fade-in">
                    <div className="pt-3 border-t border-white/5">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CollapsibleSection
