// Benachrichtigungs-Manager für Bitcoin-Angebote (Phase 2)

import type { OfferNotification } from '$lib/types/offers';
import { offerActions } from '$lib/stores/phase2OfferStore';

/**
 * Benachrichtigungs-Typen
 */
export type NotificationType = 
  | 'new_offer' 
  | 'new_interest' 
  | 'offer_expired' 
  | 'offer_completed'
  | 'offer_cancelled'
  | 'price_alert'
  | 'system_message';

/**
 * Benachrichtigungs-Einstellungen
 */
export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showOnNewOffer: boolean;
  showOnNewInterest: boolean;
  showOnOfferExpiry: boolean;
  showOnPriceAlert: boolean;
  priceAlertThreshold: number; // Prozent
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM
  quietHoursEnd: string; // HH:MM
}

/**
 * Browser-Benachrichtigung
 */
export interface BrowserNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

/**
 * Benachrichtigungs-Aktion
 */
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Benachrichtigungs-Manager Klasse
 */
export class NotificationManager {
  private settings: NotificationSettings;
  private permission: NotificationPermission = 'default';
  private soundContext: AudioContext | null = null;
  private notificationQueue: OfferNotification[] = [];
  private isProcessingQueue = false;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeAudio();
    this.requestPermission();
    
