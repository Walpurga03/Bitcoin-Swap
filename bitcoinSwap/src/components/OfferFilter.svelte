<!-- Filter-Komponente für Bitcoin-Angebote -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Phase2OfferFilter } from '$lib/nostr/types';
  import type { PaymentMethodType } from '$lib/types/offers';
  import { formatSatoshis } from '$lib/utils/offers';

  export let currentFilter: Phase2OfferFilter = {};

  const dispatch = createEventDispatcher<{
    applied: Phase2OfferFilter;
    reset: void;
    cancel: void;
  }>();

  // Filter State (lokale Kopie für Bearbeitung)
  let filterData: Phase2OfferFilter = { ...currentFilter };

  // Payment Methods Options
  const paymentMethodOptions: Array<{ value: PaymentMethodType; label: string; icon: string }> = [
    { value: 'cash', label: 'Bargeld', icon: '💰' },
    { value: 'bank', label: 'Banküberweisung', icon: '🏦' },
    { value: 'rechnung', label: 'Rechnung', icon: '📄' }
  ];

  // Status Options
  const statusOptions = [
    { value: 'active', label: 'Aktiv', icon: '🟢' },
    { value: 'expired', label: 'Abgelaufen', icon: '⏰' },
    { value: 'completed', label: 'Abgeschlossen', icon: '✅' },
    { value: 'cancelled', label: 'Storniert', icon: '❌' }
  ];

  // Predefined Amount Ranges (in Satoshis)
  const amountRanges = [
    { label: '1k - 10k Sats', min: 1000, max: 10000 },
    { label: '10k - 100k Sats', min: 10000, max: 100000 },
    { label: '100k - 1M Sats', min: 100000, max: 1000000 },
    { label: '1M - 10M Sats', min: 1000000, max: 10000000 },
    { label: '10M+ Sats', min: 10000000, max: undefined }
  ];

  // Predefined Price Ranges (in EUR)
  const priceRanges = [
    { label: '< 30.000 EUR', min: undefined, max: 30000 },
    { label: '30k - 40k EUR', min: 30000, max: 40000 },
    { label: '40k - 50k EUR', min: 40000, max: 50000 },
    { label: '50k - 60k EUR', min: 50000, max: 60000 },
    { label: '> 60.000 EUR', min: 60000, max: undefined }
  ];

  // Event Handlers
  function handlePaymentMethodToggle(method: PaymentMethodType) {
    if (!filterData.paymentMethods) {
      filterData.paymentMethods = [];
    }
    
    if (filterData.paymentMethods.includes(method)) {
      filterData.paymentMethods = filterData.paymentMethods.filter(m => m !== method);
    } else {
      filterData.paymentMethods = [...filterData.paymentMethods, method];
    }
  }

  function handleStatusToggle(status: string) {
    if (!filterData.status) {
      filterData.status = [];
    }
    
    if (filterData.status.includes(status as any)) {
      filterData.status = filterData.status.filter(s => s !== status);
    } else {
      filterData.status = [...filterData.status, status as any];
    }
  }

  function handleAmountRangeSelect(range: typeof amountRanges[0]) {
    filterData.minAmount = range.min;
    filterData.maxAmount = range.max;
  }

  function handlePriceRangeSelect(range: typeof priceRanges[0]) {
    filterData.minPrice = range.min;
    filterData.maxPrice = range.max;
  }

  function handleApply() {
    // Leere Arrays und undefined-Werte bereinigen
    const cleanFilter: Phase2OfferFilter = {};
    
    if (filterData.type) cleanFilter.type = filterData.type;
    if (filterData.minAmount) cleanFilter.minAmount = filterData.minAmount;
    if (filterData.maxAmount) cleanFilter.maxAmount = filterData.maxAmount;
    if (filterData.minPrice) cleanFilter.minPrice = filterData.minPrice;
    if (filterData.maxPrice) cleanFilter.maxPrice = filterData.maxPrice;
    if (filterData.paymentMethods && filterData.paymentMethods.length > 0) {
      cleanFilter.paymentMethods = filterData.paymentMethods;
    }
    if (filterData.location && filterData.location.trim()) {
      cleanFilter.location = filterData.location.trim();
    }
    if (filterData.status && filterData.status.length > 0) {
      cleanFilter.status = filterData.status;
    }

    dispatch('applied', cleanFilter);
  }

  function handleReset() {
    filterData = {};
    dispatch('reset');
  }

  function handleCancel() {
    filterData = { ...currentFilter };
    dispatch('cancel');
  }

  // Reactive Statements
  $: hasActiveFilters = Object.keys(filterData).some(key => {
    const value = filterData[key as keyof Phase2OfferFilter];
    return value !== undefined && value !== '' && 
           (!Array.isArray(value) || value.length > 0);
  });
</script>

