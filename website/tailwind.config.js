/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple-inspired neutral palette
        'surface': {
          base: 'var(--color-bg-base)',
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          elevated: 'var(--color-bg-elevated)',
          card: 'var(--color-bg-card)',
        },
        'accent': {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          subtle: 'var(--color-accent-subtle)',
          muted: 'var(--color-accent-muted)',
        },
        'text': {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        // Semantic colors
        'positive': {
          DEFAULT: 'var(--color-positive)',
          subtle: 'var(--color-positive-subtle)',
        },
        'negative': {
          DEFAULT: 'var(--color-negative)',
          subtle: 'var(--color-negative-subtle)',
        },
        // Legacy support (for gradual migration)
        'dynamic-island': {
          DEFAULT: '#1c1c1e',
          dark: '#0a0a0b',
          light: '#2a2a2a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1.2' }],   // 10px
        'xs': ['0.6875rem', { lineHeight: '1.35' }],  // 11px
        'sm': ['0.8125rem', { lineHeight: '1.4' }],   // 13px
        'base': ['0.9375rem', { lineHeight: '1.5' }], // 15px
        'lg': ['1.0625rem', { lineHeight: '1.4' }],   // 17px
        'xl': ['1.3125rem', { lineHeight: '1.3' }],   // 21px
        '2xl': ['1.75rem', { lineHeight: '1.2' }],    // 28px
      },
      borderRadius: {
        'sm': '0.5rem',   // 8px
        'md': '0.75rem',  // 12px
        'lg': '1rem',     // 16px
        'xl': '1.25rem',  // 20px
        '2xl': '1.5rem',  // 24px
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(0, 0, 0, 0.12)',
        'sm': '0 2px 4px rgba(0, 0, 0, 0.15)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.18)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.22)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'island': '0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'island-glow': '0 0 40px rgba(0, 0, 0, 0.3)',
        'focus': '0 0 0 3px rgba(94, 124, 226, 0.12)',
      },
      backdropBlur: {
        'xs': '8px',
        'sm': '16px',
        'md': '24px',
        'lg': '40px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'scale-in': 'scaleIn 0.2s ease-out forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
        // Metropolitain-inspired animations
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'gradient-flow': 'gradientFlow 5s ease infinite',
        'shimmer-fast': 'shimmerFast 2s linear infinite',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'blur-in': 'blurIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'morph': 'morph 8s ease-in-out infinite',
        'reveal': 'reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        // Metropolitain-inspired keyframes
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(94, 124, 226, 0.3), 0 0 10px rgba(94, 124, 226, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(94, 124, 226, 0.5), 0 0 40px rgba(94, 124, 226, 0.3)' },
        },
        gradientFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        shimmerFast: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        blurIn: {
          '0%': { filter: 'blur(10px)', opacity: '0', transform: 'scale(0.95)' },
          '100%': { filter: 'blur(0)', opacity: '1', transform: 'scale(1)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%': { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
        },
        reveal: {
          '0%': { clipPath: 'inset(0 100% 0 0)', opacity: '0' },
          '100%': { clipPath: 'inset(0 0 0 0)', opacity: '1' },
        },
      },
      transitionDuration: {
        'fast': '100ms',
        'normal': '150ms',
        'slow': '250ms',
        'slower': '400ms',
        'slowest': '600ms',
      },
      transitionTimingFunction: {
        'out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'snappy': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
}

