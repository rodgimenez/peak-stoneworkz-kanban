import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // es2022 allows top-level await (used to load the Firebase config before the app starts)
  build: { target: 'es2022' },
})