<div class="offer-filter">
  <div class="filter-section">
    <!-- Angebots-Typ -->
    <div class="filter-group">
      <h4 class="filter-title">Angebots-Typ</h4>
      <div class="radio-group">
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={filterData.type} 
            value={undefined}
          />
          <span class="radio-label">🔄 Alle</span>
        </label>
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={filterData.type} 
            value="buy"
          />
          <span class="radio-label">🟢 Kaufen</span>
        </label>
        <label class="radio-option">
          <input 
            type="radio" 
            bind:group={filterData.type} 
            value="sell"
          />
          <span class="radio-label">🔴 Verkaufen</span>
        </label>
      </div>
    </div>

    <!-- Betrag -->
    <div class="filter-group">
      <h4 class="filter-title">Betrag (Satoshis)</h4>
      <div class="range-presets">
        {#each amountRanges as range}
          <button
            type="button"
            class="preset-btn"
            class:active={filterData.minAmount === range.min && filterData.maxAmount === range.max}
            on:click={() => handleAmountRangeSelect(range)}
          >
            {range.label}
          </button>
        {/each}
      </div>
      <div class="custom-range">
        <input
          type="number"
          bind:value={filterData.minAmount}
          placeholder="Min. Satoshis"
          min="1000"
          class="range-input"
        />
        <span class="range-separator">bis</span>
        <input
          type="number"
          bind:value={filterData.maxAmount}
          placeholder="Max. Satoshis"
          min="1000"
          class="range-input"
        />
      </div>
    </div>

    <!-- Preis -->
    <div class="filter-group">
      <h4 class="filter-title">Preis pro BTC (EUR)</h4>
      <div class="range-presets">
        {#each priceRanges as range}
          <button
            type="button"
            class="preset-btn"
            class:active={filterData.minPrice === range.min && filterData.maxPrice === range.max}
            on:click={() => handlePriceRangeSelect(range)}
          >
            {range.label}
          </button>
        {/each}
      </div>
      <div class="custom-range">
        <input
          type="number"
          bind:value={filterData.minPrice}
          placeholder="Min. EUR"
          min="1"
          step="100"
          class="range-input"
        />
        <span class="range-separator">bis</span>
        <input
          type="number"
          bind:value={filterData.maxPrice}
          placeholder="Max. EUR"
          min="1"
          step="100"
          class="range-input"
        />
      </div>
    </div>

    <!-- Zahlungsmethoden -->
    <div class="filter-group">
      <h4 class="filter-title">Zahlungsmethoden</h4>
      <div class="checkbox-group">
        {#each paymentMethodOptions as option}
          <label class="checkbox-option">
            <input
              type="checkbox"
              checked={filterData.paymentMethods?.includes(option.value) || false}
              on:change={() => handlePaymentMethodToggle(option.value)}
            />
            <span class="checkbox-label">
              {option.icon} {option.label}
            </span>
          </label>
        {/each}
      </div>
    </div>

    <!-- Ort -->
    <div class="filter-group">
      <h4 class="filter-title">Ort</h4>
      <input
        type="text"
        bind:value={filterData.location}
        placeholder="Stadt oder Region eingeben..."
        class="location-input"
      />
    </div>

    <!-- Status -->
    <div class="filter-group">
      <h4 class="filter-title">Status</h4>
      <div class="checkbox-group">
        {#each statusOptions as option}
          <label class="checkbox-option">
            <input
              type="checkbox"
              checked={filterData.status?.includes(option.value as any) || false}
              on:change={() => handleStatusToggle(option.value)}
            />
            <span class="checkbox-label">
              {option.icon} {option.label}
            </span>
          </label>
        {/each}
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class="filter-actions">
    <button
      type="button"
      class="btn btn-secondary"
      on:click={handleCancel}
    >
      Abbrechen
    </button>
    
    {#if hasActiveFilters}
      <button
        type="button"
        class="btn btn-tertiary"
        on:click={handleReset}
      >
        Zurücksetzen
      </button>
    {/if}
    
    <button
      type="button"
      class="btn btn-primary"
      on:click={handleApply}
    >
      Filter anwenden
    </button>
  </div>
</div>

<style>
  .offer-filter {
    background: var(--bg-secondary);
    border-radius: 8px;
    padding: 1.5rem;
    border: 1px solid var(--border-color);
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .filter-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .radio-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: var(--bg-primary);
  }

  .radio-option:hover {
    border-color: var(--accent-color);
    background: var(--bg-tertiary);
  }

  .radio-option:has(input:checked) {
    border-color: var(--accent-color);
    background: var(--accent-color);
    color: white;
  }

  .radio-option input[type="radio"] {
    margin: 0;
  }

  .radio-label {
    font-size: 0.9rem;
    font-weight: 500;
  }

  .range-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .preset-btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s ease;
  }

  .preset-btn:hover {
    border-color: var(--accent-color);
    background: var(--bg-tertiary);
  }

  .preset-btn.active {
    border-color: var(--accent-color);
    background: var(--accent-color);
    color: white;
  }

  .custom-range {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .range-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .range-input:focus {
    outline: none;
    border-color: var(--accent-color);
  }

  .range-separator {
    color: var(--text-secondary);
    font-size: 0.9rem;
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
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .checkbox-option:hover {
    background: var(--bg-tertiary);
  }

  .checkbox-option input[type="checkbox"] {
    margin: 0;
  }

  .checkbox-label {
    font-size: 0.9rem;
    color: var(--text-primary);
  }

  .location-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.9rem;
  }

  .location-input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .filter-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .btn-primary {
    background: var(--accent-color);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: var(--bg-tertiary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }

  .btn-tertiary {
    background: var(--warning-bg);
    color: var(--warning-color);
    border: 1px solid var(--warning-border);
  }

  .btn-tertiary:hover {
    background: var(--warning-hover);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .offer-filter {
      padding: 1rem;
    }

    .filter-actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }

    .custom-range {
      flex-direction: column;
      align-items: stretch;
    }

    .range-separator {
      text-align: center;
      margin: 0.25rem 0;
    }

    .radio-group {
      flex-direction: column;
    }

    .range-presets {
      flex-direction: column;
    }
  }
</style>