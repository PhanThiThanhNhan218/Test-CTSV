import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_HASH_ROUTER=1 → bản demo một file: gộp cả chunk tải động (xuất Excel) vào bundle chính
const singleFile = !!process.env.VITE_HASH_ROUTER;

export default defineConfig({
  plugins: [react()],
  build: singleFile ? { rollupOptions: { output: { inlineDynamicImports: true } } } : {},
  test: { environment: 'node' },
} as any);
