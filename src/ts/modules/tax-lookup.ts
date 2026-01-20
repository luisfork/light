/**
 * Tax Lookup Module
 *
 * Provides local tax rate lookups by ZIP code
 * for Texas electricity billing.
 *
 * VULNERABILITY FIXED: Added types for tax data structures
 * VULNERABILITY FIXED: Safe property access with optional chaining
 * VULNERABILITY FIXED: Type-safe ZIP code parsing
 */

// Types are locally defined for this standalone module

/**
 * City tax data structure.
 */
interface CityTaxData {
  readonly rate: number;
  readonly tdu: string | null;
  readonly deregulated?: boolean;
  readonly note?: string;
  readonly zip_codes?: readonly string[];
}

/**
 * ZIP range tax data structure.
 */
interface RangeTaxData {
  readonly rate: number;
  readonly region: string;
  readonly tdu: string | null;
  readonly note?: string;
}

/**
 * Full tax data file structure.
 */
interface TaxDataFile {
  readonly major_cities?: Record<string, CityTaxData>;
  readonly zip_code_ranges?: Record<string, RangeTaxData>;
  readonly default_local_rate?: number;
}

/**
 * Extended tax info with deregulation details.
 */
interface ExtendedTaxInfo {
  readonly rate: number;
  readonly city?: string;
  readonly tdu: string | null;
  readonly region?: string;
  readonly deregulated: boolean;
  readonly note: string | null;
}

/**
 * Deregulation status result.
 */
interface DeregulationStatus {
  readonly isDeregulated: boolean;
  readonly tdu: string | null;
  readonly reason: string | null;
}

/**
 * Tax Lookup singleton.
 * Handles ZIP code to tax rate mapping.
 */
const TaxLookup = {
  /**
   * Get local tax rate information for a ZIP code.
   *
   * VULNERABILITY FIXED: Safe property access throughout
   * VULNERABILITY FIXED: Validated ZIP code parsing
   *
   * @param zipCode - 5-digit ZIP code string
   * @param taxData - Tax data object from local-taxes.json
   * @returns Tax info object with rate and details
   */
  getLocalTaxInfo(zipCode: string, taxData: TaxDataFile): ExtendedTaxInfo {
    const zip = Number.parseInt(zipCode, 10);

    // VULNERABILITY FIXED: Validate parsed ZIP is a number
    if (Number.isNaN(zip)) {
      return {
        rate: taxData.default_local_rate ?? 0,
        region: 'Texas',
        tdu: null,
        deregulated: true,
        note: 'Invalid ZIP code'
      };
    }

    // Check major cities first for exact ZIP match
    const majorCities = taxData.major_cities;
    if (majorCities !== undefined) {
      for (const [cityName, cityData] of Object.entries(majorCities)) {
        // VULNERABILITY FIXED: Safe access to zip_codes array
        if (cityData.zip_codes?.includes(zipCode) === true) {
          return {
            rate: cityData.rate ?? 0,
            city: cityName.replace(/_/g, ' '),
            tdu: cityData.tdu,
            deregulated: cityData.deregulated !== false,
            note: cityData.note ?? null
          };
        }
      }
    }

    // Check ZIP code ranges
    const zipRanges = taxData.zip_code_ranges;
    if (zipRanges !== undefined) {
      for (const [range, rangeData] of Object.entries(zipRanges)) {
        const parts = range.split('-');
        // VULNERABILITY FIXED: Safe destructuring with validation
        if (parts.length !== 2) continue;

        const minStr = parts[0];
        const maxStr = parts[1];
        if (minStr === undefined || maxStr === undefined) continue;

        const min = Number.parseInt(minStr, 10);
        const max = Number.parseInt(maxStr, 10);

        if (!Number.isNaN(min) && !Number.isNaN(max) && zip >= min && zip <= max) {
          return {
            rate: rangeData.rate ?? 0,
            region: rangeData.region,
            tdu: rangeData.tdu,
            deregulated: rangeData.tdu !== null,
            note: rangeData.note ?? null
          };
        }
      }
    }

    // Default response
    return {
      rate: taxData.default_local_rate ?? 0,
      region: 'Texas',
      tdu: null,
      deregulated: true,
      note: null
    };
  },

  /**
   * Get local tax rate for a ZIP code (simplified).
   *
   * @param zipCode - 5-digit ZIP code
   * @param taxData - Tax data object
   * @returns Local tax rate (0.0 - 1.0)
   */
  getLocalTaxRate(zipCode: string, taxData: TaxDataFile): number {
    const info = this.getLocalTaxInfo(zipCode, taxData);
    return info.rate;
  },

  /**
   * Check if a ZIP code is in a deregulated area.
   *
   * @param zipCode - 5-digit ZIP code
   * @param taxData - Tax data object
   * @returns Deregulation info
   */
  checkDeregulationStatus(zipCode: string, taxData: TaxDataFile): DeregulationStatus {
    const info = this.getLocalTaxInfo(zipCode, taxData);
    return {
      isDeregulated: info.deregulated,
      tdu: info.tdu,
      reason: info.note
    };
  }
};

export default TaxLookup;

// Named export for tree-shaking
export { TaxLookup };

// Type exports for consumers
export type { TaxDataFile, CityTaxData, RangeTaxData, ExtendedTaxInfo, DeregulationStatus };

// Browser environment: attach to window for compatibility
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).TaxLookup = TaxLookup;
}

// CommonJS export for Node.js compatibility (tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TaxLookup;
}
