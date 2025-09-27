// Feedback & Error-Handling Manager für Bitcoin-Angebote (Phase 2)

import { writable, derived } from 'svelte/store';
import { notificationManager } from '$lib/notifications/notificationManager';

/**
 * Feedback-Typen
 */
export type FeedbackType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'loading';

/**
 * Feedback-Nachricht
 */
export interface FeedbackMessage {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  duration?: number; // ms, 0 = permanent
  actions?: FeedbackAction[];
  timestamp: number;
  dismissible: boolean;
  persistent: boolean;
}

/**
 * Feedback-Aktion
 */
export interface FeedbackAction {
  label: string;
  action: () => void | Promise<void>;
  style?: 'primary' | 'secondary' | 'danger';
}

/**
 * Error-Kontext
 */
export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  offerId?: string;
  metadata?: Record<string, any>;
}

/**
 * Performance-Metriken
 */
export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  errorRate: number;
  userSatisfaction: number;
}

// Stores
export const feedbackMessages = writable<FeedbackMessage[]>([]);
export const isLoading = writable<boolean>(false);
export const loadingMessage = writable<string>('');
export const errorLog = writable<Array<{ error: Error; context: ErrorContext; timestamp: number }>>([]);
export const performanceMetrics = writable<PerformanceMetrics>({
  loadTime: 0,
  renderTime: 0,
  apiResponseTime: 0,
  errorRate: 0,
  userSatisfaction: 0
});

// Derived Stores
export const hasErrors = derived(feedbackMessages, $messages => 
  $messages.some(msg => msg.type === 'error')
);

export const hasWarnings = derived(feedbackMessages, $messages => 
  $messages.some(msg => msg.type === 'warning')
);

export const activeMessages = derived(feedbackMessages, $messages => 
  $messages.filter(msg => msg.persistent || msg.duration === 0)
);

/**
 * Feedback-Manager Klasse
 */
