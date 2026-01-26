
import { defineConfig } from 'vite';

export default defineConfig({
    // Serve the root directory (where index.html is)
    root: '.',
    base: '/MemoSuite/',
    server: {
        port: 3000,
        strictPort: true,
        proxy: {
            '/MemoSuite/HandMemo': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
            },
            '/MemoSuite/BookMemo': {
                target: 'http://localhost:3002',
                changeOrigin: true,
                secure: false,
            },
            '/MemoSuite/WordMemo': {
                target: 'http://localhost:3003',
                changeOrigin: true,
                secure: false,
            },
            '/MemoSuite/LLMemo': {
                target: 'http://localhost:3004',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
