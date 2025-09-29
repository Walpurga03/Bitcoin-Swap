// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Environment Variables
declare module '$env/static/public' {
	export const PUBLIC_ALLOWED_PUBKEYS: string;
	export const PUBLIC_APP_NAME: string;
	export const PUBLIC_DEFAULT_RELAY: string;
	export const PUBLIC_BACKUP_RELAYS: string;
}

export {};
