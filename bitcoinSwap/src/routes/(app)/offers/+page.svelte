<!-- Vereinfachte Bitcoin-Angebots-Seite mit schlichter Textarena -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { userStore } from '$lib/stores/userStore';
  import { groupConfig } from '$lib/stores/groupStore';
  import SimpleOfferInterface from '../../../components/SimpleOfferInterface.svelte';
  import FeedbackToast from '../../../components/FeedbackToast.svelte';
  import MobileOptimization from '../../../components/MobileOptimization.svelte';
  import NotificationSettings from '../../../components/NotificationSettings.svelte';
  import { feedback } from '$lib/feedback/feedbackManager';
  import { notificationManager } from '$lib/notifications/notificationManager';
  import type { UserProfile, GroupConfig } from '$lib/nostr/types';

  // State
  let user: UserProfile | null = null;
  let config: GroupConfig | null = null;
  let loading = true;
  let error = '';
  let showNotificationSettings = false;
  let isMobile = false;
  let isInitialized = false;

  // Reactive subscriptions
  const unsubscribeUser = userStore.subscribe(value => user = value);
  const unsubscribeConfig = groupConfig.subscribe(value => config = value);

  onMount(async () => {
    try {
      // Loading-Feedback anzeigen
      feedback.loading('Initialisiere Bitcoin-Angebote...');
      
      // Prüfen ob Benutzer angemeldet und Gruppe konfiguriert ist
      if (!user || !config) {
        error = 'Benutzer nicht angemeldet oder Gruppe nicht konfiguriert';
        feedback.hideLoading();
        feedback.error(
          'Authentifizierung erforderlich',
          'Sie müssen angemeldet sein und eine Gruppe konfiguriert haben.',
          { component: 'offers-page', action: 'authentication_check' },
          [
            {
              label: 'Zur Anmeldung',
              action: () => { window.location.href = '/'; },
              style: 'primary'
            }
          ]
        );
        
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }

      // Vereinfachte Angebots-Initialisierung
      console.log('Vereinfachte Angebots-Interface initialisiert');
      
      // Benachrichtigungs-Berechtigung anfordern
      const permission = await notificationManager.requestPermission();
      
      // Erfolgs-Feedback
      feedback.hideLoading();
      feedback.success(
        'System bereit',
        'Bitcoin-Tausch-Netzwerk erfolgreich geladen!',
        [
          {
            label: 'Benachrichtigungen',
            action: () => { showNotificationSettings = true; },
            style: 'secondary'
          }
        ]
      );

      // Benachrichtigungs-Info falls verweigert
      if (permission === 'denied') {
        feedback.warning(
          'Benachrichtigungen deaktiviert',
          'Aktivieren Sie Benachrichtigungen für wichtige Updates.',
          [
            {
              label: 'Einstellungen',
              action: () => { showNotificationSettings = true; },
              style: 'secondary'
            }
          ]
        );
      }

      isInitialized = true;
      loading = false;

    } catch (err) {
      const errorMessage = (err as Error).message || 'Unbekannter Fehler';
      error = errorMessage;
      
      feedback.hideLoading();
      feedback.error(
        'Initialisierung fehlgeschlagen',
        `Fehler beim Laden: ${errorMessage}`,
        { 
          component: 'offers-page', 
          action: 'initialization',
          metadata: { error: errorMessage }
        },
        [
          {
            label: 'Erneut versuchen',
            action: () => window.location.reload(),
            style: 'primary'
          },
          {
            label: 'Support kontaktieren',
            action: () => {
              const subject = encodeURIComponent('Bitcoin-Tausch-Netzwerk Fehler');
              const body = encodeURIComponent(`Fehler beim Laden der Angebots-Seite:\n\n${errorMessage}`);
              window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
            },
            style: 'secondary'
          }
        ]
      );
      loading = false;
    }
  });

  onDestroy(() => {
    // Subscriptions beenden
    unsubscribeUser();
    unsubscribeConfig();
    
    // Cleanup
    if (isInitialized) {
      console.log('Vereinfachte Angebots-Interface beendet');
    }
  });

  function handleMobileStateChange(event: CustomEvent) {
    isMobile = event.detail.isMobile;
  }

  function handleRetry() {
    loading = true;
    error = '';
    // Trigger re-mount
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  function openNotificationSettings() {
    showNotificationSettings = true;
    feedback.info('Benachrichtigungs-Einstellungen', 'Passen Sie Ihre Benachrichtigungen an.');
  }
</script>

<svelte:head>
  <title>Bitcoin-Angebote - Bitcoin Tausch Netzwerk</title>
  <meta name="description" content="Erstelle und durchsuche Bitcoin-Angebote in deiner Gruppe" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#667eea" />
</svelte:head>

<!-- Mobile Optimization Component -->
<MobileOptimization 
  bind:isMobile
  on:mobileStateChange={handleMobileStateChange}
/>

<!-- Feedback Toast System -->
<FeedbackToast position="top-right" maxMessages={3} />


<div class="offers-page" class:mobile={isMobile}>
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <h2>Lade Bitcoin-Angebote...</h2>
      <p>Initialisiere sicheres Tausch-Netzwerk</p>
      <div class="loading-progress">
        <div class="progress-bar"></div>
      </div>
    </div>
  {:else if error}
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <h2>Fehler beim Laden</h2>
      <p>{error}</p>
      <div class="error-actions">
        <button class="retry-btn primary" on:click={handleRetry}>
          🔄 Erneut versuchen
        </button>
        <button class="retry-btn secondary" on:click={() => window.location.href = '/'}>
          🏠 Zur Startseite
        </button>
      </div>
    </div>
  {:else}
    <!-- Header mit Einstellungen -->
    <header class="page-header" class:mobile={isMobile}>
      <div class="header-content">
        <h1>🏷️ Bitcoin-Angebote</h1>
        <p class="header-subtitle">Einfach • Schlicht • Effektiv</p>
      </div>
      
      <!-- Desktop Settings Button -->
      {#if !isMobile}
        <div class="header-actions">
          <button
            class="settings-btn"
            on:click={openNotificationSettings}
            title="Benachrichtigungs-Einstellungen"
          >
            🔔 Einstellungen
          </button>
        </div>
      {/if}
    </header>

    <!-- Vereinfachtes Angebots-Interface -->
    <main class="main-content">
      <SimpleOfferInterface />
    </main>
    
    <!-- Navigation -->
    <nav class="bottom-nav" class:mobile={isMobile}>
      <a href="/group" class="nav-item">
        <span class="nav-icon">💬</span>
        <span class="nav-label">Chat</span>
      </a>
      <a href="/offers" class="nav-item active">
        <span class="nav-icon">🏷️</span>
        <span class="nav-label">Angebote</span>
      </a>
      {#if isMobile}
        <button class="nav-item" on:click={openNotificationSettings}>
          <span class="nav-icon">🔔</span>
          <span class="nav-label">Einstellungen</span>
        </button>
      {/if}
    </nav>
  {/if}
</div>

<style>
  .offers-page {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: linear-gradient(135deg, 
      var(--bg-primary, #f8fafc) 0%, 
      var(--bg-secondary, #ffffff) 100%);
    color: var(--text-primary, #1e293b);
    transition: all var(--transition-normal, 0.2s ease);
  }

  .offers-page.mobile {
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  /* Loading State */
  .loading-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: var(--spacing-xl, 2rem);
    text-align: center;
    gap: var(--spacing-lg, 1.5rem);
  }

  .loading-spinner {
    width: 64px;
    height: 64px;
    border: 4px solid var(--border-color, #e2e8f0);
    border-top: 4px solid var(--accent-color, #667eea);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-container h2 {
    margin: 0;
    color: var(--text-primary, #1e293b);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .loading-container p {
    margin: 0;
    color: var(--text-secondary, #64748b);
    font-size: 1rem;
  }

  .loading-progress {
    width: 200px;
    height: 4px;
    background: var(--border-color, #e2e8f0);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-color, #667eea), var(--accent-hover, #5a67d8));
    border-radius: 2px;
    animation: progress 2s ease-in-out infinite;
  }

  /* Error State */
  .error-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: var(--spacing-xl, 2rem);
    text-align: center;
    gap: var(--spacing-lg, 1.5rem);
  }

  .error-icon {
    font-size: 4rem;
    opacity: 0.8;
  }

  .error-container h2 {
    margin: 0;
    color: var(--error-color, #ef4444);
    font-size: 1.5rem;
    font-weight: 600;
  }

  .error-container p {
    margin: 0;
    color: var(--text-secondary, #64748b);
    font-size: 1rem;
    max-width: 400px;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    gap: var(--spacing-md, 1rem);
    flex-wrap: wrap;
    justify-content: center;
  }

  .retry-btn {
    padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
    border: none;
    border-radius: var(--radius-md, 6px);
    cursor: pointer;
    font-weight: 500;
    font-size: 0.9rem;
    transition: all var(--transition-normal, 0.2s ease);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs, 0.25rem);
  }

  .retry-btn.primary {
    background: var(--accent-color, #667eea);
    color: white;
  }

  .retry-btn.primary:hover {
    background: var(--accent-hover, #5a67d8);
    transform: translateY(-1px);
  }

  .retry-btn.secondary {
    background: var(--bg-secondary, #ffffff);
    color: var(--text-primary, #1e293b);
    border: 1px solid var(--border-color, #e2e8f0);
  }

  .retry-btn.secondary:hover {
    background: var(--bg-hover, #f1f5f9);
    border-color: var(--accent-color, #667eea);
  }

  /* Header */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg, 1.5rem) var(--spacing-xl, 2rem);
    background: var(--bg-secondary, #ffffff);
    border-bottom: 1px solid var(--border-color, #e2e8f0);
    box-shadow: var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05));
  }

  .page-header.mobile {
    padding: var(--spacing-md, 1rem);
    flex-direction: column;
    gap: var(--spacing-md, 1rem);
    text-align: center;
  }

  .header-content h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--accent-color, #667eea);
    text-shadow: 0 1px 2px rgba(102, 126, 234, 0.1);
  }

  .header-subtitle {
    margin: var(--spacing-xs, 0.25rem) 0 0 0;
    color: var(--text-secondary, #64748b);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-sm, 0.5rem);
  }

  .settings-btn {
    padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
    background: var(--bg-tertiary, #f1f5f9);
    color: var(--text-primary, #1e293b);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: var(--radius-md, 6px);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all var(--transition-normal, 0.2s ease);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs, 0.25rem);
  }

  .settings-btn:hover {
    background: var(--accent-color, #667eea);
    color: white;
    border-color: var(--accent-color, #667eea);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  }

  /* Main Content */
  .main-content {
    flex: 1;
    overflow: hidden;
  }

  /* Navigation */
  .bottom-nav {
    display: flex;
    background: var(--bg-secondary, #ffffff);
    border-top: 1px solid var(--border-color, #e2e8f0);
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(8px);
  }

  .bottom-nav.mobile {
    position: sticky;
    bottom: 0;
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs, 0.25rem);
    padding: var(--spacing-md, 1rem) var(--spacing-sm, 0.5rem);
    text-decoration: none;
    color: var(--text-secondary, #64748b);
    font-weight: 500;
    transition: all var(--transition-normal, 0.2s ease);
    border-bottom: 3px solid transparent;
    background: none;
    border: none;
    cursor: pointer;
    font-size: inherit;
    font-family: inherit;
  }

  .nav-icon {
    font-size: 1.25rem;
  }

  .nav-label {
    font-size: 0.8rem;
  }

  .nav-item:hover {
    background: var(--bg-hover, #f1f5f9);
    color: var(--text-primary, #1e293b);
  }

  .nav-item.active {
    background: var(--accent-light, #eef2ff);
    color: var(--accent-color, #667eea);
    border-bottom-color: var(--accent-color, #667eea);
  }




  /* Animations */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes progress {
    0% {
      transform: translateX(-100%);
    }
    50% {
      transform: translateX(0%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* CSS Custom Properties für konsistentes Theming */
  :global(:root) {
    /* Farben */
    --bg-primary: #f8fafc;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f1f5f9;
    --bg-hover: #e2e8f0;
    --bg-disabled: #f8fafc;
    
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-tertiary: #94a3b8;
    
    --accent-color: #667eea;
    --accent-hover: #5a67d8;
    --accent-light: #eef2ff;
    
    --border-color: #e2e8f0;
    --border-light: #f1f5f9;
    
    --success-color: #10b981;
    --success-bg: #ecfdf5;
    --success-border: #a7f3d0;
    
    --warning-color: #f59e0b;
    --warning-bg: #fffbeb;
    --warning-border: #fde68a;
    
    --error-color: #ef4444;
    --error-bg: #fef2f2;
    --error-border: #fecaca;
    
    /* Schatten */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    
    /* Übergänge */
    --transition-fast: 0.15s ease;
    --transition-normal: 0.2s ease;
    --transition-slow: 0.3s ease;
    
    /* Abstände */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    
    /* Border Radius */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --radius-xl: 12px;
  }

  /* Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --bg-primary: #0f172a;
      --bg-secondary: #1e293b;
      --bg-tertiary: #334155;
      --bg-hover: #475569;
      --bg-disabled: #1e293b;
      
      --text-primary: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-tertiary: #94a3b8;
      
      --border-color: #334155;
      --border-light: #475569;
      
      --accent-color: #818cf8;
      --accent-hover: #a5b4fc;
      --accent-light: #312e81;
    }
  }

  /* Mobile Optimierung */
  @media (max-width: 768px) {


    .nav-item {
      padding: var(--spacing-sm, 0.5rem);
    }

    .nav-label {
      font-size: 0.75rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .loading-spinner,
    .progress-bar {
      animation: none;
    }
    
    * {
      transition: none !important;
    }
  }

  /* High Contrast Mode */
  @media (prefers-contrast: high) {
    :global(:root) {
      --border-color: #000000;
      --text-secondary: #000000;
    }
    
    .page-header,
    .bottom-nav {
      border-width: 2px;
    }
  }

  /* Print Styles */
  @media print {
    .bottom-nav,
    .settings-btn {
      display: none;
    }
    
    .offers-page {
      background: white;
    }
  }
</style>