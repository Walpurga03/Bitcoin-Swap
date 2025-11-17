<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { userStore } from '$lib/stores/userStore';
  
  // Room-ID aus URL
  $: roomId = $page.params.dealId;
  
  // Trystero Room & Peers
  let room: any = null;
  let peers: Map<string, { name: string; npub: string }> = new Map();
  let connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  
  // Chat State
  let messages: Array<{ from: string; fromName: string; text: string; timestamp: number }> = [];
  let messageInput = '';
  let myName = '';
  let myNpub = '';
  
  onMount(async () => {
    console.log('🚀 Deal Room gestartet:', roomId);
    console.log('📋 User-Store:', $userStore);
    
    // Hole User-Info aus Store
    myName = $userStore.name || '';
    myNpub = $userStore.pubkey || '';
    
    console.log('👤 Meine Identität:', { myName, myNpub: myNpub.substring(0, 16) + '...' });
    
    // Dynamischer Import von Trystero (Torrent Strategy = nur BitTorrent, keine Nostr!)
    console.log('📦 Lade Trystero/Torrent...');
    const { joinRoom } = await import('trystero/torrent');
    console.log('✅ Trystero/Torrent geladen');
    
    // Erstelle P2P Room (NUR Torrent Strategy, keine Nostr-Relays!)
    const config = { 
      appId: 'bitcoin-swap-chat',
      // Explizite STUN/TURN Server für bessere Mobile-Konnektivität
      rtcConfig: {
        iceServers: [
          // Google STUN (öffentlich)
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Cloudflare TURN (öffentlich, keine Auth nötig)
          { 
            urls: 'turn:turn.cloudflare.com:3478?transport=udp',
            username: 'cloudflare',
            credential: 'cloudflare'
          }
        ],
        iceTransportPolicy: 'all' // Versuche alle Optionen (relay + direct)
      }
    };
    
    console.log('🏗️ Erstelle P2P Room mit:', { appId: config.appId, roomId, strategy: 'torrent-only' });
    console.log('🔧 ICE Server Config:', config.rtcConfig.iceServers.length + ' Server');
    room = joinRoom(config, roomId);
    console.log('✅ Room-Objekt erstellt:', room);
    
    console.log('🔗 Verbinde mit P2P Room...');
    console.log('⏳ Warte auf Peer-Verbindungen...');
    console.log('🌍 Dieser Client ist jetzt im Raum und wartet auf andere Peers');
    
    // Debugging: Zeige ob wir im Room sind
    setTimeout(() => {
      if (peers.size === 0) {
        console.warn('⚠️ Nach 5 Sekunden: Noch keine Peer-Verbindung!');
        console.warn('Mögliche Ursachen:');
        console.warn('- Anderer User ist noch nicht im Raum');
        console.warn('- Firewall blockiert WebRTC');
        console.warn('- NAT-Traversal Problem');
      }
    }, 5000);
    
    // Identity Exchange Channel (P2P!)
    console.log('🔧 Erstelle Identity-Channel...');
    const [sendIdentity, receiveIdentity] = room.makeAction('identity');
    console.log('✅ Identity-Channel erstellt');
    
    receiveIdentity((data: { name: string; npub: string }, peerId: string) => {
      console.log('👤 Identität empfangen von', peerId, ':', data);
      peers.set(peerId, { name: data.name, npub: data.npub });
      peers = peers; // Trigger reactivity
      
      // Update System-Nachricht
      messages = [...messages, {
        from: 'system',
        fromName: 'System',
        text: `${data.name || data.npub.substring(0, 16) + '...'} ist beigetreten`,
        timestamp: Date.now()
      }];
    });
    
    // Peer Events
    room.onPeerJoin((peerId: string) => {
      console.log('✅ Peer beigetreten:', peerId);
      console.log('📊 Aktuelle Peers:', peers.size + 1);
      connectionStatus = 'connected';
      
      // Sende eigene Identität an neuen Peer (P2P!)
      console.log('📤 Sende meine Identität an Peer:', peerId);
      sendIdentity({ name: myName, npub: myNpub }, peerId);
      
      // Temporärer Eintrag (wird durch identity-message überschrieben)
      peers.set(peerId, { name: 'Lädt...', npub: '' });
      peers = peers;
    });
    
    room.onPeerLeave((peerId: string) => {
      console.log('❌ Peer verlassen:', peerId);
      console.log('📊 Verbleibende Peers:', peers.size - 1);
      const peerInfo = peers.get(peerId);
      peers.delete(peerId);
      peers = peers;
      
      if (peers.size === 0) {
        console.log('⚠️ Keine Peers mehr verbunden');
        connectionStatus = 'disconnected';
      }
      
      messages = [...messages, {
        from: 'system',
        fromName: 'System',
        text: `${peerInfo?.name || 'Peer'} hat den Chat verlassen`,
        timestamp: Date.now()
      }];
    });
    
    // Chat-Nachrichten empfangen
    console.log('🔧 Erstelle Chat-Channel...');
    const [sendMessage, receiveMessage] = room.makeAction('chat');
    console.log('✅ Chat-Channel erstellt');
    
    receiveMessage((data: { text: string; name: string; timestamp: number }, peerId: string) => {
      console.log('📩 Nachricht empfangen von', peerId, ':', data.text);
      messages = [...messages, {
        from: peerId,
        fromName: data.name || peerId.substring(0, 8),
        text: data.text,
        timestamp: data.timestamp
      }];
    });
    
    // Speichere sendMessage Funktion für später
    (window as any).__sendChatMessage = sendMessage;
  });
  
  onDestroy(() => {
    console.log('🛑 Verlasse P2P Room');
    if (room) {
      room.leave();
    }
  });
  
  function handleSendMessage() {
    if (!messageInput.trim()) return;
    
    const sendFn = (window as any).__sendChatMessage;
    if (!sendFn) {
      console.error('❌ Send-Funktion nicht verfügbar');
      return;
    }
    
    const message = {
      text: messageInput,
      name: myName,
      timestamp: Date.now()
    };
    
    // Sende an alle Peers
    sendFn(message);
    
    // Zeige eigene Nachricht lokal
    messages = [...messages, {
      from: 'me',
      fromName: myName || 'Du',
      text: messageInput,
      timestamp: Date.now()
    }];
    
    messageInput = '';
  }
  
  function handleEndChat() {
    if (confirm('Chat wirklich beenden?')) {
      goto('/group');
    }
  }
