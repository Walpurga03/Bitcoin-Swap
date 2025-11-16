<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { dealRoomStore, type DealRoomMessage } from '$lib/stores/dealRoomStore';
  import { userStore } from '$lib/stores/userStore';
  import { truncatePubkey } from '$lib/utils';
  import { logger } from '$lib/utils/logger';
  import { createNIP17Message, decryptNIP17Message } from '$lib/nostr/crypto';
  import { publishEvent, initPool } from '$lib/nostr/client';
  import { DEFAULT_RELAYS } from '$lib/config';
  import type { NostrEvent } from 'nostr-tools';

  /**
   * ============================================
   * Deal-Room Chat Component
   * ============================================
   * 
   * Features:
   * - NIP-17 verschlüsselter 1:1 Chat
   * - Echtzeit-Nachrichten
   * - Auto-Scroll zu neuen Nachrichten
   * - Responsive Design
   */

  export let roomId: string;
  export let partnerPubkey: string;
  export let partnerName: string = '';

  let messageInput = '';
  let sending = false;
  let messagesContainer: HTMLDivElement;
  let subscription: any = null;

  $: room = $dealRoomStore.rooms.get(roomId);
  $: messages = room?.messages || [];
  $: userPubkey = $userStore.pubkey;
  $: userPrivateKey = $userStore.privateKey;

  /**
   * Sende Nachricht
   */
  async function sendMessage() {
    if (!messageInput.trim() || sending || !userPrivateKey || !userPubkey) {
      return;
    }

    const content = messageInput.trim();
    messageInput = '';
    sending = true;

    try {
      logger.info('💬 Sende NIP-17 Nachricht...');

      // Erstelle NIP-17 Gift-Wrapped Message
      const { giftWrapEvent } = await createNIP17Message(
        content,
        partnerPubkey,
        userPrivateKey,
        roomId
      );

      // Publiziere zu Relays
      await publishEvent(giftWrapEvent as NostrEvent, DEFAULT_RELAYS);

      // Füge eigene Nachricht zum Store hinzu
      const message: DealRoomMessage = {
        id: giftWrapEvent.id,
        roomId,
        content,
        senderPubkey: userPubkey,
        timestamp: Math.floor(Date.now() / 1000),
        isOwn: true
      };

      dealRoomStore.addMessage(message);

      logger.success('✅ Nachricht gesendet');

      // Scroll zu neuer Nachricht
      await tick();
      scrollToBottom();
    } catch (error) {
      logger.error('❌ Fehler beim Senden:', error);
      alert('Fehler beim Senden der Nachricht. Bitte versuche es erneut.');
      messageInput = content; // Restore message
    } finally {
      sending = false;
    }
  }

  /**
   * Handle Enter-Taste (mit Shift+Enter für Zeilenumbruch)
   */
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  /**
   * Scroll zu neuesten Nachrichten
   */
  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Abonniere NIP-17 Nachrichten
   */
  async function subscribeToMessages() {
    if (!userPubkey || !userPrivateKey) {
      logger.warn('⚠️ Kein User-Pubkey oder Private Key');
      return;
    }

    logger.info('🔔 Abonniere NIP-17 Nachrichten...');

    const pool = initPool();

    // Subscribiere zu Gift-Wrapped Events (Kind 1059) die an uns gerichtet sind
    const filter: any = {
      kinds: [1059],
      '#p': [userPubkey],
      limit: 50
    };

    subscription = (pool.subscribeMany as any)(
      DEFAULT_RELAYS,
      [filter],
      {
        onevent: async (event: NostrEvent) => {
          try {
            // Entschlüssele NIP-17 Message
            const decrypted = await decryptNIP17Message(event, userPrivateKey);

            // Prüfe ob Nachricht zu diesem Room gehört
            if (decrypted.roomId !== roomId) {
              return; // Nachricht gehört zu anderem Room
            }

            // Prüfe ob Nachricht vom Partner kommt
            if (decrypted.senderPubkey !== partnerPubkey) {
              logger.warn('⚠️ Nachricht von unbekanntem Sender');
              return;
            }

            // Füge Nachricht zum Store hinzu
            const message: DealRoomMessage = {
              id: event.id,
              roomId,
              content: decrypted.content,
              senderPubkey: decrypted.senderPubkey,
              timestamp: decrypted.createdAt,
              isOwn: false
            };

            dealRoomStore.addMessage(message);

            // Auto-Scroll wenn am Ende
            await tick();
            const isAtBottom = 
              messagesContainer.scrollHeight - messagesContainer.scrollTop <= 
              messagesContainer.clientHeight + 100;
            
            if (isAtBottom) {
              scrollToBottom();
            }

            logger.debug('📨 Nachricht empfangen von', truncatePubkey(decrypted.senderPubkey));
          } catch (error) {
            logger.error('❌ Fehler beim Verarbeiten der Nachricht:', error);
          }
        },
        oneose: () => {
          logger.debug('✅ Subscription EOSE erreicht');
        }
      }
    );

    logger.success('✅ Subscription aktiv');
  }

  /**
   * Lifecycle
   */
  onMount(() => {
    dealRoomStore.setActiveRoom(roomId);
    subscribeToMessages();
    
    // Initial scroll
    setTimeout(scrollToBottom, 100);
  });

  onDestroy(() => {
    if (subscription) {
      subscription.close();
    }
    dealRoomStore.setActiveRoom(null);
  });
