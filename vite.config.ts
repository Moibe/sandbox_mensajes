import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 4177,
		host: true,
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8082',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, '')
			}
		}
	},
	preview: {
		port: 4177,
		host: true,
		strictPort: true
	}
});
