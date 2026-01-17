/**
 * User Interface Module
 * Handles all UI interactions, form state, and results display
 */

/**
 * Toast Notification System - Enhanced Professional Design
 */
const Toast = {
  container: null,

  // Icon symbols (text-based, no emojis)
  icons: {
    success: '&#10003;', // Checkmark
    error: '&#10007;', // X mark
    warning: '!', // Exclamation
    info: 'i' // Info
  },

  // Default titles for each type
  titles: {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Information'
  },

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  },

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duration in ms (0 for persistent)
   * @param {string} title - Optional custom title
   */
  show(message, type = 'info', duration = 5000, title = null) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const displayTitle = title || this.titles[type] || 'Notification';
    const icon = this.icons[type] || this.icons.info;

    toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(displayTitle)}</div>
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="toast-close" aria-label="Dismiss notification">&times;</button>
            ${
              duration > 0
                ? `
                <div class="toast-progress">
                    <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
                </div>
            `
                : ''
            }
        `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismiss(toast));

    this.container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  },

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  },

  /**
   * Show success notification
   */
  success(msg, duration = 5000, title = 'Success') {
    return this.show(msg, 'success', duration, title);
  },

  /**
   * Show error notification
   */
  error(msg, duration = 8000, title = 'Error') {
    return this.show(msg, 'error', duration, title);
  },

  /**
   * Show warning notification
   */
  warning(msg, duration = 6000, title = 'Attention') {
    return this.show(msg, 'warning', duration, title);
  },

  /**
   * Show info notification
   */
  info(msg, duration = 5000, title = 'Information') {
    return this.show(msg, 'info', duration, title);
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

/**
 * Main UI Controller
 */
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
  },

  elements: {},

  /**
   * Auto-calculate debounce delay (ms)
   */
  AUTO_CALCULATE_DELAY: 500,

  /**
   * ZIP validation debounce delay (ms)
   */
  ZIP_VALIDATION_DELAY: 300,

  async init() {
    this.cacheElements();
    Toast.init();
    this.attachEventListeners();

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
      console.error('Init error:', error);
    }
  },

  cacheElements() {
    this.elements = {
      // Hero
      totalPlansCount: document.getElementById('total-plans-count'),
      lastUpdate: document.getElementById('last-update'),

      // Step 1: Location
      zipInput: document.getElementById('zip-code'),
      zipStatus: document.getElementById('zip-status'),
      tduDisplay: document.getElementById('tdu-display'),
      tduName: document.getElementById('tdu-name'),
      tduBase: document.getElementById('tdu-base'),
      tduRate: document.getElementById('tdu-rate'),
      tduArea: document.getElementById('tdu-area'),

      // Step 2: Usage
      stepUsage: document.getElementById('step-usage'),
      methodOptions: document.querySelectorAll('.method-option'),
      panelEstimate: document.getElementById('panel-estimate'),
      panelAverage: document.getElementById('panel-average'),
      panelDetailed: document.getElementById('panel-detailed'),
      homeSize: document.getElementById('home-size'),
      avgKwh: document.getElementById('avg-kwh'),
      annualUsageTotal: document.getElementById('annual-usage-total'),
      monthlyUsageAvg: document.getElementById('monthly-usage-avg'),
      calculateBtn: document.getElementById('calculate-btn'),

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
      filterTerm: document.getElementById('filter-term'),
      filterRenewable: document.getElementById('filter-renewable'),

      // Modal
      modalBackdrop: document.getElementById('modal-backdrop'),
      modalBody: document.getElementById('modal-body'),
      modalClose: document.getElementById('modal-close'),

      // Status indicator
      calculationStatus: document.getElementById('calculation-status'),
      statusIdle: document.getElementById('status-idle'),
      statusLoading: document.getElementById('status-loading'),
      statusReady: document.getElementById('status-ready')
    };
  },

  attachEventListeners() {
    // ZIP code input
    if (this.elements.zipInput) {
      this.elements.zipInput.addEventListener('input', (e) => this.handleZipInput(e));
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

    // Home size select - auto-calculate on change
    if (this.elements.homeSize) {
      this.elements.homeSize.addEventListener('change', (e) => {
        this.state.homeSize = e.target.value;
        this.triggerAutoCalculate();
      });
    }

    // Average usage input - auto-calculate on input with debounce
    if (this.elements.avgKwh) {
      this.elements.avgKwh.addEventListener('input', (e) => {
        this.state.avgUsage = Number.parseFloat(e.target.value) || null;
        this.debounceAutoCalculate();
      });
    }

    // Monthly usage inputs - auto-calculate with debounce
    const monthInputs = document.querySelectorAll('[data-month]');
    monthInputs.forEach((input) => {
      input.addEventListener('input', () => {
        this.handleMonthlyInput();
        this.debounceAutoCalculate();
      });
    });

    // Filters
    if (this.elements.filterTerm) {
      this.elements.filterTerm.addEventListener('change', () => this.applyFilters());
    }
    if (this.elements.filterRenewable) {
      this.elements.filterRenewable.addEventListener('change', () => this.applyFilters());
    }

    // Modal
    if (this.elements.modalBackdrop) {
      this.elements.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === this.elements.modalBackdrop) this.closeModal();
      });
    }
    if (this.elements.modalClose) {
      this.elements.modalClose.addEventListener('click', () => this.closeModal());
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  },

  async updateHeroMetrics() {
    try {
      const freshness = await API.getDataFreshness();
      this.state.freshness = freshness;

      if (this.elements.totalPlansCount) {
        // Show unique plan count prominently with original count in smaller text
        if (freshness.duplicateCount > 0) {
          this.elements.totalPlansCount.innerHTML = `
            <span class="metric-value-main">${freshness.totalPlans.toLocaleString()}</span>
            <span class="metric-subvalue">
              ${freshness.originalPlanCount.toLocaleString()} total • ${freshness.duplicateCount.toLocaleString()} duplicate${freshness.duplicateCount !== 1 ? 's' : ''} removed
            </span>
            <button type="button" class="metric-link">Deduplication details</button>
          `;
          const metricTrigger = this.elements.totalPlansCount.querySelector('.metric-link');
          if (metricTrigger) {
            metricTrigger.addEventListener('click', (event) => {
              event.preventDefault();
              this.showDeduplicationInfo(freshness);
            });
          }
        } else {
          this.elements.totalPlansCount.textContent = freshness.totalPlans.toLocaleString();
        }
      }

      if (this.elements.lastUpdate) {
        const date = new Date(freshness.plansUpdated);
        // Include year in the date format
        this.elements.lastUpdate.textContent = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  },

  handleZipInput(e) {
    const value = e.target.value.replace(/\D/g, '').substring(0, 5);
    e.target.value = value;

    // Clear any pending validation
    if (this.state.zipValidationTimer) {
      clearTimeout(this.state.zipValidationTimer);
      this.state.zipValidationTimer = null;
    }

    if (value.length === 5) {
      // Show checking status immediately
      this.elements.zipStatus.innerHTML = '<span class="zip-status-checking">Validating...</span>';

      // Debounced auto-validation - no need for blur/enter
      this.state.zipValidationTimer = setTimeout(() => {
        this.validateZipCode(value);
      }, this.ZIP_VALIDATION_DELAY);
    } else if (value.length > 0) {
      // Partial input
      this.elements.zipStatus.innerHTML = `<span class="zip-status-partial">${5 - value.length} more digits</span>`;
      this.disableUsageSection();
    } else {
      // Empty
      this.elements.zipStatus.textContent = '';
      this.disableUsageSection();
    }
  },

  /**
   * Validate ZIP code and update TDU information
   * Called automatically after debounce or on blur/enter
   */
  async validateZipCode(zipCode) {
    if (!zipCode || zipCode.length !== 5) {
      this.disableUsageSection();
      return;
    }

    // Skip if already validated this ZIP
    if (this.state.zipCode === zipCode && this.state.tdu) {
      return;
    }

    this.state.zipCode = zipCode;

    try {
      const taxInfo = await API.getLocalTaxInfo(zipCode);
      this.state.taxInfo = taxInfo;
      this.state.localTaxRate = taxInfo?.rate || 0;

      if (taxInfo.deregulated === false) {
        Toast.warning(
          'This ZIP code is in a regulated service area where retail choice is not available.',
          8000,
          'Regulated Area'
        );
        this.disableUsageSection();
        this.elements.zipStatus.innerHTML = '<span class="zip-status-unknown">Regulated</span>';
        return;
      }

      if (taxInfo.tdu) {
        const tdu = await API.getTDUByCode(taxInfo.tdu);
        if (tdu) {
          this.state.tdu = tdu;
          this.showTduInfo(tdu);
          this.enableUsageSection();
          this.elements.zipStatus.innerHTML = '<span class="zip-status-valid">Valid ZIP</span>';
          return;
        }
      }

      // Fallback: detect by ZIP range
      const tdus = await API.getAllTDUs();
      const tdu = detectTDU(zipCode, tdus);

      if (tdu) {
        this.state.tdu = tdu;
        this.showTduInfo(tdu);
        this.enableUsageSection();
        this.elements.zipStatus.innerHTML = '<span class="zip-status-valid">Valid ZIP</span>';
      } else {
        Toast.warning(
          'This ZIP code may be in a non-deregulated area of Texas. Only deregulated areas can choose providers.',
          8000,
          'Unknown Service Area'
        );
        this.disableUsageSection();
        this.elements.zipStatus.innerHTML = '<span class="zip-status-unknown">Unknown</span>';
      }
    } catch (error) {
      Toast.error('Unable to verify service area. Please try again.', 6000, 'Lookup Failed');
      console.error('ZIP detection error:', error);
      this.disableUsageSection();
    }
  },

  async handleZipBlur() {
    // Clear pending validation timer and validate immediately on blur
    if (this.state.zipValidationTimer) {
      clearTimeout(this.state.zipValidationTimer);
      this.state.zipValidationTimer = null;
    }

    const zipCode = this.elements.zipInput.value;
    await this.validateZipCode(zipCode);
  },

  showTduInfo(tdu) {
    if (!this.elements.tduDisplay) return;

    this.elements.tduDisplay.hidden = false;
    this.elements.tduName.textContent = tdu.name;
    this.elements.tduBase.textContent = `$${tdu.monthly_base_charge.toFixed(2)}/month`;
    this.elements.tduRate.textContent = `${tdu.per_kwh_rate.toFixed(2)} cents/kWh`;
    this.elements.tduArea.textContent = tdu.service_area;
  },

  enableUsageSection() {
    if (this.elements.stepUsage) {
      this.elements.stepUsage.classList.remove('calc-step-disabled');
    }
    this.updateCalculateButton();
  },

  disableUsageSection() {
    if (this.elements.stepUsage) {
      this.elements.stepUsage.classList.add('calc-step-disabled');
    }
    if (this.elements.tduDisplay) {
      this.elements.tduDisplay.hidden = true;
    }
    this.state.tdu = null;
    this.state.localTaxRate = 0;
    this.state.taxInfo = null;
    this.updateCalculateButton();
  },

  handleMethodChange(option) {
    const method = option.dataset.method;
    this.state.usageMethod = method;

    // Update tab states
    this.elements.methodOptions.forEach((opt) => {
      opt.classList.remove('active');
      opt.setAttribute('aria-selected', 'false');
    });
    option.classList.add('active');
    option.setAttribute('aria-selected', 'true');

    // Show correct panel
    ['estimate', 'average', 'detailed'].forEach((m) => {
      const panel = document.getElementById(`panel-${m}`);
      if (panel) {
        panel.hidden = m !== method;
        panel.classList.toggle('active', m === method);
      }
    });

    this.updateCalculateButton();
  },

  handleMonthlyInput() {
    const monthInputs = document.querySelectorAll('[data-month]');
    const values = Array.from(monthInputs).map((input) => Number.parseFloat(input.value) || 0);
    this.state.monthlyUsage = values;

    const total = values.reduce((sum, v) => sum + v, 0);
    const avg =
      values.filter((v) => v > 0).length > 0 ? total / values.filter((v) => v > 0).length : 0;

    if (this.elements.annualUsageTotal) {
      this.elements.annualUsageTotal.textContent = `${total.toLocaleString()} kWh`;
    }
    if (this.elements.monthlyUsageAvg) {
      this.elements.monthlyUsageAvg.textContent = `${Math.round(avg).toLocaleString()} kWh`;
    }

    this.updateCalculateButton();
  },

  updateCalculateButton() {
    // Legacy method - now hidden but kept for compatibility
    if (!this.elements.calculateBtn) return;
    this.elements.calculateBtn.hidden = true;
  },

  /**
   * Check if calculation input is valid
   */
  isInputValid() {
    if (!this.state.tdu) return false;

    switch (this.state.usageMethod) {
      case 'estimate':
        return !!(this.state.homeSize || this.elements.homeSize?.value);
      case 'average':
        return !!(this.state.avgUsage || Number.parseFloat(this.elements.avgKwh?.value));
      case 'detailed':
        return this.state.monthlyUsage.some((v) => v > 0);
      default:
        return false;
    }
  },

  /**
   * Debounced auto-calculate trigger
   */
  debounceAutoCalculate() {
    if (this.state.autoCalculateTimer) {
      clearTimeout(this.state.autoCalculateTimer);
    }

    this.state.autoCalculateTimer = setTimeout(() => {
      this.triggerAutoCalculate();
    }, this.AUTO_CALCULATE_DELAY);
  },

  /**
   * Trigger auto-calculation if input is valid
   */
  triggerAutoCalculate() {
    if (this.state.autoCalculateTimer) {
      clearTimeout(this.state.autoCalculateTimer);
      this.state.autoCalculateTimer = null;
    }

    if (this.isInputValid() && !this.state.isLoading) {
      this.handleCalculate();
    }
  },

  async handleCalculate() {
    if (this.state.isLoading) return;

    if (!this.state.tdu) {
      Toast.warning('Enter your 5-digit Texas ZIP code to begin.', 5000, 'ZIP Required');
      return;
    }

    // Get usage pattern
    let monthlyUsage;
    switch (this.state.usageMethod) {
      case 'estimate': {
        const homeSize = this.elements.homeSize?.value || this.state.homeSize;
        if (!homeSize) {
          Toast.warning('Select your home size to estimate usage.', 5000, 'Selection Required');
          return;
        }
        monthlyUsage = estimateUsagePattern(Number.parseFloat(homeSize));
        break;
      }
      case 'average': {
        const avgKwh = Number.parseFloat(this.elements.avgKwh?.value) || this.state.avgUsage;
        if (!avgKwh) {
          Toast.warning('Enter your average monthly kWh usage.', 5000, 'Usage Required');
          return;
        }
        monthlyUsage = estimateUsagePattern(avgKwh);
        break;
      }
      case 'detailed': {
        if (!this.state.monthlyUsage.some((v) => v > 0)) {
          Toast.warning('Enter usage for at least one month.', 5000, 'Usage Required');
          return;
        }
        monthlyUsage = [...this.state.monthlyUsage];
        // Fill empty months with average of filled months
        const filledMonths = monthlyUsage.filter((v) => v > 0);
        const avgFilled = filledMonths.reduce((a, b) => a + b, 0) / filledMonths.length;
        monthlyUsage = monthlyUsage.map((v) => v || avgFilled);
        break;
      }
    }

    this.state.isLoading = true;
    this.showLoading();

    try {
      const plansData = await API.loadPlans();
      const tduPlans = plansData.plans.filter((p) => p.tdu_area === this.state.tdu.code);

      if (tduPlans.length === 0) {
        Toast.warning(
          'No electricity plans currently available for your service area.',
          6000,
          'No Plans Found'
        );
        return;
      }

      // Use PlanRanker if available, otherwise fallback to legacy rankPlans
      const rankingFunction =
        typeof PlanRanker !== 'undefined' && PlanRanker.rankPlans
          ? PlanRanker.rankPlans.bind(PlanRanker)
          : rankPlans;

      const rankedPlans = rankingFunction(tduPlans, monthlyUsage, this.state.tdu, {
        localTaxRate: this.state.localTaxRate || 0
      });
      this.state.rankedPlans = rankedPlans;

      this.displayResults(rankedPlans, monthlyUsage);

      this.elements.resultsSection.hidden = false;
      this.elements.resultsSection.classList.remove('is-visible');
      requestAnimationFrame(() => {
        this.elements.resultsSection.classList.add('is-visible');
      });
      if (this.elements.calculationStatus) {
        this.elements.calculationStatus.hidden = true;
      }
      this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const best = rankedPlans[0];
      const savings =
        rankedPlans.length > 1
          ? rankedPlans[rankedPlans.length - 1].annualCost - best.annualCost
          : 0;
      Toast.success(
        `Lowest cost plan: ${formatCurrency(best.annualCost)}/year. ` +
          (savings > 0 ? `Save up to ${formatCurrency(savings)} vs other plans.` : ''),
        6000,
        `${rankedPlans.length} Plans Analyzed`
      );
    } catch (error) {
      Toast.error('Unable to calculate costs. Please try again.', 8000, 'Calculation Error');
      console.error('Calculation error:', error);
    } finally {
      this.state.isLoading = false;
      this.hideLoading();
    }
  },

  showLoading() {
    // Update status indicator
    if (this.elements.statusIdle) this.elements.statusIdle.hidden = true;
    if (this.elements.statusLoading) this.elements.statusLoading.hidden = false;
    if (this.elements.statusReady) this.elements.statusReady.hidden = true;
  },

  hideLoading() {
    // Update status indicator to show ready
    if (this.elements.statusIdle) this.elements.statusIdle.hidden = true;
    if (this.elements.statusLoading) this.elements.statusLoading.hidden = true;
    if (this.elements.statusReady) this.elements.statusReady.hidden = false;
  },

  resetStatus() {
    // Reset status indicator to idle state
    if (this.elements.calculationStatus) this.elements.calculationStatus.hidden = false;
    if (this.elements.statusIdle) this.elements.statusIdle.hidden = false;
    if (this.elements.statusLoading) this.elements.statusLoading.hidden = true;
    if (this.elements.statusReady) this.elements.statusReady.hidden = true;
  },

  displayResults(plans, monthlyUsage) {
    this.displayUsageProfile(monthlyUsage);
    this.displayTopPlans(plans);
    this.displayWarningPlans(plans.filter((p) => p.isGimmick).slice(0, 3));
    this.displayDeduplicationStats();

    // Reset sort state and display table in default order (by combined score, highest first)
    this.sortState = {
      column: null,
      direction: 'desc'
    };

    // Ensure plans are sorted by combined score descending (highest first) with robust tie-breaking
    const sortedPlans = [...plans].sort((a, b) => {
      // 1. Combined Score (Descending)
      const scoreDiff = (b.combinedScore || 0) - (a.combinedScore || 0);
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

      // 2. Annual Cost (Ascending)
      const costDiff = (a.annualCost || 0) - (b.annualCost || 0);
      if (Math.abs(costDiff) > 0.01) return costDiff;

      // 3. Quality Score (Descending)
      const qualityDiff = (b.qualityScore || 0) - (a.qualityScore || 0);
      if (qualityDiff !== 0) return qualityDiff;

      // 4. Plan Name (Ascending)
      return (a.plan_name || '').localeCompare(b.plan_name || '');
    });

    this.displayComparisonTable(sortedPlans);

    if (this.elements.resultsCount) {
      this.elements.resultsCount.textContent = plans.length;
    }
  },

  displayUsageProfile(monthlyUsage) {
    const total = monthlyUsage.reduce((a, b) => a + b, 0);
    const avg = total / 12;
    const max = Math.max(...monthlyUsage);
    const peakMonth = monthlyUsage.indexOf(max);
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

    if (this.elements.profileAnnual) {
      this.elements.profileAnnual.textContent = `${total.toLocaleString()} kWh`;
    }
    if (this.elements.profileAvg) {
      this.elements.profileAvg.textContent = `${Math.round(avg).toLocaleString()} kWh`;
    }
    if (this.elements.profilePeak) {
      this.elements.profilePeak.textContent = `${monthNames[peakMonth]} (${Math.round(max).toLocaleString()} kWh)`;
    }

    // Render chart with month names and color-coded intensity
    if (this.elements.usageChart) {
      const maxHeight = 120; // Increased height for better visibility
      const min = Math.min(...monthlyUsage);

      this.elements.usageChart.setAttribute('role', 'img');
      this.elements.usageChart.setAttribute('aria-label', 'Monthly electricity usage by month');

      this.elements.usageChart.innerHTML = monthlyUsage
        .map((usage, i) => {
          const height = max > 0 ? (usage / max) * maxHeight : 4;
          // Calculate intensity (0-1) for color coding
          const intensity = max > min ? (usage - min) / (max - min) : 0.5;
          // Assign intensity class: very-low (blue), low (green), medium (yellow), medium-high (orange), high (red)
          let intensityClass = 'intensity-very-low';
          if (intensity >= 0.8) intensityClass = 'intensity-high';
          else if (intensity >= 0.6) intensityClass = 'intensity-medium-high';
          else if (intensity >= 0.4) intensityClass = 'intensity-medium';
          else if (intensity >= 0.2) intensityClass = 'intensity-low';

          return `
            <div class="bar-container">
              <div class="bar ${intensityClass}" style="height: ${height}px" title="${monthNames[i]}: ${Math.round(usage).toLocaleString()} kWh" aria-label="${monthNames[i]} ${Math.round(usage).toLocaleString()} kWh"></div>
              <div class="bar-label">${monthNames[i]}</div>
            </div>
          `;
        })
        .join('');
    }
  },

  displayTopPlans(plans) {
    if (!this.elements.topPlans) return;

    // Only show plans with acceptable quality (grade C or better, score >= 70)
    // This prevents F-grade gimmick plans from appearing in top recommendations
    const acceptablePlans = plans.filter((p) => (p.qualityScore || 0) >= 70);

    // If no acceptable plans, fall back to showing top 5 regardless of quality
    const displayPlans =
      acceptablePlans.length >= 5 ? acceptablePlans.slice(0, 5) : plans.slice(0, 5);

    // Get total plans count for ranking context
    const totalPlans = this.state.rankedPlans?.length || plans.length;
    const bestPlan = displayPlans[0];

    this.elements.topPlans.innerHTML = displayPlans
      .map((plan, i) => {
        const grade =
          typeof getQualityGrade === 'function'
            ? getQualityGrade(plan.qualityScore || 0)
            : { letter: '-', description: 'N/A', class: 'grade-na', tooltip: '', shortDesc: '' };

        // Get score explanation for tooltip
        const scoreExplanation =
          typeof getScoreExplanation === 'function' && plan.scoreBreakdown
            ? getScoreExplanation(plan)
            : `Quality score: ${plan.qualityScore || 0}/100`;

        // Get rank description
        const rankDesc =
          typeof getRankDescription === 'function'
            ? getRankDescription(i + 1, totalPlans)
            : { label: `Rank ${i + 1}`, description: '' };

        // Calculate savings vs worst plan in top 5
        const savingsVsLast =
          i === 0 && displayPlans.length > 1
            ? displayPlans[displayPlans.length - 1].annualCost - plan.annualCost
            : null;

        // Calculate difference from #1
        const diffFromBest = i > 0 ? plan.annualCost - bestPlan.annualCost : 0;

        const isNonFixed = plan.rate_type !== 'FIXED';
        const nonFixedClass = isNonFixed ? 'plan-non-fixed' : '';
        const termMonths = plan.term_months || 12;
        const contractTotalCost = plan.averageMonthlyCost * termMonths;

        // Determine rank badge style
        const rankBadgeClass =
          i === 0 ? 'rank-badge-first' : i <= 2 ? 'rank-badge-top3' : 'rank-badge-top5';

        return `
            <div class="plan-item ${nonFixedClass}">
                <div class="plan-item-rank">
                    <div class="rank-info">
                        <span class="rank-badge ${rankBadgeClass}">${rankDesc.label}</span>
                        ${i === 0 && savingsVsLast ? `<span class="rank-savings">Save up to ${formatCurrency(savingsVsLast)}/yr</span>` : ''}
                        ${diffFromBest > 0 ? `<span class="rank-diff">+${formatCurrency(diffFromBest)}/yr vs #1</span>` : ''}
                    </div>
                    <div class="grade-info" title="${scoreExplanation}">
                        <span class="plan-item-grade ${grade.class}" aria-label="${grade.description} grade (${plan.qualityScore || 0} out of 100)">${grade.letter}</span>
                        <span class="grade-desc">${grade.shortDesc || grade.description}</span>
                    </div>
                </div>
                ${
                  isNonFixed
                    ? `
                <div class="non-fixed-warning">
                    <span class="non-fixed-warning-icon">!</span>
                    <span class="non-fixed-warning-text"><strong>${plan.rate_type} Rate:</strong> Price can change based on market conditions. Consider fixed-rate plans for budget certainty.</span>
                </div>`
                    : ''
                }
                <div class="plan-item-header">
                    <div>
                        <div class="plan-item-name">${this.escapeHtml(plan.plan_name)}</div>
                        <div class="plan-item-provider">
                            ${this.escapeHtml(plan.rep_name)}
                            <span class="rate-type-badge rate-type-badge-${plan.rate_type.toLowerCase()}">${plan.rate_type}</span>
                        </div>
                    </div>
                    <div class="plan-item-cost">
                        <div class="plan-item-annual">${formatCurrency(plan.annualCost)}/yr</div>
                        ${termMonths !== 12 ? `<div class="plan-item-term-total">${formatCurrency(contractTotalCost)} (${termMonths} months)</div>` : ''}
                        <div class="plan-item-monthly">${formatCurrency(plan.averageMonthlyCost)}/month avg</div>
                    </div>
                </div>
                <div class="plan-item-details">
                    <span class="plan-detail-item" title="Quality score considers cost efficiency, rate stability, fees, and risk factors">
                        <span class="plan-detail-label">Quality:</span>
                        <span class="plan-detail-value quality-score-${this.getQualityTier(plan.qualityScore)}">${plan.qualityScore || 0}/100</span>
                    </span>
                    <span class="plan-detail-item" title="Contract duration - longer terms may offer lower rates but less flexibility">
                        <span class="plan-detail-label">Term:</span>
                        <span class="plan-detail-value">${plan.term_months} months</span>
                    </span>
                    <span class="plan-detail-item" title="Your effective rate based on your usage pattern">
                        <span class="plan-detail-label">Effective Rate:</span>
                        <span class="plan-detail-value">${formatRate(plan.effectiveRate)}</span>
                    </span>
                    <span class="plan-detail-item" title="Percentage of electricity from renewable sources">
                        <span class="plan-detail-label">Renewable:</span>
                        <span class="plan-detail-value ${(plan.renewable_pct || 0) >= 100 ? 'renewable-100' : ''}">${plan.renewable_pct || 0}%</span>
                    </span>
                    <span class="plan-detail-item" title="Early termination fee if you cancel before contract ends">
                        <span class="plan-detail-label">Cancel Fee:</span>
                        <span class="plan-detail-value">${this.formatETF(plan)}</span>
                    </span>
                </div>
                ${
                  plan.warnings && plan.warnings.length > 0 && !isNonFixed
                    ? `
                <div class="plan-item-warnings">
                    <span class="warnings-label">Note:</span>
                    <span class="warnings-text">${plan.warnings.length} consideration${plan.warnings.length > 1 ? 's' : ''} - view details</span>
                </div>`
                    : ''
                }
                <div class="plan-item-actions">
                    <button class="btn-plan-action btn-plan-details" onclick="UI.showPlanModal('${plan.plan_id}')">View Details</button>
                    ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-plan-action btn-plan-efl">View EFL</a>` : ''}
                </div>
            </div>
            `;
      })
      .join('');
  },

  /**
   * Get quality tier for styling (high, medium, low)
   */
  getQualityTier(score) {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  },

  displayWarningPlans(_plans) {
    // Plans Requiring Caution section has been removed
    // All plan warnings are now shown inline in the plan cards and comparison table
    return;
  },

  /**
   * Display deduplication statistics in results header
   */
  displayDeduplicationStats() {
    // Find table info bar or create container
    const tableInfoBar = document.querySelector('.table-info-bar');
    if (!tableInfoBar) return;

    // Check if we have deduplication data
    if (!this.state.data || typeof this.state.data.duplicate_count === 'undefined') {
      return;
    }

    // Remove existing stats if present
    const existingStats = document.querySelector('.deduplication-stats');
    if (existingStats) {
      existingStats.remove();
    }

    const totalPlans = this.state.data.total_plans || 0;
    const originalCount = this.state.data.original_plan_count || totalPlans;
    const duplicateCount = this.state.data.duplicate_count || 0;

    // Always show the stats, even if no duplicates found
    const statsHTML = `
      <div class="deduplication-stats" role="region" aria-label="Duplicate plan detection">
        <div class="deduplication-stats-row">
          <span class="plan-count">
            ${totalPlans.toLocaleString()} unique plan${totalPlans !== 1 ? 's' : ''}
          </span>
          <span class="duplicate-info">
            ${
              duplicateCount > 0
                ? `${originalCount.toLocaleString()} total • ${duplicateCount.toLocaleString()} duplicate${duplicateCount !== 1 ? 's' : ''} removed`
                : `${originalCount.toLocaleString()} total`
            }
          </span>
          <button class="deduplication-trigger" type="button" aria-label="Deduplication details">
            Details
          </button>
        </div>
      </div>
    `;

    // Insert after table info bar
    tableInfoBar.insertAdjacentHTML('afterend', statsHTML);

    // Add click handler for info tooltip
    const tooltipTrigger = document.querySelector('.deduplication-stats .deduplication-trigger');
    if (tooltipTrigger) {
      tooltipTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.showDeduplicationInfo(this.state.data);
      });
    }
  },

  /**
   * Show detailed deduplication information in a modal-like overlay
   */
  showDeduplicationInfo(sourceData = null) {
    const data = sourceData || this.state.data || this.state.freshness || {};
    const duplicateCount = data.duplicate_count ?? data.duplicateCount ?? 0;
    const orphanedEnglish = data.orphaned_english_count ?? data.orphanedEnglishCount ?? 0;
    const orphanedSpanish = data.orphaned_spanish_count ?? data.orphanedSpanishCount ?? 0;
    const languagePairs = Math.floor(duplicateCount / 2);

    const modalHTML = `
      <div class="deduplication-modal-backdrop" role="dialog" aria-modal="true" aria-label="Duplicate plan detection">
        <div class="deduplication-modal">
          <div class="deduplication-modal-header">
            <h3 class="deduplication-modal-title">Duplicate Plan Detection</h3>
            <button class="deduplication-modal-close" aria-label="Close">&times;</button>
          </div>

          <div class="deduplication-modal-body">
            <p class="deduplication-lede">
              Many providers list identical plans in both <strong>English and Spanish</strong> on Power to Choose. These plans share pricing, terms, and features but have different names and documentation links.
            </p>

            <h4 class="deduplication-section-title">How We Detect Duplicates</h4>
            <p class="deduplication-section-text">
              We create a numeric fingerprint using objective plan features only:
            </p>
            <ul class="deduplication-list">
              <li>Provider name and TDU service area</li>
              <li>Rate type (Fixed, Variable, etc.)</li>
              <li>Pricing at 500, 1000, and 2000 kWh usage levels</li>
              <li>Contract term length (months)</li>
              <li>Early termination fee amount</li>
              <li>Monthly base charge</li>
              <li>Renewable energy percentage</li>
              <li>Prepaid plan flag (yes/no)</li>
              <li>Time-of-use plan flag (yes/no)</li>
            </ul>
            <div class="deduplication-note">
              <strong>Why numeric-only?</strong> Analysis of 986 plans confirms that identical numeric features always map to identical terms.
            </div>

            <h4 class="deduplication-section-title">Which Version Do We Keep?</h4>
            <p class="deduplication-section-text">
              When duplicates are found, we keep the English version based on:
            </p>
            <ul class="deduplication-list">
              <li>Explicit language field (English vs Spanish)</li>
              <li>Absence of Spanish characters (ñ, á, é, í, ó, ú)</li>
              <li>Shorter plan names</li>
              <li>Fewer special characters</li>
            </ul>

            <h4 class="deduplication-section-title">Language Distribution</h4>
            <p class="deduplication-section-text">
              Not all plans have both English and Spanish versions. Some appear in only one language:
            </p>
            <div class="deduplication-grid">
              ${
                languagePairs > 0
                  ? `
                <div class="deduplication-stat">
                  <div class="deduplication-stat-value">${languagePairs.toLocaleString()}</div>
                  <div class="deduplication-stat-label">Language Pairs</div>
                </div>
              `
                  : ''
              }
              ${
                orphanedEnglish > 0
                  ? `
                <div class="deduplication-stat">
                  <div class="deduplication-stat-value">${orphanedEnglish.toLocaleString()}</div>
                  <div class="deduplication-stat-label">English Only</div>
                </div>
              `
                  : ''
              }
              ${
                orphanedSpanish > 0
                  ? `
                <div class="deduplication-stat">
                  <div class="deduplication-stat-value">${orphanedSpanish.toLocaleString()}</div>
                  <div class="deduplication-stat-label">Spanish Only</div>
                </div>
              `
                  : ''
              }
            </div>
            ${
              orphanedSpanish > 0
                ? `
              <div class="deduplication-note deduplication-note-accent">
                <strong>Note:</strong> ${orphanedSpanish.toLocaleString()} plan${orphanedSpanish !== 1 ? 's are' : ' is'} marked as Spanish-only because no English equivalent exists for the same provider and service area.
              </div>
            `
                : ''
            }

            ${
              duplicateCount > 0
                ? `
              <div class="deduplication-summary">
                <strong>${duplicateCount.toLocaleString()} duplicate plan${duplicateCount !== 1 ? 's' : ''}</strong> removed so you see only unique options.
              </div>
            `
                : ''
            }
          </div>
        </div>
      </div>
    `;

    // Add modal to document
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add close handlers
    const overlay = document.querySelector('.deduplication-modal-backdrop');
    const closeBtn = document.querySelector('.deduplication-modal .deduplication-modal-close');

    const closeModal = () => {
      overlay.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Close on Escape key
    const escapeHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  },

  displayComparisonTable(plans) {
    if (!this.elements.comparisonBody) return;

    // If no sort column is selected, ensure plans are sorted by combined score descending
    // with deterministic tie-breakers
    let displayPlans = plans;
    if (!this.sortState.column) {
      displayPlans = [...plans].sort((a, b) => {
        // 1. Combined Score (Descending) - Primary ranking metric
        const scoreDiff = (b.combinedScore || 0) - (a.combinedScore || 0);
        if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

        // 2. Annual Cost (Ascending) - Cheaper is better
        const costDiff = (a.annualCost || 0) - (b.annualCost || 0);
        if (Math.abs(costDiff) > 0.01) return costDiff;

        // 3. Quality Score (Descending) - Higher quality is better
        const qualityDiff = (b.qualityScore || 0) - (a.qualityScore || 0);
        if (qualityDiff !== 0) return qualityDiff;

        // 4. Plan Name (Ascending) - Alphabetical stability
        return (a.plan_name || '').localeCompare(b.plan_name || '');
      });
    }

    // Calculate best values for highlighting
    const bestValues = this.calculateBestValues(displayPlans);
    const annualCostThreshold = this.getCostPercentileThreshold(displayPlans, 0.1);

    this.elements.comparisonBody.innerHTML = displayPlans
      .map((plan, _i) => {
        const grade =
          typeof getQualityGrade === 'function'
            ? getQualityGrade(plan.qualityScore || 0)
            : { letter: '-', description: 'N/A', class: 'grade-na', tooltip: '' };

        // Get score explanation for tooltip
        const scoreExplanation =
          typeof getScoreExplanation === 'function' && plan.scoreBreakdown
            ? getScoreExplanation(plan)
            : `Quality score: ${plan.qualityScore || 0}/100`;

        const isNonFixed = plan.rate_type !== 'FIXED';
        const rowClass = plan.isGimmick ? 'row-caution' : isNonFixed ? 'plan-non-fixed' : '';
        const termMonths = plan.term_months || 12;
        const contractTotalCost = plan.averageMonthlyCost * termMonths;

        // Calculate contract end date (assuming enrollment today)
        const contractEndDate = new Date();
        contractEndDate.setMonth(contractEndDate.getMonth() + termMonths);
        const endDateFormatted = contractEndDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        });

        // Get contract expiration analysis
        const expirationAnalysis =
          typeof ContractAnalyzer !== 'undefined' && ContractAnalyzer.calculateContractExpiration
            ? ContractAnalyzer.calculateContractExpiration(new Date(), termMonths)
            : { riskLevel: 'low', renewalSeason: 'Optimal' };

        const planScore = plan.combinedScore ?? plan.qualityScore ?? 0;
        const isTopCheapest =
          Number.isFinite(annualCostThreshold) &&
          Number.isFinite(plan.annualCost) &&
          plan.annualCost <= annualCostThreshold;
        const annualHighlightClass = planScore >= 80 && isTopCheapest ? 'text-positive' : '';
        const contractRiskClass = expirationAnalysis.riskLevel === 'high' ? 'text-negative' : '';
        const renewablePct = plan.renewable_pct ?? 0;
        const renewableClass =
          renewablePct >= 80 ? 'text-positive' : renewablePct <= 33.3 ? 'text-negative' : '';
        const annualRateSubtext = this.formatRateSafe(plan.effectiveRate);

        // Check if this plan has best values
        const isBestCost = plan.annualCost === bestValues.lowestCost;
        const isBestRate = plan.effectiveRate === bestValues.lowestRate;
        const isBestQuality = plan.qualityScore === bestValues.highestQuality;
        const isLowestFee = this.getETFSortValue(plan) === bestValues.lowestFee;

        // Badge Logic
        const variableBadge = isNonFixed
          ? `<span class="rate-type-badge rate-type-badge-${plan.rate_type.toLowerCase()}">${plan.rate_type}</span>`
          : '';
        const prepaidBadge = plan.is_prepaid
          ? '<span class="rate-type-badge rate-type-badge-prepaid">PREPAID</span>'
          : '';
        const touBadge = plan.is_tou
          ? '<span class="rate-type-badge rate-type-badge-tou">TIME OF USE</span>'
          : '';

        const badRenewalBadge =
          expirationAnalysis.riskLevel === 'high'
            ? `<span class="bad-renewal-badge" title="Expires during expensive peak season">RENEWAL</span>`
            : '';

        return `
            <tr class="${rowClass}" data-plan-id="${plan.plan_id}" onclick="UI.showPlanModal('${plan.plan_id}')">
                <td class="col-grade">
                    <div class="grade-content-wrapper">
                        <span class="quality-grade ${grade.class}" title="${scoreExplanation}" aria-label="Quality grade ${grade.letter}">
                            ${grade.letter}
                        </span>
                        <span class="quality-score ${isBestQuality ? 'best-value' : ''}">${plan.qualityScore || 0}</span>
                    </div>
                </td>
                <td class="col-provider">
                    <div class="provider-cell">
                        <span class="provider-name">${this.escapeHtml(plan.rep_name)}</span>
                    </div>
                </td>
                <td>
                    <div class="plan-name-cell">
                        <span>${this.escapeHtml(plan.plan_name)}</span>
                        <div class="plan-badges">
                            ${variableBadge}
                            ${prepaidBadge}
                            ${touBadge}
                            ${badRenewalBadge}
                        </div>
                    </div>
                </td>
                <td><span class="term-badge">${plan.term_months} months</span></td>
                <td class="col-contract-end" data-sort-value="${contractEndDate.getTime()}">
                    <div class="contract-end-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                    <span class="contract-end-date ${contractRiskClass}">${endDateFormatted}</span>
                    </div>
                </td>
                <td class="col-annual">
                  <span class="cost-value ${annualHighlightClass}">${this.formatCurrencySafe(plan.annualCost)}</span>
                  ${isBestCost ? '<span class="best-indicator">Lowest</span>' : ''}
                  ${termMonths !== 12 ? `<span class="term-cost-label">${this.formatCurrencySafe(contractTotalCost)} (${termMonths} months)</span>` : ''}
                  <span class="cost-subtext">${annualRateSubtext}</span>
                </td>
                <td class="col-monthly">${this.formatCurrencySafe(plan.averageMonthlyCost)}</td>
                <td class="col-rate"><span class="rate-value ${isBestRate ? 'best-value' : ''}">${this.formatRateSafe(plan.effectiveRate)}</span></td>
                <td class="col-renewable">
                  <span class="renewable-value ${renewableClass}">${renewablePct}%</span>
                </td>
                <td class="col-etf ${isLowestFee ? 'best-value' : ''}">${this.formatETF(plan)}</td>
                <td><button class="btn-view" onclick="event.stopPropagation(); UI.showPlanModal('${plan.plan_id}')">View</button></td>
            </tr>
            `;
      })
      .join('');

    // Add click handlers for sortable column headers
    this.attachTableSortHandlers();
  },

  /**
   * Calculate the annual cost threshold for the cheapest percentile of plans
   * @param {Object[]} plans
   * @param {number} percentile - Decimal percentile (e.g., 0.1 for cheapest 10%)
   * @returns {number|null}
   */
  getCostPercentileThreshold(plans, percentile) {
    if (!plans || plans.length === 0) return null;
    const costs = plans
      .map((plan) => plan.annualCost)
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    if (!costs.length) return null;
    const count = Math.max(1, Math.ceil(costs.length * percentile));
    return costs[count - 1];
  },

  formatCurrencySafe(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value)) return '—';
    return typeof formatCurrency === 'function' ? formatCurrency(value) : `$${value.toFixed(2)}`;
  },

  formatRateSafe(rate) {
    const value = Number(rate);
    if (!Number.isFinite(value)) return '—';
    return typeof formatRate === 'function' ? formatRate(value) : `${value.toFixed(2)}¢/kWh`;
  },

  /**
   * Calculate best values across all plans for highlighting
   */
  calculateBestValues(plans) {
    if (!plans || plans.length === 0) {
      return {
        lowestCost: 0,
        lowestRate: 0,
        highestQuality: 0,
        lowestFee: 0
      };
    }

    return {
      lowestCost: Math.min(...plans.map((p) => p.annualCost || Infinity)),
      lowestRate: Math.min(...plans.map((p) => p.effectiveRate || Infinity)),
      highestQuality: Math.max(...plans.map((p) => p.qualityScore || 0)),
      lowestFee: Math.min(...plans.map((p) => this.getETFSortValue(p)))
    };
  },

  // Current sort state
  sortState: {
    column: null,
    direction: 'asc'
  },

  attachTableSortHandlers() {
    const sortableHeaders = document.querySelectorAll('.comparison-table th.sortable');
    sortableHeaders.forEach((header) => {
      // Remove existing listeners to prevent duplicates
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);

      newHeader.addEventListener('click', () => {
        const sortKey = newHeader.dataset.sort;
        this.handleTableSort(sortKey, newHeader);
      });
    });
  },

  handleTableSort(sortKey, headerElement) {
    if (!this.state.rankedPlans) return;

    // Toggle direction if same column, otherwise default to ascending
    if (this.sortState.column === sortKey) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortState.column = sortKey;
      this.sortState.direction = 'asc';
    }

    // Update header visual indicators
    document.querySelectorAll('.comparison-table th.sortable').forEach((th) => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    headerElement.classList.add(this.sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');

    // Apply filters (which will use the sort state)
    this.applyFilters();
  },

  applyFilters() {
    if (!this.state.rankedPlans) return;

    let filtered = [...this.state.rankedPlans];

    const termFilter = this.elements.filterTerm?.value;
    if (termFilter && termFilter !== 'all') {
      switch (termFilter) {
        case 'short':
          filtered = filtered.filter((p) => p.term_months <= 6);
          break;
        case 'medium':
          filtered = filtered.filter((p) => p.term_months >= 10 && p.term_months <= 14);
          break;
        case 'long':
          filtered = filtered.filter((p) => p.term_months >= 24);
          break;
      }
    }

    const renewableFilter = this.elements.filterRenewable?.value;
    if (renewableFilter && renewableFilter !== 'all') {
      const minPct = Number.parseInt(renewableFilter, 10);
      filtered = filtered.filter((p) => (p.renewable_pct || 0) >= minPct);
    }

    // Apply sorting
    // If a column is selected, sort by that column
    // Otherwise, maintain default sort by combined score descending
    if (this.sortState.column) {
      const dir = this.sortState.direction === 'asc' ? 1 : -1;
      filtered.sort((a, b) => {
        let aVal, bVal;
        switch (this.sortState.column) {
          case 'annual':
            aVal = a.annualCost || 0;
            bVal = b.annualCost || 0;
            break;
          case 'rate':
            aVal = a.effectiveRate || 0;
            bVal = b.effectiveRate || 0;
            break;
          case 'quality':
            aVal = a.qualityScore || 0;
            bVal = b.qualityScore || 0;
            break;
          case 'term':
            aVal = a.term_months || 0;
            bVal = b.term_months || 0;
            break;
          case 'contractEnd': {
            // Sort by contract end date (calculated from term_months)
            const dateA = new Date();
            dateA.setMonth(dateA.getMonth() + (a.term_months || 0));
            const dateB = new Date();
            dateB.setMonth(dateB.getMonth() + (b.term_months || 0));
            aVal = dateA.getTime();
            bVal = dateB.getTime();
            break;
          }
          case 'monthly':
            aVal = a.averageMonthlyCost || 0;
            bVal = b.averageMonthlyCost || 0;
            break;
          case 'renewable':
            aVal = a.renewable_pct || 0;
            bVal = b.renewable_pct || 0;
            break;
          case 'provider':
            aVal = (a.rep_name || '').toLowerCase();
            bVal = (b.rep_name || '').toLowerCase();
            return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
          case 'plan':
            aVal = (a.plan_name || '').toLowerCase();
            bVal = (b.plan_name || '').toLowerCase();
            return aVal < bVal ? -dir : aVal > bVal ? dir : 0;
          case 'cancelFee':
            // Sort by ETF amount, treating 'None' as 0
            aVal = this.getETFSortValue(a);
            bVal = this.getETFSortValue(b);
            break;
          default:
            return 0;
        }
        return (aVal - bVal) * dir;
      });
    } else {
      // Default sort: combined score descending (highest first)
      filtered.sort((a, b) => {
        const aScore = a.combinedScore || 0;
        const bScore = b.combinedScore || 0;
        return bScore - aScore;
      });
    }

    this.displayComparisonTable(filtered);
  },

  showPlanModal(planId) {
    const plan = this.state.rankedPlans?.find((p) => p.plan_id === planId);
    if (!plan) {
      Toast.error('Plan not found');
      return;
    }

    const isNonFixed = plan.rate_type !== 'FIXED';
    const termMonths = plan.term_months || 12;
    const contractTotalCost = plan.averageMonthlyCost * termMonths;

    this.elements.modalBody.innerHTML = `
            <h2 class="modal-title">${this.escapeHtml(plan.plan_name)}</h2>
            <p class="modal-provider">
                ${this.escapeHtml(plan.rep_name)}
                <span class="rate-type-badge rate-type-badge-${plan.rate_type.toLowerCase()}">${plan.rate_type}</span>
            </p>

            ${
              isNonFixed
                ? `
            <div class="non-fixed-warning" style="margin-bottom: var(--space-4);">
                <span class="non-fixed-warning-icon">!</span>
                <span class="non-fixed-warning-text"><strong>${plan.rate_type} Rate Plan:</strong> Your rate can change based on market conditions. You may pay significantly more during peak demand periods. Fixed-rate plans provide more budget certainty.</span>
            </div>
            `
                : ''
            }

            <div class="modal-section">
                <h3 class="modal-section-title">Cost Summary</h3>
                <div class="modal-grid">
                    <div class="modal-stat">
                        <span class="modal-stat-value highlight">${formatCurrency(plan.annualCost)}</span>
                        <span class="modal-stat-label">Annual Cost</span>
                    </div>
                    ${
                      termMonths !== 12
                        ? `
                    <div class="modal-stat">
                        <span class="modal-stat-value">${formatCurrency(contractTotalCost)} (${termMonths} months)</span>
                        <span class="modal-stat-label">Contract Total</span>
                    </div>
                    `
                        : ''
                    }
                    <div class="modal-stat">
                        <span class="modal-stat-value">${formatCurrency(plan.averageMonthlyCost)}</span>
                        <span class="modal-stat-label">Monthly Average</span>
                    </div>
                    <div class="modal-stat">
                        <span class="modal-stat-value">${formatRate(plan.effectiveRate)}</span>
                        <span class="modal-stat-label">Effective Rate</span>
                    </div>
                </div>
            </div>

            <div class="modal-section">
                <h3 class="modal-section-title">Plan Details</h3>
                <div class="modal-grid">
                    <div class="modal-stat">
                        <span class="modal-stat-value">${plan.term_months} months</span>
                        <span class="modal-stat-label">Contract Term</span>
                    </div>
                    <div class="modal-stat">
                      <span class="modal-stat-value">${this.renderETFModalValue(plan)}</span>
                      <span class="modal-stat-label">Cancellation Fee</span>
                    </div>
                    <div class="modal-stat">
                        <span class="modal-stat-value">${plan.renewable_pct || 0}%</span>
                        <span class="modal-stat-label">Renewable Energy</span>
                    </div>
                    <div class="modal-stat">
                        <span class="modal-stat-value">${plan.is_tou ? 'Yes' : 'No'}</span>
                        <span class="modal-stat-label">Time-of-Use</span>
                    </div>
                </div>
            </div>

            <div class="modal-section">
                <h3 class="modal-section-title">Advertised Rates</h3>
                <div class="modal-grid">
                    <div class="modal-stat">
                        <span class="modal-stat-value">${formatRate(plan.price_kwh_500)}</span>
                        <span class="modal-stat-label">At 500 kWh</span>
                    </div>
                    <div class="modal-stat">
                        <span class="modal-stat-value">${formatRate(plan.price_kwh_1000)}</span>
                        <span class="modal-stat-label">At 1,000 kWh</span>
                    </div>
                    <div class="modal-stat">
                        <span class="modal-stat-value">${formatRate(plan.price_kwh_2000)}</span>
                        <span class="modal-stat-label">At 2,000 kWh</span>
                    </div>
                </div>
            </div>

            ${
              plan.warnings.length > 0
                ? `
                <div class="modal-section">
                    <h3 class="modal-section-title">Warnings</h3>
                    <div class="modal-warnings">
                        ${plan.warnings.map((w) => `<div class="modal-warning">${this.escapeHtml(w)}</div>`).join('')}
                    </div>
                </div>
            `
                : ''
            }

            <div class="modal-section">
              <div class="etf-reminder">
                <strong>Verify cancellation terms:</strong> Always confirm details in the Electricity Facts Label (EFL), Residential Terms of Service, and Your Rights as a Retail Electric Customer documents. Contact the REP directly if terms are unclear.
              </div>
            </div>

            <div class="modal-actions">
                ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="modal-btn monthsdal-btn-primary">View EFL</a>` : ''}
                ${plan.enrollment_url ? `<a href="${this.escapeHtml(plan.enrollment_url)}" target="_blank" rel="noopener" class="modal-btn monthsdal-btn-secondary">Enroll</a>` : ''}
            </div>
        `;

    this.elements.modalBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    if (this.elements.modalBackdrop && !this.elements.modalBackdrop.hidden) {
      this.elements.modalBackdrop.classList.add('modal-out');

      // Wait for animation to finish (matches CSS duration of 0.2s)
      setTimeout(() => {
        this.elements.modalBackdrop.hidden = true;
        this.elements.modalBackdrop.classList.remove('modal-out');
        document.body.style.overflow = '';
      }, 200);
    }
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  },

  /**
   * Format ETF for display, handling per-month-remaining fees
   */
  formatETF(plan) {
    const etfInfo = this.getETFInfo(plan);

    const exampleTitle =
      etfInfo.structure === 'per-month' || etfInfo.structure === 'per-month-inferred'
        ? `Example: ${formatCurrency(etfInfo.exampleTotal)} with ${etfInfo.exampleMonths} months remaining`
        : '';

    if (etfInfo.needsConfirmation) {
      return `
          <span title="${this.escapeHtml(exampleTitle)}">${etfInfo.displayText}</span>
          <span class="etf-info-icon"
                title="Fee structure detected automatically. Click for verification guidance."
                onclick="UI.showETFVerificationModal(event)"
                style="cursor: pointer; margin-left: 4px; color: var(--color-accent); font-weight: 600;">ⓘ</span>
        `;
    }

    return `<span title="${this.escapeHtml(exampleTitle)}">${etfInfo.displayText}</span>`;
  },

  getETFInfo(plan) {
    if (typeof ETFCalculator !== 'undefined' && ETFCalculator.getETFDisplayInfo) {
      return ETFCalculator.getETFDisplayInfo(plan);
    }

    const fallbackFee = plan.early_termination_fee || 0;
    return {
      total: fallbackFee,
      structure: fallbackFee > 0 ? 'flat' : 'none',
      perMonthRate: 0,
      monthsRemaining: Math.floor((plan.term_months || 12) / 2),
      displayText: fallbackFee > 0 ? formatCurrency(fallbackFee) : 'None',
      exampleTotal: fallbackFee,
      exampleMonths: Math.floor((plan.term_months || 12) / 2),
      needsConfirmation: false
    };
  },

  getETFSortValue(plan) {
    const etfInfo = this.getETFInfo(plan);
    if (!etfInfo || etfInfo.structure === 'none') return 0;
    if (etfInfo.structure === 'unknown') return Number.POSITIVE_INFINITY;
    if (etfInfo.structure === 'flat') return etfInfo.total || 0;
    return etfInfo.exampleTotal || etfInfo.total || 0;
  },

  renderETFModalValue(plan) {
    const etfInfo = this.getETFInfo(plan);
    if (etfInfo.structure === 'per-month' || etfInfo.structure === 'per-month-inferred') {
      return `${etfInfo.displayText} <span class="modal-subtext">(example ${formatCurrency(etfInfo.exampleTotal)} with ${etfInfo.exampleMonths} months remaining)</span>`;
    }
    return etfInfo.displayText;
  },

  /**
   * Show ETF verification monthsdal with guidance on verifying cancellation fees
   */
  showETFVerificationModal(event) {
    // Prevent event propagation
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const modalContent = `
      <div class="etf-verification-content">
        <h3 style="margin-top: 0; color: var(--color-ink);">Early Termination Fee Verification Required</h3>
        <p style="color: var(--color-ink-secondary); line-height: 1.6;">
          This fee structure was detected automatically and may not be accurate.
        </p>

        <div class="verification-instructions" style="margin: var(--space-6) 0; padding: var(--space-4); background: var(--color-surface-sunken); border-radius: 8px;">
          <h4 style="margin-top: 0; font-size: var(--text-base); color: var(--color-ink);">Please verify exact cancellation terms in these official documents:</h4>
          <ul style="margin: var(--space-3) 0; padding-left: var(--space-5); line-height: 1.8; color: var(--color-ink-secondary);">
            <li><strong>Electricity Facts Label (EFL)</strong> - Required disclosure document</li>
            <li><strong>Residential Terms of Service</strong> - Full contract terms</li>
            <li><strong>Your Rights as a Retail Electric Customer</strong> - Consumer protection guide</li>
          </ul>
          <p style="margin: var(--space-3) 0; font-size: var(--text-sm); color: var(--color-ink-secondary);">
            Contact the Retail Electric Provider (REP) directly if terms are unclear.
          </p>
        </div>

        <div class="fee-structure-types" style="margin: var(--space-6) 0;">
          <h4 style="margin-top: 0; font-size: var(--text-base); color: var(--color-ink);">Common Fee Structures:</h4>
          <ul style="margin: var(--space-3) 0; padding-left: var(--space-5); line-height: 1.8; color: var(--color-ink-secondary);">
            <li><strong>Fixed fee:</strong> One-time charge (e.g., $150 total)</li>
            <li><strong>Per-month remaining:</strong> Multiplied by months left in contract (e.g., $20 × 8 months = $160)</li>
            <li><strong>No fee:</strong> $0 cancellation cost</li>
          </ul>
        </div>

        <p class="verification-note" style="margin-top: var(--space-6); padding: var(--space-4); background: var(--color-caution-muted); border-radius: 8px; border: 1px solid var(--color-caution); font-size: var(--text-sm); line-height: 1.6; color: var(--color-ink);">
          <strong>Important:</strong> Texas law requires the Retail Electric Provider (REP) to clearly disclose cancellation terms in your EFL.
          Always verify before enrolling.
        </p>
      </div>
    `;

    this.showModal('ETF Verification', modalContent);
  }
};

// Initialize on DOM ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => UI.init());
  } else {
    UI.init();
  }
}

// Export for monthsdules
if (typeof monthsdule !== 'undefined' && monthsdule.exports) {
  monthsdule.exports = { UI, Toast };
}