</script>

<div class="deal-room">
  <!-- Header -->
  <div class="room-header">
    <div class="partner-info">
      <div class="avatar">💬</div>
      <div class="partner-details">
        <div class="partner-name">
          {partnerName || truncatePubkey(partnerPubkey, 16)}
        </div>
        <div class="partner-status">
          <span class="status-dot"></span>
          Deal-Room
        </div>
      </div>
    </div>
    <div class="room-actions">
      <button class="btn-icon" title="Room-Info">ℹ️</button>
    </div>
  </div>

  <!-- Messages -->
  <div class="messages-container" bind:this={messagesContainer}>
    {#if messages.length === 0}
      <div class="empty-messages">
        <p>💬 Noch keine Nachrichten</p>
        <small>Starte die Konversation mit deinem Deal-Partner!</small>
      </div>
    {:else}
      <div class="messages-list">
        {#each messages as message (message.id)}
          <div class="message" class:own={message.isOwn}>
            <div class="message-bubble">
              <div class="message-content">{message.content}</div>
              <div class="message-meta">
                <span class="message-time">
                  {new Date(message.timestamp * 1000).toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                {#if message.isOwn}
                  <span class="message-status">✓</span>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Input -->
  <div class="message-input-container">
    <div class="input-wrapper">
      <textarea
        bind:value={messageInput}
        on:keydown={handleKeyDown}
        placeholder="Nachricht schreiben... (Enter zum Senden, Shift+Enter für neue Zeile)"
        rows="1"
        disabled={sending}
      />
      <button 
        class="btn-send" 
        on:click={sendMessage}
        disabled={!messageInput.trim() || sending}
        title="Nachricht senden"
      >
        {#if sending}
          ⏳
        {:else}
          ➤
        {/if}
      </button>
    </div>
    <div class="input-hint">
      🔒 Ende-zu-Ende verschlüsselt mit NIP-17
    </div>
  </div>
</div>

<style>
  .deal-room {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #8b5cf6;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.2);
  }

  /* ========================================== */
  /* Header */
  /* ========================================== */

  .room-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: rgba(139, 92, 246, 0.1);
    border-bottom: 1px solid rgba(139, 92, 246, 0.3);
  }

  .partner-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .partner-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .partner-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
  }

  .partner-status {
    font-size: 0.85rem;
    color: #a78bfa;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .room-actions {
    display: flex;
    gap: 8px;
  }

  .btn-icon {
    background: transparent;
    border: 1px solid rgba(139, 92, 246, 0.5);
    color: #a78bfa;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.2rem;
    transition: all 0.2s;
  }

  .btn-icon:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: #8b5cf6;
  }

  /* ========================================== */
  /* Messages */
  /* ========================================== */

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    scroll-behavior: smooth;
  }

  .messages-container::-webkit-scrollbar {
    width: 8px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: rgba(139, 92, 246, 0.1);
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 4px;
  }

  .empty-messages {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #a78bfa;
  }

  .empty-messages p {
    font-size: 1.2rem;
    margin: 0 0 8px 0;
  }

  .empty-messages small {
    color: rgba(167, 139, 250, 0.7);
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .message {
    display: flex;
    max-width: 70%;
  }

  .message.own {
    margin-left: auto;
  }

  .message-bubble {
    background: rgba(139, 92, 246, 0.2);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    padding: 10px 14px;
    word-wrap: break-word;
  }

  .message.own .message-bubble {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    border-color: #8b5cf6;
  }

  .message-content {
    color: #fff;
    font-size: 0.95rem;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  .message-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .message.own .message-meta {
    justify-content: flex-end;
  }

  .message-status {
    color: #10b981;
  }

  /* ========================================== */
  /* Input */
  /* ========================================== */

  .message-input-container {
    padding: 16px 20px;
    background: rgba(139, 92, 246, 0.05);
    border-top: 1px solid rgba(139, 92, 246, 0.3);
  }

  .input-wrapper {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    background: rgba(30, 30, 46, 0.8);
    border: 1px solid rgba(139, 92, 246, 0.3);
    border-radius: 12px;
    padding: 12px 16px;
    color: #fff;
    font-size: 0.95rem;
    font-family: inherit;
    resize: none;
    max-height: 120px;
    transition: border-color 0.2s;
  }

  textarea:focus {
    outline: none;
    border-color: #8b5cf6;
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  textarea::placeholder {
    color: rgba(167, 139, 250, 0.5);
  }

  .btn-send {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    border: none;
    color: #fff;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .btn-send:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }

  .btn-send:active:not(:disabled) {
    transform: scale(0.95);
  }

  .btn-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .input-hint {
    margin-top: 8px;
    font-size: 0.75rem;
    color: rgba(167, 139, 250, 0.6);
    text-align: center;
  }

  /* ========================================== */
  /* Responsive */
  /* ========================================== */

  @media (max-width: 768px) {
    .message {
      max-width: 85%;
    }

    .partner-name {
      font-size: 1rem;
    }

    .avatar {
      width: 40px;
      height: 40px;
      font-size: 20px;
    }
  }
</style>
