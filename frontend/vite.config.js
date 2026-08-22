import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var target = env.VITE_API_PROXY_TARGET || 'http://localhost:8000';
    return {
        plugins: [react()],
        resolve: { alias: { '@': path.resolve(__dirname, './src') } },
        server: {
            port: 5173,
            // Dev proxy keeps the browser on one origin, so cookies/CORS stay simple.
            proxy: {
                '/api': { target: target, changeOrigin: true, ws: true },
            },
        },
        build: { outDir: 'dist', sourcemap: mode !== 'production' },
    };
});
