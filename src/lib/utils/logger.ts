/**
 * Logger Utility
 * 
 * Umgebungs-basiertes Logging-System:
 * - Development: Alle Logs werden ausgegeben
 * - Production: Nur Errors werden ausgegeben
 */

const isDev = import.meta.env?.DEV ?? true;

/**
 * Log-Levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Logger mit verschiedenen Log-Levels
 */
export const logger = {
  /**
   * Debug-Logs - nur in Development
   * Für detaillierte Debugging-Informationen
   */
  debug: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Info-Logs - nur in Development
   * Für allgemeine Informationen über den Programmablauf
   */
  info: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  },

  /**
   * Warning-Logs - nur in Development
   * Für Warnungen die keine Fehler sind
   */
  warn: (message: string, ...args: any[]) => {
    if (isDev) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  },

  /**
   * Error-Logs - IMMER (auch in Production!)
   * Für echte Fehler die geloggt werden müssen
   */
  error: (message: string, ...args: any[]) => {
    console.error(`❌ [ERROR] ${message}`, ...args);
  },

  /**
   * Success-Logs - nur in Development
   * Für erfolgreiche Operationen
   */
  success: (message: string, ...args: any[]) => {
    if (isDev) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }
};

/**
 * Spezialisierte Logger für verschiedene Module
 */

/**
 * Nostr-Logger
 */
export const nostrLogger = {
  relay: (message: string, ...args: any[]) => {
    if (isDev) console.log(`📡 [RELAY] ${message}`, ...args);
  },
  
  event: (message: string, ...args: any[]) => {
    if (isDev) console.log(`📨 [EVENT] ${message}`, ...args);
  },
  
  crypto: (message: string, ...args: any[]) => {
    if (isDev) console.log(`🔐 [CRYPTO] ${message}`, ...args);
  },
  
  profile: (message: string, ...args: any[]) => {
    if (isDev) console.log(`👤 [PROFILE] ${message}`, ...args);
  }
};

/**
 * Marketplace-Logger
 */
export const marketplaceLogger = {
  offer: (message: string, ...args: any[]) => {
    if (isDev) console.log(`🛒 [OFFER] ${message}`, ...args);
  },
  
  interest: (message: string, ...args: any[]) => {
    if (isDev) console.log(`💌 [INTEREST] ${message}`, ...args);
  },
  
  deal: (message: string, ...args: any[]) => {
    if (isDev) console.log(`🤝 [DEAL] ${message}`, ...args);
  }
};

/**
 * Security-Logger
 */
export const securityLogger = {
  auth: (message: string, ...args: any[]) => {
    if (isDev) console.log(`🔒 [AUTH] ${message}`, ...args);
  },
  
  admin: (message: string, ...args: any[]) => {
    if (isDev) console.log(`👑 [ADMIN] ${message}`, ...args);
  },
  
  whitelist: (message: string, ...args: any[]) => {
    if (isDev) console.log(`📋 [WHITELIST] ${message}`, ...args);
  }
};
