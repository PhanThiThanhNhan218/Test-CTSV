/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--tm-${name}) / <alpha-value>)`;

export default {
  // Tiền tố tm- để không đụng class của app mẹ; preflight được reset riêng trong .ctsv-module
  prefix: 'tm-',
  corePlugins: { preflight: false },
  content: ['./src/module/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        subtle: token('subtle'),
        muted: token('muted'),
        line: token('line'),
        'line-strong': token('line-strong'),
        fg: token('fg'),
        'fg-2': token('fg-2'),
        'fg-3': token('fg-3'),
        accent: token('accent'),
        danger: token('danger'),
        warn: token('warn'),
        success: token('success'),
        caution: token('caution'),
      },
      fontFamily: { sans: 'var(--tm-font)' },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '16px'],
        sm: ['13px', '20px'],
        base: ['14px', '20px'],
        md: ['15px', '22px'],
      },
      borderRadius: { DEFAULT: '6px' },
      zIndex: {
        drawer: 'calc(var(--tm-z) + 10)',
        modal: 'calc(var(--tm-z) + 20)',
      },
    },
  },
};
