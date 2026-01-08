/**
 * Light - User Interface Module
 *
 * Handles all UI interactions, toast notifications, and result display
 */

/**
 * Toast Notification System
 */
const Toast = {
    container: null,

    /**
     * Initialize toast container
     */
    init() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        this.container.setAttribute('role', 'alert');
        this.container.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.container);
    },

    /**
     * Show a toast notification
     *
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'warning', 'info'
     * @param {number} duration - Duration in ms (default 5000)
     */
    show(message, type = 'info', duration = 5000) {
        this.init();

        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
            warning: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Close notification">&times;</button>
        `;

        // Add close handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        // Add to container
        this.container.appendChild(toast);

        // Auto dismiss
        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    },

    /**
     * Dismiss a toast
     */
    dismiss(toast) {
        if (!toast || !toast.parentNode) return;
        toast.style.animation = 'toastFadeOut 0.3s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    /**
     * Show success toast
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    /**
     * Show error toast
     */
    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    },

    /**
     * Show warning toast
     */
    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    },

    /**
     * Show info toast
     */
    info(message, duration) {
        return this.show(message, 'info', duration);
    },

    /**
     * Escape HTML to prevent XSS
     */
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
    /**
     * Current state
     */
    state: {
        zipCode: null,
        tdu: null,
        usageType: 'quick', // 'quick', 'average', 'monthly'
        homeSize: null,
        avgUsage: null,
        monthlyUsage: null,
        rankedPlans: null,
        isLoading: false
    },

    /**
     * DOM element cache
     */
    elements: {},

    /**
     * Initialize the UI
     */
    async init() {
        // Cache DOM elements
        this.cacheElements();

        // Initialize toast system
        Toast.init();

        // Attach event listeners
        this.attachEventListeners();

        // Show loading state
        this.showInitialLoading();

        try {
            // Preload all data in parallel
            await API.preloadAll();
            await this.showDataFreshness();
            Toast.success('Data loaded successfully');
        } catch (error) {
            Toast.error('Failed to load data. Please refresh the page.');
            console.error('Initialization error:', error);
        } finally {
            this.hideInitialLoading();
        }
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            zipInput: document.getElementById('zip-code'),
            tduInfo: document.getElementById('tdu-info'),
            usageSection: document.getElementById('usage-section'),
            usageTabs: document.querySelectorAll('.usage-tab'),
            homeSizeSelect: document.getElementById('home-size'),
            avgUsageInput: document.getElementById('avg-usage'),
            calculateBtn: document.getElementById('calculate-btn'),
            resultsSection: document.getElementById('results-section'),
            bestPlans: document.getElementById('best-plans'),
            gimmickPlans: document.getElementById('gimmick-plans'),
            comparisonTable: document.getElementById('comparison-table'),
            dataFreshness: document.getElementById('data-freshness')
        };
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // ZIP code input
        if (this.elements.zipInput) {
            this.elements.zipInput.addEventListener('input', (e) => this.handleZipCodeInput(e));
            this.elements.zipInput.addEventListener('change', (e) => this.handleZipCodeChange(e));
            this.elements.zipInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleZipCodeChange(e);
                }
            });
        }

        // Usage type tabs
        this.elements.usageTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleUsageTabClick(e));
        });

        // Home size selector
        if (this.elements.homeSizeSelect) {
            this.elements.homeSizeSelect.addEventListener('change', (e) => this.handleHomeSizeChange(e));
        }

        // Average usage input
        if (this.elements.avgUsageInput) {
            this.elements.avgUsageInput.addEventListener('input', (e) => this.handleAvgUsageChange(e));
        }

        // Monthly usage inputs
        for (let i = 1; i <= 12; i++) {
            const monthInput = document.getElementById(`month-${i}`);
            if (monthInput) {
                monthInput.addEventListener('input', (e) => this.handleMonthlyUsageChange(e));
            }
        }

        // Calculate button
        if (this.elements.calculateBtn) {
            this.elements.calculateBtn.addEventListener('click', () => this.handleCalculate());
        }

        // Keyboard shortcut for calculate
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                if (!this.state.isLoading) {
                    this.handleCalculate();
                }
            }
        });
    },

    /**
     * Show initial loading state
     */
    showInitialLoading() {
        // Add loading class to body for any global styling
        document.body.classList.add('is-loading');
    },

    /**
     * Hide initial loading state
     */
    hideInitialLoading() {
        document.body.classList.remove('is-loading');
    },

    /**
     * Show data freshness indicator
     */
    async showDataFreshness() {
        try {
            const freshness = await API.getDataFreshness();
            if (this.elements.dataFreshness) {
                const date = new Date(freshness.plansUpdated);
                const formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                this.elements.dataFreshness.textContent = `Plans updated: ${formattedDate} (${freshness.totalPlans} plans)`;
            }
        } catch (error) {
            console.error('Error showing data freshness:', error);
        }
    },

    /**
     * Handle ZIP code input (format as user types)
     */
    handleZipCodeInput(event) {
        const value = event.target.value.replace(/\D/g, '').substring(0, 5);
        event.target.value = value;
    },

    /**
     * Handle ZIP code change
     */
    async handleZipCodeChange(event) {
        const zipCode = event.target.value;

        if (zipCode.length !== 5) {
            return;
        }

        this.state.zipCode = zipCode;

        // Show loading indicator
        this.showZipCodeLoading();

        try {
            // Check deregulation status first
            const deregStatus = await API.checkDeregulationStatus(zipCode);

            if (!deregStatus.isDeregulated) {
                this.showNotDeregulatedMessage(deregStatus.reason);
                this.disableUsageInput();
                return;
            }

            // Detect TDU
            const tdus = await API.getAllTDUs();
            const tdu = detectTDU(zipCode, tdus);

            if (tdu) {
                this.state.tdu = tdu;
                this.showTDUInfo(tdu);
                this.enableUsageInput();
                Toast.success(`Detected ${tdu.name} service area`);
            } else {
                // Try to get info from tax data
                const taxInfo = await API.getLocalTaxInfo(zipCode);
                if (taxInfo.tdu) {
                    const tduFromTax = await API.getTDUByCode(taxInfo.tdu);
                    if (tduFromTax) {
                        this.state.tdu = tduFromTax;
                        this.showTDUInfo(tduFromTax);
                        this.enableUsageInput();
                        Toast.success(`Detected ${tduFromTax.name} service area`);
                        return;
                    }
                }
                Toast.warning('Could not detect TDU for this ZIP code. Please verify you are in a deregulated area.');
                this.disableUsageInput();
            }
        } catch (error) {
            Toast.error('Error detecting service area. Please try again.');
            console.error('ZIP code detection error:', error);
        } finally {
            this.hideZipCodeLoading();
        }
    },

    /**
     * Show ZIP code loading state
     */
    showZipCodeLoading() {
        if (this.elements.zipInput) {
            this.elements.zipInput.classList.add('loading');
        }
        if (this.elements.tduInfo) {
            this.elements.tduInfo.innerHTML = `
                <div class="tdu-info-box">
                    <div class="skeleton skeleton-text skeleton-text-medium"></div>
                    <div class="skeleton skeleton-text skeleton-text-short"></div>
                </div>
            `;
            this.elements.tduInfo.style.display = 'block';
        }
    },

    /**
     * Hide ZIP code loading state
     */
    hideZipCodeLoading() {
        if (this.elements.zipInput) {
            this.elements.zipInput.classList.remove('loading');
        }
    },

    /**
     * Show not deregulated message
     */
    showNotDeregulatedMessage(reason) {
        if (this.elements.tduInfo) {
            const message = reason || 'This ZIP code is not in a deregulated service area.';
            this.elements.tduInfo.innerHTML = `
                <div class="tdu-info-box" style="border-left-color: var(--color-warning);">
                    <h3 style="color: var(--color-warning-dark);">Not Available</h3>
                    <p>${this.escapeHtml(message)}</p>
                    <p style="margin-top: 0.5rem; font-size: 0.875rem;">
                        <a href="https://www.powertochoose.org" target="_blank" rel="noopener">
                            Learn more about Texas electricity deregulation
                        </a>
                    </p>
                </div>
            `;
            this.elements.tduInfo.style.display = 'block';
        }
        Toast.warning('This area is not in the deregulated market');
    },

    /**
     * Show TDU information
     */
    showTDUInfo(tdu) {
        if (this.elements.tduInfo) {
            this.elements.tduInfo.innerHTML = `
                <div class="tdu-info-box">
                    <h3>${this.escapeHtml(tdu.name)}</h3>
                    <p>${this.escapeHtml(tdu.service_area)}</p>
                    <p class="tdu-rates">
                        Delivery charges: $${tdu.monthly_base_charge.toFixed(2)}/month +
                        ${tdu.per_kwh_rate.toFixed(2)}¢/kWh
                    </p>
                    <p style="font-size: 0.8125rem; color: var(--color-text-tertiary); margin-top: 0.5rem;">
                        Last updated: ${tdu.last_updated || 'N/A'}
                    </p>
                </div>
            `;
            this.elements.tduInfo.style.display = 'block';
        }
    },

    /**
     * Enable usage input section
     */
    enableUsageInput() {
        if (this.elements.usageSection) {
            this.elements.usageSection.classList.remove('disabled');
        }
    },

    /**
     * Disable usage input section
     */
    disableUsageInput() {
        if (this.elements.usageSection) {
            this.elements.usageSection.classList.add('disabled');
        }
    },

    /**
     * Handle usage tab click
     */
    handleUsageTabClick(event) {
        const tab = event.target.closest('.usage-tab');
        if (!tab) return;

        const usageType = tab.dataset.usageType;

        // Update active tab
        this.elements.usageTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Show corresponding panel
        document.querySelectorAll('.usage-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`${usageType}-usage-panel`);
        if (panel) {
            panel.classList.add('active');
        }

        this.state.usageType = usageType;
    },

    /**
     * Handle home size change
     */
    handleHomeSizeChange(event) {
        this.state.homeSize = event.target.value;
    },

    /**
     * Handle average usage change
     */
    handleAvgUsageChange(event) {
        this.state.avgUsage = parseFloat(event.target.value) || null;
    },

    /**
     * Handle monthly usage change
     */
    handleMonthlyUsageChange(event) {
        // Collect all monthly values
        const monthlyUsage = [];
        for (let i = 1; i <= 12; i++) {
            const input = document.getElementById(`month-${i}`);
            const value = parseFloat(input?.value) || 0;
            monthlyUsage.push(value);
        }
        this.state.monthlyUsage = monthlyUsage;
    },

    /**
     * Handle calculate button click
     */
    async handleCalculate() {
        if (this.state.isLoading) {
            return;
        }

        if (!this.validateInputs()) {
            return;
        }

        this.state.isLoading = true;
        this.showLoading();

        try {
            // Determine usage pattern
            let monthlyUsage;

            if (this.state.usageType === 'quick') {
                const avgKwh = estimateUsageFromHomeSize(this.state.homeSize);
                monthlyUsage = estimateUsagePattern(avgKwh);
            } else if (this.state.usageType === 'average') {
                monthlyUsage = estimateUsagePattern(this.state.avgUsage);
            } else {
                monthlyUsage = this.state.monthlyUsage;
            }

            // Get plans for this TDU
            const plansData = await API.loadPlans();
            const tduPlans = plansData.plans.filter(p => p.tdu_area === this.state.tdu.code);

            if (tduPlans.length === 0) {
                Toast.warning('No plans found for your service area. Please try again later.');
                return;
            }

            // Rank plans
            const rankedPlans = rankPlans(tduPlans, monthlyUsage, this.state.tdu);
            this.state.rankedPlans = rankedPlans;

            // Display results
            this.displayResults(rankedPlans, monthlyUsage);

            // Scroll to results
            this.elements.resultsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            // Show success message
            const planCount = rankedPlans.length;
            const bestPlan = rankedPlans[0];
            Toast.success(`Found ${planCount} plans. Best plan: ${formatCurrency(bestPlan.annualCost)}/year`);

        } catch (error) {
            Toast.error('Error calculating plans: ' + error.message);
            console.error('Calculation error:', error);
        } finally {
            this.state.isLoading = false;
            this.hideLoading();
        }
    },

    /**
     * Validate inputs
     */
    validateInputs() {
        if (!this.state.zipCode) {
            Toast.warning('Please enter a ZIP code');
            this.elements.zipInput?.focus();
            return false;
        }

        if (!this.state.tdu) {
            Toast.warning('Please enter a valid Texas ZIP code in a deregulated area');
            this.elements.zipInput?.focus();
            return false;
        }

        if (this.state.usageType === 'quick' && !this.state.homeSize) {
            Toast.warning('Please select a home size');
            this.elements.homeSizeSelect?.focus();
            return false;
        }

        if (this.state.usageType === 'average' && !this.state.avgUsage) {
            Toast.warning('Please enter your average monthly usage');
            this.elements.avgUsageInput?.focus();
            return false;
        }

        if (this.state.usageType === 'monthly') {
            const hasValues = this.state.monthlyUsage &&
                this.state.monthlyUsage.some(v => v > 0);
            if (!hasValues) {
                Toast.warning('Please enter usage for at least one month');
                return false;
            }
        }

        return true;
    },

    /**
     * Display results
     */
    displayResults(plans, monthlyUsage) {
        // Show best plans
        this.displayBestPlans(plans.slice(0, 3));

        // Show gimmick plans to avoid
        const gimmickPlans = plans.filter(p => p.isGimmick).slice(0, 3);
        if (gimmickPlans.length > 0) {
            this.displayGimmickPlans(gimmickPlans);
        } else {
            this.elements.gimmickPlans.style.display = 'none';
        }

        // Show comparison table
        this.displayComparisonTable(plans);

        // Show results section
        this.elements.resultsSection.style.display = 'block';
    },

    /**
     * Display best plans
     */
    displayBestPlans(plans) {
        if (!this.elements.bestPlans) return;

        this.elements.bestPlans.innerHTML = plans.map((plan, index) => `
            <div class="plan-card best-plan" data-plan-id="${this.escapeHtml(plan.plan_id)}">
                <div class="plan-rank">#${index + 1}</div>
                <h3 class="plan-name">${this.escapeHtml(plan.plan_name)}</h3>
                <div class="plan-rep">${this.escapeHtml(plan.rep_name)}</div>
                <div class="plan-annual-cost">${formatCurrency(plan.annualCost)}/year</div>
                <div class="plan-monthly-avg">${formatCurrency(plan.averageMonthlyCost)}/month average</div>
                <div class="plan-details">
                    <div class="detail-item">
                        <span class="detail-label">Term:</span>
                        <span class="detail-value">${plan.term_months} months</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Renewable:</span>
                        <span class="detail-value">${plan.renewable_pct || 0}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">ETF:</span>
                        <span class="detail-value">${formatCurrency(plan.early_termination_fee || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Effective Rate:</span>
                        <span class="detail-value">${formatRate(plan.effectiveRate)}</span>
                    </div>
                </div>
                <div class="plan-actions">
                    <button class="btn-details" onclick="UI.showPlanDetails('${this.escapeHtml(plan.plan_id)}')">
                        View Details
                    </button>
                    ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-efl">View EFL</a>` : ''}
                </div>
            </div>
        `).join('');
    },

    /**
     * Display gimmick plans
     */
    displayGimmickPlans(plans) {
        if (!this.elements.gimmickPlans) return;

        this.elements.gimmickPlans.innerHTML = `
            <h2>Plans to Avoid</h2>
            <p class="warning-intro">These plans look cheap but cost more due to bill credits, time-of-use restrictions, or rate volatility:</p>
            ${plans.map(plan => `
                <div class="plan-card gimmick-plan">
                    <h3 class="plan-name">${this.escapeHtml(plan.plan_name)}</h3>
                    <div class="plan-rep">${this.escapeHtml(plan.rep_name)}</div>
                    <div class="plan-costs">
                        <div>Advertised at 1000 kWh: ${formatRate(plan.price_kwh_1000)}</div>
                        <div class="actual-cost">Actual annual cost: ${formatCurrency(plan.annualCost)}</div>
                    </div>
                    <div class="plan-warnings">
                        ${plan.warnings.map(w => `<div class="warning-item">${this.escapeHtml(w)}</div>`).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        this.elements.gimmickPlans.style.display = 'block';
    },

    /**
     * Display comparison table
     */
    displayComparisonTable(plans) {
        if (!this.elements.comparisonTable) return;

        const tableHTML = `
            <table class="plans-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Provider</th>
                        <th>Plan</th>
                        <th>Term</th>
                        <th>Annual Cost</th>
                        <th>Monthly Avg</th>
                        <th>Effective Rate</th>
                        <th>Renewable</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${plans.map((plan, index) => `
                        <tr class="${plan.isGimmick ? 'gimmick-row' : ''}">
                            <td>${index + 1}</td>
                            <td>${this.escapeHtml(plan.rep_name)}</td>
                            <td>
                                ${this.escapeHtml(plan.plan_name)}
                                ${plan.warnings.length > 0 ? '<span class="warning-badge" title="Has warnings">⚠️</span>' : ''}
                            </td>
                            <td>${plan.term_months}mo</td>
                            <td>${formatCurrency(plan.annualCost)}</td>
                            <td>${formatCurrency(plan.averageMonthlyCost)}</td>
                            <td>${formatRate(plan.effectiveRate)}</td>
                            <td>${plan.renewable_pct || 0}%</td>
                            <td>
                                ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-small">EFL</a>` : '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        this.elements.comparisonTable.innerHTML = tableHTML;
    },

    /**
     * Show plan details modal
     */
    showPlanDetails(planId) {
        const plan = this.state.rankedPlans?.find(p => p.plan_id === planId);
        if (!plan) {
            Toast.error('Plan not found');
            return;
        }

        // Create modal content
        const modalContent = `
            <div class="modal-overlay" onclick="UI.closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <button class="modal-close" onclick="UI.closeModal()" aria-label="Close modal">&times;</button>
                    <h2 id="modal-title">${this.escapeHtml(plan.plan_name)}</h2>
                    <h3>${this.escapeHtml(plan.rep_name)}</h3>

                    <div class="plan-detail-section">
                        <h4>Annual Cost Breakdown</h4>
                        <div class="cost-summary">
                            <div class="cost-item">
                                <span>Total Annual Cost:</span>
                                <span class="cost-value">${formatCurrency(plan.annualCost)}</span>
                            </div>
                            <div class="cost-item">
                                <span>Average Monthly Cost:</span>
                                <span class="cost-value">${formatCurrency(plan.averageMonthlyCost)}</span>
                            </div>
                            <div class="cost-item">
                                <span>Effective Rate:</span>
                                <span class="cost-value">${formatRate(plan.effectiveRate)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="plan-detail-section">
                        <h4>Plan Details</h4>
                        <div class="details-grid">
                            <div class="detail-row">
                                <span class="detail-label">Contract Term:</span>
                                <span class="detail-value">${plan.term_months} months</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Early Termination Fee:</span>
                                <span class="detail-value">${formatCurrency(plan.early_termination_fee || 0)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Base Charge:</span>
                                <span class="detail-value">${formatCurrency(plan.base_charge_monthly || 0)}/month</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Renewable Energy:</span>
                                <span class="detail-value">${plan.renewable_pct || 0}%</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Time of Use:</span>
                                <span class="detail-value">${plan.is_tou ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>

                    ${plan.warnings.length > 0 ? `
                        <div class="plan-detail-section warnings-section">
                            <h4>Warnings</h4>
                            ${plan.warnings.map(w => `<div class="warning-item">${this.escapeHtml(w)}</div>`).join('')}
                        </div>
                    ` : ''}

                    <div class="modal-actions">
                        ${plan.efl_url ? `<a href="${this.escapeHtml(plan.efl_url)}" target="_blank" rel="noopener" class="btn-primary">View EFL</a>` : ''}
                        ${plan.enrollment_url ? `<a href="${this.escapeHtml(plan.enrollment_url)}" target="_blank" rel="noopener" class="btn-secondary">Enroll</a>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        this.closeModal();

        // Add to DOM
        const modal = document.createElement('div');
        modal.id = 'plan-modal';
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);

        // Focus trap and escape key handler
        document.addEventListener('keydown', this.handleModalKeydown);

        // Focus the close button
        modal.querySelector('.modal-close')?.focus();
    },

    /**
     * Handle keydown in modal
     */
    handleModalKeydown(event) {
        if (event.key === 'Escape') {
            UI.closeModal();
        }
    },

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('plan-modal');
        if (modal) {
            modal.remove();
        }
        document.removeEventListener('keydown', this.handleModalKeydown);
    },

    /**
     * Show loading state
     */
    showLoading() {
        if (this.elements.calculateBtn) {
            this.elements.calculateBtn.disabled = true;
            this.elements.calculateBtn.innerHTML = '<span class="loading-spinner"></span> Calculating...';
        }
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.elements.calculateBtn) {
            this.elements.calculateBtn.disabled = false;
            this.elements.calculateBtn.textContent = 'Find Best Plans';
        }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },

    /**
     * Show error message (legacy method, now uses Toast)
     */
    showError(message) {
        Toast.error(message);
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        Toast.success(message);
    }
};

// Initialize UI when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            UI.init();
        });
    } else {
        UI.init();
    }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UI, Toast };
}
