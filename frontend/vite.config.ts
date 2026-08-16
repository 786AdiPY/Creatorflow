import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 5173 is the console's (frontend/) default — keep the two apps running
    // side by side in local dev without a port clash.
    port: 5174,
  },
  preview: {
    port: 5174,
  },
});
