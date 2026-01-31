import { memo } from 'react'
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'

/**
 * Data Card Component - Apple-inspired clean design for KPIs
 * Memoized to prevent unnecessary re-renders
 */
const DataCard = memo(({ label, value, subValue, icon: Icon, color = 'var(--color-accent)', onClick, trend, compact = false }) => {
    const isPositive = trend >= 0
    const TrendIcon = isPositive ? TrendingUp : TrendingDown

    return (
        <div
            className={`bg-surface-card rounded-xl transition-all duration-300
                  border border-white/[0.06] group interactive-card shine-effect
                  ${compact ? 'p-3' : 'p-4'}
                  ${onClick ? 'cursor-pointer hover:bg-surface-elevated hover:border-white/10 active:scale-[0.98] hover-lift' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-center gap-2 mb-2">
                <div
                    className="p-1.5 rounded-lg transition-transform duration-150 group-hover:scale-105"
                    style={{ backgroundColor: 'var(--color-accent-muted)' }}
                >
                    <Icon size={compact ? 12 : 14} style={{ color: 'var(--color-accent)' }} />
                </div>
                <span className="text-xs text-text-secondary font-medium">{label}</span>
                {onClick && (
                    <ArrowUpRight size={12} className="text-text-tertiary ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                )}
            </div>
            <div className="flex items-end justify-between gap-2">
                <div>
                    <p className={`font-semibold text-text-primary tracking-tight ${compact ? 'text-base' : 'text-lg'}`}>{value}</p>
                    {subValue && (
                        <p className="text-xs text-text-tertiary mt-0.5">{subValue}</p>
                    )}
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-md
                          ${isPositive ? 'bg-positive-subtle text-positive' : 'bg-negative-subtle text-negative'}`}>
                        <TrendIcon size={10} />
                        <span className="text-2xs font-medium">
                            {isPositive ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(2) : trend}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
})

DataCard.displayName = 'DataCard'

export default DataCard
