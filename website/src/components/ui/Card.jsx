/**
 * Card - Reusable glass-morphism card component
 * 
 * Apple-inspired design with variants for different use cases.
 * Uses CSS design tokens for consistent styling.
 */
import { memo } from 'react'

const variantStyles = {
    default: 'bg-white/[0.03] border-white/[0.06]',
    elevated: 'bg-white/[0.05] border-white/[0.08] shadow-lg hover-lift',
    glass: 'bg-black/40 backdrop-blur-xl border-white/[0.1] glass-premium',
    interactive: 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1] transition-all duration-300 interactive-card shine-effect',
    success: 'bg-emerald-500/[0.08] border-emerald-500/[0.15] morph-glow',
    warning: 'bg-amber-500/[0.08] border-amber-500/[0.15] morph-glow',
    danger: 'bg-red-500/[0.08] border-red-500/[0.15] morph-glow',
    premium: 'bg-gradient-to-br from-white/[0.05] to-white/[0.02] border-white/[0.08] shadow-xl tilt-card gradient-border-card breathing-glow'
}

const sizeStyles = {
    sm: 'p-3 rounded-xl',
    md: 'p-4 rounded-2xl',
    lg: 'p-5 rounded-2xl',
    xl: 'p-6 rounded-3xl'
}

/**
 * Card Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Card content
 * @param {'default'|'elevated'|'glass'|'interactive'|'success'|'warning'|'danger'|'premium'} props.variant - Visual style
 * @param {'sm'|'md'|'lg'|'xl'} props.size - Padding and border radius
 * @param {boolean} props.glow - Add subtle glow effect
 * @param {boolean} props.animated - Add entrance animation
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 * @param {Function} props.onClick - Click handler (adds cursor: pointer)
 */
const Card = memo(({
    children,
    variant = 'default',
    size = 'md',
    glow = false,
    animated = false,
    className = '',
    style,
    onClick,
    ...props
}) => {
    const baseStyles = 'border'
    const variantClass = variantStyles[variant] || variantStyles.default
    const sizeClass = sizeStyles[size] || sizeStyles.md
    const glowClass = glow ? 'shadow-[0_0_30px_rgba(59,130,246,0.15)]' : ''
    const animatedClass = animated ? 'animate-fade-in-up' : ''
    const clickableClass = onClick ? 'cursor-pointer' : ''

    return (
        <div
            className={`
        ${baseStyles}
        ${variantClass}
        ${sizeClass}
        ${glowClass}
        ${animatedClass}
        ${clickableClass}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
            style={style}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    )
})

Card.displayName = 'Card'

/**
 * CardHeader - Header section with title and optional subtitle
 */
export const CardHeader = memo(({ title, subtitle, icon: Icon, action, className = '' }) => (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
        <div className="flex items-center gap-2">
            {Icon && (
                <div className="p-2 rounded-xl bg-white/[0.05]">
                    <Icon size={16} className="text-gray-400" />
                </div>
            )}
            <div>
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {subtitle && (
                    <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                )}
            </div>
        </div>
        {action && <div>{action}</div>}
    </div>
))

CardHeader.displayName = 'CardHeader'

/**
 * CardContent - Main content area with consistent spacing
 */
export const CardContent = memo(({ children, className = '' }) => (
    <div className={`text-gray-300 ${className}`}>
        {children}
    </div>
))

CardContent.displayName = 'CardContent'

/**
 * CardFooter - Footer section for actions or additional info
 */
export const CardFooter = memo(({ children, className = '' }) => (
    <div className={`mt-4 pt-3 border-t border-white/[0.05] ${className}`}>
        {children}
    </div>
))

CardFooter.displayName = 'CardFooter'

export default Card
