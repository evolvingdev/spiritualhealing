export interface LegalSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly sections: readonly LegalSection[];
}

/**
 * Text that only the business can supply (legal entity, contacts, periods). Shown as-is so a
 * missing detail is visible, never silently invented.
 */
export const TO_BE_CONFIRMED = '[TO BE CONFIRMED]';
