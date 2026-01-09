/**
 * Light - User Interface Module
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
        error: '&#10007;',   // X mark
        warning: '!',        // Exclamation
        info: 'i'            // Info
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
            ${duration > 0 ? `
                <div class="toast-progress">
                    <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
                </div>
            ` : ''}
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
        lastCalculation: null
    },

    elements: {},

    /**
     * Auto-calculate debounce delay (ms)
     */
    AUTO_CALCULATE_DELAY: 500,

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
        this.elements.methodOptions.forEach(option => {
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
                this.state.avgUsage = parseFloat(e.target.value) || null;
                this.debounceAutoCalculate();
            });
        }

        // Monthly usage inputs - auto-calculate with debounce
        const monthInputs = document.querySelectorAll('[data-month]');
        monthInputs.forEach(input => {
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

            if (this.elements.totalPlansCount) {
                // Show unique plan count (after deduplication)
                this.elements.totalPlansCount.textContent = freshness.totalPlans.toLocaleString();

                // Add tooltip with full details
                if (freshness.duplicateCount > 0) {
                    this.elements.totalPlansCount.setAttribute(
                        'title',
                        `${freshness.originalPlanCount.toLocaleString()} total plans, ` +
                        `${freshness.duplicateCount} duplicates removed`
                    );
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

        if (value.length === 5) {
            this.elements.zipStatus.innerHTML = '<span style="color: var(--color-positive);">Checking...</span>';
        } else {
            this.elements.zipStatus.textContent = '';
        }
    },

    async handleZipBlur() {
        const zipCode = this.elements.zipInput.value;

        if (zipCode.length !== 5) {
            this.disableUsageSection();
            return;
        }

        this.state.zipCode = zipCode;

        try {
            const taxInfo = await API.getLocalTaxInfo(zipCode);

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
            Toast.error(
                'Unable to verify service area. Please try again.',
                6000,
                'Lookup Failed'
            );
            console.error('ZIP detection error:', error);
            this.disableUsageSection();
        }
    },

    showTduInfo(tdu) {
        if (!this.elements.tduDisplay) return;

        this.elements.tduDisplay.hidden = false;
        this.elements.tduName.textContent = tdu.name;
        this.elements.tduBase.textContent = `$${tdu.monthly_base_charge.toFixed(2)}/mo`;
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
        this.updateCalculateButton();
    },

    handleMethodChange(option) {
        const method = option.dataset.method;
        this.state.usageMethod = method;

        // Update tab states
        this.elements.methodOptions.forEach(opt => {
            opt.classList.remove('active');
            opt.setAttribute('aria-selected', 'false');
        });
        option.classList.add('active');
        option.setAttribute('aria-selected', 'true');

        // Show correct panel
        ['estimate', 'average', 'detailed'].forEach(m => {
            const panel = document.getElementById(`panel-${m}`);
            if (panel) {
                panel.hidden = (m !== method);
                panel.classList.toggle('active', m === method);
            }
        });

        this.updateCalculateButton();
    },

    handleMonthlyInput() {
        const monthInputs = document.querySelectorAll('[data-month]');
        const values = Array.from(monthInputs).map(input => parseFloat(input.value) || 0);
        this.state.monthlyUsage = values;

        const total = values.reduce((sum, v) => sum + v, 0);
        const avg = values.filter(v => v > 0).length > 0
            ? total / values.filter(v => v > 0).length
            : 0;

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
                return !!(this.state.avgUsage || parseFloat(this.elements.avgKwh?.value));
            case 'detailed':
                return this.state.monthlyUsage.some(v => v > 0);
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
            Toast.warning(
                'Enter your 5-digit Texas ZIP code to begin.',
                5000,
                'ZIP Required'
            );
            return;
        }

        // Get usage pattern
        let monthlyUsage;
        switch (this.state.usageMethod) {
            case 'estimate':
                const homeSize = this.elements.homeSize?.value || this.state.homeSize;
                if (!homeSize) {
                    Toast.warning(
                        'Select your home size to estimate usage.',
                        5000,
                        'Selection Required'
                    );
                    return;
                }
                monthlyUsage = estimateUsagePattern(parseFloat(homeSize));
                break;
            case 'average':
                const avgKwh = parseFloat(this.elements.avgKwh?.value) || this.state.avgUsage;
                if (!avgKwh) {
                    Toast.warning(
                        'Enter your average monthly kWh usage.',
                        5000,
                        'Usage Required'
                    );
                    return;
                }
                monthlyUsage = estimateUsagePattern(avgKwh);
                break;
            case 'detailed':
                if (!this.state.monthlyUsage.some(v => v > 0)) {
                    Toast.warning(
                        'Enter usage for at least one month.',
                        5000,
                        'Usage Required'
                    );
                    return;
                }
                monthlyUsage = [...this.state.monthlyUsage];
                // Fill empty months with average of filled months
                const filledMonths = monthlyUsage.filter(v => v > 0);
                const avgFilled = filledMonths.reduce((a, b) => a + b, 0) / filledMonths.length;
                monthlyUsage = monthlyUsage.map(v => v || avgFilled);
                break;
        }

        this.state.isLoading = true;
        this.showLoading();

        try {
            const plansData = await API.loadPlans();
            const tduPlans = plansData.plans.filter(p => p.tdu_area === this.state.tdu.code);

            if (tduPlans.length === 0) {
                Toast.warning(
                    'No electricity plans currently available for your service area.',
                    6000,
                    'No Plans Found'
                );
                return;
            }

            const rankedPlans = rankPlans(tduPlans, monthlyUsage, this.state.tdu);
            this.state.rankedPlans = rankedPlans;

            this.displayResults(rankedPlans, monthlyUsage);

            this.elements.resultsSection.hidden = false;
            this.elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const best = rankedPlans[0];
            const savings = rankedPlans.length > 1 ? rankedPlans[rankedPlans.length - 1].annualCost - best.annualCost : 0;
            Toast.success(
                `Lowest cost plan: ${formatCurrency(best.annualCost)}/year. ` +
                (savings > 0 ? `Save up to ${formatCurrency(savings)} vs other plans.` : ''),
                6000,
                `${rankedPlans.length} Plans Analyzed`
            );

        } catch (error) {
            Toast.error(
                'Unable to calculate costs. Please try again.',
                8000,
                'Calculation Error'
            );
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
        if (this.elements.statusIdle) this.elements.statusIdle.hidden = false;
        if (this.elements.statusLoading) this.elements.statusLoading.hidden = true;
        if (this.elements.statusReady) this.elements.statusReady.hidden = true;
    },

    displayResults(plans, monthlyUsage) {
        this.displayUsageProfile(monthlyUsage);
        this.displayTopPlans(plans.slice(0, 5));
        this.displayWarningPlans(plans.filter(p => p.isGimmick).slice(0, 3));
        this.displayComparisonTable(plans);

        if (this.elements.resultsCount) {
            this.elements.resultsCount.textContent = plans.length;
        }
    },

    displayUsageProfile(monthlyUsage) {
        const total = monthlyUsage.reduce((a, b) => a + b, 0);
        const avg = total / 12;
        const max = Math.max(...monthlyUsage);
        const peakMonth = monthlyUsage.indexOf(max);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (this.elements.profileAnnual) {
            this.elements.profileAnnual.textContent = `${total.toLocaleString()} kWh`;
        }
        if (this.elements.profileAvg) {
            this.elements.profileAvg.textContent = `${Math.round(avg).toLocaleString()} kWh`;
        }
        if (this.elements.profilePeak) {
            this.elements.profilePeak.textContent = `${monthNames[peakMonth]} (${Math.round(max).toLocaleString()} kWh)`;
        }

        // Render chart
        if (this.elements.usageChart) {
            const maxHeight = 60;
            this.elements.usageChart.innerHTML = monthlyUsage.map((usage, i) => {
                const height = max > 0 ? (usage / max) * maxHeight : 4;
                const isPeak = i === peakMonth;
                return `<div class="bar ${isPeak ? 'peak' : ''}" style="height: ${height}px" title="${monthNames[i]}: ${Math.round(usage)} kWh"></div>`;
            }).join('');
        }
    },

    displayTopPlans(plans) {
        if (!this.elements.topPlans) return;

        this.elements.topPlans.innerHTML = plans.map((plan, i) => `
            <div class="plan-item">
                <div class="plan-item-rank">Rank #${i + 1}</div>
                <div class="plan-item-header">
                    <div>
                        <div class="plan-item-name">${this.escapeHtml(plan.plan_name)}</div>
                        <div class="plan-item-provider">${this.escapeHtml(plan.rep_name)}</div>
                    </div>
                    <div class="plan-item-cost">
                        <div class="plan-item-annual">${formatCurrency(plan.annualCost)}/yr</div>
                        <div class="plan-item-monthly">${formatCurrency(plan.averageMonthlyCost)}/mo avg</div>
                    </div>
                </div>
                <div class="plan-item-details">
                    <span class="plan-detail-item">
                        <span class="plan-detail-label">Term:</span>
                        <span class="plan-detail-value">${plan.term_months} mo</span>
                    </span>
                    <span class="plan-detail-item">
                        <span class="plan-detail-label">Rate:</span>
                        <span class="plan-detail-value">${formatRate(plan.effectiveRate)}</span>
                    </span>
                    <span class="plan-detail-item">
                        <span class="plan-detail-label">Renewable:</span>
                        <span class="plan-detail-value">${plan.renewable_pct || 0}%</span>
                    </span>
                    <span class="plan-detail-item">
                        <span class="plan-detail-label">Cancel Fee:</span>
                        <span class="plan-detail-value">${this.formatETF(plan)}</span>
                    </span>
                </div>
                <div class="plan-item-actions">
                    <button class="btn-plan-action btn-plan-details" onclick="UI.showPlanModal('${plan.plan_id}')">View Details</button>
                    ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-plan-action btn-plan-efl">View EFL</a>` : ''}
                </div>
            </div>
        `).join('');
    },

    displayWarningPlans(plans) {
        if (!this.elements.warningsSection || !this.elements.warningPlans) return;

        if (plans.length === 0) {
            this.elements.warningsSection.hidden = true;
            return;
        }

        this.elements.warningsSection.hidden = false;
        this.elements.warningPlans.innerHTML = plans.map(plan => `
            <div class="warning-item">
                <div class="warning-item-header">
                    <div>
                        <div class="warning-item-title">${this.escapeHtml(plan.plan_name)}</div>
                        <div class="warning-item-provider">${this.escapeHtml(plan.rep_name)}</div>
                    </div>
                    <div class="warning-item-cost">
                        <div class="warning-item-advertised">Advertised: ${formatRate(plan.price_kwh_1000)}</div>
                        <div class="warning-item-actual">Actual: ${formatCurrency(plan.annualCost)}/yr</div>
                    </div>
                </div>
                <div class="warning-reasons">
                    ${plan.warnings.map(w => `<div class="warning-reason">${this.escapeHtml(w)}</div>`).join('')}
                </div>
            </div>
        `).join('');
    },

    displayComparisonTable(plans) {
        if (!this.elements.comparisonBody) return;

        this.elements.comparisonBody.innerHTML = plans.map((plan, i) => `
            <tr class="${plan.isGimmick ? 'row-caution' : ''}">
                <td class="col-rank">${i + 1}</td>
                <td>${this.escapeHtml(plan.rep_name)}</td>
                <td>${this.escapeHtml(plan.plan_name)}</td>
                <td>${plan.term_months} mo</td>
                <td class="col-annual"><span class="cost-value">${formatCurrency(plan.annualCost)}</span></td>
                <td class="col-monthly">${formatCurrency(plan.averageMonthlyCost)}</td>
                <td class="col-rate"><span class="rate-value">${formatRate(plan.effectiveRate)}</span></td>
                <td class="col-renewable">${plan.renewable_pct || 0}%</td>
                <td class="col-etf">${this.formatETF(plan)}</td>
                <td><button class="btn-view" onclick="UI.showPlanModal('${plan.plan_id}')">View</button></td>
            </tr>
        `).join('');
    },

    applyFilters() {
        if (!this.state.rankedPlans) return;

        let filtered = [...this.state.rankedPlans];

        const termFilter = this.elements.filterTerm?.value;
        if (termFilter && termFilter !== 'all') {
            switch (termFilter) {
                case 'short':
                    filtered = filtered.filter(p => p.term_months <= 6);
                    break;
                case 'medium':
                    filtered = filtered.filter(p => p.term_months >= 10 && p.term_months <= 14);
                    break;
                case 'long':
                    filtered = filtered.filter(p => p.term_months >= 24);
                    break;
            }
        }

        const renewableFilter = this.elements.filterRenewable?.value;
        if (renewableFilter && renewableFilter !== 'all') {
            const minPct = parseInt(renewableFilter, 10);
            filtered = filtered.filter(p => (p.renewable_pct || 0) >= minPct);
        }

        this.displayComparisonTable(filtered);
    },

    showPlanModal(planId) {
        const plan = this.state.rankedPlans?.find(p => p.plan_id === planId);
        if (!plan) {
            Toast.error('Plan not found');
            return;
        }

        this.elements.modalBody.innerHTML = `
            <h2 class="modal-title">${this.escapeHtml(plan.plan_name)}</h2>
            <p class="modal-provider">${this.escapeHtml(plan.rep_name)}</p>

            <div class="modal-section">
                <h3 class="modal-section-title">Cost Summary</h3>
                <div class="modal-grid">
                    <div class="modal-stat">
                        <span class="modal-stat-value highlight">${formatCurrency(plan.annualCost)}</span>
                        <span class="modal-stat-label">Annual Cost</span>
                    </div>
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
                        <span class="modal-stat-value">${formatCurrency(plan.early_termination_fee || 0)}</span>
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

            ${plan.warnings.length > 0 ? `
                <div class="modal-section">
                    <h3 class="modal-section-title">Warnings</h3>
                    <div class="modal-warnings">
                        ${plan.warnings.map(w => `<div class="modal-warning">${this.escapeHtml(w)}</div>`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="modal-actions">
                ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="modal-btn modal-btn-primary">View EFL</a>` : ''}
                ${plan.enrollment_url ? `<a href="${this.escapeHtml(plan.enrollment_url)}" target="_blank" rel="noopener" class="modal-btn modal-btn-secondary">Enroll</a>` : ''}
            </div>
        `;

        this.elements.modalBackdrop.hidden = false;
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        if (this.elements.modalBackdrop) {
            this.elements.modalBackdrop.hidden = true;
            document.body.style.overflow = '';
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
        if (typeof getETFDisplayInfo === 'function') {
            const etfInfo = getETFDisplayInfo(plan);
            return etfInfo.displayText;
        }

        // Fallback if function not available
        if (!plan.early_termination_fee) return 'None';
        return formatCurrency(plan.early_termination_fee);
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

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UI, Toast };
}
