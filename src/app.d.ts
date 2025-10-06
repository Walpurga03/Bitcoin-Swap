// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

// SvelteKit module declarations
declare module '$app/environment' {
	export const browser: boolean;
	export const dev: boolean;
	export const building: boolean;
	export const version: string;
}

declare module '$app/navigation' {
	export function goto(url: string | URL, opts?: { replaceState?: boolean; noScroll?: boolean; keepFocus?: boolean; invalidateAll?: boolean }): Promise<void>;
	export function invalidate(dependency: string | ((url: URL) => boolean)): Promise<void>;
	export function invalidateAll(): Promise<void>;
	export function preloadData(href: string): Promise<void>;
	export function preloadCode(...urls: string[]): Promise<void>;
	export function beforeNavigate(fn: (navigation: { from: URL | null; to: URL | null; type: 'enter' | 'leave' | 'link' | 'goto' | 'popstate'; willUnload: boolean; cancel: () => void }) => void): void;
	export function afterNavigate(fn: (navigation: { from: URL | null; to: URL | null; type: 'enter' | 'leave' | 'link' | 'goto' | 'popstate' }) => void): void;
}

declare module '$app/stores' {
	import { Readable } from 'svelte/store';
	export const page: Readable<{
		url: URL;
		params: Record<string, string>;
		route: { id: string | null };
		status: number;
		error: Error | null;
		data: Record<string, any>;
		form: any;
	}>;
	export const navigating: Readable<{
		from: URL | null;
		to: URL | null;
		type: 'enter' | 'leave' | 'link' | 'goto' | 'popstate';
	} | null>;
	export const updated: Readable<boolean>;
}

declare module '$env/dynamic/public' {
	export const env: Record<string, string>;
}

declare module '$env/dynamic/private' {
	export const env: Record<string, string>;
}

declare module '$env/static/public' {
	export const PUBLIC_ALLOWED_PUBKEYS: string;
}

declare module '$env/static/private' {
	// Add your private environment variables here
}

export {};