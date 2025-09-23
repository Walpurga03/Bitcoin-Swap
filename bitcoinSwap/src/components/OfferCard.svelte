<!-- Komponente für die Anzeige eines einzelnen Angebots -->
<script lang="ts">
	import { userStore } from '$lib/stores/userStore';
	import type { Offer, UserProfile } from '$lib/nostr/types';
	
	export let offer: Offer;
	export let onShowInterest: (offerId: string) => void;
	export let canShowInterest: boolean = true;
	
	let user: UserProfile | null = null;
	userStore.subscribe(value => user = value);
	
	$: isOwnOffer = user?.pubkey === offer.tempPubkey || (!offer.tempPubkey && user?.pubkey);
	$: hasShownInterest = user?.pubkey ? offer.interests.includes(user.pubkey) : false;
	
	function formatTime(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
	function formatAmount(amount: number, currency: string): string {
		return new Intl.NumberFormat('de-DE', {
			minimumFractionDigits: currency === 'BTC' ? 8 : 2,
			maximumFractionDigits: currency === 'BTC' ? 8 : 2
		}).format(amount);
	}
	
	function getPaymentMethodIcon(method: string): string {
		switch (method) {
			case 'rechnung': return '🧾';
			case 'bargeld': return '💵';
			case 'ueberweisung': return '🏦';
			default: return '💳';
		}
	}
	
	function getPaymentMethodLabel(method: string): string {
		switch (method) {
			case 'rechnung': return 'Rechnung';
			case 'bargeld': return 'Bargeld';
			case 'ueberweisung': return 'Überweisung';
			default: return method;
		}
	}
</script>

<div class="offer-card" class:own={isOwnOffer}>
	<div class="offer-header">
		<h3 class="offer-title">{offer.title}</h3>
		<div class="offer-meta">
			<span class="offer-time">{formatTime(offer.createdAt)}</span>
			{#if isOwnOffer}
				<span class="own-badge">Ihr Angebot</span>
			{/if}
		</div>
	</div>
	
	<div class="offer-content">
		{#if offer.description}
			<p class="offer-description">{offer.description}</p>
		{/if}
		
		<div class="offer-amount">
			<span class="amount">{formatAmount(offer.amount, offer.currency)}</span>
			<span class="currency">{offer.currency}</span>
		</div>
		
		<div class="payment-methods">
			<span class="payment-label">Zahlungsoptionen:</span>
			<div class="payment-list">
				{#each offer.paymentMethods as method}
					<span class="payment-method">
						{getPaymentMethodIcon(method)}
						{getPaymentMethodLabel(method)}
					</span>
				{/each}
			</div>
		</div>
	</div>
	
	<div class="offer-footer">
		<div class="interest-info">
			{#if offer.interests.length > 0}
				<span class="interest-count">
					👥 {offer.interests.length} Interessent{offer.interests.length !== 1 ? 'en' : ''}
				</span>
			{:else}
				<span class="no-interest">Noch kein Interesse</span>
			{/if}
		</div>
		
		{#if !isOwnOffer && canShowInterest}
			<button 
				class="interest-btn"
				class:interested={hasShownInterest}
				disabled={hasShownInterest}
				on:click={() => onShowInterest(offer.id)}
			>
				{#if hasShownInterest}
					✅ Interesse gezeigt
				{:else}
					🙋 Interesse zeigen
				{/if}
			</button>
		{/if}
		
		{#if isOwnOffer && offer.interests.length > 0}
			<div class="interested-users">
				<span class="interested-label">Interessenten:</span>
				{#each offer.interests as pubkey}
					<span class="interested-user">{pubkey.substring(0, 8)}...</span>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.offer-card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1rem;
		border: 1px solid rgba(0, 0, 0, 0.1);
		transition: all 0.3s ease;
	}
	
	.offer-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}
	
	.offer-card.own {
		border-left: 4px solid #667eea;
		background: rgba(102, 126, 234, 0.05);
	}
	
	.offer-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	
	.offer-title {
		margin: 0;
		color: #333;
		font-size: 1.2rem;
		font-weight: 600;
		flex: 1;
	}
	
	.offer-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}
	
	.offer-time {
		font-size: 0.8rem;
		color: #666;
	}
	
	.own-badge {
		background: #667eea;
		color: white;
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-weight: 500;
	}
	
	.offer-description {
		color: #555;
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}
	
	.offer-amount {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	
	.amount {
		font-size: 1.8rem;
		font-weight: 700;
		color: #f97316;
	}
	
	.currency {
		font-size: 1rem;
		font-weight: 600;
		color: #666;
	}
	
	.payment-methods {
		margin-bottom: 1rem;
	}
	
	.payment-label {
		display: block;
		font-size: 0.9rem;
		color: #666;
		margin-bottom: 0.5rem;
		font-weight: 500;
	}
	
	.payment-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	
	.payment-method {
		background: #f8f9fa;
		padding: 0.4rem 0.8rem;
		border-radius: 20px;
		font-size: 0.85rem;
		color: #555;
		border: 1px solid #e9ecef;
	}
	
	.offer-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.interest-count {
		color: #667eea;
		font-weight: 500;
		font-size: 0.9rem;
	}
	
	.no-interest {
		color: #999;
		font-size: 0.9rem;
		font-style: italic;
	}
	
	.interest-btn {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		border: none;
		padding: 0.6rem 1.2rem;
		border-radius: 25px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
		font-size: 0.9rem;
	}
	
	.interest-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}
	
	.interest-btn:disabled {
		background: #6b7280;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}
	
	.interested-users {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	
	.interested-label {
		font-size: 0.85rem;
		color: #666;
		font-weight: 500;
	}
	
	.interested-user {
		background: #667eea;
		color: white;
		padding: 0.2rem 0.6rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
	}
	
	@media (max-width: 768px) {
		.offer-card {
			padding: 1rem;
		}
		
		.offer-header {
			flex-direction: column;
			gap: 0.5rem;
		}
		
		.offer-meta {
			align-items: flex-start;
		}
		
		.offer-footer {
			flex-direction: column;
			align-items: stretch;
		}
		
		.interest-btn {
			width: 100%;
		}
	}
</style>