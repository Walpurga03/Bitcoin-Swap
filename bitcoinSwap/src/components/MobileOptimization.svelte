<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  
  // Mobile Detection & Optimization
  let isMobile = false;
  let isTablet = false;
  let isTouch = false;
  let orientation: 'portrait' | 'landscape' = 'portrait';
  let viewportHeight = 0;
  let viewportWidth = 0;
  let safeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };
  
  // Performance Optimization
  let isLowEndDevice = false;
  let connectionType = 'unknown';
  let isOnline = true;
  
  // UI State
  let showMobileMenu = false;
  let showBottomSheet = false;
  let keyboardVisible = false;
  
  onMount(() => {
    if (!browser) return;
    
    // Device Detection
    detectDevice();
    detectConnection();
    detectSafeArea();
    
    // Event Listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('online', () => isOnline = true);
    window.addEventListener('offline', () => isOnline = false);
    
    // Keyboard Detection (iOS Safari)
    if (isMobile) {
      setupKeyboardDetection();
    }
    
    // Initial values
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  });
  
  function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    
    // Mobile Detection
    isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
               (maxTouchPoints > 0 && window.innerWidth < 768);
    
    // Tablet Detection
    isTablet = /ipad|android(?!.*mobile)/i.test(userAgent) ||
               (maxTouchPoints > 0 && window.innerWidth >= 768 && window.innerWidth < 1024);
    
    // Touch Detection
    isTouch = maxTouchPoints > 0 || 'ontouchstart' in window;
    
    // Low-end Device Detection
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    isLowEndDevice = (memory && memory < 4) || (cores && cores < 4);
  }
  
  function detectConnection() {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      connectionType = connection.effectiveType || connection.type || 'unknown';
    }
  }
  
  function detectSafeArea() {
    // CSS Environment Variables für Safe Area
    const computedStyle = getComputedStyle(document.documentElement);
    
    safeAreaInsets = {
      top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0')
    };
  }
  
  function handleResize() {
    viewportHeight = window.innerHeight;
    viewportWidth = window.innerWidth;
    
    // Orientation Detection
    orientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait';
    
    // Update device classification
    isMobile = viewportWidth < 768;
    isTablet = viewportWidth >= 768 && viewportWidth < 1024;
  }
  
  function handleOrientationChange() {
    // Delay to get correct dimensions after orientation change
    setTimeout(() => {
      handleResize();
    }, 100);
  }
  
  function setupKeyboardDetection() {
    let initialViewportHeight = window.innerHeight;
    
    const checkKeyboard = () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // Keyboard is likely visible if height decreased by more than 150px
      keyboardVisible = heightDifference > 150;
    };
    
    window.addEventListener('resize', checkKeyboard);
    
    // Visual Viewport API (better keyboard detection)
    if ('visualViewport' in window) {
      window.visualViewport?.addEventListener('resize', () => {
        const heightDifference = window.innerHeight - (window.visualViewport?.height || 0);
        keyboardVisible = heightDifference > 50;
      });
    }
  }
  
  // Touch Gestures
  let touchStartY = 0;
  let touchStartX = 0;
  
  function handleTouchStart(event: TouchEvent) {
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
  }
  
  function handleTouchEnd(event: TouchEvent) {
    if (!event.changedTouches[0]) return;
    
    const touchEndY = event.changedTouches[0].clientY;
    const touchEndX = event.changedTouches[0].clientX;
    
    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;
    
    // Swipe Detection
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      // Vertical Swipe
      if (deltaY > minSwipeDistance) {
        // Swipe Up
        handleSwipeUp();
      } else if (deltaY < -minSwipeDistance) {
        // Swipe Down
        handleSwipeDown();
      }
    } else {
      // Horizontal Swipe
      if (deltaX > minSwipeDistance) {
        // Swipe Left
        handleSwipeLeft();
      } else if (deltaX < -minSwipeDistance) {
        // Swipe Right
        handleSwipeRight();
      }
    }
  }
  
  function handleSwipeUp() {
    if (isMobile && !showBottomSheet) {
      showBottomSheet = true;
    }
  }
  
  function handleSwipeDown() {
    if (showBottomSheet) {
      showBottomSheet = false;
    }
    if (showMobileMenu) {
      showMobileMenu = false;
    }
  }
  
  function handleSwipeLeft() {
    if (showMobileMenu) {
      showMobileMenu = false;
    }
  }
  
  function handleSwipeRight() {
    if (isMobile && !showMobileMenu) {
      showMobileMenu = true;
    }
  }
  
  // Haptic Feedback
  function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }
  
  // Performance Optimization
  function shouldReduceAnimations(): boolean {
    return isLowEndDevice || 
           connectionType === 'slow-2g' || 
           connectionType === '2g' ||
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  
  function shouldReduceImages(): boolean {
    return connectionType === 'slow-2g' || 
           connectionType === '2g' ||
           !isOnline;
  }
  
  // Export reactive values and functions
  export {
    isMobile,
    isTablet,
    isTouch,
    orientation,
    viewportHeight,
    viewportWidth,
    safeAreaInsets,
    isLowEndDevice,
    connectionType,
    isOnline,
    keyboardVisible,
    showMobileMenu,
    showBottomSheet,
    hapticFeedback,
    shouldReduceAnimations,
    shouldReduceImages
  };
</script>

<!-- Mobile Navigation Overlay -->
{#if isMobile && showMobileMenu}
  <div 
    class="mobile-overlay"
    on:click={() => showMobileMenu = false}
    on:touchstart={handleTouchStart}
    on:touchend={handleTouchEnd}
  >
    <nav class="mobile-nav" class:safe-area={safeAreaInsets.top > 0}>
      <div class="mobile-nav-header">
        <h3>🏷️ Bitcoin Tausch</h3>
        <button 
          class="close-btn"
          on:click={() => showMobileMenu = false}
          on:click={() => hapticFeedback('light')}
        >
          ✕
        </button>
      </div>
      
      <div class="mobile-nav-content">
        <a href="/offers" class="nav-item" on:click={() => hapticFeedback('light')}>
          <span class="nav-icon">🏷️</span>
          <span>Angebote</span>
        </a>
        
        <a href="/group" class="nav-item" on:click={() => hapticFeedback('light')}>
          <span class="nav-icon">👥</span>
          <span>Gruppe</span>
        </a>
        
        <a href="/settings" class="nav-item" on:click={() => hapticFeedback('light')}>
          <span class="nav-icon">⚙️</span>
          <span>Einstellungen</span>
        </a>
        
        <div class="nav-divider"></div>
        
        <div class="connection-status">
          <span class="status-indicator" class:online={isOnline} class:offline={!isOnline}></span>
          <span class="status-text">
            {isOnline ? 'Online' : 'Offline'} 
            {#if connectionType !== 'unknown'}
              • {connectionType.toUpperCase()}
            {/if}
          </span>
        </div>
      </div>
    </nav>
  </div>
{/if}

<!-- Bottom Sheet -->
{#if isMobile && showBottomSheet}
  <div 
    class="bottom-sheet-overlay"
    on:click={() => showBottomSheet = false}
  >
    <div 
      class="bottom-sheet"
      class:keyboard-visible={keyboardVisible}
      on:touchstart={handleTouchStart}
      on:touchend={handleTouchEnd}
    >
      <div class="bottom-sheet-handle"></div>
      
      <div class="bottom-sheet-content">
        <h4>Schnellaktionen</h4>
        
        <div class="quick-actions">
          <button 
            class="quick-action"
            on:click={() => hapticFeedback('medium')}
          >
            <span class="action-icon">➕</span>
            <span>Neues Angebot</span>
          </button>
          
          <button 
            class="quick-action"
            on:click={() => hapticFeedback('medium')}
          >
            <span class="action-icon">🔍</span>
            <span>Suchen</span>
          </button>
          
          <button 
            class="quick-action"
            on:click={() => hapticFeedback('medium')}
          >
            <span class="action-icon">📊</span>
            <span>Statistiken</span>
          </button>
          
          <button 
            class="quick-action"
            on:click={() => hapticFeedback('medium')}
          >
            <span class="action-icon">🔔</span>
            <span>Benachrichtigungen</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Mobile Floating Action Button -->
{#if isMobile}
  <button 
    class="fab"
    class:fab-with-keyboard={keyboardVisible}
    on:click={() => showBottomSheet = !showBottomSheet}
    on:click={() => hapticFeedback('medium')}
  >
    <span class="fab-icon" class:rotated={showBottomSheet}>➕</span>
  </button>
{/if}

<!-- Performance Indicators (Development) -->
{#if browser && window.location.hostname === 'localhost'}
  <div class="dev-indicators">
    <div class="indicator" class:active={isMobile}>📱</div>
    <div class="indicator" class:active={isTablet}>📟</div>
    <div class="indicator" class:active={isTouch}>👆</div>
    <div class="indicator" class:active={isLowEndDevice}>🐌</div>
    <div class="indicator" class:active={!isOnline}>📡</div>
    <div class="indicator" class:active={keyboardVisible}>⌨️</div>
  </div>
{/if}

<style>
  /* Mobile Overlay */
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    backdrop-filter: blur(4px);
  }

  .mobile-nav {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    background: var(--surface-color, #ffffff);
    box-shadow: 4px 0 12px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    transform: translateX(-100%);
    animation: slideInLeft 0.3s ease-out forwards;
  }

  .mobile-nav.safe-area {
    padding-top: env(safe-area-inset-top);
  }

  .mobile-nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    background: var(--primary-color, #2563eb);
    color: white;
  }

  .mobile-nav-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .mobile-nav-content {
    flex: 1;
    padding: 1rem 0;
    overflow-y: auto;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    color: var(--text-primary, #1f2937);
    text-decoration: none;
    transition: background-color 0.2s;
  }

  .nav-item:hover {
    background: var(--background-secondary, #f8fafc);
  }

  .nav-icon {
    font-size: 1.25rem;
    width: 24px;
    text-align: center;
  }

  .nav-divider {
    height: 1px;
    background: var(--border-color, #e5e7eb);
    margin: 1rem 1.5rem;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.8rem;
    color: var(--text-secondary, #6b7280);
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--error-color, #dc2626);
  }

  .status-indicator.online {
    background: var(--success-color, #10b981);
  }

  /* Bottom Sheet */
  .bottom-sheet-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
  }

  .bottom-sheet {
    width: 100%;
    background: var(--surface-color, #ffffff);
    border-radius: 16px 16px 0 0;
    padding: 0 0 env(safe-area-inset-bottom) 0;
    transform: translateY(100%);
    animation: slideInUp 0.3s ease-out forwards;
    max-height: 60vh;
    overflow: hidden;
  }

  .bottom-sheet.keyboard-visible {
    max-height: 40vh;
  }

  .bottom-sheet-handle {
    width: 40px;
    height: 4px;
    background: var(--border-color, #e5e7eb);
    border-radius: 2px;
    margin: 0.75rem auto 0 auto;
  }

  .bottom-sheet-content {
    padding: 1rem 1.5rem 1.5rem 1.5rem;
  }

  .bottom-sheet-content h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary, #1f2937);
    font-size: 1.1rem;
    font-weight: 600;
  }

  .quick-actions {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .quick-action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--background-secondary, #f8fafc);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .quick-action:hover {
    background: var(--primary-light, #dbeafe);
    border-color: var(--primary-color, #2563eb);
    transform: translateY(-1px);
  }

  .action-icon {
    font-size: 1.5rem;
  }

  .quick-action span:last-child {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary, #1f2937);
  }

  /* Floating Action Button */
  .fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 56px;
    height: 56px;
    background: var(--primary-color, #2563eb);
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
  }

  .fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.5);
  }

  .fab-with-keyboard {
    bottom: calc(2rem + env(keyboard-inset-height, 0px));
  }

  .fab-icon {
    font-size: 1.5rem;
    transition: transform 0.3s ease;
  }

  .fab-icon.rotated {
    transform: rotate(45deg);
  }

  /* Development Indicators */
  .dev-indicators {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    gap: 0.25rem;
    z-index: 9999;
    opacity: 0.7;
  }

  .indicator {
    width: 24px;
    height: 24px;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    transition: all 0.2s;
  }

  .indicator.active {
    background: var(--primary-color, #2563eb);
    color: white;
    transform: scale(1.1);
  }

  /* Animations */
  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slideInUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  /* Dark Mode */
  @media (prefers-color-scheme: dark) {
    .mobile-nav {
      background: var(--surface-dark, #1f2937);
    }

    .nav-item {
      color: var(--text-dark, #f9fafb);
    }

    .nav-item:hover {
      background: var(--background-dark-secondary, #374151);
    }

    .bottom-sheet {
      background: var(--surface-dark, #1f2937);
    }

    .quick-action {
      background: var(--background-dark-secondary, #374151);
      border-color: var(--border-dark, #4b5563);
    }

    .quick-action span:last-child {
      color: var(--text-dark, #f9fafb);
    }
  }

  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .mobile-nav,
    .bottom-sheet,
    .fab,
    .fab-icon,
    .quick-action,
    .indicator {
      animation: none;
      transition: none;
    }
  }

  /* High Contrast */
  @media (prefers-contrast: high) {
    .mobile-overlay {
      background: rgba(0, 0, 0, 0.8);
    }

    .nav-item:hover,
    .quick-action:hover {
      outline: 2px solid var(--primary-color, #2563eb);
    }
  }
</style>