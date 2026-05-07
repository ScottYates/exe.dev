import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			'$lib': resolve(__dirname, 'src/lib')
		}
	},
	build: {
		// Output as a single JS + CSS bundle for the Go template to load
		outDir: '../srv/static/dist',
		emptyOutDir: true,
		rollupOptions: {
			input: 'src/main.ts',
			output: {
				entryFileNames: 'app.js',
				assetFileNames: 'app.[ext]'
			}
		}
	},
	server: {
		port: 5173,
		proxy: {
			'/api': 'http://localhost:8000',
			'/auth': 'http://localhost:8000',
			'/static': 'http://localhost:8000'
		}
	}
});
