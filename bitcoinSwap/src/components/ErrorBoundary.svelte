<!-- Error Boundary Komponente für bessere Fehlerbehandlung -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	export let error: Error | null = null;
	export let showDetails: boolean = false;
	export let canRetry: boolean = true;
	export let retryText: string = 'Erneut versuchen';
	export let title: string = 'Ein Fehler ist aufgetreten';
	
	const dispatch = createEventDispatcher<{
		retry: void;
		dismiss: void;
	}>();
	
	let detailsVisible = false;
	
	function handleRetry() {
		error = null;
		dispatch('retry');
	}
	
	function handleDismiss() {
		error = null;
		dispatch('dismiss');
	}
	
	function toggleDetails() {
		detailsVisible = !detailsVisible;
	}
	
	function getErrorType(error: Error): string {
		if (error.name === 'NetworkError' || error.message.includes('fetch')) {
			return 'Netzwerkfehler';
		}
		if (error.message.includes('timeout')) {
			return 'Zeitüberschreitung';
		}
		if (error.message.includes('permission') || error.message.includes('unauthorized')) {
			return 'Berechtigungsfehler';
		}
		if (error.message.includes('validation')) {
			return 'Validierungsfehler';
		}
		return 'Unbekannter Fehler';
	}
	
	function getErrorIcon(error: Error): string {
		const type = getErrorType(error);
		switch (type) {
			case 'Netzwerkfehler': return '🌐';
			case 'Zeitüberschreitung': return '⏰';
			case 'Berechtigungsfehler': return '🔒';
			case 'Validierungsfehler': return '⚠️';
			default: return '❌';
		}
	}
	
	function getUserFriendlyMessage(error: Error): string {
		const type = getErrorType(error);
		switch (type) {
			case 'Netzwerkfehler':
				return 'Verbindung zum Server fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung.';
			case 'Zeitüberschreitung':
				return 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.';
			case 'Berechtigungsfehler':
				return 'Sie haben keine Berechtigung für diese Aktion.';
			case 'Validierungsfehler':
				return 'Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.';
			default:
				return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
		}
	}
</script>

{#if error}
	<div class="error-boundary" role="alert" aria-live="polite">
		<div class="error-content">
			<div class="error-header">
				<span class="error-icon">{getErrorIcon(error)}</span>
				<h3 class="error-title">{title}</h3>
			</div>
			
			<div class="error-body">
				<p class="error-message">{getUserFriendlyMessage(error)}</p>
				
				{#if showDetails}
					<button 
						class="details-toggle"
						on:click={toggleDetails}
						aria-expanded={detailsVisible}
					>
						{detailsVisible ? '▼' : '▶'} Technische Details
					</button>
					
					{#if detailsVisible}
						<div class="error-details">
							<div class="detail-item">
								<strong>Fehlertyp:</strong> {getErrorType(error)}
							</div>
							<div class="detail-item">
								<strong>Nachricht:</strong> {error.message}
							</div>
							{#if error.stack}
								<div class="detail-item">
									<strong>Stack Trace:</strong>
									<pre class="stack-trace">{error.stack}</pre>
								</div>
							{/if}
							<div class="detail-item">
								<strong>Zeitstempel:</strong> {new Date().toLocaleString('de-DE')}
							</div>
						</div>
					{/if}
				{/if}
			</div>
			
			<div class="error-actions">
				{#if canRetry}
					<button class="retry-btn" on:click={handleRetry}>
						🔄 {retryText}
					</button>
				{/if}
				<button class="dismiss-btn" on:click={handleDismiss}>
					✕ Schließen
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.error-boundary {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 1000;
		max-width: 500px;
		width: 90%;
		background: rgba(255, 255, 255, 0.98);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.2);
		animation: slideIn 0.3s ease-out;
	}
	
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translate(-50%, -60%);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%);
		}
	}
	
	.error-content {
		padding: 1.5rem;
	}
	
	.error-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	
	.error-icon {
		font-size: 1.5rem;
	}
	
	.error-title {
		margin: 0;
		color: #dc2626;
		font-size: 1.2rem;
		font-weight: 600;
	}
	
	.error-body {
		margin-bottom: 1.5rem;
	}
	
	.error-message {
		color: #374151;
		line-height: 1.5;
		margin: 0 0 1rem 0;
	}
	
	.details-toggle {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		font-size: 0.9rem;
		padding: 0.25rem 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: color 0.2s;
	}
	
	.details-toggle:hover {
		color: #374151;
	}
	
	.error-details {
		margin-top: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}
	
	.detail-item {
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
	}
	
	.detail-item:last-child {
		margin-bottom: 0;
	}
	
	.detail-item strong {
		color: #374151;
		font-weight: 600;
	}
	
	.stack-trace {
		background: #1f2937;
		color: #f9fafb;
		padding: 0.75rem;
		border-radius: 4px;
		font-size: 0.8rem;
		overflow-x: auto;
		margin-top: 0.5rem;
		white-space: pre-wrap;
		word-break: break-all;
	}
	
	.error-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}
	
	.retry-btn, .dismiss-btn {
		padding: 0.6rem 1.2rem;
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		font-size: 0.9rem;
	}
	
	.retry-btn {
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
	}
	
	.retry-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
	}
	
	.dismiss-btn {
		background: #f3f4f6;
		color: #6b7280;
		border: 1px solid #d1d5db;
	}
	
	.dismiss-btn:hover {
		background: #e5e7eb;
		color: #374151;
	}
	
	@media (max-width: 768px) {
		.error-boundary {
			width: 95%;
			max-width: none;
		}
		
		.error-content {
			padding: 1rem;
		}
		
		.error-actions {
			flex-direction: column;
		}
		
		.retry-btn, .dismiss-btn {
			width: 100%;
		}
	}
</style>