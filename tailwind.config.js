/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        'dark-primary': '#1a1d23',
        'dark-secondary': '#23272f',
        'dark-card': '#2b2f38',
        'dark-hover': '#32363f',
        'discord': '#5865F2',
        'discord-hover': '#4752c4',
        'text-primary': '#ffffff',
        'text-secondary': '#b9bbbe',
        'border-dark': '#3a3f4b',
      },
    },
  },
  plugins: [],
}
