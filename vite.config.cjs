const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')

module.exports = defineConfig({
  plugins: [react()],
  base: '/skillsSecurity/',
  server: {
    port: 5173
  },
  build: {
    // Optimize chunk size with code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // React libraries
          'react-vendor': ['react', 'react-dom'],

          // Ethers.js is large, split separately
          'ethers': ['ethers'],

          // Recharts for charts
          'charts': ['recharts'],

          // Lucide icons
          'icons': ['lucide-react']
        }
      }
    },

    // Increase chunk size warning limit temporarily
    chunkSizeWarningLimit: 600,

    // Minify options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },

    // CSS code splitting
    cssCodeSplit: true,

    // Source maps for production (optional, disable for smaller bundle)
    sourcemap: false
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'ethers', 'recharts'],
    exclude: ['lucide-react']
  },

  // Define global constants
  define: {
    'process.env.NODE_ENV': '"production"'
  }
})