import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [sveltekit()],
	
	// Build-Optimierungen für Vercel
	build: {
		// Chunk-Splitting für bessere Caching-Strategien
		rollupOptions: {
			output: {
				manualChunks: {
					// Nostr-Tools in separaten Chunk
					'nostr': ['nostr-tools'],
					// Svelte-spezifische Chunks
					'svelte-vendor': ['svelte', 'svelte/store'],
					// Eigene Nostr-Implementierung
					'nostr-client': [
						'./src/lib/nostr/realNostrClient.ts',
						'./src/lib/nostr/optimizedNostrClient.ts',
						'./src/lib/nostr/strategicNostrClient.ts'
					],
					// Krypto-Funktionen
					'crypto': [
						'./src/lib/nostr/realCrypto.ts',
						'./src/lib/crypto/encryption.ts'
					],
					// UI-Komponenten
					'components': [
						'./src/components/SimpleOfferInterface.svelte',
						'./src/components/OfferCard.svelte'
					]
				}
			}
		},
		// Optimierungen für Production
		minify: mode === 'production' ? 'terser' : false,
		sourcemap: mode === 'development',
		// Target für bessere Browser-Kompatibilität
		target: 'es2020',
		// Chunk-Größe-Warnung erhöhen
		chunkSizeWarningLimit: 1000
	},
	
	// Optimierungen für Development und Production
	optimizeDeps: {
		include: ['nostr-tools'],
		exclude: ['@sveltejs/kit']
	},
	
	// Server-Konfiguration
	server: {
		// Hot Module Replacement optimieren
		hmr: {
			overlay: false
		},
		// CORS für WebSocket-Verbindungen
		cors: true
	},
	
	// Preview-Server (für lokale Tests)
	preview: {
		port: 4173,
		host: true,
		cors: true
	},
	
	// CSS-Optimierungen
	css: {
		devSourcemap: mode === 'development',
		// PostCSS-Optimierungen für Production
		postcss: mode === 'production' ? {
			plugins: []
		} : undefined
	},
	
	// Environment-Variablen
	define: {
		// Vercel-spezifische Variablen
		__APP_VERSION__: JSON.stringify('1.0.0'),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
		__VERCEL_ENV__: JSON.stringify(mode === 'production' ? 'production' : 'development')
	},
	
	// Worker-Unterstützung für Service Worker
	worker: {
		format: 'es'
	}
}));
