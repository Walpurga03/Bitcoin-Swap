<!-- Verbesserte Loading-Komponente mit verschiedenen Varianten -->
<script lang="ts">
	export let size: 'small' | 'medium' | 'large' = 'medium';
	export let variant: 'spinner' | 'dots' | 'pulse' | 'bitcoin' = 'spinner';
	export let text: string = '';
	export let overlay: boolean = false;
	export let color: string = '#667eea';
	
	$: sizeClass = `size-${size}`;
	$: variantClass = `variant-${variant}`;
</script>

<div class="loading-container" class:overlay>
	<div class="loading-content {sizeClass} {variantClass}" style="--color: {color}">
		{#if variant === 'spinner'}
			<div class="spinner"></div>
		{:else if variant === 'dots'}
			<div class="dots">
				<div class="dot"></div>
				<div class="dot"></div>
				<div class="dot"></div>
			</div>
		{:else if variant === 'pulse'}
			<div class="pulse"></div>
		{:else if variant === 'bitcoin'}
			<div class="bitcoin-spinner">₿</div>
		{/if}
		
		{#if text}
			<p class="loading-text">{text}</p>
		{/if}
	</div>
</div>

<style>
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100px;
	}
	
	.loading-container.overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		z-index: 999;
		min-height: 100vh;
	}
	
	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	
	/* Größenvarianten */
	.size-small {
		--spinner-size: 24px;
		--dot-size: 6px;
		--text-size: 0.8rem;
	}
	
	.size-medium {
		--spinner-size: 40px;
		--dot-size: 8px;
		--text-size: 1rem;
	}
	
	.size-large {
		--spinner-size: 60px;
		--dot-size: 12px;
		--text-size: 1.2rem;
	}
	
	/* Spinner Variante */
	.spinner {
		width: var(--spinner-size);
		height: var(--spinner-size);
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top: 3px solid var(--color);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	/* Dots Variante */
	.dots {
		display: flex;
		gap: 4px;
	}
	
	.dot {
		width: var(--dot-size);
		height: var(--dot-size);
		background: var(--color);
		border-radius: 50%;
		animation: bounce 1.4s ease-in-out infinite both;
	}
	
	.dot:nth-child(1) { animation-delay: -0.32s; }
	.dot:nth-child(2) { animation-delay: -0.16s; }
	.dot:nth-child(3) { animation-delay: 0s; }
	
	@keyframes bounce {
		0%, 80%, 100% {
			transform: scale(0);
		}
		40% {
			transform: scale(1);
		}
	}
	
	/* Pulse Variante */
	.pulse {
		width: var(--spinner-size);
		height: var(--spinner-size);
		background: var(--color);
		border-radius: 50%;
		animation: pulse 2s ease-in-out infinite;
	}
	
	@keyframes pulse {
		0% {
			transform: scale(0);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 0;
		}
	}
	
	/* Bitcoin Variante */
	.bitcoin-spinner {
		font-size: var(--spinner-size);
		color: var(--color);
		animation: bitcoinSpin 2s ease-in-out infinite;
	}
	
	@keyframes bitcoinSpin {
		0%, 100% {
			transform: rotate(0deg) scale(1);
		}
		50% {
			transform: rotate(180deg) scale(1.2);
		}
	}
	
	/* Loading Text */
	.loading-text {
		margin: 0;
		color: var(--color);
		font-size: var(--text-size);
		font-weight: 500;
		text-align: center;
		animation: textFade 2s ease-in-out infinite;
	}
	
	@keyframes textFade {
		0%, 100% { opacity: 0.7; }
		50% { opacity: 1; }
	}
	
	/* Overlay-spezifische Styles */
	.overlay .loading-content {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
	}
	
	.overlay .loading-text {
		color: #374151;
	}
	
	.overlay .spinner {
		border-color: rgba(0, 0, 0, 0.1);
		border-top-color: var(--color);
	}
</style>