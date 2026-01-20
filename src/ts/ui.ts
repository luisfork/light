/**
 * User Interface Module
 *
 * Handles all UI interactions, form state, and results display.
 *
 * VULNERABILITY FIXED: Full type safety for DOM operations
 * VULNERABILITY FIXED: Null-safe element access throughout
 */

import { API } from './api';
import { CostCalculator } from './modules/cost-calculator';
import { ETFCalculator } from './modules/etf-calculator';
import { formatCurrency, formatRate, getMonthName } from './modules/formatters';
import { PlanRanker } from './modules/plan-ranker';
import { UsageEstimator } from './modules/usage-estimator';
import type { ElectricityPlan, QualityGrade, TaxInfo, TDURate } from './types';
import Logger from './utils/logger';
import {
  animateSpring,
  applyStaggeredDelay,
  SpringPresets,
  setupScrollReveal
} from './utils/motion';

// ==============================
// Types
// ==============================

/**
 * Toast notification type.
 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Usage input method.
 */
type UsageMethod = 'estimate' | 'average' | 'detailed';

/**
 * Sort direction.
 */
type SortDirection = 'asc' | 'desc';

/**
 * UI State.
 */
interface UIState {
  zipCode: string | null;
  tdu: TDURate | null;
  usageMethod: UsageMethod;
  homeSize: string | null;
  avgUsage: number | null;
  monthlyUsage: number[];
  rankedPlans: ElectricityPlan[] | null;
  isLoading: boolean;
  autoCalculateTimer: ReturnType<typeof setTimeout> | null;
  zipValidationTimer: ReturnType<typeof setTimeout> | null;
  lastCalculation: Date | null;
  localTaxRate: number;
  taxInfo: TaxInfo | null;
  data?: {
    duplicate_count?: number;
    total_plans?: number;
    original_plan_count?: number;
    orphaned_english_count?: number;
    orphaned_spanish_count?: number;
  };
  freshness?: {
    totalPlans: number;
    originalPlanCount: number;
    duplicateCount: number;
    orphanedEnglishCount?: number;
    orphanedSpanishCount?: number;
  };
}

/**
 * Cached UI elements.
 */
interface UIElements {
  // Hero
  totalPlansCount: HTMLElement | null;
  lastUpdate: HTMLElement | null;
  // Step 1: Location
  zipInput: HTMLInputElement | null;
  zipStatus: HTMLElement | null;
  tduDisplay: HTMLElement | null;
  tduName: HTMLElement | null;
  tduBase: HTMLElement | null;
  tduRate: HTMLElement | null;
  tduArea: HTMLElement | null;
  // Step 2: Usage
  stepUsage: HTMLElement | null;
  methodOptions: NodeListOf<HTMLElement>;
  panelEstimate: HTMLElement | null;
  panelAverage: HTMLElement | null;
  panelDetailed: HTMLElement | null;
  homeSize: HTMLSelectElement | null;
  avgKwh: HTMLInputElement | null;
  annualUsageTotal: HTMLElement | null;
  monthlyUsageAvg: HTMLElement | null;
  calculateBtn: HTMLButtonElement | null;
  // Results
  resultsSection: HTMLElement | null;
  resultsCount: HTMLElement | null;
  usageChart: HTMLElement | null;
  profileAnnual: HTMLElement | null;
  profileAvg: HTMLElement | null;
  profilePeak: HTMLElement | null;
  topPlans: HTMLElement | null;
  warningsSection: HTMLElement | null;
  warningPlans: HTMLElement | null;
  comparisonBody: HTMLElement | null;
  filterTerm: HTMLSelectElement | null;
  filterRenewable: HTMLSelectElement | null;
  // Modal
  modalBackdrop: HTMLElement | null;
  modalBody: HTMLElement | null;
  modalClose: HTMLButtonElement | null;
  // Status
  calculationStatus: HTMLElement | null;
  statusIdle: HTMLElement | null;
  statusLoading: HTMLElement | null;
  statusReady: HTMLElement | null;
}

/**
 * Sort state.
 */
interface SortState {
  column: string | null;
  direction: SortDirection;
}

/**
 * Ranked plan with computed metrics.
 */
interface RankedPlanWithMetrics extends ElectricityPlan {
  annualCost: number;
  averageMonthlyCost: number;
  effectiveRate: number;
  monthlyCosts: readonly number[];
  qualityScore: number;
  combinedScore: number;
  warnings: string[];
  isGimmick: boolean;
  contractEndTimestamp?: number;
}

