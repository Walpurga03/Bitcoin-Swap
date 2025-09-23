<!-- Formular zum Erstellen neuer Bitcoin-Angebote -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { PaymentMethod } from '$lib/nostr/types';
	
	const dispatch = createEventDispatcher();
	
	let title = '';
	let description = '';
	let amount = 0;
	let currency = 'EUR';
	let selectedPaymentMethods: PaymentMethod[] = [];
	let isSubmitting = false;
	let error = '';
	
	const currencies = ['EUR', 'USD', 'BTC'];
	const paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
		{ value: 'rechnung', label: 'Rechnung', icon: '🧾' },
		{ value: 'bargeld', label: 'Bargeld', icon: '💵' },
		{ value: 'ueberweisung', label: 'Überweisung', icon: '🏦' }
	];
	
	function togglePaymentMethod(method: PaymentMethod) {
		if (selectedPaymentMethods.includes(method)) {
			selectedPaymentMethods = selectedPaymentMethods.filter(m => m !== method);
		} else {
			selectedPaymentMethods = [...selectedPaymentMethods, method];
		}
	}
	
	async function submitOffer() {
		// Validierung
		if (!title.trim()) {
			error = 'Bitte geben Sie einen Titel ein';
			return;
		}
		
		if (amount <= 0) {
			error = 'Der Betrag muss größer als 0 sein';
			return;
		}
		
		if (selectedPaymentMethods.length === 0) {
			error = 'Bitte wählen Sie mindestens eine Zahlungsoption';
			return;
		}
		
		isSubmitting = true;
		error = '';
		
		try {
			// Event an Parent-Komponente senden
			dispatch('submit', {
				title: title.trim(),
				description: description.trim(),
				amount,
				currency,
				paymentMethods: selectedPaymentMethods
			});
			
			// Formular zurücksetzen
			resetForm();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Fehler beim Erstellen des Angebots';
		} finally {
			isSubmitting = false;
		}
	}
	
	function resetForm() {
		title = '';
		description = '';
		amount = 0;
		currency = 'EUR';
		selectedPaymentMethods = [];
		error = '';
	}
	
	function cancel() {
		resetForm();
		dispatch('cancel');
	}
</script>

<div class="offer-form-container">
	<div class="offer-form">
		<div class="form-header">
			<h2>📝 Neues Angebot erstellen</h2>
			<button class="close-btn" on:click={cancel}>✕</button>
		</div>
		
		{#if error}
			<div class="error">{error}</div>
		{/if}
		
		<form on:submit|preventDefault={submitOffer}>
			<div class="form-group">
				<label for="title">Titel *</label>
				<input 
					id="title"
					type="text" 
					bind:value={title}
					placeholder="z.B. Bitcoin gegen Euro tauschen"
					maxlength="100"
					required
				/>
			</div>
			
			<div class="form-group">
				<label for="description">Beschreibung (optional)</label>
				<textarea 
					id="description"
					bind:value={description}
					placeholder="Weitere Details zu Ihrem Angebot..."
					maxlength="500"
					rows="3"
				></textarea>
			</div>
			
			<div class="amount-group">
				<div class="form-group">
					<label for="amount">Betrag *</label>
					<input 
						id="amount"
						type="number" 
						bind:value={amount}
						placeholder="0.00"
						min="0"
						step="0.01"
						required
					/>
				</div>
				
				<div class="form-group">
					<label for="currency">Währung</label>
					<select id="currency" bind:value={currency}>
						{#each currencies as curr}
							<option value={curr}>{curr}</option>
						{/each}
					</select>
				</div>
			</div>
			
			<div class="form-group">
				<span class="payment-methods-label">Zahlungsoptionen * (mindestens eine auswählen)</span>
				<div class="payment-options">
					{#each paymentMethods as method}
						<button
							type="button"
							class="payment-option"
							class:selected={selectedPaymentMethods.includes(method.value)}
							on:click={() => togglePaymentMethod(method.value)}
						>
							<span class="payment-icon">{method.icon}</span>
							<span class="payment-label">{method.label}</span>
						</button>
					{/each}
				</div>
			</div>
			
			<div class="form-actions">
				<button type="button" class="cancel-btn" on:click={cancel}>
					Abbrechen
				</button>
				<button type="submit" class="submit-btn" disabled={isSubmitting}>
					{#if isSubmitting}
						⏳ Erstelle...
					{:else}
						🚀 Angebot veröffentlichen
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.offer-form-container {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
		padding: 1rem;
	}
	
	.offer-form {
		background: white;
		border-radius: 16px;
		padding: 2rem;
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
	}
	
	.form-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}
	
	.form-header h2 {
		margin: 0;
		color: #333;
		font-size: 1.5rem;
	}
	
	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #999;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		transition: all 0.3s;
	}
	
	.close-btn:hover {
		background: #f5f5f5;
		color: #666;
	}
	
	.error {
		background: #fee;
		color: #c53030;
		padding: 0.75rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #fecaca;
		font-size: 0.9rem;
	}
	
	.form-group {
		margin-bottom: 1.5rem;
	}
	
	.amount-group {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1rem;
	}
	
	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
		font-size: 0.9rem;
	}
	
	.payment-methods-label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
		font-size: 0.9rem;
	}
	
	input, textarea, select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e1e5e9;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.3s;
		font-family: inherit;
	}
	
	input:focus, textarea:focus, select:focus {
		outline: none;
		border-color: #667eea;
	}
	
	textarea {
		resize: vertical;
		min-height: 80px;
	}
	
	.payment-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	
	.payment-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border: 2px solid #e1e5e9;
		border-radius: 12px;
		background: white;
		cursor: pointer;
		transition: all 0.3s;
	}
	
	.payment-option:hover {
		border-color: #667eea;
		transform: translateY(-2px);
	}
	
	.payment-option.selected {
		border-color: #667eea;
		background: #f0f4ff;
		color: #667eea;
	}
	
	.payment-icon {
		font-size: 1.5rem;
	}
	
	.payment-label {
		font-size: 0.9rem;
		font-weight: 500;
	}
	
	.form-actions {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}
	
	.cancel-btn {
		flex: 1;
		padding: 0.875rem;
		background: #f8f9fa;
		color: #666;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
	}
	
	.cancel-btn:hover {
		background: #e9ecef;
		border-color: #adb5bd;
	}
	
	.submit-btn {
		flex: 2;
		padding: 0.875rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s;
	}
	
	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
	}
	
	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}
	
	@media (max-width: 768px) {
		.offer-form {
			padding: 1.5rem;
			margin: 0.5rem;
		}
		
		.amount-group {
			grid-template-columns: 1fr;
		}
		
		.payment-options {
			grid-template-columns: 1fr;
		}
		
		.form-actions {
			flex-direction: column;
		}
	}
</style>