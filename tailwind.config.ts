import type { Config } from 'tailwindcss';

/**
 * Design direction: premium editorial + analytical.
 *
 * The system is deliberately narrow — one warm paper background, one ink
 * scale, one restrained accent, one dark section colour. Colour is used to
 * carry meaning (evidence labels), never as decoration.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm off-white page ground and raised surfaces.
        paper: {
          DEFAULT: '#FBFAF7',
          raised: '#FFFFFF',
          sunk: '#F4F2ED',
        },
        // Charcoal text scale.
        //
        // `faint` was #767B84, which measured 3.8:1 on paper.sunk and
        // 4.08–4.25:1 elsewhere — below the 4.5:1 WCAG AA threshold for body
        // text. Darkened to clear AA on every background the site uses while
        // staying clearly recessive against `soft`.
        ink: {
          DEFAULT: '#15161A',
          soft: '#4B5058',
          faint: '#5F646D',
          inverse: '#F6F5F2',
        },
        // Warm hairline borders.
        line: {
          DEFAULT: '#E6E2DA',
          strong: '#D3CEC3',
          dark: '#2C3034',
        },
        // The single restrained accent: deep analytical teal.
        accent: {
          DEFAULT: '#0E5D55',
          hover: '#0A4A44',
          soft: '#E7F0EE',
          line: '#B9D3CE',
          ink: '#0B463F',
        },
        // Dark contrast sections.
        night: {
          DEFAULT: '#17191C',
          raised: '#212429',
          line: '#32363C',
        },
        // Evidence-label semantics. Muted on purpose: a "reported" chip must
        // never read as loud as a "verified" one.
        evidence: {
          verified: '#0E5D55',
          calculated: '#3F5B87',
          reported: '#8A6A2F',
          limitation: '#8C4A3F',
          recommendation: '#4A4460',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      fontSize: {
        // Editorial display scale.
        'display-xl': ['clamp(2.55rem, 1.35rem + 4.4vw, 4.75rem)', { lineHeight: '1.03', letterSpacing: '-0.022em' }],
        'display-lg': ['clamp(2.15rem, 1.3rem + 3.2vw, 3.6rem)', { lineHeight: '1.06', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(1.8rem, 1.25rem + 2.1vw, 2.75rem)', { lineHeight: '1.12', letterSpacing: '-0.018em' }],
        'display-sm': ['clamp(1.5rem, 1.15rem + 1.3vw, 2.05rem)', { lineHeight: '1.18', letterSpacing: '-0.014em' }],
        // Metric numerals.
        'metric-lg': ['clamp(2.1rem, 1.5rem + 2.4vw, 3.15rem)', { lineHeight: '1', letterSpacing: '-0.028em' }],
        'metric': ['clamp(1.7rem, 1.35rem + 1.4vw, 2.35rem)', { lineHeight: '1.02', letterSpacing: '-0.024em' }],
        'metric-sm': ['clamp(1.4rem, 1.2rem + 0.8vw, 1.75rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        // Small caps / eyebrow.
        eyebrow: ['0.75rem', { lineHeight: '1.35', letterSpacing: '0.13em' }],
        micro: ['0.6875rem', { lineHeight: '1.45', letterSpacing: '0.09em' }],
      },
      maxWidth: {
        container: '78rem', // ~1248px
        prose: '42rem',
        measure: '36rem',
      },
      spacing: {
        section: 'clamp(4rem, 2.5rem + 6vw, 7.5rem)',
        'section-sm': 'clamp(2.75rem, 1.9rem + 3.6vw, 4.75rem)',
      },
      borderRadius: {
        card: '0.5rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(21, 22, 26, 0.04), 0 1px 1px rgba(21, 22, 26, 0.02)',
        lift: '0 6px 24px -12px rgba(21, 22, 26, 0.18), 0 2px 6px -3px rgba(21, 22, 26, 0.06)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
