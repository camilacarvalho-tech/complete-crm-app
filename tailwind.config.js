export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        code: {
          primary: '#1E40AF',
          secondary: '#7C3AED',
          action: '#F97316',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#0EA5E9',
          dark: '#0F172A',
          sidebar: '#111827',
          card: '#1E293B',
          'card-hover': '#273449',
          border: '#334155',
        },
        nexus: {
          orange: '#F97316',
          blue: '#1E40AF',
          purple: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 25px rgba(0,0,0,.12)',
        btn: '0 8px 20px rgba(30,64,175,.30)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease',
      },
    },
  },
  plugins: [],
}
