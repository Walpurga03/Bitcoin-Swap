import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Optimiert für Vercel-Deployment
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html', // SPA-Modus für Client-Side-Routing
			precompress: false,
			strict: true
		}),
		
		// Prerendering-Konfiguration
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn',
			entries: [
				'*', // Alle Routen prerendern
				'/offers',
				'/group'
			]
		},
		
		// Service Worker für PWA-Features
		serviceWorker: {
			register: false // Erstmal deaktiviert
		},
		
		// CSP für Sicherheit
		csp: {
			mode: 'auto',
			directives: {
				'connect-src': ['self', 'wss://nostr-relay.online', 'wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.nostr.band']
			}
		}
	}
};

export default config;
