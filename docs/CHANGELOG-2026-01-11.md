# Changelog - January 11, 2026

## UI/UX Enhancements

### Accessibility Improvements

**Enhanced Text Contrast**
- Updated gray text colors for WCAG 2.1 AA compliance
- Light mode: `#666666` (5.74:1 contrast) and `#757575` (4.54:1 contrast)
- Dark mode: `#ababab` and `#999999` for enhanced readability
- Affects all secondary and tertiary text throughout the application

### Layout & Component Improvements

**ZIP Code Input Section**
- Moved "Valid ZIP" indicator to the right of the input box (horizontal layout)
- Changed Service Area text from monospace to San Francisco sans-serif font for consistency
- Improved visual flow and reduced vertical space usage

**Status Indicators**
- Fixed Unicode checkmark display in "Results ready - scroll down to view" message
- Changed from double-escaped `\\2713` to proper `\2713` in CSS

### Data Visualization

**Usage Profile Chart Enhancements**
- Increased chart height from 80px to 140px for better month-to-month distinction
- Added month name labels below each bar (Jan, Feb, Mar, etc.)
- Implemented heat-map color scheme based on usage intensity:
  - **High intensity (red)**: 75-100% of peak usage
  - **Medium-high (orange)**: 50-75% of peak
  - **Medium (yellow)**: 25-50% of peak
  - **Low (blue)**: 0-25% of peak
- New bar container structure with improved spacing

### Plan Comparison UI

**Contract Length Display**
- Changed all "mo" abbreviations to "months" with proper spacing
- Updated format: `$318.18/3 months` (was `$318.18/3mo`)
- Applied to plan cards, table rows, and all summary displays

**Filter Dropdowns**
- Enhanced visual design with:
  - Increased padding and rounded corners (6px radius)
  - Hover states with blue accent border and subtle glow
  - Focus states with 3px accent ring
  - Subtle box shadow for depth
  - Font weight increased to 500 for better readability

**Quality Grade Badges**
- Upgraded from flat colors to gradient backgrounds
- Increased size from 32px to 36px for better visibility
- Added hover animation (scale 1.05)
- Implemented colored drop shadows matching grade color
- Improved font rendering with flexbox centering

**Grade Legend**
- Enhanced layout with:
  - Larger padding and rounded corners (12px radius)
  - Thicker border separator (2px vs 1px)
  - Increased title size and weight (font-weight: 700)
  - Better color contrast for subtitle text
  - Added subtle box shadow for depth

**TIME OF USE Warning Badge**
- Added 1.5px border in caution color (orange)
- Changed icon from "!" to "⚠" warning symbol
- Increased icon size from 14px to 16px
- Added colored drop shadow for emphasis
- Enhanced font weight to 600

### Section Removals

**Removed "Plans Requiring Caution" Section**
- Eliminated dedicated warning section from results page
- Plan warnings now displayed inline within plan cards
- Simplified UI reduces information overload
- Warnings still visible in detailed plan comparisons

## Functional Enhancements

### Usage Calculation

**Annual Usage Accuracy**
- Fixed rounding error causing 11,999 kWh display instead of 12,000 kWh
- Implemented smart rounding algorithm that ensures sum equals exactly `avgMonthlyKwh × 12`
- Adjustment applied to highest usage month to preserve seasonal patterns

### Plan Ranking Algorithm

**F-Grade Plan Ranking Fix**
- Prevented 0/100 quality score plans from ranking high solely on cost
- Implemented combined score cap of 40 for F-grade plans
- Ensures plans with automatic F grades (variable rates, prepaid, time-of-use) rank appropriately
- Maintains 85% cost / 15% quality weighting for acceptable plans

### Early Termination Fee (ETF) Detection

**Enhanced Pattern Matching**
- Added detection for "$X multiplied by the number of months remaining" pattern
- Improved regex patterns for various fee structure descriptions
- Better handling of EFL language variations across providers

**Verification Modal Improvements**
- Updated document names to official titles:
  - "Residential Terms of Service" (was "Terms of Service")
  - "Your Rights as a Retail Electric Customer" (was "Your Rights as a Customer")
- Enhanced styling with proper CSS variable usage
- Added guidance for contacting REPs directly
- Fixed typography issues ("monthsdal" → "modalContent", "monthsnths" → "months")

## Technical Improvements

### Code Quality

- Removed unused `displayWarningPlans` section rendering code
- Cleaned up element references for removed warning section
- Improved CSS specificity and reduced duplication
- Enhanced color consistency across light and dark modes

### Performance

- Bar chart now uses efficient CSS classes instead of inline styles
- Reduced DOM manipulation with improved HTML generation
- Optimized gradient rendering for grade badges

## Documentation

All changes documented in:
- This changelog (`docs/CHANGELOG-2026-01-11.md`)
- Updated `README.md` with new screenshots and feature descriptions
- Code comments updated to reflect new behavior

## Breaking Changes

None. All changes are backward compatible.

## Browser Compatibility

Tested and confirmed working on:
- Chrome 131+
- Safari 18+
- Firefox 133+
- Edge 131+

## Known Issues

- Minor Biome linting warnings (unused parameters) - non-critical
- Legacy browser support (<2023) not tested

---

**Summary**: This update significantly improves accessibility, visual clarity, and data accuracy while maintaining the clean, professional Apple-inspired design language. All changes enhance user experience without compromising performance.
