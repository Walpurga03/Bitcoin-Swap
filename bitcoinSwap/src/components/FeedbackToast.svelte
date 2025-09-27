<script lang="ts">
  import { onMount } from 'svelte';
  import { feedbackMessages, feedback } from '$lib/feedback/feedbackManager';
  import type { FeedbackMessage } from '$lib/feedback/feedbackManager';
  
  // Props
  export let position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' = 'top-right';
  export let maxMessages = 5;
  export let animationDuration = 300;
  
  // State
  let toastContainer: HTMLElement | undefined;
  let visibleMessages: FeedbackMessage[] = [];
  
  // Subscribe to feedback messages
  $: {
    // Limit visible messages and sort by timestamp
    visibleMessages = $feedbackMessages
      .slice(-maxMessages)
      .sort((a: FeedbackMessage, b: FeedbackMessage) => b.timestamp - a.timestamp);
  }
  
  onMount(() => {
    // Auto-scroll to newest message
    if (toastContainer) {
      toastContainer.scrollTop = 0;
    }
  });
  
  function dismissMessage(id: string) {
    feedback.dismiss(id);
  }
  
  function getIcon(type: FeedbackMessage['type']): string {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      loading: '⏳'
    };
    return icons[type] || 'ℹ️';
  }
  
  function getProgressWidth(message: FeedbackMessage): number {
    if (!message.duration || message.duration === 0) return 0;
    
    const elapsed = Date.now() - message.timestamp;
    const progress = Math.max(0, Math.min(100, (elapsed / message.duration) * 100));
    return 100 - progress;
  }
  
  function handleAction(action: () => void | Promise<void>, messageId: string) {
    try {
      const result = action();
      if (result instanceof Promise) {
        result.catch(error => {
          feedback.error('Aktion fehlgeschlagen', error.message);
        });
      }
      dismissMessage(messageId);
    } catch (error) {
      feedback.error('Aktion fehlgeschlagen', (error as Error).message);
    }
  }
</script>

<div 
  class="toast-container {position}"
  bind:this={toastContainer}
  role="region"
  aria-label="Benachrichtigungen"
  aria-live="polite"