    // Queue-Verarbeitung alle 2 Sekunden
    setInterval(() => this.processNotificationQueue(), 2000);
  }

  /**
   * Lädt Benachrichtigungs-Einstellungen
   */
  private loadSettings(): NotificationSettings {
    const defaultSettings: NotificationSettings = {
      enabled: true,
      browserNotifications: true,
      soundEnabled: true,
      vibrationEnabled: true,
      showOnNewOffer: true,
      showOnNewInterest: true,
      showOnOfferExpiry: true,
      showOnPriceAlert: true,
      priceAlertThreshold: 5.0,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    };

    if (typeof window === 'undefined') {
      return defaultSettings;
    }

    try {
      const stored = localStorage.getItem('notification-settings');
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch (error) {
      console.warn('Fehler beim Laden der Benachrichtigungs-Einstellungen:', error);
      return defaultSettings;
    }
  }

  /**
   * Speichert Benachrichtigungs-Einstellungen
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('notification-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Fehler beim Speichern der Benachrichtigungs-Einstellungen:', error);
    }
  }

  /**
   * Initialisiert Audio-Kontext
   */
  private initializeAudio(): void {
    if (typeof window === 'undefined') return;
    
    try {
      this.soundContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio-Kontext nicht verfügbar:', error);
    }
  }

  /**
   * Fordert Browser-Benachrichtigungs-Berechtigung an
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      this.permission = 'denied';
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    } catch (error) {
      console.warn('Fehler beim Anfordern der Benachrichtigungs-Berechtigung:', error);
      this.permission = 'denied';
      return 'denied';
    }
  }

  /**
   * Erstellt eine neue Benachrichtigung
   */
  async notify(
    type: NotificationType,
    title: string,
    message: string,
    offerId?: string,
    data?: any
  ): Promise<void> {
    if (!this.settings.enabled) {
      return;
    }

    // Prüfen ob in Ruhezeiten
    if (this.isQuietHours()) {
      console.log('Benachrichtigung während Ruhezeiten unterdrückt');
      return;
    }

    // Typ-spezifische Filterung
    if (!this.shouldShowNotification(type)) {
      return;
    }

    // Benachrichtigung zur Queue hinzufügen
    const notification: OfferNotification = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      offerId: offerId || '',
      message: `${title}: ${message}`,
      createdAt: Math.floor(Date.now() / 1000),
      read: false
    };

    this.notificationQueue.push(notification);
    
    // Sofort verarbeiten wenn Queue leer war
    if (this.notificationQueue.length === 1 && !this.isProcessingQueue) {
      this.processNotificationQueue();
    }
  }

  /**
   * Verarbeitet die Benachrichtigungs-Queue
   */
  private async processNotificationQueue(): Promise<void> {
    if (this.isProcessingQueue || this.notificationQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      const notification = this.notificationQueue.shift();
      if (notification) {
        await this.showNotification(notification);
        
        // Zur Store hinzufügen
        offerActions.addNotification(notification);
      }
    } catch (error) {
      console.error('Fehler beim Verarbeiten der Benachrichtigung:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Zeigt eine Benachrichtigung an
   */
  private async showNotification(notification: OfferNotification): Promise<void> {
    // Browser-Benachrichtigung
    if (this.settings.browserNotifications && this.permission === 'granted') {
      await this.showBrowserNotification(notification);
    }

    // Sound abspielen
    if (this.settings.soundEnabled) {
      this.playNotificationSound(notification.type);
    }

    // Vibration
    if (this.settings.vibrationEnabled && 'vibrate' in navigator) {
      this.vibrate(notification.type);
    }
  }

  /**
   * Zeigt Browser-Benachrichtigung
   */
  private async showBrowserNotification(notification: OfferNotification): Promise<void> {
    try {
      const { title, body, icon, actions } = this.formatBrowserNotification(notification);
      
      const browserNotification = new Notification(title, {
        body,
        icon,
        badge: '/favicon.svg',
        tag: notification.type,
        requireInteraction: notification.type === 'new_interest'
      });

      // Auto-close nach 5 Sekunden (außer bei wichtigen Benachrichtigungen)
      if (notification.type !== 'new_interest') {
        setTimeout(() => browserNotification.close(), 5000);
      }

      // Click-Handler
      browserNotification.onclick = () => {
        window.focus();
        if (notification.offerId) {
          // Navigation zum Angebot
          window.location.hash = `#offer-${notification.offerId}`;
        }
        browserNotification.close();
      };

    } catch (error) {
      console.warn('Fehler beim Anzeigen der Browser-Benachrichtigung:', error);
    }
  }

  /**
   * Formatiert Browser-Benachrichtigung
   */
  private formatBrowserNotification(notification: OfferNotification): BrowserNotification {
    const typeConfig = {
      new_offer: {
        title: '🆕 Neues Bitcoin-Angebot',
        icon: '🏷️',
        actions: [
          { action: 'view', title: 'Anzeigen', icon: '👁️' },
          { action: 'dismiss', title: 'Schließen', icon: '❌' }
        ]
      },
      new_interest: {
        title: '🙋 Neues Interesse',
        icon: '💬',
        actions: [
          { action: 'respond', title: 'Antworten', icon: '💬' },
          { action: 'view', title: 'Details', icon: '👁️' }
        ]
      },
      offer_expired: {
        title: '⏰ Angebot abgelaufen',
        icon: '⏰',
        actions: [
          { action: 'renew', title: 'Erneuern', icon: '🔄' },
          { action: 'dismiss', title: 'OK', icon: '✅' }
        ]
      },
      offer_completed: {
        title: '✅ Angebot abgeschlossen',
        icon: '🎉',
        actions: [
          { action: 'feedback', title: 'Bewerten', icon: '⭐' },
          { action: 'dismiss', title: 'OK', icon: '✅' }
        ]
      },
      price_alert: {
        title: '📈 Preis-Alarm',
        icon: '💰',
        actions: [
          { action: 'view', title: 'Anzeigen', icon: '👁️' },
          { action: 'dismiss', title: 'OK', icon: '✅' }
        ]
      }
    };

    const config = typeConfig[notification.type as keyof typeof typeConfig] || {
      title: '📢 Benachrichtigung',
      icon: '🔔',
      actions: []
    };

    return {
      title: config.title,
      body: notification.message,
      icon: `/icons/${config.icon}.png`,
      actions: config.actions
    };
  }

  /**
   * Spielt Benachrichtigungs-Sound ab
   */
  private playNotificationSound(type: NotificationType): void {
    if (!this.soundContext) return;

    try {
      // Verschiedene Töne für verschiedene Typen
      const frequencies: Record<NotificationType, number[]> = {
        new_offer: [800, 1000],
        new_interest: [600, 800, 1000],
        offer_expired: [400, 300],
        offer_completed: [600, 800, 1000, 1200],
        offer_cancelled: [400, 300, 400],
        price_alert: [1000, 800, 1000],
        system_message: [800]
      };

      const freq = frequencies[type] || [800];
      this.playTone(freq, 0.3, 200);

    } catch (error) {
      console.warn('Fehler beim Abspielen des Benachrichtigungs-Sounds:', error);
    }
  }

  /**
   * Spielt einen Ton ab
   */
  private playTone(frequencies: number[], volume: number = 0.3, duration: number = 200): void {
    if (!this.soundContext) return;

    frequencies.forEach((freq, index) => {
      const oscillator = this.soundContext!.createOscillator();
      const gainNode = this.soundContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.soundContext!.destination);

      oscillator.frequency.setValueAtTime(freq, this.soundContext!.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, this.soundContext!.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, this.soundContext!.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.soundContext!.currentTime + duration / 1000);

      const startTime = this.soundContext!.currentTime + (index * duration / 1000);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration / 1000);
    });
  }

  /**
   * Vibration auslösen
   */
  private vibrate(type: NotificationType): void {
    const patterns: Record<NotificationType, number[]> = {
      new_offer: [200, 100, 200],
      new_interest: [100, 50, 100, 50, 100],
      offer_expired: [500],
      offer_completed: [100, 50, 100, 50, 100, 50, 100],
      offer_cancelled: [500, 200, 500],
      price_alert: [200, 100, 200, 100, 200],
      system_message: [200]
    };

    const pattern = patterns[type] || [200];
    navigator.vibrate(pattern);
  }

  /**
   * Prüft ob Benachrichtigung angezeigt werden soll
   */
  private shouldShowNotification(type: NotificationType): boolean {
    switch (type) {
      case 'new_offer':
        return this.settings.showOnNewOffer;
      case 'new_interest':
        return this.settings.showOnNewInterest;
      case 'offer_expired':
        return this.settings.showOnOfferExpiry;
      case 'price_alert':
        return this.settings.showOnPriceAlert;
      default:
        return true;
    }
  }

  /**
   * Prüft ob aktuell Ruhezeiten sind
   */
  private isQuietHours(): boolean {
    if (!this.settings.quietHoursEnabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = this.settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      // Normale Zeitspanne (z.B. 22:00 - 08:00 nächster Tag)
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Über Mitternacht (z.B. 22:00 - 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Aktualisiert Einstellungen
   */
  updateSettings(newSettings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Berechtigung neu anfordern falls aktiviert
    if (newSettings.browserNotifications && this.permission !== 'granted') {
      this.requestPermission();
    }
  }

  /**
   * Gibt aktuelle Einstellungen zurück
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Testet Benachrichtigungen
   */
  async testNotification(): Promise<void> {
    await this.notify(
      'system_message',
      'Test-Benachrichtigung',
      'Dies ist eine Test-Benachrichtigung um zu prüfen ob alles funktioniert.'
    );
  }

  /**
   * Bereinigt alte Benachrichtigungen
   */
  cleanup(): void {
    // Queue leeren
    this.notificationQueue = [];
    
    // Audio-Kontext schließen
    if (this.soundContext && this.soundContext.state !== 'closed') {
      this.soundContext.close();
    }
  }
}

// Singleton-Instanz
export const notificationManager = new NotificationManager();

// Convenience-Funktionen
export const notify = {
  newOffer: (title: string, message: string, offerId: string) => 
    notificationManager.notify('new_offer', title, message, offerId),
    
  newInterest: (title: string, message: string, offerId: string) => 
    notificationManager.notify('new_interest', title, message, offerId),
    
  offerExpired: (title: string, message: string, offerId: string) => 
    notificationManager.notify('offer_expired', title, message, offerId),
    
  offerCompleted: (title: string, message: string, offerId: string) => 
    notificationManager.notify('offer_completed', title, message, offerId),
    
  priceAlert: (title: string, message: string, offerId?: string) => 
    notificationManager.notify('price_alert', title, message, offerId)
};