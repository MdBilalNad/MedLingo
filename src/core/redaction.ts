export interface RedactionResult {
  redactedText: string;
  detectedPiiCount: number;
  redactedTypes: string[];
}

/**
 * Masks Personally Identifiable Information (PII) before any external API transmission.
 * Masks: Names, Patient IDs, MRNs, DOBs, Phone numbers, Emails, and Addresses.
 * Preserves age and sex tokens when provided.
 */
export function redactPii(text: string): RedactionResult {
  let redacted = text;
  let count = 0;
  const typesFound = new Set<string>();

  // 1. Patient Name patterns
  const namePatterns = [
    /(?:Patient\s*Name|Patient|Pt\s*Name|Name)\s*:\s*([A-Z][a-zA-Z\s,.'-]+)(?=\r?\n|$)/gi,
    /(?:Doctor|Physician|Dr\.|Referred\s*By)\s*:\s*([A-Z][a-zA-Z\s,.'-]+)(?=\r?\n|$)/gi,
  ];

  for (const pat of namePatterns) {
    redacted = redacted.replace(pat, (match, p1) => {
      count++;
      typesFound.add('NAME');
      return match.replace(p1.trim(), '[REDACTED_NAME]');
    });
  }

  // 2. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  if (emailRegex.test(redacted)) {
    typesFound.add('EMAIL');
    redacted = redacted.replace(emailRegex, () => {
      count++;
      return '[REDACTED_EMAIL]';
    });
  }

  // 3. Phone numbers (various formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  if (phoneRegex.test(redacted)) {
    typesFound.add('PHONE');
    redacted = redacted.replace(phoneRegex, () => {
      count++;
      return '[REDACTED_PHONE]';
    });
  }

  // 4. Date of Birth (DOB)
  const dobRegex = /(?:DOB|Date\s*of\s*Birth|Birth\s*Date)\s*:\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/gi;
  if (dobRegex.test(redacted)) {
    typesFound.add('DOB');
    redacted = redacted.replace(dobRegex, (match, p1) => {
      count++;
      return match.replace(p1.trim(), '[REDACTED_DOB]');
    });
  }

  // 5. Patient ID, MRN, Barcode, Sample ID, Accession #
  const idRegex = /(?:MRN|Patient\s*ID|PID|Accession\s*#?|Sample\s*ID|Barcode|UHID|Lab\s*No\.?)\s*:\s*([A-Za-z0-9-]+)/gi;
  if (idRegex.test(redacted)) {
    typesFound.add('ID');
    redacted = redacted.replace(idRegex, (match, p1) => {
      count++;
      return match.replace(p1.trim(), '[REDACTED_ID]');
    });
  }

  // 6. Street addresses
  const addressRegex = /(?:Address|Residence)\s*:\s*([^\n\r]+)/gi;
  if (addressRegex.test(redacted)) {
    typesFound.add('ADDRESS');
    redacted = redacted.replace(addressRegex, (match, p1) => {
      count++;
      return match.replace(p1.trim(), '[REDACTED_ADDRESS]');
    });
  }

  return {
    redactedText: redacted,
    detectedPiiCount: count,
    redactedTypes: Array.from(typesFound),
  };
}