</script>

<div class="deal-room">
  <div class="header">
    <h1>🔒 Private Deal Chat</h1>
    <div class="room-info">
      <span class="room-id">Room: {roomId}</span>
      <span class="status" class:connected={connectionStatus === 'connected'}>
        {connectionStatus === 'connecting' ? '🔄 Verbinde...' : 
         connectionStatus === 'connected' ? '✅ Verbunden' : 
         '❌ Getrennt'}
      </span>
      <span class="peers">👥 {peers.size} Peer{peers.size !== 1 ? 's' : ''}</span>
    </div>
  </div>
  
  <div class="chat-container">
    <div class="messages">
      {#if connectionStatus === 'connecting' && messages.length === 0}
        <div class="waiting-notice">
          <div class="spinner"></div>
          <h3>⏳ Warte auf anderen Teilnehmer...</h3>
          <p>Sobald der andere User den Chat betritt, wird die Verbindung automatisch hergestellt.</p>
          <small>💡 Tipp: Stelle sicher, dass beide im gleichen Room sind</small>
        </div>
      {/if}
      
      {#each messages as msg}
        <div class="message" class:own={msg.from === 'me'} class:system={msg.from === 'system'}>
          <div class="message-content">
            {#if msg.from === 'system'}
              <em>{msg.text}</em>
            {:else}
              <strong>{msg.fromName || (msg.from === 'me' ? 'Du' : 'Peer')}:</strong>
              {msg.text}
            {/if}
          </div>
          <div class="timestamp">
            {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      {/each}
    </div>
    
    <div class="input-area">
      <input
        type="text"
        bind:value={messageInput}
        on:keydown={(e) => e.key === 'Enter' && handleSendMessage()}
        placeholder="Nachricht eingeben..."
        disabled={connectionStatus !== 'connected'}
      />
      <button on:click={handleSendMessage} disabled={connectionStatus !== 'connected'}>
        Senden
      </button>
    </div>
  </div>
  
  <div class="actions">
    <button class="btn-end" on:click={handleEndChat}>
      Chat beenden
    </button>
  </div>
</div>

<style>
  .deal-room {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem;
    min-height: 100vh;
    background: var(--bg-color);
  }
  
  .header {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--surface-color);
    border-radius: 1rem;
    border: 1px solid var(--border-color);
  }
  
  .header h1 {
    margin: 0 0 1rem 0;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 1.75rem;
  }
  
  .room-info {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: 0.875rem;
  }
  
  .room-id {
    font-family: 'Monaco', 'Menlo', monospace;
    background: var(--surface-elevated);
    color: var(--text-secondary);
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
    font-size: 0.8125rem;
  }
  
  .status {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--warning-color);
    color: white;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .status.connected {
    background: var(--success-color);
  }
  
  .peers {
    padding: 0.5rem 0.75rem;
    background: linear-gradient(135deg, var(--secondary-color) 0%, var(--accent-color) 100%);
    color: white;
    border-radius: 0.5rem;
    font-weight: 500;
  }
  
  .chat-container {
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 1rem;
    overflow: hidden;
    height: 600px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  }
  
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: var(--bg-secondary);
  }
  
  .messages::-webkit-scrollbar {
    width: 8px;
  }
  
  .messages::-webkit-scrollbar-track {
    background: var(--surface-color);
  }
  
  .messages::-webkit-scrollbar-thumb {
    background: var(--border-hover);
    border-radius: 4px;
  }
  
  .messages::-webkit-scrollbar-thumb:hover {
    background: var(--text-muted);
  }
  
  .waiting-notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 3rem 2rem;
    color: var(--text-secondary);
    gap: 1rem;
  }
  
  .waiting-notice h3 {
    margin: 0;
    color: var(--text-color);
    font-size: 1.25rem;
  }
  
  .waiting-notice p {
    margin: 0;
    max-width: 400px;
    line-height: 1.6;
  }
  
  .waiting-notice small {
    color: var(--text-muted);
    opacity: 0.7;
  }
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .message {
    padding: 0.875rem 1rem;
    border-radius: 1rem;
    background: var(--surface-color);
    max-width: 75%;
    border: 1px solid var(--border-color);
    animation: messageSlideIn 0.2s ease-out;
  }
  
  @keyframes messageSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .message.own {
    align-self: flex-end;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
    color: white;
    border: none;
  }
  
  .message.own .timestamp {
    color: rgba(255, 255, 255, 0.7);
  }
  
  .message.system {
    align-self: center;
    background: var(--surface-elevated);
    color: var(--text-muted);
    max-width: 90%;
    text-align: center;
    border: 1px dashed var(--border-hover);
    font-size: 0.875rem;
  }
  
  .message-content {
    margin-bottom: 0.5rem;
    line-height: 1.5;
    color: var(--text-color);
  }
  
  .message.own .message-content {
    color: white;
  }
  
  .message-content strong {
    color: var(--primary-color);
    margin-right: 0.5rem;
  }
  
  .message.own .message-content strong {
    color: rgba(255, 255, 255, 0.9);
  }
  
  .timestamp {
    font-size: 0.6875rem;
    opacity: 0.7;
    color: var(--text-muted);
  }
  
  .input-area {
    display: flex;
    gap: 0.75rem;
    padding: 1.25rem;
    border-top: 1px solid var(--border-color);
    background: var(--surface-elevated);
  }
  
  .input-area input {
    flex: 1;
    padding: 0.875rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    font-size: 1rem;
    background: var(--surface-color);
    color: var(--text-color);
    transition: all 0.2s;
  }
  
  .input-area input:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
  }
  
  .input-area input::placeholder {
    color: var(--text-muted);
  }
  
  .input-area button {
    padding: 0.875rem 2rem;
    background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
    color: white;
    border: none;
    border-radius: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 600;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.3);
  }
  
  .input-area button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.4);
  }
  
  .input-area button:disabled {
    background: var(--surface-color);
    color: var(--text-muted);
    cursor: not-allowed;
    box-shadow: none;
    opacity: 0.5;
  }
  
  .actions {
    margin-top: 1.5rem;
    text-align: center;
  }
  
  .btn-end {
    padding: 0.875rem 2.5rem;
    background: var(--surface-color);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s;
  }
  
  .btn-end:hover {
    background: var(--error-color);
    border-color: var(--error-color);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
  
  @media (max-width: 768px) {
    .deal-room {
      padding: 1rem;
    }
    
    .chat-container {
      height: calc(100vh - 300px);
      min-height: 400px;
    }
    
    .message {
      max-width: 85%;
    }
  }
</style>