>
  {#each visibleMessages as message (message.id)}
    <div 
      class="toast toast-{message.type}"
      class:dismissible={message.dismissible}
      class:persistent={message.persistent}
      style="--animation-duration: {animationDuration}ms"
      role="alert"
      aria-labelledby="toast-title-{message.id}"
      aria-describedby="toast-message-{message.id}"
    >
      <!-- Progress Bar -->
      {#if message.duration && message.duration > 0 && !message.persistent}
        <div 
          class="toast-progress"
          style="width: {getProgressWidth(message)}%"
        ></div>
      {/if}
      
      <!-- Content -->
      <div class="toast-content">
        <div class="toast-icon">
          {getIcon(message.type)}
        </div>
        
        <div class="toast-text">
          <div class="toast-title" id="toast-title-{message.id}">
            {message.title}
          </div>
          <div class="toast-message" id="toast-message-{message.id}">
            {message.message}
          </div>
          
          <!-- Actions -->
          {#if message.actions && message.actions.length > 0}
            <div class="toast-actions">
              {#each message.actions as action}
                <button 
                  class="toast-action toast-action-{action.style || 'secondary'}"
                  on:click={() => handleAction(action.action, message.id)}
                >
                  {action.label}
                </button>
              {/each}
            </div>
          {/if}
        </div>
        
        <!-- Dismiss Button -->
        {#if message.dismissible}
          <button 
            class="toast-dismiss"
            on:click={() => dismissMessage(message.id)}
            aria-label="Nachricht schließen"
            title="Schließen"
          >
            ✕
          </button>
        {/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    max-width: 400px;
    width: 100%;
    max-height: 100vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }

  /* Positioning */
  .top-right {
    top: 0;
    right: 0;
  }

  .top-left {
    top: 0;
    left: 0;
  }

  .bottom-right {
    bottom: 0;
    right: 0;
    flex-direction: column-reverse;
  }

  .bottom-left {
    bottom: 0;
    left: 0;
    flex-direction: column-reverse;
  }

  .top-center {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
  }

  .bottom-center {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    flex-direction: column-reverse;
  }

  .toast {
    position: relative;
    background: var(--surface-color, #ffffff);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid var(--border-color, #e5e7eb);
    overflow: hidden;
    pointer-events: auto;
    animation: slideIn var(--animation-duration) ease-out;
    transition: all 0.3s ease;
    min-height: 60px;
  }

  .toast:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  /* Toast Types */
  .toast-success {
    border-left: 4px solid var(--success-color, #10b981);
  }

  .toast-error {
    border-left: 4px solid var(--error-color, #dc2626);
  }

  .toast-warning {
    border-left: 4px solid var(--warning-color, #f59e0b);
  }

  .toast-info {
    border-left: 4px solid var(--info-color, #3b82f6);
  }

  .toast-loading {
    border-left: 4px solid var(--primary-color, #2563eb);
  }

  /* Progress Bar */
  .toast-progress {
    position: absolute;
    top: 0;
    left: 0;
    height: 3px;
    background: var(--primary-color, #2563eb);
    transition: width 0.1s linear;
    z-index: 1;
  }

  .toast-success .toast-progress {
    background: var(--success-color, #10b981);
  }

  .toast-error .toast-progress {
    background: var(--error-color, #dc2626);
  }

  .toast-warning .toast-progress {
    background: var(--warning-color, #f59e0b);
  }

  .toast-info .toast-progress {
    background: var(--info-color, #3b82f6);
  }

  /* Content */
  .toast-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    position: relative;
  }

  .toast-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .toast-text {
    flex: 1;
    min-width: 0;
  }

  .toast-title {
    font-weight: 600;
    color: var(--text-primary, #1f2937);
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .toast-message {
    color: var(--text-secondary, #6b7280);
    font-size: 0.85rem;
    line-height: 1.4;
    word-wrap: break-word;
  }

  /* Actions */
  .toast-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .toast-action {
    padding: 0.375rem 0.75rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .toast-action-primary {
    background: var(--primary-color, #2563eb);
    color: white;
  }

  .toast-action-primary:hover {
    background: var(--primary-dark, #1d4ed8);
  }

  .toast-action-secondary {
    background: var(--background-secondary, #f8fafc);
    color: var(--text-primary, #1f2937);
    border-color: var(--border-color, #e5e7eb);
  }

  .toast-action-secondary:hover {
    background: var(--background-tertiary, #f1f5f9);
  }

  .toast-action-danger {
    background: var(--error-color, #dc2626);
    color: white;
  }

  .toast-action-danger:hover {
    background: var(--error-dark, #b91c1c);
  }

  /* Dismiss Button */
  .toast-dismiss {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: none;
    border: none;
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    font-size: 0.9rem;
    line-height: 1;
    transition: all 0.2s;
    opacity: 0.7;
  }

  .toast-dismiss:hover {
    background: var(--background-secondary, #f8fafc);
    opacity: 1;
    color: var(--text-primary, #1f2937);
  }

  /* Loading Animation */
  .toast-loading .toast-icon {
    animation: spin 1s linear infinite;
  }

  /* Animations */
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    .toast {
      background: var(--surface-dark, #1f2937);
      border-color: var(--border-dark, #4b5563);
      color: var(--text-dark, #f9fafb);
    }

    .toast-title {
      color: var(--text-dark, #f9fafb);
    }

    .toast-message {
      color: var(--text-dark-secondary, #d1d5db);
    }

    .toast-action-secondary {
      background: var(--background-dark-secondary, #374151);
      color: var(--text-dark, #f9fafb);
      border-color: var(--border-dark, #4b5563);
    }

    .toast-action-secondary:hover {
      background: var(--background-dark-tertiary, #4b5563);
    }

    .toast-dismiss {
      color: var(--text-dark-secondary, #d1d5db);
    }

    .toast-dismiss:hover {
      background: var(--background-dark-secondary, #374151);
      color: var(--text-dark, #f9fafb);
    }
  }

  /* Mobile Optimierung */
  @media (max-width: 768px) {
    .toast-container {
      max-width: calc(100vw - 2rem);
      padding: 0.75rem;
    }

    .toast {
      border-radius: 6px;
    }

    .toast-content {
      padding: 0.75rem;
      gap: 0.5rem;
    }

    .toast-icon {
      font-size: 1.1rem;
    }

    .toast-title {
      font-size: 0.85rem;
    }

    .toast-message {
      font-size: 0.8rem;
    }

    .toast-actions {
      margin-top: 0.5rem;
      gap: 0.375rem;
    }

    .toast-action {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    .toast-dismiss {
      top: 0.375rem;
      right: 0.375rem;
      padding: 0.125rem;
      font-size: 0.8rem;
    }

    /* Position adjustments for mobile */
    .top-right,
    .top-left,
    .top-center {
      top: env(safe-area-inset-top, 0);
    }

    .bottom-right,
    .bottom-left,
    .bottom-center {
      bottom: env(safe-area-inset-bottom, 0);
    }
  }

  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .toast {
      animation: none;
    }

    .toast-loading .toast-icon {
      animation: none;
    }

    .toast-progress {
      transition: none;
    }
  }

  /* High Contrast */
  @media (prefers-contrast: high) {
    .toast {
      border-width: 2px;
    }

    .toast-action {
      border-width: 2px;
    }

    .toast-dismiss:hover {
      outline: 2px solid currentColor;
    }
  }

  /* Print Styles */
  @media print {
    .toast-container {
      display: none;
    }
  }
</style>