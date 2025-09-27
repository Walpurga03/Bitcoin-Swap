// Sichere Konfigurationsverwaltung für Bitcoin Tausch Netzwerk

interface AppConfig {
  groupSecrets: Record<string, string>;
  defaultRelay: string;
  allowedRelays: string[];
  adminSettings: {
    maxGroupSize: number;
    messageRetentionDays: number;
  };
}

let config: AppConfig | null = null;

/**
 * Lädt die Konfiguration aus config.json (falls vorhanden)
 * Fallback auf Standardwerte wenn Datei nicht existiert
 */
export async function loadConfig(): Promise<AppConfig> {
  if (config) {
    return config;
  }

  try {
    // Versuche config.json zu laden
    const response = await fetch('/src/config.json');
    if (response.ok) {
      config = await response.json();
      console.log('✅ Konfiguration aus config.json geladen');
    } else {
      throw new Error('config.json nicht gefunden');
    }
  } catch (error) {
    console.warn('⚠️ config.json nicht gefunden, verwende Standardkonfiguration');
    
    // Fallback-Konfiguration
    config = {
      groupSecrets: {
        'default': 'change-this-secret-in-production'
      },
      defaultRelay: 'wss://relay.damus.io',
      allowedRelays: [
        'wss://relay.damus.io',
        'wss://nos.lol',
        'wss://relay.nostr.band',
        'wss://nostr.wine',
        'wss://relay.snort.social'
      ],
      adminSettings: {
        maxGroupSize: 50,
        messageRetentionDays: 30
      }
    };
  }

  return config!;
}

/**
 * Gibt alle verfügbaren Gruppen-Secrets zurück
 */
export async function getGroupSecrets(): Promise<Record<string, string>> {
  const cfg = await loadConfig();
  return cfg.groupSecrets;
}

/**
 * Prüft ob ein Secret gültig ist
 */
export async function isValidSecret(secret: string): Promise<boolean> {
  const secrets = await getGroupSecrets();
  return Object.values(secrets).includes(secret);
}

/**
 * Gibt den Standard-Relay zurück
 */
export async function getDefaultRelay(): Promise<string> {
  const cfg = await loadConfig();
  return cfg.defaultRelay;
}

/**
 * Gibt alle erlaubten Relays zurück
 */
export async function getAllowedRelays(): Promise<string[]> {
  const cfg = await loadConfig();
  return cfg.allowedRelays;
}

/**
 * Gibt Admin-Einstellungen zurück
 */
export async function getAdminSettings() {
  const cfg = await loadConfig();
  return cfg.adminSettings;
}

/**
 * Erstellt einen Einladungslink mit validiertem Secret
 */
export async function createSecureInviteLink(
  baseUrl: string, 
  relay: string, 
  secretKey: string
): Promise<string> {
  const secrets = await getGroupSecrets();
  
  if (!secrets[secretKey]) {
    throw new Error(`Unbekannter Secret-Key: ${secretKey}`);
  }

  const secret = secrets[secretKey];
  const url = new URL(baseUrl);
  url.searchParams.set('relay', relay);
  url.searchParams.set('secret', secret);
  
  return url.toString();
}

/**
 * Gibt alle verfügbaren Gruppen zurück (für Admin-Interface)
 */
export async function getAvailableGroups(): Promise<Array<{key: string, name: string}>> {
  const secrets = await getGroupSecrets();
  
  return Object.keys(secrets).map(key => ({
    key,
    name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));
}