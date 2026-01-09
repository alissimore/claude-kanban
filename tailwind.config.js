/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clean minimal palette
        'board-bg': '#f8f9fa',
        'column-bg': '#ffffff',
        'card-bg': '#ffffff',
        'card-hover': '#f1f3f4',
        'border': '#e1e4e8',
        'text-primary': '#1f2937',
        'text-secondary': '#6b7280',
        'text-muted': '#9ca3af',
        // Status colors
        'status-attention': '#ef4444',
        'status-working': '#3b82f6',
        'status-blocked': '#f59e0b',
        'status-done': '#10b981',
        'status-inactive': '#9ca3af',
      },
      animation: {
        'attention-pulse': 'attention-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'attention-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)',
          },
          '50%': {
            boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.2)',
          },
        },
      },
    },
  },
  plugins: [],
}
