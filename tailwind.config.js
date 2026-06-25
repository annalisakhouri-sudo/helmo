/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#E6EEF7',
          100: '#B5CCE8',
          200: '#85ABD9',
          400: '#3878BB',
          600: '#185FA5',
          800: '#0C3A6A',
          900: '#042C53',
        },
        teal: {
          50:  '#E1F5EE',
          100: '#9FE1CB',
          200: '#5DCAA5',
          400: '#1D9E75',
          600: '#0F6E56',
          800: '#085041',
          900: '#04342C',
        },
        amber: {
          50:  '#FAEEDA',
          100: '#FAC775',
          200: '#EF9F27',
          400: '#BA7517',
          600: '#854F0B',
          800: '#633806',
          900: '#412402',
        },
        danger: {
          50:  '#FCEBEB',
          100: '#F7C1C1',
          200: '#F09595',
          400: '#E24B4A',
          600: '#A32D2D',
          800: '#791F1F',
          900: '#501313',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
