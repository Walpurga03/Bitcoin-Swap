<script lang="ts">
  import { onMount } from 'svelte';
  import { notificationManager, type NotificationSettings } from '$lib/notifications/notificationManager';
  
  let settings: NotificationSettings;
  let isLoading = true;
  let testingNotification = false;
  let permissionStatus: NotificationPermission = 'default';
  
  // Reactive statements
  $: canUseNotifications = typeof window !== 'undefined' && 'Notification' in window;
  $: needsPermission = permissionStatus !== 'granted' && settings?.browserNotifications;
  
  onMount(async () => {
    settings = notificationManager.getSettings();
    permissionStatus = Notification.permission;
    isLoading = false;
  });
  
  async function updateSettings(key: keyof NotificationSettings, value: any) {
    if (!settings) return;
    
    settings = { ...settings, [key]: value };
    notificationManager.updateSettings({ [key]: value });
    
    // Berechtigung anfordern wenn Browser-Benachrichtigungen aktiviert werden
    if (key === 'browserNotifications' && value) {
      permissionStatus = await notificationManager.requestPermission();
    }
  }
  
  async function requestPermission() {
    permissionStatus = await notificationManager.requestPermission();
  }
  
  async function testNotification() {
    testingNotification = true;
    try {
      await notificationManager.testNotification();
    } finally {
      testingNotification = false;
    }
  }
  
  function formatTime(time: string): string {
    return time || '00:00';
  }
</script>

