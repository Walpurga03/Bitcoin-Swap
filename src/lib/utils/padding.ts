/**
 * Padding-Utility für anonyme Nachrichten
 * 
 * Bringt alle Nachrichten auf die gleiche Größe um Metadaten-Analyse zu verhindern
 */

/**
 * Paddet eine Nachricht auf eine Zielgröße
 * @param data - Die zu paddende Nachricht (wird als JSON serialisiert)
 * @param targetSize - Zielgröße in Zeichen (Standard: 500)
 * @returns JSON-String mit Padding
 */
export function padMessageForAnonymity(data: any, targetSize = 500): string {
  const json = JSON.stringify(data);
  const paddingNeeded = Math.max(0, targetSize - json.length);
  
  // Füge Padding als zusätzliches Feld hinzu
  const paddedData = {
    ...data,
    _p: 'x'.repeat(paddingNeeded)  // Kurzer Name spart Platz
  };
  
  return JSON.stringify(paddedData);
}

/**
 * Entfernt Padding aus einer Nachricht
 * @param paddedJson - JSON-String mit Padding
 * @returns Originale Daten ohne Padding-Feld
 */
export function removePadding(paddedJson: string): any {
  const data = JSON.parse(paddedJson);
  
  // Entferne Padding-Feld
  if (data._p !== undefined) {
    delete data._p;
  }
  
  return data;
}

/**
 * Generiert einen zufälligen Delay (0-maxSeconds)
 * @param maxSeconds - Maximale Sekunden (Standard: 30)
 * @returns Delay in Millisekunden
 */
export function generateRandomDelay(maxSeconds = 30): number {
  return Math.floor(Math.random() * maxSeconds * 1000);
}
