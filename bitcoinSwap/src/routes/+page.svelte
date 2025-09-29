<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { NostrClient } from '$lib/nostr/client';
	import { getPublicKey, nip19 } from 'nostr-tools';
	import { setUser } from '$lib/stores/userStore';
	import { setGroupConfig } from '$lib/stores/groupStore';
	import {
		validatePrivateKey,
		validateRelayUrl,
		validateGroupSecret,
		sanitizeInput
	} from '$lib/security/validation';
	import { parseInviteLink, createInviteLink } from '$lib/utils';
	import ErrorBoundary from '../components/ErrorBoundary.svelte';
	import LoadingSpinner from '../components/LoadingSpinner.svelte';
	import type { UserProfile, GroupConfig } from '$lib/nostr/types';
	import { PUBLIC_ALLOWED_PUBKEYS } from '$env/static/public';

	let inviteLink = '';
	let privateKey = '';
	let loading = false;
	let error = '';

	// Hilfsfunktion für gültige Channel-IDs (32 Bytes als Hex = 64 Zeichen)
	function generateRandomChannelId(): string {
		const bytes = new Array(32);
		for (let i = 0; i < 32; i++) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
		return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	// URL Parameter prüfen (falls Einladungslink)
	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const relay = urlParams.get('relay');
		const secret = urlParams.get('secret');
		
		if (relay && secret) {
			inviteLink = window.location.href;
		}
	});

	async function parseInviteLinkLocal(link: string): Promise<GroupConfig | null> {
		try {
			// Verwende die Utility-Funktion
			const parsed = parseInviteLink(link);
			if (!parsed || !parsed.relay || !parsed.secret) {
				throw new Error('Ungültiger Einladungslink');
			}

			// Validiere Relay-URL
			const relayValidation = validateRelayUrl(parsed.relay);
			if (!relayValidation.isValid) {
				throw new Error(`Ungültige Relay-URL: ${relayValidation.errors.join(', ')}`);
			}

			// Validiere Secret
			const secretValidation = validateGroupSecret(parsed.secret);
			if (!secretValidation.isValid) {
				throw new Error(`Ungültiges Secret: ${secretValidation.errors.join(', ')}`);
			}

			// Channel-ID aus dem Secret ableiten für konsistente Gruppenzugehörigkeit
			const channelId = await deriveChannelIdFromSecret(parsed.secret);

			return {
				channelId: channelId,
				relay: parsed.relay,
				secret: parsed.secret,
				name: 'Private Bitcoin-Gruppe'
			};
		} catch (err) {
			console.error('Fehler beim Parsen des Einladungslinks:', err);
			return null;
		}
	}

	// Channel-ID deterministisch aus Secret ableiten
	async function deriveChannelIdFromSecret(secret: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(secret + 'bitcoin-group-channel');
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const channelId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		
		console.log('🔧 Channel-ID Ableitung:');
		console.log('  🔐 Secret (first 8 chars):', secret.substring(0, 8) + '...');
		console.log('  📋 Abgeleitete Channel-ID:', channelId);
		
		return channelId;
	}


	async function joinGroup() {
		// Input sanitization
		const cleanInviteLink = sanitizeInput(inviteLink.trim(), 500);
		const cleanPrivateKey = sanitizeInput(privateKey.trim(), 100);

		console.log('🚀 Starte Login-Prozess...');
		console.log('🔗 Invite Link:', cleanInviteLink.substring(0, 50) + '...');

		if (!cleanInviteLink || !cleanPrivateKey) {
			error = 'Bitte füllen Sie alle Felder aus';
			return;
		}

		loading = true;
		error = '';

		try {
			// Gruppenkonfiguration aus Link parsen mit Validierung
			console.log('📋 Parse Einladungslink...');
			const groupConfig = await parseInviteLinkLocal(cleanInviteLink);
			if (!groupConfig) {
				throw new Error('Ungültiger Einladungslink');
			}
			console.log('✅ Gruppenkonfiguration erstellt:');
			console.log('  📋 Channel-ID:', groupConfig.channelId);
			console.log('  📡 Relay:', groupConfig.relay);
			console.log('  📛 Name:', groupConfig.name);
			console.log('  🔐 Secret (first 8 chars):', groupConfig.secret.substring(0, 8) + '...');

			// Private Key validieren mit der neuen Validierungsfunktion
			console.log('🔐 Validiere Private Key...');
			const keyValidation = validatePrivateKey(cleanPrivateKey);
			if (!keyValidation.isValid) {
				throw new Error(`Ungültiger privater Schlüssel: ${keyValidation.errors.join(', ')}`);
			}

			// Schlüssel normalisieren
			let cleanKey = cleanPrivateKey.toLowerCase();
			if (cleanKey.startsWith('nsec')) {
				try {
					const decoded = nip19.decode(cleanKey);
					if (decoded.type !== 'nsec' || !(decoded.data instanceof Uint8Array)) {
						throw new Error('Ungültiger nsec-Schlüssel');
					}
					cleanKey = Array.from(decoded.data).map(b => b.toString(16).padStart(2, '0')).join('');
				} catch (e) {
					throw new Error('Ungültiger nsec-Schlüssel');
				}
			}

			// Public Key ableiten
			const privkeyBytes = new Uint8Array(cleanKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
			const publicKey = getPublicKey(privkeyBytes);
			console.log('🔑 Public Key abgeleitet:', publicKey.substring(0, 16) + '...');

			// Whitelist-Prüfung über Environment Variable
			const allowedPubkeysEnv = PUBLIC_ALLOWED_PUBKEYS || '';
			const allowedPubkeys = allowedPubkeysEnv.split(',').map((key: string) => key.trim()).filter((key: string) => key.length > 0);
			const npub = nip19.npubEncode(publicKey);
			console.log('📋 Prüfe Whitelist für:', npub.substring(0, 20) + '...');
			
			if (allowedPubkeys.length > 0 && !allowedPubkeys.includes(npub)) {
				throw new Error('Du bist nicht auf der Whitelist! Kontaktieren Sie einen Administrator.');
			}

			// Einfacher Benutzername basierend auf Public Key
			const userName = `User_${publicKey.substring(0, 8)}`;
			console.log('👤 Benutzer gefunden:', userName);

			// NostrClient erstellen und Verbindung testen
			console.log('🌐 Teste Relay-Verbindung...');
			const client = new NostrClient();
			await client.connectToRelays([groupConfig.relay]);
			console.log('✅ Relay-Verbindung erfolgreich');

			// User Profile erstellen
			const userProfile: UserProfile = {
				pubkey: publicKey,
				privkey: cleanKey,
				name: userName
			};

			// Stores aktualisieren
			console.log('💾 Aktualisiere Stores...');
			setUser(userProfile);
			setGroupConfig(groupConfig);
			console.log('✅ Stores aktualisiert');

			// Zur Gruppenansicht navigieren
			console.log('🎯 Navigiere zur Gruppenansicht...');
			await goto('/group');

		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Ein unerwarteter Fehler ist aufgetreten';
			console.error('❌ Login-Fehler:', errorMsg);
			error = errorMsg;
		} finally {
			loading = false;
		}
	}

	// Fehler-Handler für ErrorBoundary
	let loginError: Error | null = null;

	function handleRetry() {
		loginError = null;
		error = '';
		loading = false;
	}

</script>

<svelte:head>
	<title>Bitcoin Tausch Netzwerk - Private Gruppe</title>
	<meta name="description" content="Sichere, private Bitcoin-Handelsgruppe auf Nostr" />
</svelte:head>

<section class="login-container">
	<div class="login-card">
		<h1>🔐 Private Bitcoin-Gruppe</h1>
		<p>Treten Sie einer sicheren, verschlüsselten Handelsgruppe bei</p>

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<form on:submit|preventDefault={joinGroup}>
			<div class="form-group">
				<label for="inviteLink">Einladungslink:</label>
				<input 
					id="inviteLink"
					type="url" 
					bind:value={inviteLink} 
					placeholder="https://example.com?relay=wss://...&secret=..."
					required
				/>
			</div>

			<div class="form-group">
				<label for="privateKey">Ihr privater Nostr-Schlüssel (nsec/hex):</label>
				<div class="key-input-group">
					<input 
						id="privateKey"
						type="password" 
						bind:value={privateKey} 
						placeholder="64-stelliger Hex-Schlüssel..."
						required
					/>
				</div>
				<small>Bewahren Sie Ihren privaten Schlüssel sicher auf!</small>
			</div>

			<button type="submit" disabled={loading} class="join-btn">
				{#if loading}
					<LoadingSpinner size="small" variant="dots" color="#ffffff" />
					Verbinde...
				{:else}
					🚀 Gruppe beitreten
				{/if}
			</button>
		</form>

		<div class="info">
			<h3>ℹ️ Wie es funktioniert:</h3>
			<ul>
				<li>🔗 Erhalten Sie einen Einladungslink von einem Gruppenmitglied</li>
				<li>🔐 Verwenden Sie Ihren privaten Nostr-Schlüssel zur Authentifizierung</li>
				<li>💬 Kommunizieren Sie sicher in der verschlüsselten Gruppe</li>
				<li>₿ Erstellen und handeln Sie anonyme Bitcoin-Angebote</li>
			</ul>
		</div>
	</div>
</section>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.login-card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-radius: 16px;
		padding: 2rem;
		max-width: 500px;
		width: 100%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	h1 {
		text-align: center;
		color: #333;
		margin-bottom: 0.5rem;
		font-size: 2rem;
	}

	p {
		text-align: center;
		color: #666;
		margin-bottom: 2rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
	}

	input {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e1e5e9;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.3s;
	}

	input:focus {
		outline: none;
		border-color: #667eea;
	}

	.key-input-group {
		display: flex;
		gap: 0.5rem;
	}

	.key-input-group input {
		flex: 1;
	}

	small {
		display: block;
		margin-top: 0.25rem;
		color: #6c757d;
		font-size: 0.875rem;
	}

	.join-btn {
		width: 100%;
		padding: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.join-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
	}

	.join-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		background: #ffe6e6;
		color: #d63384;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #f8cfd4;
	}

	.info {
		margin-top: 2rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border-left: 4px solid #667eea;
	}

	.info h3 {
		margin: 0 0 1rem 0;
		color: #333;
		font-size: 1rem;
	}

	.info ul {
		margin: 0;
		padding-left: 1rem;
	}

	.info li {
		margin-bottom: 0.5rem;
		color: #555;
	}
</style>
