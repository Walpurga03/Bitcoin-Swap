<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { userStore } from '$lib/stores/userStore';
	import { groupConfig } from '$lib/stores/groupStore';
	import { offers, addOffer, addInterestToOffer } from '$lib/stores/offerStore';
	import { NostrClient } from '$lib/nostr/client';
	import { createOfferEvent, createInterestReaction, parseOfferEvent, isOfferEvent, isInterestReaction } from '$lib/nostr/events';
	import OfferCard from '../../../components/OfferCard.svelte';
	import OfferForm from '../../../components/OfferForm.svelte';
	import type { Offer, UserProfile, GroupConfig } from '$lib/nostr/types';
	import type { Event as NostrEvent } from 'nostr-tools';
	
	let client: NostrClient | null = null;
	let user: UserProfile | null = null;
	let config: GroupConfig | null = null;
	let offersList: Offer[] = [];
	let loading = true;
	let error = '';
	let showOfferForm = false;
	
	// Reactive subscriptions
	userStore.subscribe(value => user = value);
	groupConfig.subscribe(value => config = value);
	offers.subscribe(value => offersList = value);
	
	onMount(async () => {
		if (!user || !config) {
			window.location.href = '/';
			return;
		}
		
		try {
			// NostrClient für Angebote konfigurieren
			client = new NostrClient();
			client.setUserProfile(user);
			await client.configureGroup(config);
			await client.connectToRelays([config.relay]);
			
			// Auf Angebots-Events hören
			subscribeToOffers();
			
			// DEBUG: Teste mit einem lokalen Dummy-Angebot
			setTimeout(() => {
				const testOffer: Offer = {
					id: 'test-' + Date.now(),
					title: '🧪 Test-Angebot (lokal)',
					description: 'Dies ist ein Test-Angebot um zu prüfen ob die UI funktioniert',
					amount: 0.01,
					currency: 'EUR',
					paymentMethods: ['bargeld', 'ueberweisung'],
					createdAt: Math.floor(Date.now() / 1000),
					interests: []
				};
				console.log('Füge Test-Angebot hinzu:', testOffer);
				addOffer(testOffer);
			}, 2000); // Nach 2 Sekunden hinzufügen
			
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Verbindungsfehler';
			loading = false;
		}
	});
	
	onDestroy(() => {
		if (client && config) {
			try {
				client.pool.close([config.relay]);
			} catch (err) {
				console.warn('Fehler beim Schließen der Pool-Verbindungen:', err);
			}
		}
	});
	
	function subscribeToOffers() {
		if (!client || !config) return;
		
		// Filter für Angebots-Events (kind 30078) und Reaktionen (kind 7)
		const filters = [
			{
				kinds: [30078], // Angebots-Events
				'#t': ['bitcoin-offer'],
				since: Math.floor(Date.now() / 1000) - 7 * 86400 // Letzte 7 Tage statt 24h
			},
			{
				kinds: [7], // Reaktions-Events
				since: Math.floor(Date.now() / 1000) - 7 * 86400
			}
		];
		
		console.log('Starte Angebots-Subscription mit Filtern:', filters);
		
		// Subscription mit SimplePool
		const sub = client.pool.subscribeMany(
			[config.relay],
			filters as any,
			{
				onevent: (event: NostrEvent) => {
					console.log('Event empfangen:', event.kind, event.id);
					handleOfferEvent(event);
				},
				oneose: () => {
					console.log('Initiale Angebote geladen - Anzahl gefunden:', offersList.length);
				}
			}
		);
	}
	
	function handleOfferEvent(event: NostrEvent) {
		console.log('Verarbeite Event:', event.kind, event.content?.substring(0, 100));
		
		if (isOfferEvent(event)) {
			// Neues Angebot verarbeiten
			console.log('Angebots-Event gefunden:', event.id);
			const offer = parseOfferEvent(event);
			if (offer) {
				console.log('Angebot geparst:', offer.title, offer.amount, offer.currency);
				addOffer(offer);
			} else {
				console.warn('Konnte Angebot nicht parsen:', event);
			}
		} else if (isInterestReaction(event)) {
			// Interesse-Reaktion verarbeiten
			console.log('Interest-Reaktion gefunden:', event.id);
			const offerEventId = event.tags.find(tag => tag[0] === 'e')?.[1];
			if (offerEventId) {
				addInterestToOffer(offerEventId, event.pubkey);
			}
		} else {
			console.log('Unbekannter Event-Typ:', event.kind);
		}
	}
	
	async function createOffer(offerData: any) {
		if (!client || !user || !config || !user.privkey) return;
		
		try {
			console.log('Erstelle Angebot:', offerData);
			// Angebots-Event erstellen
			const privkeyBytes = new Uint8Array(user.privkey.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
			const offerEvent = createOfferEvent(offerData, user.pubkey, privkeyBytes);
			
			console.log('Angebots-Event erstellt:', offerEvent);
			
			// Event an Relay senden
			await client.pool.publish([config.relay], offerEvent);
			
			console.log('Angebot veröffentlicht:', offerEvent.id);
			showOfferForm = false;
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Fehler beim Veröffentlichen';
		}
	}
	
	async function showInterest(offerId: string) {
		if (!client || !user || !config || !user.privkey) return;
		
		try {
			// Interesse-Reaktion erstellen
			const privkeyBytes = new Uint8Array(user.privkey.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
			const reactionEvent = createInterestReaction(offerId, user.pubkey, privkeyBytes);
			
			// Event an Relay senden
			await client.pool.publish([config.relay], reactionEvent);
			
			console.log('Interesse gezeigt für Angebot:', offerId);
			
		} catch (err) {
			error = err instanceof Error ? err.message : 'Fehler beim Zeigen von Interesse';
		}
	}
</script>

<svelte:head>
	<title>Angebote - Bitcoin Tausch</title>
</svelte:head>

<div class="offers-container">
	<header class="offers-header">
		<h1>🏷️ Bitcoin-Angebote</h1>
		<div class="header-actions">
			<span class="offer-count">{offersList.length} Angebot{offersList.length !== 1 ? 'e' : ''}</span>
			<button class="create-offer-btn" on:click={() => showOfferForm = true}>
				➕ Angebot erstellen
			</button>
		</div>
	</header>
	
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Lade Angebote...</p>
		</div>
	{:else if error}
		<div class="error">
			<p>❌ {error}</p>
			<button on:click={() => window.location.reload()}>Neu laden</button>
		</div>
	{:else}
		<div class="offers-content">
			{#if offersList.length === 0}
				<div class="no-offers">
					<div class="no-offers-icon">📋</div>
					<h3>Noch keine Angebote</h3>
					<p>Seien Sie der erste, der ein Bitcoin-Angebot erstellt!</p>
					<button class="create-first-offer-btn" on:click={() => showOfferForm = true}>
						🚀 Erstes Angebot erstellen
					</button>
				</div>
			{:else}
				<div class="offers-list">
					{#each offersList as offer (offer.id)}
						<OfferCard 
							{offer} 
							onShowInterest={showInterest}
							canShowInterest={user?.pubkey !== user?.pubkey}
						/>
					{/each}
				</div>
			{/if}
		</div>
		
		<nav class="bottom-nav">
			<a href="/group" class="nav-item">
				💬 Chat
			</a>
			<a href="/offers" class="nav-item active">
				🏷️ Angebote
			</a>
		</nav>
	{/if}
	
	{#if showOfferForm}
		<OfferForm 
			on:submit={(e: CustomEvent) => createOffer(e.detail)}
			on:cancel={() => showOfferForm = false}
		/>
	{/if}
</div>

<style>
	.offers-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}
	
	.offers-header {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		padding: 1rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.1);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.offers-header h1 {
		margin: 0;
		font-size: 1.2rem;
		color: #333;
	}
	
	.header-actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.offer-count {
		font-size: 0.9rem;
		color: #666;
		font-weight: 500;
	}
	
	.create-offer-btn {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		border: none;
		padding: 0.6rem 1rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
		font-size: 0.9rem;
	}
	
	.create-offer-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}
	
	.loading, .error {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		color: white;
		text-align: center;
	}
	
	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	.offers-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}
	
	.no-offers {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 3rem 1rem;
		color: white;
		height: 100%;
	}
	
	.no-offers-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.7;
	}
	
	.no-offers h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
	}
	
	.no-offers p {
		margin: 0 0 2rem 0;
		opacity: 0.8;
		font-size: 1.1rem;
	}
	
	.create-first-offer-btn {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 2px solid rgba(255, 255, 255, 0.3);
		padding: 1rem 2rem;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
		font-size: 1rem;
	}
	
	.create-first-offer-btn:hover {
		background: rgba(255, 255, 255, 0.3);
		border-color: rgba(255, 255, 255, 0.5);
		transform: translateY(-2px);
	}
	
	.offers-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 800px;
		margin: 0 auto;
	}
	
	.bottom-nav {
		display: flex;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-top: 1px solid rgba(0, 0, 0, 0.1);
	}
	
	.nav-item {
		flex: 1;
		padding: 1rem;
		text-align: center;
		text-decoration: none;
		color: #666;
		font-weight: 500;
		transition: all 0.3s;
	}
	
	.nav-item.active {
		background: rgba(102, 126, 234, 0.1);
		color: #667eea;
	}
	
	.nav-item:hover {
		background: rgba(0, 0, 0, 0.05);
	}
	
	@media (max-width: 768px) {
		.offers-header {
			flex-direction: column;
			gap: 1rem;
			padding: 1rem;
		}
		
		.header-actions {
			width: 100%;
			justify-content: space-between;
		}
		
		.offers-content {
			padding: 0.5rem;
		}
		
		.no-offers {
			padding: 2rem 1rem;
		}
		
		.no-offers-icon {
			font-size: 3rem;
		}
	}
</style>