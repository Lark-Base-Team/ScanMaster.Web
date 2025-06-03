import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    plugins: [react()],
    server: {
        host: '0.0.0.0',
    },
    build: {
        rollupOptions: {
            external: [
                '#minpath',
                '#minproc',  // 新增这个模块
                /^node:.*/,
                /^#/         // 通配所有#开头的模块
            ],
            plugins: [
                {
                    name: 'vfile-resolver',
                    resolveId(source) {
                        if (source.startsWith('#')) {
                            return { id: source, external: true }
                        }
                    }
                }
            ]
        }
    }
})
