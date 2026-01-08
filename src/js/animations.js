/**
 * Light - Animations
 * Physics-based spring animations for seamless transitions
 */

(function() {
    'use strict';

    // Segmented Control Animation
    function initSegmentedControl() {
        const control = document.getElementById('usage-mode-control');
        if (!control) return;

        const segments = control.querySelectorAll('.segment');
        const indicator = control.querySelector('.segment-indicator');

        if (!indicator || segments.length === 0) return;

        // Initialize indicator position
        const activeSegment = control.querySelector('.segment.active');
        if (activeSegment) {
            updateIndicator(activeSegment);
        }

        // Handle segment clicks
        segments.forEach((segment, index) => {
            segment.addEventListener('click', () => {
                // Remove active from all
                segments.forEach(s => s.classList.remove('active'));

                // Add active to clicked
                segment.classList.add('active');

                // Animate indicator
                updateIndicator(segment);

                // Switch usage mode
                switchUsageMode(segment.dataset.mode);
            });
        });

        function updateIndicator(segment) {
            const rect = segment.getBoundingClientRect();
            const controlRect = control.getBoundingClientRect();
            const left = rect.left - controlRect.left - 2; // Account for padding
            const width = rect.width;

            indicator.style.width = `${width}px`;
            indicator.style.transform = `translateX(${left}px)`;
        }
    }

    // Usage Mode Switching with Spring Animation
    function switchUsageMode(mode) {
        const modes = document.querySelectorAll('.usage-mode');

        modes.forEach(modeElement => {
            if (modeElement.dataset.mode === mode) {
                modeElement.classList.add('active');

                // Focus first input in the mode
                setTimeout(() => {
                    const firstInput = modeElement.querySelector('input, select');
                    if (firstInput) firstInput.focus();
                }, 200);
            } else {
                modeElement.classList.remove('active');
            }
        });
    }

    // ZIP Code Entry Animation
    function initZipCodeAnimation() {
        const zipField = document.getElementById('zip-code');
        const usageSection = document.getElementById('usage-section');

        if (!zipField || !usageSection) return;

        zipField.addEventListener('input', (e) => {
            const value = e.target.value.replace(/\D/g, '');
            e.target.value = value;

            // Enable usage section when ZIP is valid
            if (value.length === 5) {
                // Smooth fade-in animation
                usageSection.style.transition = 'opacity 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                usageSection.style.opacity = '1';
                usageSection.style.pointerEvents = 'auto';
            } else {
                usageSection.style.opacity = '0.4';
                usageSection.style.pointerEvents = 'none';
            }
        });
    }

    // Results Animation: Stagger entrance
    function animateResults() {
        const resultsList = document.getElementById('results-list');
        if (!resultsList) return;

        const items = resultsList.querySelectorAll('.plan-item');

        items.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';

            setTimeout(() => {
                item.style.transition = 'opacity 400ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 80); // Stagger by 80ms
        });
    }

    // Scroll Animation: Reveal on scroll
    function initScrollAnimations() {
        const observerOptions = {
            root: null,
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, observerOptions);

        // Observe methodology items
        document.querySelectorAll('.method-item').forEach(item => {
            item.classList.add('fade-in-up');
            observer.observe(item);
        });
    }

    // Initialize all animations
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initSegmentedControl();
                initZipCodeAnimation();
                initScrollAnimations();
            });
        } else {
            initSegmentedControl();
            initZipCodeAnimation();
            initScrollAnimations();
        }
    }

    // Export for use in ui.js
    window.LightAnimations = {
        animateResults: animateResults,
        switchUsageMode: switchUsageMode
    };

    // Initialize
    init();

})();
