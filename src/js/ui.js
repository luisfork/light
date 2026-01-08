/**
 * Light - User Interface Module
 *
 * Handles all UI interactions and result display
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
        rankedPlans: null
    },

    /**
     * Initialize the UI
     */
    async init() {
        this.attachEventListeners();
        await this.loadInitialData();
        this.showDataFreshness();
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // ZIP code input
        const zipInput = document.getElementById('zip-code');
        if (zipInput) {
            zipInput.addEventListener('input', (e) => this.handleZipCodeInput(e));
            zipInput.addEventListener('change', (e) => this.handleZipCodeChange(e));
        }

        // Usage type tabs
        const usageTabs = document.querySelectorAll('.usage-tab');
        usageTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.handleUsageTabClick(e));
        });

        // Home size selector
        const homeSizeSelect = document.getElementById('home-size');
        if (homeSizeSelect) {
            homeSizeSelect.addEventListener('change', (e) => this.handleHomeSizeChange(e));
        }

        // Average usage input
        const avgUsageInput = document.getElementById('avg-usage');
        if (avgUsageInput) {
            avgUsageInput.addEventListener('input', (e) => this.handleAvgUsageChange(e));
        }

        // Monthly usage inputs
        for (let i = 1; i <= 12; i++) {
            const monthInput = document.getElementById(`month-${i}`);
            if (monthInput) {
                monthInput.addEventListener('input', (e) => this.handleMonthlyUsageChange(e));
            }
        }

        // Calculate button
        const calculateBtn = document.getElementById('calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.handleCalculate());
        }
    },

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            await API.loadPlans();
            await API.loadTDURates();
            await API.loadLocalTaxes();
        } catch (error) {
            this.showError('Failed to load data. Please refresh the page.');
        }
    },

    /**
     * Show data freshness indicator
     */
    async showDataFreshness() {
        try {
            const freshness = await API.getDataFreshness();
            const freshnessEl = document.getElementById('data-freshness');
            if (freshnessEl) {
                const date = new Date(freshness.plansUpdated);
                freshnessEl.textContent = `Plans updated: ${date.toLocaleDateString()}`;
            }
        } catch (error) {
            console.error('Error showing data freshness:', error);
        }
    },

    /**
     * Handle ZIP code input
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

        if (zipCode.length === 5) {
            this.state.zipCode = zipCode;

            // Detect TDU
            const tdus = await API.getAllTDUs();
            const tdu = detectTDU(zipCode, tdus);

            if (tdu) {
                this.state.tdu = tdu;
                this.showTDUInfo(tdu);
                this.enableUsageInput();
            } else {
                this.showError('This ZIP code is not in a deregulated service area.');
                this.disableUsageInput();
            }
        }
    },

    /**
     * Show TDU information
     */
    showTDUInfo(tdu) {
        const tduInfoEl = document.getElementById('tdu-info');
        if (tduInfoEl) {
            tduInfoEl.innerHTML = `
                <div class="tdu-info-box">
                    <h3>${tdu.name}</h3>
                    <p>${tdu.service_area}</p>
                    <p class="tdu-rates">
                        Delivery charges: $${tdu.monthly_base_charge.toFixed(2)}/month +
                        ${tdu.per_kwh_rate.toFixed(2)}¢/kWh
                    </p>
                </div>
            `;
            tduInfoEl.style.display = 'block';
        }
    },

    /**
     * Enable usage input section
     */
    enableUsageInput() {
        const usageSection = document.getElementById('usage-section');
        if (usageSection) {
            usageSection.classList.remove('disabled');
        }
    },

    /**
     * Disable usage input section
     */
    disableUsageInput() {
        const usageSection = document.getElementById('usage-section');
        if (usageSection) {
            usageSection.classList.add('disabled');
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
        document.querySelectorAll('.usage-tab').forEach(t => t.classList.remove('active'));
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
            const value = parseFloat(input.value) || 0;
            monthlyUsage.push(value);
        }
        this.state.monthlyUsage = monthlyUsage;
    },

    /**
     * Handle calculate button click
     */
    async handleCalculate() {
        if (!this.validateInputs()) {
            return;
        }

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

            // Rank plans
            const rankedPlans = rankPlans(tduPlans, monthlyUsage, this.state.tdu);
            this.state.rankedPlans = rankedPlans;

            // Display results
            this.displayResults(rankedPlans, monthlyUsage);

            // Scroll to results
            document.getElementById('results-section').scrollIntoView({
                behavior: 'smooth'
            });

        } catch (error) {
            this.showError('Error calculating plans: ' + error.message);
        } finally {
            this.hideLoading();
        }
    },

    /**
     * Validate inputs
     */
    validateInputs() {
        if (!this.state.zipCode) {
            this.showError('Please enter a ZIP code');
            return false;
        }

        if (!this.state.tdu) {
            this.showError('Please enter a valid Texas ZIP code in a deregulated area');
            return false;
        }

        if (this.state.usageType === 'quick' && !this.state.homeSize) {
            this.showError('Please select a home size');
            return false;
        }

        if (this.state.usageType === 'average' && !this.state.avgUsage) {
            this.showError('Please enter your average monthly usage');
            return false;
        }

        if (this.state.usageType === 'monthly') {
            const hasValues = this.state.monthlyUsage &&
                this.state.monthlyUsage.some(v => v > 0);
            if (!hasValues) {
                this.showError('Please enter usage for at least one month');
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
        }

        // Show comparison table
        this.displayComparisonTable(plans);

        // Show results section
        document.getElementById('results-section').style.display = 'block';
    },

    /**
     * Display best plans
     */
    displayBestPlans(plans) {
        const container = document.getElementById('best-plans');
        if (!container) return;

        container.innerHTML = plans.map((plan, index) => `
            <div class="plan-card best-plan">
                <div class="plan-rank">#${index + 1}</div>
                <h3 class="plan-name">${plan.plan_name}</h3>
                <div class="plan-rep">${plan.rep_name}</div>
                <div class="plan-annual-cost">${formatCurrency(plan.annualCost)}/year</div>
                <div class="plan-monthly-avg">${formatCurrency(plan.averageMonthlyCost)}/month average</div>
                <div class="plan-details">
                    <div class="detail-item">
                        <span class="detail-label">Term:</span>
                        <span class="detail-value">${plan.term_months} months</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Renewable:</span>
                        <span class="detail-value">${plan.renewable_pct}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">ETF:</span>
                        <span class="detail-value">${formatCurrency(plan.early_termination_fee)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Effective Rate:</span>
                        <span class="detail-value">${formatRate(plan.effectiveRate)}</span>
                    </div>
                </div>
                <div class="plan-actions">
                    <button class="btn-details" onclick="UI.showPlanDetails('${plan.plan_id}')">
                        View Details
                    </button>
                    <a href="${plan.efl_url}" target="_blank" class="btn-efl">View EFL</a>
                </div>
            </div>
        `).join('');
    },

    /**
     * Display gimmick plans
     */
    displayGimmickPlans(plans) {
        const container = document.getElementById('gimmick-plans');
        if (!container) return;

        container.innerHTML = `
            <h2>Plans to Avoid</h2>
            <p class="warning-intro">These plans look cheap but cost more due to bill credits, time-of-use restrictions, or rate volatility:</p>
            ${plans.map(plan => `
                <div class="plan-card gimmick-plan">
                    <h3 class="plan-name">${plan.plan_name}</h3>
                    <div class="plan-rep">${plan.rep_name}</div>
                    <div class="plan-costs">
                        <div>Advertised at 1000 kWh: ${formatRate(plan.price_kwh_1000)}</div>
                        <div class="actual-cost">Actual annual cost: ${formatCurrency(plan.annualCost)}</div>
                    </div>
                    <div class="plan-warnings">
                        ${plan.warnings.map(w => `<div class="warning-item">⚠️ ${w}</div>`).join('')}
                    </div>
                </div>
            `).join('')}
        `;

        container.style.display = 'block';
    },

    /**
     * Display comparison table
     */
    displayComparisonTable(plans) {
        const container = document.getElementById('comparison-table');
        if (!container) return;

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
                            <td>${plan.rep_name}</td>
                            <td>
                                ${plan.plan_name}
                                ${plan.warnings.length > 0 ? '<span class="warning-badge">⚠️</span>' : ''}
                            </td>
                            <td>${plan.term_months}mo</td>
                            <td>${formatCurrency(plan.annualCost)}</td>
                            <td>${formatCurrency(plan.averageMonthlyCost)}</td>
                            <td>${formatRate(plan.effectiveRate)}</td>
                            <td>${plan.renewable_pct}%</td>
                            <td>
                                <a href="${plan.efl_url}" target="_blank" class="btn-small">EFL</a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    },

    /**
     * Show plan details modal
     */
    showPlanDetails(planId) {
        const plan = this.state.rankedPlans.find(p => p.plan_id === planId);
        if (!plan) return;

        // Create modal content
        const modalContent = `
            <div class="modal-overlay" onclick="UI.closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="UI.closeModal()">×</button>
                    <h2>${plan.plan_name}</h2>
                    <h3>${plan.rep_name}</h3>

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
                                <span class="detail-value">${formatCurrency(plan.early_termination_fee)}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Base Charge:</span>
                                <span class="detail-value">${formatCurrency(plan.base_charge_monthly)}/month</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Renewable Energy:</span>
                                <span class="detail-value">${plan.renewable_pct}%</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Time of Use:</span>
                                <span class="detail-value">${plan.is_tou ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>

                    ${plan.warnings.length > 0 ? `
                        <div class="plan-detail-section warnings-section">
                            <h4>⚠️ Warnings</h4>
                            ${plan.warnings.map(w => `<div class="warning-item">${w}</div>`).join('')}
                        </div>
                    ` : ''}

                    <div class="modal-actions">
                        <a href="${plan.efl_url}" target="_blank" class="btn-primary">View EFL</a>
                        <a href="${plan.enrollment_url}" target="_blank" class="btn-secondary">Enroll</a>
                    </div>
                </div>
            </div>
        `;

        // Add to DOM
        const modal = document.createElement('div');
        modal.id = 'plan-modal';
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    },

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('plan-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        const btn = document.getElementById('calculate-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Calculating...';
        }
    },

    /**
     * Hide loading state
     */
    hideLoading() {
        const btn = document.getElementById('calculate-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Find Best Plans';
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        // Simple alert for now - could be improved with a toast notification
        alert(message);
    }
};

// Initialize UI when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        UI.init();
    });
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
