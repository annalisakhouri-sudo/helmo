import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' }
  },
  optimizeDeps: {
    // jspdf référence en interne html2canvas et canvg (fonctions qu'on n'utilise pas,
    // seulement le texte), mais Vite essaie quand même de les résoudre au démarrage.
    // On l'exclut du pré-bundling pour éviter cette erreur.
    exclude: ['jspdf'],
  },
})
