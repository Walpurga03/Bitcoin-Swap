<!-- Formular zum Erstellen neuer Bitcoin-Angebote -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CreateOfferForm as CreateOfferFormType, PaymentMethodType } from '$lib/types/offers';
  import type { BitcoinOffer } from '$lib/nostr/types';
  import { validateOfferForm, generateOfferId, generateAnonymousKeyPair } from '$lib/utils/offers';
  import { offerActions } from '$lib/stores/phase2OfferStore';
  import { userStore } from '$lib/stores/userStore';
  import { groupConfig } from '$lib/stores/groupStore';
  import { OfferService } from '$lib/nostr/offerService';
  import { NostrClient } from '$lib/nostr/client';

  const dispatch = createEventDispatcher<{
    created: { offer: BitcoinOffer };
    cancel: void;
  }>();

  // Form State
  let formData: CreateOfferFormType = {
    type: 'sell',
    amount: '',
    price: '',
    paymentMethods: [],
    location: '',
    description: '',
    expiresInHours: 24
  };

  let errors: string[] = [];
  let isSubmitting = false;

  // Payment Methods Options
  const paymentMethodOptions: Array<{ value: PaymentMethodType; label: string; icon: string }> = [
    { value: 'cash', label: 'Bargeld', icon: '💰' },
    { value: 'bank', label: 'Banküberweisung', icon: '🏦' },
    { value: 'rechnung', label: 'Rechnung', icon: '📄' }
  ];

  // Reactive Statements
  $: user = $userStore;
  $: config = $groupConfig;
  $: canSubmit = formData.amount && formData.price && formData.paymentMethods.length > 0 && !isSubmitting;

  // Event Handlers
  function handlePaymentMethodToggle(method: PaymentMethodType) {
    if (formData.paymentMethods.includes(method)) {
      formData.paymentMethods = formData.paymentMethods.filter(m => m !== method);
    } else {
      formData.paymentMethods = [...formData.paymentMethods, method];
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }

  async function handleSubmit() {
    if (!user?.pubkey || !config) {
      errors = ['Benutzer nicht angemeldet oder Gruppe nicht konfiguriert'];
      return;
    }

    // Validierung
    errors = validateOfferForm(formData);
    if (errors.length > 0) {
      return;
    }

    isSubmitting = true;

    try {
      // Unix timestamps
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + (formData.expiresInHours * 60 * 60);

      // Bitcoin-Angebot erstellen
      const offer: BitcoinOffer = {
        id: generateOfferId(),
        type: formData.type,
        amount: parseInt(formData.amount),
        price: parseFloat(formData.price),
        paymentMethods: formData.paymentMethods.map(method => ({
          type: method,
          label: paymentMethodOptions.find(opt => opt.value === method)?.label || method,
          details: undefined // Wird später bei Interesse-Austausch verschlüsselt hinzugefügt
        })),
        location: formData.location || undefined,
        description: formData.description || undefined,
        createdAt: now,
        expiresAt,
        status: 'active',
        anonymousKey: '', // Wird vom OfferService gesetzt
        encrypted: true, // Wird verschlüsselt übertragen
        authorPubkey: '' // Wird vom OfferService gesetzt
      };

      // Nostr-Client und OfferService initialisieren
      const client = new NostrClient();
      client.setUserProfile(user);
      await client.configureGroup(config);
      await client.connectToRelays([config.relay]);

      const offerService = new OfferService(
        client.pool,
        [config.relay],
        config.channelId
      );
      offerService.initialize(user);

      // Angebot über Nostr veröffentlichen
      const success = await offerService.publishOffer(offer);
      
      if (success) {
        console.log('Angebot erfolgreich veröffentlicht');
        
        // Event dispatchen
        dispatch('created', { offer });

        // Form zurücksetzen
        formData = {
          type: 'sell',
          amount: '',
          price: '',
          paymentMethods: [],
          location: '',
          description: '',
          expiresInHours: 24
        };
      } else {
        throw new Error('Angebot konnte nicht veröffentlicht werden');
      }

    } catch (error) {
      console.error('Fehler beim Erstellen des Angebots:', error);
      errors = [error instanceof Error ? error.message : 'Fehler beim Erstellen des Angebots. Bitte versuchen Sie es erneut.'];
    } finally {
      isSubmitting = false;
    }
  }

  // Helper Functions
  function formatPreview() {
    if (!formData.amount || !formData.price) return '';
    const amount = parseInt(formData.amount);
    const price = parseFloat(formData.price);
    const total = (amount / 100_000_000) * price;
    return `≈ ${total.toFixed(2)} EUR`;
  }
</script>

<div class="create-offer-form">
  <form on:submit|preventDefault={handleSubmit}>
    <!-- Angebots-Typ -->
    <div class="form-group">
      <div class="radio-group">
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={formData.type} 
            value="buy"
          />
          <span class="radio-label">
            🟢 Bitcoin kaufen
            <small>Ich möchte Bitcoin kaufen</small>
          </span>
        </label>
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={formData.type} 
            value="sell"
          />
          <span class="radio-label">
            🔴 Bitcoin verkaufen
            <small>Ich möchte Bitcoin verkaufen</small>
          </span>
        </label>
      </div>
    </div>

    <!-- Betrag -->
    <div class="form-group">
      <label for="amount" class="form-label">
        Betrag (Satoshis)
        <small>1 BTC = 100.000.000 Satoshis</small>
      </label>
      <input
        id="amount"
        type="number"
        bind:value={formData.amount}
        placeholder="z.B. 1000000 (0.01 BTC)"
        min="1000"
        max="100000000"
        step="1000"
        class="form-input"
        required
      />
    </div>

    <!-- Preis -->
    <div class="form-group">
      <label for="price" class="form-label">
        Preis pro BTC (EUR)
        {#if formatPreview()}
          <small class="preview">Gesamt: {formatPreview()}</small>
        {/if}
      </label>
      <input
        id="price"
        type="number"
        bind:value={formData.price}
        placeholder="z.B. 45000"
        min="1"
        max="1000000"
        step="0.01"
        class="form-input"
        required
      />
    </div>

    <!-- Zahlungsmethoden -->
    <div class="form-group">
      <div class="checkbox-group">
        {#each paymentMethodOptions as option}
          <label class="checkbox-option">
            <input
              type="checkbox"
              checked={formData.paymentMethods.includes(option.value)}
              on:change={() => handlePaymentMethodToggle(option.value)}
            />
            <span class="checkbox-label">
              {option.icon} {option.label}
            </span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Ort (optional) -->
    <div class="form-group">
      <label for="location" class="form-label">
        Ort (optional)
        <small>Für persönliche Übergabe</small>
      </label>
      <input
        id="location"
        type="text"
        bind:value={formData.location}
        placeholder="z.B. Berlin, München, Wien..."
        maxlength="100"
        class="form-input"
      />
    </div>

    <!-- Beschreibung (optional) -->
    <div class="form-group">
      <label for="description" class="form-label">
        Beschreibung (optional)
        <small>Zusätzliche Informationen</small>
      </label>
      <textarea
        id="description"
        bind:value={formData.description}
        placeholder="Weitere Details zu Ihrem Angebot..."
        maxlength="500"
        rows="3"
        class="form-textarea"
      ></textarea>
    </div>

    <!-- Ablaufzeit -->
    <div class="form-group">
      <label for="expires" class="form-label">Ablaufzeit</label>
      <select
        id="expires"
        bind:value={formData.expiresInHours}
        class="form-select"
      >
        <option value={1}>1 Stunde</option>
        <option value={6}>6 Stunden</option>
        <option value={12}>12 Stunden</option>
        <option value={24}>1 Tag</option>
        <option value={48}>2 Tage</option>
        <option value={72}>3 Tage</option>
        <option value={168}>1 Woche</option>
      </select>
    </div>

    <!-- Fehler anzeigen -->
    {#if errors.length > 0}
      <div class="error-list">
        {#each errors as error}
          <div class="error-item">⚠️ {error}</div>
        {/each}
      </div>
    {/if}

    <!-- Buttons -->
    <div class="form-actions">
      <button
        type="button"
        class="btn btn-secondary"
        on:click={handleCancel}
        disabled={isSubmitting}
      >
        Abbrechen
      </button>
      <button
        type="submit"
        class="btn btn-primary"
        disabled={!canSubmit}
      >
        {#if isSubmitting}
          ⏳ Erstelle Angebot...
        {:else}
          ✅ Angebot erstellen
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .create-offer-form {
    max-width: 600px;
    margin: 0 auto;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .form-label small {
    display: block;
    font-weight: 400;
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }

  .preview {
    color: var(--accent-color) !important;
    font-weight: 500 !important;
  }

  .form-input,
  .form-textarea,
  .form-select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 1rem;
    transition: border-color 0.2s ease;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .radio-option {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .radio-option:hover {
    border-color: var(--accent-color);
    background: var(--bg-tertiary);
  }

  .radio-option input[type="radio"] {
    margin: 0;
  }

  .radio-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .radio-label small {
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .checkbox-option:hover {
    border-color: var(--accent-color);
    background: var(--bg-tertiary);
  }

  .checkbox-option input[type="checkbox"] {
    margin: 0;
  }

  .checkbox-label {
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .error-list {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .error-item {
    color: var(--error-color);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .error-item:last-child {
    margin-bottom: 0;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 2rem;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .form-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }

    .radio-group {
      gap: 0.5rem;
    }

    .radio-option {
      padding: 0.75rem;
    }
  }
</style>