export class FeedbackManager {
  private messageQueue: FeedbackMessage[] = [];
  private errorCount = 0;
  private startTime = Date.now();
  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.initializePerformanceMonitoring();
    this.setupErrorHandling();
  }

  /**
   * Zeigt eine Feedback-Nachricht an
   */
  show(
    type: FeedbackType,
    title: string,
    message: string,
    options: {
      duration?: number;
      actions?: FeedbackAction[];
      dismissible?: boolean;
      persistent?: boolean;
      context?: ErrorContext;
    } = {}
  ): string {
    const id = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const feedbackMessage: FeedbackMessage = {
      id,
      type,
      title,
      message,
      duration: options.duration ?? (type === 'error' ? 0 : 5000),
      actions: options.actions || [],
      timestamp: Date.now(),
      dismissible: options.dismissible ?? true,
      persistent: options.persistent ?? false
    };

    // Zur Queue hinzufügen
    this.messageQueue.push(feedbackMessage);
    
    // Store aktualisieren
    feedbackMessages.update(messages => [...messages, feedbackMessage]);

    // Auto-dismiss nach Duration
    if (feedbackMessage.duration && feedbackMessage.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, feedbackMessage.duration);
    }

    // Error-Logging
    if (type === 'error' && options.context) {
      this.logError(new Error(message), options.context);
    }

    // Browser-Benachrichtigung für wichtige Nachrichten
    if (type === 'error' || type === 'warning') {
      notificationManager.notify('system_message', title, message);
    }

    return id;
  }

  /**
   * Schließt eine Feedback-Nachricht
   */
  dismiss(id: string): void {
    feedbackMessages.update(messages => 
      messages.filter(msg => msg.id !== id)
    );
  }

  /**
   * Schließt alle Nachrichten eines Typs
   */
  dismissByType(type: FeedbackType): void {
    feedbackMessages.update(messages => 
      messages.filter(msg => msg.type !== type)
    );
  }

  /**
   * Schließt alle Nachrichten
   */
  dismissAll(): void {
    feedbackMessages.set([]);
  }

  /**
   * Zeigt Erfolgs-Nachricht
   */
  success(title: string, message: string, actions?: FeedbackAction[]): string {
    return this.show('success', title, message, { actions, duration: 3000 });
  }

  /**
   * Zeigt Fehler-Nachricht
   */
  error(title: string, message: string, context?: ErrorContext, actions?: FeedbackAction[]): string {
    this.errorCount++;
    return this.show('error', title, message, { 
      actions, 
      context, 
      duration: 0, 
      persistent: true 
    });
  }

  /**
   * Zeigt Warnung
   */
  warning(title: string, message: string, actions?: FeedbackAction[]): string {
    return this.show('warning', title, message, { actions, duration: 7000 });
  }

  /**
   * Zeigt Info-Nachricht
   */
  info(title: string, message: string, actions?: FeedbackAction[]): string {
    return this.show('info', title, message, { actions, duration: 4000 });
  }

  /**
   * Zeigt Loading-Nachricht
   */
  loading(message: string = 'Lädt...'): string {
    isLoading.set(true);
    loadingMessage.set(message);
    
    return this.show('loading', 'Bitte warten', message, { 
      duration: 0, 
      dismissible: false,
      persistent: true 
    });
  }

  /**
   * Versteckt Loading-Nachricht
   */
  hideLoading(): void {
    isLoading.set(false);
    loadingMessage.set('');
    this.dismissByType('loading');
  }

  /**
   * Loggt einen Fehler
   */
  private logError(error: Error, context: ErrorContext): void {
    const errorEntry = {
      error,
      context,
      timestamp: Date.now()
    };

    errorLog.update(log => [...log.slice(-99), errorEntry]); // Nur letzte 100 Fehler behalten

    // Console-Logging für Development
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.group('🚨 Fehler geloggt');
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Timestamp:', new Date(errorEntry.timestamp).toISOString());
      console.groupEnd();
    }

    // Performance-Metriken aktualisieren
    this.updateErrorRate();
  }

  /**
   * Behandelt unbehandelte Fehler
   */
  private setupErrorHandling(): void {
    if (typeof window === 'undefined') return;

    // Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error(
        'Unbehandelter Fehler',
        `Ein unerwarteter Fehler ist aufgetreten: ${event.reason}`,
        { component: 'global', action: 'unhandledrejection' }
      );
    });

    // JavaScript Errors
    window.addEventListener('error', (event) => {
      this.error(
        'JavaScript Fehler',
        `${event.message} in ${event.filename}:${event.lineno}`,
        { 
          component: 'global', 
          action: 'javascript_error',
          metadata: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      );
    });
  }

  /**
   * Initialisiert Performance-Monitoring
   */
  private initializePerformanceMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      // Navigation Timing
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            performanceMetrics.update(metrics => ({
              ...metrics,
              loadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
              renderTime: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart
            }));
          }
        }
      });

      this.performanceObserver.observe({ entryTypes: ['navigation', 'measure'] });

    } catch (error) {
      console.warn('Performance-Monitoring nicht verfügbar:', error);
    }
  }

  /**
   * Aktualisiert Error-Rate
   */
  private updateErrorRate(): void {
    const runtime = Date.now() - this.startTime;
    const errorRate = (this.errorCount / (runtime / 1000)) * 60; // Fehler pro Minute

    performanceMetrics.update(metrics => ({
      ...metrics,
      errorRate
    }));
  }

  /**
   * Misst API-Response-Zeit
   */
  measureApiResponse<T>(promise: Promise<T>, endpoint: string): Promise<T> {
    const startTime = performance.now();
    
    return promise
      .then(result => {
        const responseTime = performance.now() - startTime;
        performanceMetrics.update(metrics => ({
          ...metrics,
          apiResponseTime: responseTime
        }));
        
        // Warnung bei langsamen API-Calls
        if (responseTime > 5000) {
          this.warning(
            'Langsame Verbindung',
            `API-Aufruf zu ${endpoint} dauerte ${Math.round(responseTime)}ms`
          );
        }
        
        return result;
      })
      .catch(error => {
        const responseTime = performance.now() - startTime;
        this.error(
          'API-Fehler',
          `Fehler bei ${endpoint}: ${error.message}`,
          { 
            component: 'api', 
            action: endpoint,
            metadata: { responseTime, error: error.message }
          }
        );
        throw error;
      });
  }

  /**
   * Sammelt Benutzer-Feedback
   */
  collectUserFeedback(satisfaction: number, feedback?: string): void {
    performanceMetrics.update(metrics => ({
      ...metrics,
      userSatisfaction: satisfaction
    }));

    if (feedback) {
      this.info(
        'Feedback erhalten',
        'Vielen Dank für Ihr Feedback!'
      );
    }

    // Feedback an Analytics senden (falls implementiert)
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('user_feedback', {
        satisfaction,
        feedback,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Exportiert Error-Log für Support
   */
  exportErrorLog(): string {
    let currentErrorLog: any[] = [];
    errorLog.subscribe(log => currentErrorLog = log)();

    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errors: currentErrorLog.map(entry => ({
        message: entry.error.message,
        stack: entry.error.stack,
        context: entry.context,
        timestamp: new Date(entry.timestamp).toISOString()
      })),
      performance: null as any
    };

    performanceMetrics.subscribe(metrics => exportData.performance = metrics)();

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Bereinigt alte Daten
   */
  cleanup(): void {
    // Alte Nachrichten entfernen
    feedbackMessages.update(messages => 
      messages.filter(msg => 
        msg.persistent || (Date.now() - msg.timestamp) < 300000 // 5 Minuten
      )
    );

    // Alte Fehler entfernen
    errorLog.update(log => 
      log.filter(entry => (Date.now() - entry.timestamp) < 3600000) // 1 Stunde
    );

    // Performance Observer stoppen
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Singleton-Instanz
export const feedbackManager = new FeedbackManager();

// Convenience-Funktionen
export const feedback = {
  success: (title: string, message: string, actions?: FeedbackAction[]) => 
    feedbackManager.success(title, message, actions),
    
  error: (title: string, message: string, context?: ErrorContext, actions?: FeedbackAction[]) => 
    feedbackManager.error(title, message, context, actions),
    
  warning: (title: string, message: string, actions?: FeedbackAction[]) => 
    feedbackManager.warning(title, message, actions),
    
  info: (title: string, message: string, actions?: FeedbackAction[]) => 
    feedbackManager.info(title, message, actions),
    
  loading: (message?: string) => 
    feedbackManager.loading(message),
    
  hideLoading: () => 
    feedbackManager.hideLoading(),
    
  dismiss: (id: string) => 
    feedbackManager.dismiss(id),
    
  dismissAll: () => 
    feedbackManager.dismissAll()
};

// Auto-cleanup alle 5 Minuten
if (typeof window !== 'undefined') {
  setInterval(() => {
    feedbackManager.cleanup();
  }, 300000);
}