// ==============================
// Logger
// ==============================

const logger = Logger.withPrefix('UI');

// ==============================
// Toast Notification System
// ==============================

const Toast = {
  container: null as HTMLElement | null,

  icons: {
    success: '&#10003;',
    error: '&#10007;',
    warning: '!',
    info: 'i'
  } as const,

  titles: {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information'
  } as const,

  init(): void {
    this.container = document.getElementById('toast-container');
    if (this.container === null) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  },

  show(
    message: string,
    type: ToastType = 'info',
    duration: number = 5000,
    title?: string
  ): HTMLElement {
    if (this.container === null) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const displayTitle = title ?? this.titles[type] ?? 'Notification';
    const icon = this.icons[type] ?? this.icons.info;

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(displayTitle)}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss notification">&times;</button>
      ${
        duration > 0
          ? `<div class="toast-progress"><div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div></div>`
          : ''
      }
    `;

    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn !== null) {
      closeBtn.addEventListener('click', () => this.dismiss(toast));
    }

    this.container?.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  },

  dismiss(toast: HTMLElement): void {
    if (toast.parentNode === null) return;
    toast.classList.add('toast-out');
    setTimeout(() => {
      if (toast.parentNode !== null) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  },

  success(msg: string, duration: number = 5000, title: string = 'Success'): HTMLElement {
    return this.show(msg, 'success', duration, title);
  },

  error(msg: string, duration: number = 8000, title: string = 'Error'): HTMLElement {
    return this.show(msg, 'error', duration, title);
  },

  warning(msg: string, duration: number = 6000, title: string = 'Attention'): HTMLElement {
    return this.show(msg, 'warning', duration, title);
  },

  info(msg: string, duration: number = 5000, title: string = 'Information'): HTMLElement {
    return this.show(msg, 'info', duration, title);
  },

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ==============================
// Main UI Controller
// ==============================

const UI = {
  state: {
    zipCode: null,
    tdu: null,
    usageMethod: 'estimate',
    homeSize: null,
    avgUsage: null,
    monthlyUsage: Array(12).fill(0),
    rankedPlans: null,
    isLoading: false,
    autoCalculateTimer: null,
    zipValidationTimer: null,
    lastCalculation: null,
    localTaxRate: 0,
    taxInfo: null
  } as UIState,

  elements: {} as UIElements,

  sortState: { column: null, direction: 'desc' } as SortState,

  AUTO_CALCULATE_DELAY: 500,
  ZIP_VALIDATION_DELAY: 300,

  async init(): Promise<void> {
    this.cacheElements();
    Toast.init();
    this.attachEventListeners();
    this.setupMotion();

    try {
      const { plans } = await API.preloadAll();
      this.updateHeroMetrics();
      Toast.success(
        `${plans.total_plans.toLocaleString()} electricity plans ready for comparison.`,
        5000,
        'Data Loaded'
      );
    } catch (error) {
      Toast.error(
        'Unable to load plan data. Please check your connection and refresh.',
        0,
        'Connection Error'
      );
      logger.error('Init error', { error });
    }
  },

  cacheElements(): void {
    this.elements = {
      // Hero
      totalPlansCount: document.getElementById('total-plans-count'),
      lastUpdate: document.getElementById('last-update'),
      // Step 1
      zipInput: document.getElementById('zip-code') as HTMLInputElement | null,
      zipStatus: document.getElementById('zip-status'),
      tduDisplay: document.getElementById('tdu-display'),
      tduName: document.getElementById('tdu-name'),
      tduBase: document.getElementById('tdu-base'),
      tduRate: document.getElementById('tdu-rate'),
      tduArea: document.getElementById('tdu-area'),
      // Step 2
      stepUsage: document.getElementById('step-usage'),
      methodOptions: document.querySelectorAll('.method-option') as NodeListOf<HTMLElement>,
      panelEstimate: document.getElementById('panel-estimate'),
      panelAverage: document.getElementById('panel-average'),
      panelDetailed: document.getElementById('panel-detailed'),
      homeSize: document.getElementById('home-size') as HTMLSelectElement | null,
      avgKwh: document.getElementById('avg-kwh') as HTMLInputElement | null,
      annualUsageTotal: document.getElementById('annual-usage-total'),
      monthlyUsageAvg: document.getElementById('monthly-usage-avg'),
      calculateBtn: document.getElementById('calculate-btn') as HTMLButtonElement | null,
      // Results
      resultsSection: document.getElementById('results-section'),
      resultsCount: document.getElementById('results-count'),
      usageChart: document.getElementById('usage-chart'),
      profileAnnual: document.getElementById('profile-annual'),
      profileAvg: document.getElementById('profile-avg'),
      profilePeak: document.getElementById('profile-peak'),
      topPlans: document.getElementById('top-plans'),
      warningsSection: document.getElementById('warnings-section'),
      warningPlans: document.getElementById('warning-plans'),
      comparisonBody: document.getElementById('comparison-body'),
      filterTerm: document.getElementById('filter-term') as HTMLSelectElement | null,
      filterRenewable: document.getElementById('filter-renewable') as HTMLSelectElement | null,
      // Modal
      modalBackdrop: document.getElementById('modal-backdrop'),
      modalBody: document.getElementById('modal-body'),
      modalClose: document.getElementById('modal-close') as HTMLButtonElement | null,
      // Status
      calculationStatus: document.getElementById('calculation-status'),
      statusIdle: document.getElementById('status-idle'),
      statusLoading: document.getElementById('status-loading'),
      statusReady: document.getElementById('status-ready')
    };
  },

  setupMotion(): void {
    document.querySelectorAll('[data-reveal]').forEach((element) => {
      element.classList.add('reveal');
    });
    setupScrollReveal('.reveal');
  },

  attachEventListeners(): void {
    // ZIP code input
    if (this.elements.zipInput !== null) {
      this.elements.zipInput.addEventListener('input', (e) => this.handleZipInput(e as InputEvent));
      this.elements.zipInput.addEventListener('blur', () => this.handleZipBlur());
      this.elements.zipInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleZipBlur();
        }
      });
    }

    // Usage method tabs
    this.elements.methodOptions.forEach((option) => {
      option.addEventListener('click', () => this.handleMethodChange(option));
    });

    // Home size select
    if (this.elements.homeSize !== null) {
      this.elements.homeSize.addEventListener('change', (e) => {
        this.state.homeSize = (e.target as HTMLSelectElement).value;
        this.triggerAutoCalculate();
      });
    }

    // Average usage input
    if (this.elements.avgKwh !== null) {
      this.elements.avgKwh.addEventListener('input', (e) => {
        this.state.avgUsage = Number.parseFloat((e.target as HTMLInputElement).value) || null;
        this.debounceAutoCalculate();
      });
    }

    // Monthly usage inputs
    const monthInputs = document.querySelectorAll('[data-month]');
    monthInputs.forEach((input) => {
      input.addEventListener('input', () => {
        this.handleMonthlyInput();
        this.debounceAutoCalculate();
      });
    });

    // Filters
    if (this.elements.filterTerm !== null) {
      this.elements.filterTerm.addEventListener('change', () => this.applyFilters());
    }
    if (this.elements.filterRenewable !== null) {
      this.elements.filterRenewable.addEventListener('change', () => this.applyFilters());
    }

    // Modal
    if (this.elements.modalBackdrop !== null) {
      this.elements.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.elements.modalBackdrop) this.closeModal();
      });
    }
    if (this.elements.modalClose !== null) {
      this.elements.modalClose.addEventListener('click', () => this.closeModal());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  async updateHeroMetrics(): Promise<void> {
    try {
      const freshness = await API.getDataFreshness();
      this.state.freshness = freshness;

      if (this.elements.totalPlansCount !== null) {
        if (freshness.duplicateCount > 0) {
          this.elements.totalPlansCount.innerHTML = `
            <span class="metric-value-main">${freshness.totalPlans.toLocaleString()}</span>
            <span class="metric-subvalue">
              ${freshness.originalPlanCount.toLocaleString()} total - ${freshness.duplicateCount.toLocaleString()} duplicate${freshness.duplicateCount !== 1 ? 's' : ''} removed
            </span>
          `;
        } else {
          this.elements.totalPlansCount.textContent = freshness.totalPlans.toLocaleString();
        }
      }

      if (this.elements.lastUpdate !== null) {
        const date = new Date(freshness.plansUpdated);
        this.elements.lastUpdate.textContent = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (error) {
      logger.error('Error updating metrics', { error });
    }
  },

  handleZipInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const value = target.value.replace(/\D/g, '').substring(0, 5);
    target.value = value;

    if (this.state.zipValidationTimer !== null) {
      clearTimeout(this.state.zipValidationTimer);
      this.state.zipValidationTimer = null;
    }

    if (value.length === 5) {
      if (this.elements.zipStatus !== null) {
        this.elements.zipStatus.innerHTML =
          '<span class="zip-status-checking">Validating...</span>';
      }
      this.state.zipValidationTimer = setTimeout(() => {
        this.validateZipCode(value);
      }, this.ZIP_VALIDATION_DELAY);
    } else if (value.length > 0) {
      if (this.elements.zipStatus !== null) {
        this.elements.zipStatus.innerHTML = `<span class="zip-status-partial">${5 - value.length} more digits</span>`;
      }
      this.disableUsageSection();
    } else {
      if (this.elements.zipStatus !== null) {
        this.elements.zipStatus.textContent = '';
      }
      this.disableUsageSection();
    }
  },

  async validateZipCode(zipCode: string): Promise<void> {
    if (zipCode.length !== 5) {
      this.disableUsageSection();
      return;
    }

    if (this.state.zipCode === zipCode && this.state.tdu !== null) {
      return;
    }

    this.state.zipCode = zipCode;

    try {
      const taxInfo = await API.getLocalTaxInfo(zipCode);
      this.state.taxInfo = taxInfo;
      this.state.localTaxRate = taxInfo.rate ?? 0;

      if (taxInfo.deregulated === false) {
        Toast.warning(
          'This ZIP code is in a regulated service area where retail choice is not available.',
          8000,
          'Regulated Area'
        );
        this.disableUsageSection();
        if (this.elements.zipStatus !== null) {
          this.elements.zipStatus.innerHTML = '<span class="zip-status-unknown">Regulated</span>';
        }
        return;
      }

      if (taxInfo.tdu !== null) {
        const tdu = await API.getTDUByCode(taxInfo.tdu);
        if (tdu !== null) {
          this.state.tdu = tdu;
          this.showTduInfo(tdu);
          this.enableUsageSection();
          if (this.elements.zipStatus !== null) {
            this.elements.zipStatus.innerHTML = '<span class="zip-status-valid">Valid ZIP</span>';
          }
          return;
        }
      }

      // Fallback detection
      const tdus = await API.getAllTDUs();
      const tdu = this.detectTDU(zipCode, Array.from(tdus));

      if (tdu !== null) {
        this.state.tdu = tdu;
        this.showTduInfo(tdu);
        this.enableUsageSection();
        if (this.elements.zipStatus !== null) {
          this.elements.zipStatus.innerHTML = '<span class="zip-status-valid">Valid ZIP</span>';
        }
      } else {
        Toast.warning(
          'This ZIP code may be in a non-deregulated area of Texas.',
          8000,
          'Unknown Service Area'
        );
        this.disableUsageSection();
        if (this.elements.zipStatus !== null) {
          this.elements.zipStatus.innerHTML = '<span class="zip-status-unknown">Unknown</span>';
        }
      }
    } catch (error) {
      Toast.error('Unable to verify service area. Please try again.', 6000, 'Lookup Failed');
      logger.error('ZIP detection error', { error });
      this.disableUsageSection();
    }
  },

  detectTDU(zipCode: string, tduList: TDURate[]): TDURate | null {
    const zipRanges: Record<string, Array<{ min: number; max: number }>> = {
      ONCOR: [
        { min: 75001, max: 75999 },
        { min: 76001, max: 76999 }
      ],
      CENTERPOINT: [{ min: 77001, max: 77999 }],
      AEP_CENTRAL: [
        { min: 78401, max: 78499 },
        { min: 78500, max: 78599 }
      ],
      AEP_NORTH: [
        { min: 79601, max: 79699 },
        { min: 76901, max: 76999 }
      ],
      TNMP: [{ min: 77550, max: 77554 }],
      LPL: [{ min: 79401, max: 79499 }]
    };

    const zip = Number.parseInt(zipCode, 10);

    for (const [tduCode, ranges] of Object.entries(zipRanges)) {
      for (const range of ranges) {
        if (zip >= range.min && zip <= range.max) {
          return tduList.find((tdu) => tdu.code === tduCode) ?? null;
        }
      }
    }

    return null;
  },

  async handleZipBlur(): Promise<void> {
    if (this.state.zipValidationTimer !== null) {
      clearTimeout(this.state.zipValidationTimer);
      this.state.zipValidationTimer = null;
    }

    const zipCode = this.elements.zipInput?.value ?? '';
    await this.validateZipCode(zipCode);
  },

  showTduInfo(tdu: TDURate): void {
    if (this.elements.tduDisplay === null) return;

    this.elements.tduDisplay.hidden = false;
    if (this.elements.tduName !== null) {
      this.elements.tduName.textContent = tdu.name;
    }
    if (this.elements.tduBase !== null) {
      this.elements.tduBase.textContent = `$${tdu.monthly_base_charge.toFixed(2)}/month`;
    }
    if (this.elements.tduRate !== null) {
      this.elements.tduRate.textContent = `${tdu.per_kwh_rate.toFixed(2)} cents/kWh`;
    }
    if (this.elements.tduArea !== null) {
      this.elements.tduArea.textContent = tdu.service_area;
    }
  },

  enableUsageSection(): void {
    if (this.elements.stepUsage !== null) {
      this.elements.stepUsage.classList.remove('calc-step-disabled');
    }
  },

  disableUsageSection(): void {
    if (this.elements.stepUsage !== null) {
      this.elements.stepUsage.classList.add('calc-step-disabled');
    }
    if (this.elements.tduDisplay !== null) {
      this.elements.tduDisplay.hidden = true;
    }
    this.state.tdu = null;
    this.state.localTaxRate = 0;
    this.state.taxInfo = null;
  },

  handleMethodChange(option: HTMLElement): void {
    const dataset = option.dataset as DOMStringMap & { method?: string };
    const method = (dataset.method ?? 'estimate') as UsageMethod;
    this.state.usageMethod = method;

    this.elements.methodOptions.forEach((opt) => {
      opt.classList.remove('active');
      opt.setAttribute('aria-selected', 'false');
      opt.setAttribute('tabindex', '-1');
    });
    option.classList.add('active');
    option.setAttribute('aria-selected', 'true');
    option.setAttribute('tabindex', '0');

    ['estimate', 'average', 'detailed'].forEach((m) => {
      const panel = document.getElementById(`panel-${m}`);
      if (panel !== null) {
        panel.hidden = m !== method;
        panel.classList.toggle('active', m === method);
        panel.setAttribute('aria-hidden', String(m !== method));
      }
    });
  },

  handleMonthlyInput(): void {
    const monthInputs = document.querySelectorAll('[data-month]');
    const values = Array.from(monthInputs).map(
      (input) => Number.parseFloat((input as HTMLInputElement).value) || 0
    );
    this.state.monthlyUsage = values;

    const total = values.reduce((sum, v) => sum + v, 0);
    const filledCount = values.filter((v) => v > 0).length;
    const avg = filledCount > 0 ? total / filledCount : 0;

    if (this.elements.annualUsageTotal !== null) {
      this.elements.annualUsageTotal.textContent = `${total.toLocaleString()} kWh`;
    }
    if (this.elements.monthlyUsageAvg !== null) {
      this.elements.monthlyUsageAvg.textContent = `${Math.round(avg).toLocaleString()} kWh`;
    }
  },

  isInputValid(): boolean {
    if (this.state.tdu === null) return false;

    switch (this.state.usageMethod) {
      case 'estimate':
        return Boolean(this.state.homeSize ?? this.elements.homeSize?.value);
      case 'average':
        return Boolean(this.state.avgUsage ?? Number.parseFloat(this.elements.avgKwh?.value ?? ''));
      case 'detailed':
        return this.state.monthlyUsage.some((v) => v > 0);
      default:
        return false;
    }
  },

  debounceAutoCalculate(): void {
    if (this.state.autoCalculateTimer !== null) {
      clearTimeout(this.state.autoCalculateTimer);
    }

    this.state.autoCalculateTimer = setTimeout(() => {
      this.triggerAutoCalculate();
    }, this.AUTO_CALCULATE_DELAY);
  },

  triggerAutoCalculate(): void {
    if (this.state.autoCalculateTimer !== null) {
      clearTimeout(this.state.autoCalculateTimer);
      this.state.autoCalculateTimer = null;
    }

    if (this.isInputValid() && !this.state.isLoading) {
      this.handleCalculate();
    }
  },

  async handleCalculate(): Promise<void> {
    if (this.state.isLoading || this.state.tdu === null) return;

    let monthlyUsage: number[];
    switch (this.state.usageMethod) {
      case 'estimate': {
        const homeSize = this.elements.homeSize?.value ?? this.state.homeSize;
        if (!homeSize) {
          Toast.warning('Select your home size to estimate usage.', 5000, 'Selection Required');
          return;
        }
        monthlyUsage = UsageEstimator.estimateUsagePattern(Number.parseFloat(homeSize));
        break;
      }
      case 'average': {
        const avgKwh = Number.parseFloat(this.elements.avgKwh?.value ?? '') ?? this.state.avgUsage;
        if (!avgKwh) {
          Toast.warning('Enter your average monthly kWh usage.', 5000, 'Usage Required');
          return;
        }
        monthlyUsage = UsageEstimator.estimateUsagePattern(avgKwh);
        break;
      }
      case 'detailed': {
        if (!this.state.monthlyUsage.some((v) => v > 0)) {
          Toast.warning('Enter usage for at least one month.', 5000, 'Usage Required');
          return;
        }
        const filledMonths = this.state.monthlyUsage.filter((v) => v > 0);
        const avgFilled = filledMonths.reduce((a, b) => a + b, 0) / filledMonths.length;
        monthlyUsage = this.state.monthlyUsage.map((v) => v || avgFilled);
        break;
      }
      default:
        return;
    }

    this.state.isLoading = true;
    this.showLoading();

    try {
      const plansData = await API.loadPlans();
      const tduPlans = plansData.plans.filter((p) => p.tdu_area === this.state.tdu?.code);

      if (tduPlans.length === 0) {
        Toast.warning(
          'No electricity plans currently available for your service area.',
          6000,
          'No Plans Found'
        );
        return;
      }

      const rankedPlans = PlanRanker.rankPlans(
        tduPlans,
        monthlyUsage,
        this.state.tdu,
        { localTaxRate: this.state.localTaxRate },
        CostCalculator
      );

      this.state.rankedPlans = rankedPlans;
      this.displayResults(rankedPlans as unknown as RankedPlanWithMetrics[], monthlyUsage);

      if (this.elements.resultsSection !== null) {
        this.elements.resultsSection.hidden = false;
        this.elements.resultsSection.classList.add('is-visible');
        this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      const best = rankedPlans[0] as RankedPlanWithMetrics | undefined;
      if (best !== undefined) {
        Toast.success(
          `Lowest cost plan: ${formatCurrency(best.annualCost)}/year.`,
          6000,
          `${rankedPlans.length} Plans Analyzed`
        );
      }
    } catch (error) {
      Toast.error('Unable to calculate costs. Please try again.', 8000, 'Calculation Error');
      logger.error('Calculation error', { error });
    } finally {
      this.state.isLoading = false;
      this.hideLoading();
    }
  },

  showLoading(): void {
    if (this.elements.statusIdle !== null) this.elements.statusIdle.hidden = true;
    if (this.elements.statusLoading !== null) this.elements.statusLoading.hidden = false;
    if (this.elements.statusReady !== null) this.elements.statusReady.hidden = true;
  },

  hideLoading(): void {
    if (this.elements.statusIdle !== null) this.elements.statusIdle.hidden = true;
    if (this.elements.statusLoading !== null) this.elements.statusLoading.hidden = true;
    if (this.elements.statusReady !== null) this.elements.statusReady.hidden = false;
  },

  displayResults(plans: RankedPlanWithMetrics[], monthlyUsage: number[]): void {
    this.displayUsageProfile(monthlyUsage);
    this.displayTopPlans(plans);
    this.displayComparisonTable(plans);

    if (this.elements.resultsCount !== null) {
      this.elements.resultsCount.textContent = String(plans.length);
    }
  },

  displayUsageProfile(monthlyUsage: number[]): void {
    const total = monthlyUsage.reduce((a, b) => a + b, 0);
    const avg = total / 12;
    const max = Math.max(...monthlyUsage);
    const peakMonth = monthlyUsage.indexOf(max);

    if (this.elements.profileAnnual !== null) {
      this.elements.profileAnnual.textContent = `${total.toLocaleString()} kWh`;
    }
    if (this.elements.profileAvg !== null) {
      this.elements.profileAvg.textContent = `${Math.round(avg).toLocaleString()} kWh`;
    }
    if (this.elements.profilePeak !== null) {
      this.elements.profilePeak.textContent = `${getMonthName(peakMonth)} (${Math.round(max).toLocaleString()} kWh)`;
    }

    // Render usage chart bars
    if (this.elements.usageChart !== null) {
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ];
      this.elements.usageChart.innerHTML = monthlyUsage
        .map((usage, i) => {
          const height = max > 0 ? Math.round((usage / max) * 100) : 0;
          let intensityClass = 'intensity-low';
          if (height > 80) intensityClass = 'intensity-high';
          else if (height > 60) intensityClass = 'intensity-medium-high';
          else if (height > 40) intensityClass = 'intensity-medium';
          else if (height > 20) intensityClass = 'intensity-low';
          else intensityClass = 'intensity-very-low';

          return `
            <div class="bar-container" style="justify-content: flex-end; height: 100%;">
              <div class="bar ${intensityClass}" style="height: 0%" data-target="${height}" title="${usage.toLocaleString()} kWh"></div>
              <span class="bar-label">${monthNames[i]}</span>
            </div>
          `;
        })
        .join('');

      const bars = this.elements.usageChart.querySelectorAll<HTMLElement>('.bar');
      bars.forEach((bar) => {
        const dataset = bar.dataset as { target?: string };
        const target = Number(dataset.target ?? '0');
        void animateSpring(bar, 'height', 0, target, SpringPresets.gentle, '%');
      });
    }
  },

  displayTopPlans(plans: RankedPlanWithMetrics[]): void {
    if (this.elements.topPlans === null) return;

    const displayPlans = plans.slice(0, 5);
    this.elements.topPlans.innerHTML = displayPlans
      .map((plan, i) => this.renderPlanCard(plan, i))
      .join('');

    const items = this.elements.topPlans.querySelectorAll<HTMLElement>('.plan-item');
    applyStaggeredDelay(items);
    setupScrollReveal('.plan-item.reveal');
  },

  displayComparisonTable(plans: RankedPlanWithMetrics[]): void {
    if (this.elements.comparisonBody === null) return;

    this.elements.comparisonBody.innerHTML = plans
      .map((plan) => {
        const grade = this.getQualityGrade(plan.qualityScore);
        const contractEnd = new Date();
        contractEnd.setMonth(contractEnd.getMonth() + plan.term_months);
        const contractEndStr = contractEnd.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        });

        return `
          <tr>
            <td class="col-grade"><span class="quality-grade ${grade.class}">${grade.letter}</span></td>
            <td class="col-provider">${this.escapeHtml(plan.rep_name)}</td>
            <td class="col-plan">${this.escapeHtml(plan.plan_name)}</td>
            <td class="col-term">${plan.term_months} mo</td>
            <td class="col-contract-end">${contractEndStr}</td>
            <td class="col-annual">${formatCurrency(plan.annualCost)}</td>
            <td class="col-monthly">${formatCurrency(plan.averageMonthlyCost)}</td>
            <td class="col-rate">${formatRate(plan.effectiveRate)}</td>
            <td class="col-renewable">${plan.renewable_pct}%</td>
            <td class="col-etf">${this.formatETF(plan)}</td>
            <td class="col-actions">
              <button class="btn-view" onclick="UI.showPlanModal('${plan.plan_id}')">Details</button>
            </td>
          </tr>
        `;
      })
      .join('');
  },

  renderPlanCard(plan: RankedPlanWithMetrics, index: number): string {
    const rankBadge =
      index === 0 ? 'rank-badge-first' : index <= 2 ? 'rank-badge-top3' : 'rank-badge-top5';
    const rankLabel = index === 0 ? 'Best Value' : index <= 2 ? 'Top 3' : 'Top 5';

    return `
      <div class="plan-item reveal stagger-item">
        <div class="plan-item-rank">
          <span class="rank-badge ${rankBadge}">${rankLabel}</span>
        </div>
        <div class="plan-item-header">
          <div>
            <div class="plan-item-name">${this.escapeHtml(plan.plan_name)}</div>
            <div class="plan-item-provider">${this.escapeHtml(plan.rep_name)}</div>
          </div>
          <div class="plan-item-cost">
            <div class="plan-item-annual">${formatCurrency(plan.annualCost)}/yr</div>
            <div class="plan-item-monthly">${formatCurrency(plan.averageMonthlyCost)}/month avg</div>
          </div>
        </div>
        <div class="plan-item-details">
          <span class="plan-detail-item">
            <span class="plan-detail-label">Quality:</span>
            <span class="plan-detail-value">${plan.qualityScore}/100</span>
          </span>
          <span class="plan-detail-item">
            <span class="plan-detail-label">Term:</span>
            <span class="plan-detail-value">${plan.term_months} months</span>
          </span>
          <span class="plan-detail-item">
            <span class="plan-detail-label">Rate:</span>
            <span class="plan-detail-value">${formatRate(plan.effectiveRate)}</span>
          </span>
        </div>
        <div class="plan-item-actions">
          <button class="btn-plan-action btn-plan-details" type="button" onclick="UI.showPlanModal('${plan.plan_id}')">View Details</button>
          ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-plan-action btn-plan-efl">View EFL</a>` : ''}
        </div>
      </div>
    `;
  },

  showPlanModal(planId: string): void {
    const plan = this.state.rankedPlans?.find((p) => p.plan_id === planId) as
      | RankedPlanWithMetrics
      | undefined;
    if (plan === undefined || this.elements.modalBackdrop === null) return;

    if (this.elements.modalBody !== null) {
      const monthlyCostText = plan.monthlyCosts
        ? `${formatCurrency(Math.min(...plan.monthlyCosts))} - ${formatCurrency(Math.max(...plan.monthlyCosts))}`
        : formatCurrency(plan.averageMonthlyCost);

      this.elements.modalBody.innerHTML = `
        <div class="modal-header-group">
          <h2 class="modal-title" id="modal-title">${this.escapeHtml(plan.plan_name)}</h2>
          <p class="modal-provider" id="modal-description">${this.escapeHtml(plan.rep_name)}</p>
        </div>
        <div class="modal-grid">
          <div class="modal-stat">
            <span class="modal-stat-label">Annual Cost</span>
            <span class="modal-stat-value">${formatCurrency(plan.annualCost)}</span>
          </div>
          <div class="modal-stat">
            <span class="modal-stat-label">Monthly (${plan.term_months} mo)</span>
            <span class="modal-stat-value">${monthlyCostText}</span>
          </div>
          <div class="modal-stat">
            <span class="modal-stat-label">Effective Rate</span>
            <span class="modal-stat-value">${formatRate(plan.effectiveRate)}</span>
          </div>
        </div>
        <div class="modal-section">
          <h3 class="modal-section-title">Plan Details</h3>
          <dl class="modal-kv">
            <div class="modal-kv-row">
              <dt>Rate Type</dt>
              <dd>${this.escapeHtml(plan.rate_type)}</dd>
            </div>
            <div class="modal-kv-row">
              <dt>Contract Term</dt>
              <dd>${plan.term_months} months</dd>
            </div>
            <div class="modal-kv-row">
              <dt>Renewable</dt>
              <dd>${plan.renewable_pct}%</dd>
            </div>
            <div class="modal-kv-row">
              <dt>Cancellation Fee</dt>
              <dd>${this.formatETF(plan)}</dd>
            </div>
          </dl>
        </div>
        ${
          plan.special_terms
            ? `
          <div class="modal-section">
            <h3 class="modal-section-title">Special Terms</h3>
            <div class="modal-terms-list">
              ${plan.special_terms
                .split('|')
                .map((term) => term.trim())
                .filter(Boolean)
                .map((term) => `<p class="modal-subtext">${this.escapeHtml(term)}</p>`)
                .join('')}
            </div>
          </div>
        `
            : ''
        }
        <div class="modal-actions">
          ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="modal-btn">View EFL</a>` : ''}
          ${plan.enrollment_url ? `<a href="${this.escapeHtml(plan.enrollment_url)}" target="_blank" rel="noopener" class="modal-btn modal-btn-primary btn-enroll">Enroll Now</a>` : ''}
        </div>
      `;
    }

    this.elements.modalBackdrop.hidden = false;
  },

  closeModal(): void {
    if (this.elements.modalBackdrop !== null) {
      this.elements.modalBackdrop.hidden = true;
    }
  },

  applyFilters(): void {
    // Filter implementation placeholder
  },

  escapeHtml(text: string | null | undefined): string {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  formatETF(plan: ElectricityPlan): string {
    const info = ETFCalculator.getETFDisplayInfo(plan);
    return info.displayText;
  },

  getQualityTier(score: number): string {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  },

  getQualityGrade(score: number): QualityGrade {
    return PlanRanker.getQualityGrade(score);
  }
};

export default UI;
export { UI, Toast };
export type { UIState, UIElements, ToastType, UsageMethod, RankedPlanWithMetrics };

// Browser compatibility
declare global {
  interface Window {
    UI: typeof UI;
    Toast: typeof Toast;
  }
}

if (typeof window !== 'undefined') {
  window.UI = UI;
  window.Toast = Toast;
}

// Initialize on DOM ready
if (typeof document !== 'undefined') {
  interface WindowWithInitFlag extends Window {
    _uiInitialized?: boolean;
  }

  const init = (): void => {
    // Prevent double init
    if ((window as WindowWithInitFlag)._uiInitialized) return;
    (window as WindowWithInitFlag)._uiInitialized = true;
    UI.init();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('load', init);
  } else {
    init();
  }
}
