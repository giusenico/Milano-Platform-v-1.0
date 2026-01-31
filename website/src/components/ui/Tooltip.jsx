/**
 * Tooltip - Hover tooltip component
 * 
 * Shows explanatory text when hovering over an element.
 * Positioned above the trigger element with a small arrow.
 */
import { memo, useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

/**
 * Tooltip Component
 * @param {React.ReactNode} children - The trigger element
 * @param {string} content - Tooltip text content
 * @param {string} position - Tooltip position: 'top' | 'bottom' | 'left' | 'right'
 */
const Tooltip = memo(({ 
    children, 
    content, 
    position = 'top',
    className = '',
    maxWidth = 220
}) => {
    const [isVisible, setIsVisible] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const triggerRef = useRef(null)
    const tooltipRef = useRef(null)

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const trigger = triggerRef.current.getBoundingClientRect()
            const tooltip = tooltipRef.current.getBoundingClientRect()
            
            let top, left

            switch (position) {
                case 'bottom':
                    top = trigger.height + 8
                    left = (trigger.width - tooltip.width) / 2
                    break
                case 'left':
                    top = (trigger.height - tooltip.height) / 2
                    left = -tooltip.width - 8
                    break
                case 'right':
                    top = (trigger.height - tooltip.height) / 2
                    left = trigger.width + 8
                    break
                case 'top':
                default:
                    top = -tooltip.height - 8
                    left = (trigger.width - tooltip.width) / 2
                    break
            }

            setCoords({ top, left })
        }
    }, [isVisible, position])

    const arrowClasses = {
        top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-l-transparent border-r-transparent border-b-transparent border-t-[#1a1a1e]',
        bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-l-transparent border-r-transparent border-t-transparent border-b-[#1a1a1e]',
        left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1a1a1e]',
        right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1a1a1e]'
    }

    return (
        <div 
            className={`relative inline-flex ${className}`}
            ref={triggerRef}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            
            {isVisible && content && (
                <div
                    ref={tooltipRef}
                    className={`
                        absolute z-tooltip pointer-events-none
                        px-3 py-2 rounded-xl
                        bg-[#1a1a1e] border border-white/10
                        shadow-xl shadow-black/50
                        text-[11px] text-gray-300 leading-relaxed
                        animate-apple-fade-in
                    `}
                    style={{
                        top: coords.top,
                        left: coords.left,
                        maxWidth: maxWidth
                    }}
                >
                    {content}
                    {/* Arrow */}
                    <div 
                        className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`}
                    />
                </div>
            )}
        </div>
    )
})

Tooltip.displayName = 'Tooltip'

/**
 * InfoTooltip - Info icon with tooltip
 * Convenience component that combines an info icon with tooltip
 */
export const InfoTooltip = memo(({ 
    content, 
    position = 'top',
    size = 12,
    className = ''
}) => {
    return (
        <Tooltip content={content} position={position}>
            <Info 
                size={size} 
                className={`text-gray-500 hover:text-gray-400 cursor-help transition-colors ${className}`}
            />
        </Tooltip>
    )
})

InfoTooltip.displayName = 'InfoTooltip'

export default Tooltip
