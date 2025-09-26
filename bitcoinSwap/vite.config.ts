import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit()],
	
	// Build-Optimierungen
	build: {
		// Chunk-Splitting für bessere Caching-Strategien
		rollupOptions: {
			output: {
				manualChunks: {
					// Nostr-Tools in separaten Chunk
					'nostr': ['nostr-tools'],
					// Svelte-spezifische Chunks
					'svelte-vendor': ['svelte', 'svelte/store']
				}
			}
		},
		// Minimale Bundle-Größe
		minify: 'terser',
		// Source Maps nur in Development
		sourcemap: mode === 'development'
	},
	
	// Optimierungen für Development
	optimizeDeps: {
		include: ['nostr-tools']
	},
	
	// Server-Konfiguration
	server: {
		// Hot Module Replacement optimieren
		hmr: {
			overlay: false
		}
	},
	
	// CSS-Optimierungen
	css: {
		devSourcemap: true
	}
}));
