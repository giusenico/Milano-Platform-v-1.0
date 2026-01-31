/**
 * Skeleton - Loading placeholder components
 * 
 * Apple-inspired skeleton loading states for lazy-loaded components.
 * Provides smooth visual feedback during data/component loading.
 */
import { memo } from 'react'

/**
 * Base Skeleton - Animated placeholder
 */
const Skeleton = memo(({
    width = '100%',
    height = '1rem',
    rounded = 'md',
    className = '',
    animated = true
}) => {
    const roundedClasses = {
        none: '',
        sm: 'rounded',
        md: 'rounded-lg',
        lg: 'rounded-xl',
        xl: 'rounded-2xl',
        full: 'rounded-full'
    }

    return (
        <div
            className={`
        skeleton-shimmer
        ${roundedClasses[rounded] || roundedClasses.md}
        ${animated ? 'animate-pulse' : ''}
        ${className}
      `}
            style={{ width, height }}
        />
    )
})

Skeleton.displayName = 'Skeleton'

/**
 * SkeletonText - Multiple lines of skeleton text
 */
export const SkeletonText = memo(({ lines = 3, gap = 2, lastLineWidth = '60%' }) => (
    <div className={`flex flex-col gap-${gap}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                height="0.75rem"
                width={i === lines - 1 ? lastLineWidth : '100%'}
            />
        ))}
    </div>
))

SkeletonText.displayName = 'SkeletonText'

/**
 * SkeletonCard - Card-shaped skeleton
 */
export const SkeletonCard = memo(({ hasHeader = true, hasContent = true, hasFooter = false }) => (
    <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        {hasHeader && (
            <div className="flex items-center gap-3 mb-4">
                <Skeleton width="2.5rem" height="2.5rem" rounded="xl" />
                <div className="flex-1 flex flex-col gap-2">
                    <Skeleton width="60%" height="0.875rem" />
                    <Skeleton width="40%" height="0.625rem" />
                </div>
            </div>
        )}
        {hasContent && (
            <div className="flex flex-col gap-3">
                <Skeleton height="2rem" />
                <div className="flex gap-2">
                    <Skeleton width="5rem" height="1.5rem" rounded="full" />
                    <Skeleton width="4rem" height="1.5rem" rounded="full" />
                </div>
            </div>
        )}
        {hasFooter && (
            <div className="mt-4 pt-4 border-t border-white/[0.05]">
                <Skeleton height="2.5rem" rounded="xl" />
            </div>
        )}
    </div>
))

SkeletonCard.displayName = 'SkeletonCard'

/**
 * SkeletonStat - Stat component skeleton
 */
export const SkeletonStat = memo(({ size = 'md' }) => {
    const heights = {
        sm: { label: '0.625rem', value: '1.25rem' },
        md: { label: '0.75rem', value: '1.5rem' },
        lg: { label: '0.875rem', value: '2rem' }
    }
    const h = heights[size] || heights.md

    return (
        <div className="flex flex-col gap-2">
            <Skeleton width="4rem" height={h.label} />
            <div className="flex items-center gap-2">
                <Skeleton width="5rem" height={h.value} />
                <Skeleton width="3rem" height="1.25rem" rounded="full" />
            </div>
        </div>
    )
})

SkeletonStat.displayName = 'SkeletonStat'

/**
 * SkeletonPanel - Full panel skeleton (for TimeSeriesPanel, etc.)
 */
export const SkeletonPanel = memo(({ height = '400px' }) => (
    <div
        className="p-5 rounded-3xl border border-white/[0.06] bg-black/40 backdrop-blur-xl"
        style={{ height }}
    >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Skeleton width="2.5rem" height="2.5rem" rounded="xl" />
                <div className="flex flex-col gap-1.5">
                    <Skeleton width="8rem" height="1rem" />
                    <Skeleton width="5rem" height="0.625rem" />
                </div>
            </div>
            <Skeleton width="2rem" height="2rem" rounded="lg" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
        </div>

        {/* Chart placeholder */}
        <div className="flex items-end justify-between gap-2 h-40">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                    key={i}
                    width="100%"
                    height={`${30 + Math.random() * 70}%`}
                    rounded="sm"
                />
            ))}
        </div>
    </div>
))

SkeletonPanel.displayName = 'SkeletonPanel'

/**
 * SkeletonInvestorSummary - Investor summary skeleton
 */
export const SkeletonInvestorSummary = memo(() => (
    <div className="p-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
            <Skeleton width="1.5rem" height="1.5rem" rounded="lg" />
            <Skeleton width="8rem" height="0.875rem" />
        </div>

        {/* Main metric */}
        <div className="flex items-center gap-3 mb-4">
            <Skeleton width="6rem" height="2rem" />
            <Skeleton width="4rem" height="1.25rem" rounded="full" />
        </div>

        {/* Comparison bar */}
        <div className="mb-4">
            <Skeleton width="100%" height="0.5rem" rounded="full" />
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.05]">
            <div className="flex flex-col gap-1">
                <Skeleton width="3rem" height="0.5rem" />
                <Skeleton width="4rem" height="1rem" />
            </div>
            <div className="flex flex-col gap-1">
                <Skeleton width="3rem" height="0.5rem" />
                <Skeleton width="4rem" height="1rem" />
            </div>
        </div>
    </div>
))

SkeletonInvestorSummary.displayName = 'SkeletonInvestorSummary'

export default Skeleton
