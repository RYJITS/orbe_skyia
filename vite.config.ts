import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('node_modules')) return undefined;
          if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/')) return 'react';
          if (normalizedId.includes('/three/') || normalizedId.includes('/@react-three/') || normalizedId.includes('/postprocessing/')) return 'three';
          if (normalizedId.includes('/framer-motion/') || normalizedId.includes('/lucide-react/')) return 'ui';
          if (normalizedId.includes('/recharts/')) return 'charts';
          return undefined;
        },
      },
    },
  },
});