<div class="notification-settings">
  <div class="settings-header">
    <h3>🔔 Benachrichtigungs-Einstellungen</h3>
    <p class="settings-description">
      Verwalten Sie Ihre Benachrichtigungen für Bitcoin-Angebote und Aktivitäten.
    </p>
  </div>

  {#if isLoading}
    <div class="loading">
      <div class="spinner"></div>
      <span>Lade Einstellungen...</span>
    </div>
  {:else if settings}
    <!-- Haupt-Schalter -->
    <div class="setting-group">
      <div class="setting-item main-toggle">
        <label class="toggle-label">
          <input
            type="checkbox"
            bind:checked={settings.enabled}
            on:change={() => updateSettings('enabled', settings.enabled)}
          />
          <span class="toggle-slider"></span>
          <span class="toggle-text">
            <strong>Benachrichtigungen aktivieren</strong>
            <small>Alle Benachrichtigungen ein-/ausschalten</small>
          </span>
        </label>
      </div>
    </div>

    {#if settings.enabled}
      <!-- Browser-Benachrichtigungen -->
      <div class="setting-group">
        <h4>🌐 Browser-Benachrichtigungen</h4>
        
        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.browserNotifications}
              on:change={() => updateSettings('browserNotifications', settings.browserNotifications)}
              disabled={!canUseNotifications}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">
              Browser-Benachrichtigungen anzeigen
              {#if !canUseNotifications}
                <small class="error">Nicht unterstützt in diesem Browser</small>
              {/if}
            </span>
          </label>
        </div>

        {#if needsPermission}
          <div class="permission-warning">
            <div class="warning-content">
              <span class="warning-icon">⚠️</span>
              <div>
                <strong>Berechtigung erforderlich</strong>
                <p>Erlauben Sie Browser-Benachrichtigungen um Alerts zu erhalten.</p>
              </div>
              <button class="permission-btn" on:click={requestPermission}>
                Berechtigung erteilen
              </button>
            </div>
          </div>
        {/if}

        {#if permissionStatus === 'denied'}
          <div class="permission-denied">
            <span class="error-icon">❌</span>
            <div>
              <strong>Benachrichtigungen blockiert</strong>
              <p>Aktivieren Sie Benachrichtigungen in Ihren Browser-Einstellungen.</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Audio & Haptik -->
      <div class="setting-group">
        <h4>🔊 Audio & Haptik</h4>
        
        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.soundEnabled}
              on:change={() => updateSettings('soundEnabled', settings.soundEnabled)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">Benachrichtigungs-Töne</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.vibrationEnabled}
              on:change={() => updateSettings('vibrationEnabled', settings.vibrationEnabled)}
              disabled={!('vibrate' in navigator)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">
              Vibration
              {#if !('vibrate' in navigator)}
                <small class="error">Nicht unterstützt</small>
              {/if}
            </span>
          </label>
        </div>
      </div>

      <!-- Benachrichtigungs-Typen -->
      <div class="setting-group">
        <h4>📢 Benachrichtigungs-Typen</h4>
        
        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.showOnNewOffer}
              on:change={() => updateSettings('showOnNewOffer', settings.showOnNewOffer)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">Neue Angebote</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.showOnNewInterest}
              on:change={() => updateSettings('showOnNewInterest', settings.showOnNewInterest)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">Neue Interessenten</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.showOnOfferExpiry}
              on:change={() => updateSettings('showOnOfferExpiry', settings.showOnOfferExpiry)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">Ablaufende Angebote</span>
          </label>
        </div>

        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.showOnPriceAlert}
              on:change={() => updateSettings('showOnPriceAlert', settings.showOnPriceAlert)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">Preis-Alerts</span>
          </label>
        </div>

        {#if settings.showOnPriceAlert}
          <div class="setting-item sub-setting">
            <label class="range-label">
              <span>Preis-Änderungs-Schwelle: {settings.priceAlertThreshold}%</span>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                bind:value={settings.priceAlertThreshold}
                on:input={() => updateSettings('priceAlertThreshold', settings.priceAlertThreshold)}
                class="price-range"
              />
              <div class="range-labels">
                <span>1%</span>
                <span>20%</span>
              </div>
            </label>
          </div>
        {/if}
      </div>

      <!-- Ruhezeiten -->
      <div class="setting-group">
        <h4>🌙 Ruhezeiten</h4>
        
        <div class="setting-item">
          <label class="toggle-label">
            <input
              type="checkbox"
              bind:checked={settings.quietHoursEnabled}
              on:change={() => updateSettings('quietHoursEnabled', settings.quietHoursEnabled)}
            />
            <span class="toggle-slider"></span>
            <span class="toggle-text">Ruhezeiten aktivieren</span>
          </label>
        </div>

        {#if settings.quietHoursEnabled}
          <div class="time-settings">
            <div class="time-input">
              <label>
                <span>Von:</span>
                <input
                  type="time"
                  bind:value={settings.quietHoursStart}
                  on:change={() => updateSettings('quietHoursStart', settings.quietHoursStart)}
                />
              </label>
            </div>
            <div class="time-input">
              <label>
                <span>Bis:</span>
                <input
                  type="time"
                  bind:value={settings.quietHoursEnd}
                  on:change={() => updateSettings('quietHoursEnd', settings.quietHoursEnd)}
                />
              </label>
            </div>
          </div>
          <p class="quiet-hours-info">
            Während der Ruhezeiten werden keine Benachrichtigungen angezeigt.
          </p>
        {/if}
      </div>

      <!-- Test-Bereich -->
      <div class="setting-group">
        <h4>🧪 Test</h4>
        <button
          class="test-btn"
          on:click={testNotification}
          disabled={testingNotification || !settings.enabled}
        >
          {#if testingNotification}
            <span class="spinner small"></span>
            Sende Test...
          {:else}
            🔔 Test-Benachrichtigung senden
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .notification-settings {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem;
    background: var(--surface-color, #ffffff);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .settings-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .settings-header h3 {
    margin: 0 0 0.5rem 0;
    color: var(--primary-color, #2563eb);
    font-size: 1.5rem;
  }

  .settings-description {
    margin: 0;
    color: var(--text-secondary, #6b7280);
    font-size: 0.9rem;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    color: var(--text-secondary, #6b7280);
  }

  .setting-group {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--background-secondary, #f8fafc);
    border-radius: 8px;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .setting-group h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .setting-item {
    margin-bottom: 1rem;
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .main-toggle {
    margin-bottom: 0;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .toggle-label input[type="checkbox"] {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 48px;
    height: 24px;
    background: var(--toggle-bg, #d1d5db);
    border-radius: 12px;
    transition: all 0.3s ease;
    flex-shrink: 0;
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle-label input:checked + .toggle-slider {
    background: var(--primary-color, #2563eb);
  }

  .toggle-label input:checked + .toggle-slider::before {
    transform: translateX(24px);
  }

  .toggle-label input:disabled + .toggle-slider {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toggle-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .toggle-text small {
    color: var(--text-secondary, #6b7280);
    font-size: 0.8rem;
  }

  .toggle-text small.error {
    color: var(--error-color, #dc2626);
  }

  .permission-warning {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--warning-bg, #fef3c7);
    border: 1px solid var(--warning-border, #f59e0b);
    border-radius: 6px;
  }

  .warning-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .warning-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .warning-content > div {
    flex: 1;
  }

  .warning-content strong {
    color: var(--warning-text, #92400e);
    display: block;
    margin-bottom: 0.25rem;
  }

  .warning-content p {
    margin: 0;
    color: var(--warning-text-secondary, #a16207);
    font-size: 0.9rem;
  }

  .permission-btn {
    padding: 0.5rem 1rem;
    background: var(--warning-color, #f59e0b);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .permission-btn:hover {
    background: var(--warning-dark, #d97706);
  }

  .permission-denied {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--error-bg, #fef2f2);
    border: 1px solid var(--error-border, #fca5a5);
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .error-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .permission-denied strong {
    color: var(--error-color, #dc2626);
    display: block;
    margin-bottom: 0.25rem;
  }

  .permission-denied p {
    margin: 0;
    color: var(--error-text-secondary, #b91c1c);
    font-size: 0.9rem;
  }

  .sub-setting {
    margin-left: 1.5rem;
    padding-left: 1rem;
    border-left: 2px solid var(--border-color, #e5e7eb);
  }

  .range-label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .range-label span {
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  .price-range {
    width: 100%;
    height: 6px;
    background: var(--range-bg, #e5e7eb);
    border-radius: 3px;
    outline: none;
    -webkit-appearance: none;
  }

  .price-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    background: var(--primary-color, #2563eb);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .price-range::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: var(--primary-color, #2563eb);
    border-radius: 50%;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
  }

  .time-settings {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .time-input {
    flex: 1;
  }

  .time-input label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .time-input span {
    font-weight: 500;
    color: var(--text-primary, #1f2937);
    font-size: 0.9rem;
  }

  .time-input input[type="time"] {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
  }

  .time-input input[type="time"]:focus {
    outline: none;
    border-color: var(--primary-color, #2563eb);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .quiet-hours-info {
    margin: 1rem 0 0 0;
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
    font-style: italic;
  }

  .test-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--primary-color, #2563eb);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .test-btn:hover:not(:disabled) {
    background: var(--primary-dark, #1d4ed8);
    transform: translateY(-1px);
  }

  .test-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .spinner.small {
    width: 16px;
    height: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    .notification-settings {
      background: var(--surface-dark, #1f2937);
      color: var(--text-dark, #f9fafb);
    }

    .setting-group {
      background: var(--background-dark-secondary, #374151);
      border-color: var(--border-dark, #4b5563);
    }

    .time-input input[type="time"] {
      background: var(--input-dark-bg, #374151);
      border-color: var(--border-dark, #4b5563);
      color: var(--text-dark, #f9fafb);
    }
  }

  /* Mobile Optimierung */
  @media (max-width: 768px) {
    .notification-settings {
      margin: 0;
      padding: 1rem;
      border-radius: 0;
    }

    .setting-group {
      padding: 1rem;
    }

    .time-settings {
      flex-direction: column;
      gap: 0.75rem;
    }

    .warning-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .permission-btn {
      align-self: stretch;
      text-align: center;
    }
  }
</style>