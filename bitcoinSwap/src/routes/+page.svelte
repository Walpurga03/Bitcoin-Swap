<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { NostrClient } from '$lib/nostr/client';
	import { getPublicKey } from 'nostr-tools';
	import { setUser } from '$lib/stores/userStore';
	import { setGroupConfig } from '$lib/stores/groupStore';
	import type { UserProfile, GroupConfig } from '$lib/nostr/types';
	
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

	async function parseInviteLink(link: string): Promise<GroupConfig | null> {
		try {
			const url = new URL(link);
			const relay = url.searchParams.get('relay');
			const secret = url.searchParams.get('secret');
			
			if (!relay || !secret) {
				throw new Error('Ungültiger Einladungslink');
			}

			return {
				channelId: generateRandomChannelId(), // Generiere eine gültige Event-ID
				relay,
				secret
			};
		} catch (err) {
			return null;
		}
	}

	async function joinGroup() {
		if (!inviteLink.trim() || !privateKey.trim()) {
			error = 'Bitte füllen Sie alle Felder aus';
			return;
		}

		loading = true;
		error = '';

		try {
			// Gruppenkonfiguration aus Link parsen
			const groupConfig = await parseInviteLink(inviteLink);
			if (!groupConfig) {
				throw new Error('Ungültiger Einladungslink');
			}

			// Schlüssel validieren (flexiblere Hex-Prüfung)
			const cleanKey = privateKey.trim().toLowerCase();
			if (!/^[a-f0-9]{64}$/i.test(cleanKey) || cleanKey.length !== 64) {
				throw new Error('Ungültiger privater Schlüssel (muss 64 Hex-Zeichen haben)');
			}

			// NostrClient erstellen und testen
			const client = new NostrClient();
			
			// Public Key aus private Key ableiten
			const privkeyBytes = new Uint8Array(cleanKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
			const publicKey = getPublicKey(privkeyBytes);
			
			// User Profile erstellen
			const userProfile: UserProfile = {
				pubkey: publicKey,
				privkey: cleanKey,
				name: `User_${publicKey.substring(0, 8)}`
			};

			// Stores aktualisieren
			setUser(userProfile);
			setGroupConfig(groupConfig);

			// Zur Gruppenansicht navigieren
			await goto('/group');

		} catch (err) {
			error = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
		} finally {
			loading = false;
		}
	}

	function generateNewKey() {
		const keyPair = NostrClient.generateKeyPair();
		privateKey = keyPair.privkey;
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
					<button type="button" on:click={generateNewKey} class="generate-btn">
						🎲 Neu
					</button>
				</div>
				<small>Bewahren Sie Ihren privaten Schlüssel sicher auf!</small>
			</div>

			<button type="submit" disabled={loading} class="join-btn">
				{#if loading}
					⏳ Verbinde...
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

	.generate-btn {
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border: 2px solid #e1e5e9;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s;
	}

	.generate-btn:hover {
		background: #e9ecef;
		border-color: #adb5bd;
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
