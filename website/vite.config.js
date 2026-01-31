import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit (mapbox is large)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks - heavy libraries in separate files
          'mapbox': ['mapbox-gl', 'react-map-gl'],
          'recharts': ['recharts'],
          'react-vendor': ['react', 'react-dom'],
          'zustand': ['zustand'],
        }
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['mapbox-gl', 'recharts', 'zustand']
  }
})
