/**
 * Stat - Standardized stat display with trend indicator
 * 
 * Apple-inspired metric display with comparison to average and trend arrows.
 * Used across the dashboard for consistent data presentation.
 */
import { memo } from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react'

/**
 * Format a number with locale-specific formatting
 * @param {number} value - Value to format
 * @param {Object} options - Formatting options
 */
const formatValue = (value, { type = 'number', decimals = 0, prefix = '', suffix = '' }) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '—'
    }

    let formatted
    switch (type) {
        case 'currency':
            formatted = new Intl.NumberFormat('it-IT', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(value)
            break
        case 'percent':
            formatted = `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
            break
        case 'compact':
            formatted = new Intl.NumberFormat('it-IT', {
                notation: 'compact',
                compactDisplay: 'short',
                maximumFractionDigits: 1
            }).format(value)
            break
        default:
            formatted = new Intl.NumberFormat('it-IT', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }).format(value)
    }

    return `${prefix}${formatted}${suffix}`
}

/**
 * Get trend configuration
 * @param {number} value - Trend value (positive = up, negative = down)
 * @param {boolean} invertColors - Invert color meaning (e.g., for costs where down is good)
 */
const getTrendConfig = (value, invertColors = false) => {
    if (value === null || value === undefined || value === 0) {
        return {
            icon: Minus,
            color: 'text-gray-400',
            bgColor: 'bg-gray-500/10',
            label: 'Stabile'
        }
    }

    const isPositive = value > 0
    const isGood = invertColors ? !isPositive : isPositive

    return {
        icon: isPositive ? TrendingUp : TrendingDown,
        color: isGood ? 'text-emerald-400' : 'text-red-400',
        bgColor: isGood ? 'bg-emerald-500/10' : 'bg-red-500/10',
        label: isPositive ? 'In crescita' : 'In calo'
    }
}

/**
 * Stat Component
 * @param {Object} props
 * @param {string} props.label - Metric label
 * @param {number} props.value - Main value
 * @param {Object} props.format - Formatting options { type, decimals, prefix, suffix }
 * @param {number} props.trend - Trend percentage (optional)
 * @param {boolean} props.invertTrendColors - Make negative trends green (for costs)
 * @param {number} props.comparison - Comparison value (e.g., city average)
 * @param {string} props.comparisonLabel - Label for comparison (e.g., "Media Milano")
 * @param {React.ElementType} props.icon - Icon component
 * @param {'sm'|'md'|'lg'} props.size - Display size
 * @param {string} props.className - Additional classes
 */
const Stat = memo(({
    label,
    value,
    format = { type: 'number', decimals: 0 },
    trend,
    invertTrendColors = false,
    comparison,
    comparisonLabel = 'Media Milano',
    icon: Icon,
    size = 'md',
    className = ''
}) => {
    const formattedValue = formatValue(value, format)
    const trendConfig = trend !== undefined ? getTrendConfig(trend, invertTrendColors) : null
    const TrendIcon = trendConfig?.icon

    // Calculate comparison bar percentage (value vs comparison)
    const comparisonPercent = comparison && value
        ? Math.min(Math.max((value / comparison) * 50, 5), 95)
        : null

    const sizeClasses = {
        sm: {
            container: 'gap-1',
            label: 'text-[10px]',
            value: 'text-lg',
            trend: 'text-[10px] px-1.5 py-0.5 gap-0.5',
            trendIcon: 12
        },
        md: {
            container: 'gap-1.5',
            label: 'text-xs',
            value: 'text-xl',
            trend: 'text-xs px-2 py-1 gap-1',
            trendIcon: 14
        },
        lg: {
            container: 'gap-2',
            label: 'text-sm',
            value: 'text-2xl',
            trend: 'text-sm px-2.5 py-1 gap-1',
            trendIcon: 16
        }
    }

    const sizes = sizeClasses[size] || sizeClasses.md

    return (
        <div className={`flex flex-col ${sizes.container} ${className}`}>
            {/* Label */}
            <div className="flex items-center gap-1.5">
                {Icon && <Icon size={12} className="text-gray-500" />}
                <span className={`${sizes.label} text-gray-500 font-medium uppercase tracking-wide`}>
                    {label}
                </span>
            </div>

            {/* Value Row */}
            <div className="flex items-center gap-2">
                <span className={`${sizes.value} font-bold text-white leading-none`}>
                    {formattedValue}
                </span>

                {/* Trend Badge */}
                {trendConfig && (
                    <div className={`
            flex items-center ${sizes.trend} rounded-full
            ${trendConfig.bgColor} ${trendConfig.color}
            font-medium
          `}>
                        <TrendIcon size={sizes.trendIcon} />
                        <span>{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
                    </div>
                )}
            </div>

            {/* Comparison Bar */}
            {comparisonPercent !== null && (
                <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span>vs {comparisonLabel}</span>
                        <span className={comparisonPercent > 50 ? 'text-amber-400' : 'text-emerald-400'}>
                            {comparisonPercent > 50 ? (
                                <span className="flex items-center gap-0.5">
                                    <ArrowUp size={10} />
                                    +{((value / comparison - 1) * 100).toFixed(0)}%
                                </span>
                            ) : (
                                <span className="flex items-center gap-0.5">
                                    <ArrowDown size={10} />
                                    {((value / comparison - 1) * 100).toFixed(0)}%
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${comparisonPercent > 50 ? 'bg-amber-500/60' : 'bg-emerald-500/60'
                                }`}
                            style={{ width: `${comparisonPercent}%` }}
                        />
                        <div
                            className="h-full w-0.5 bg-white/30 absolute"
                            style={{ left: '50%', transform: 'translateX(-50%)' }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
})

Stat.displayName = 'Stat'

/**
 * StatGroup - Container for multiple stats in a row/grid
 */
export const StatGroup = memo(({ children, columns = 2, className = '' }) => (
    <div
        className={`grid gap-4 ${className}`}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
        {children}
    </div>
))

StatGroup.displayName = 'StatGroup'

export default Stat
