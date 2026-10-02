import type { FlagType, LabResult } from '../types/medical.ts';
import refRangesData from '../../knowledge/reference_ranges.json';

interface RangeConfig {
  low: number | null;
  high: number | null;
  unit?: string;
}

interface TestRefMeta {
  canonical_name: string;
  aliases: string[];
  category: string;
  default_unit: string;
  ranges: {
    male?: RangeConfig;
    female?: RangeConfig;
    default: RangeConfig;
  };
  critical_thresholds?: {
    critical_low?: number | null;
    critical_high?: number | null;
  };
}

const testsDb: Record<string, TestRefMeta> = (refRangesData as any).tests || {};

// Build alias lookup table for fast canonical name resolution
const aliasMap = new Map<string, string>();
for (const [canonicalName, meta] of Object.entries(testsDb)) {
  aliasMap.set(canonicalName.toLowerCase().trim(), canonicalName);
  for (const alias of meta.aliases) {
    aliasMap.set(alias.toLowerCase().trim(), canonicalName);
  }
}

/**
 * Resolves any test name or alias to canonical form
 */
export function resolveCanonicalName(name: string): string {
  const clean = name.trim().toLowerCase();
  if (aliasMap.has(clean)) {
    return aliasMap.get(clean)!;
  }
  // Try substring or normalized matching
  for (const [alias, canonical] of aliasMap.entries()) {
    if (clean === alias || clean.startsWith(alias) || alias.startsWith(clean)) {
      return canonical;
    }
  }
  return name.trim();
}

/**
 * Parses diverse textual reference range formats into numeric low and high bounds
 */
export function parseReferenceRange(refText: string | null | undefined): {
  low: number | null;
  high: number | null;
} {
  if (!refText) return { low: null, high: null };

  const cleaned = refText
    .replace(/[–—]/g, '-')
    .replace(/,/g, '')
    .trim();

  // Pattern: "13.0 - 17.5" or "13 to 17.5"
  const rangeMatch = cleaned.match(/([\d.]+)\s*(?:-|to)\s*([\d.]+)/i);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (!isNaN(low) && !isNaN(high)) {
      return { low, high };
    }
  }

  // Pattern: "< 200" or "<= 200" or "Less than 200" or "Up to 200"
  const lessMatch = cleaned.match(/(?:<|<=|less than|up to)\s*([\d.]+)/i);
  if (lessMatch) {
    const high = parseFloat(lessMatch[1]);
    if (!isNaN(high)) {
      return { low: null, high };
    }
  }

  // Pattern: "> 40" or ">= 40" or "Greater than 40" or "More than 40"
  const greaterMatch = cleaned.match(/(?:>|>=|greater than|more than)\s*([\d.]+)/i);
  if (greaterMatch) {
    const low = parseFloat(greaterMatch[1]);
    if (!isNaN(low)) {
      return { low, high: null };
    }
  }

  return { low: null, high: null };
}

/**
 * Pure deterministic flagging logic.
 * Never uses an LLM. Checks report ranges first, then standard biological ranges,
 * and rigorously tests against critical thresholds.
 */
export function determineFlag(
  canonicalName: string,
  value: number | null,
  refLow: number | null,
  refHigh: number | null,
  sex?: 'male' | 'female' | 'other' | null,
  _age?: number | null
): { flag: FlagType; effectiveLow: number | null; effectiveHigh: number | null } {
  if (value === null || isNaN(value)) {
    return { flag: 'unknown', effectiveLow: refLow, effectiveHigh: refHigh };
  }

  const meta = testsDb[canonicalName];
  let effectiveLow = refLow;
  let effectiveHigh = refHigh;

  // If bounds not supplied in report, fall back to medical knowledge base
  if (effectiveLow === null && effectiveHigh === null && meta) {
    let range: RangeConfig = meta.ranges.default;
    if (sex === 'male' && meta.ranges.male) {
      range = meta.ranges.male;
    } else if (sex === 'female' && meta.ranges.female) {
      range = meta.ranges.female;
    }
    effectiveLow = range.low ?? null;
    effectiveHigh = range.high ?? null;
  }

  // Check critical thresholds first
  if (meta?.critical_thresholds) {
    const { critical_low, critical_high } = meta.critical_thresholds;
    if (critical_low !== null && critical_low !== undefined && value <= critical_low) {
      return { flag: 'critical_low', effectiveLow, effectiveHigh };
    }
    if (critical_high !== null && critical_high !== undefined && value >= critical_high) {
      return { flag: 'critical_high', effectiveLow, effectiveHigh };
    }
  }

  // Compare against normal reference bounds
  if (effectiveLow !== null && value < effectiveLow) {
    return { flag: 'low', effectiveLow, effectiveHigh };
  }
  if (effectiveHigh !== null && value > effectiveHigh) {
    return { flag: 'high', effectiveLow, effectiveHigh };
  }
  if (effectiveLow !== null || effectiveHigh !== null) {
    return { flag: 'normal', effectiveLow, effectiveHigh };
  }

  return { flag: 'unknown', effectiveLow, effectiveHigh };
}

/**
 * Normalizes an extracted lab item into a validated LabResult
 */
export function normalizeLabResult(
  item: {
    test_name: string;
    raw_name?: string;
    value?: number | null;
    value_text?: string | null;
    unit?: string | null;
    ref_low?: number | null;
    ref_high?: number | null;
    ref_text?: string | null;
    confidence?: number;
  },
  sex?: 'male' | 'female' | 'other' | null,
  age?: number | null
): LabResult {
  const canonical = resolveCanonicalName(item.test_name || item.raw_name || 'Unknown');
  const rawName = item.raw_name || item.test_name || canonical;

  let low = item.ref_low ?? null;
  let high = item.ref_high ?? null;

  if (low === null && high === null && item.ref_text) {
    const parsed = parseReferenceRange(item.ref_text);
    low = parsed.low;
    high = parsed.high;
  }

  const { flag, effectiveLow, effectiveHigh } = determineFlag(
    canonical,
    item.value ?? null,
    low,
    high,
    sex,
    age
  );

  return {
    test_name: canonical,
    raw_name: rawName,
    value: item.value ?? null,
    value_text: item.value_text ?? (item.value !== null && item.value !== undefined ? String(item.value) : null),
    unit: item.unit ?? testsDb[canonical]?.default_unit ?? null,
    ref_low: effectiveLow,
    ref_high: effectiveHigh,
    ref_text: item.ref_text ?? (effectiveLow !== null && effectiveHigh !== null ? `${effectiveLow} - ${effectiveHigh}` : null),
    flag,
    confidence: typeof item.confidence === 'number' ? item.confidence : 0.95,
  };
}
