# Deployment Architecture

## Overview

*Light* employs a fully automated, optimization-first deployment pipeline that minifies, obfuscates, and deploys all source files to GitHub Pages on every push to `main`. This architecture ensures minimal file sizes, optimal load times, and protection of implementation details while maintaining complete source code transparency through the GitHub repository.

---

## Architecture Principles

### Static Site Generation

*Light* is a pure static site:

- **No backend servers**: All computation happens client-side in JavaScript
- **No databases**: Data stored in static JSON files updated daily
- **No build-time SSG**: HTML is pre-written and minified at deployment
- **GitHub Pages hosting**: Free, reliable CDN with automatic HTTPS

### Optimization Strategy

The deployment process prioritizes aggressive optimization:

1. **Size Reduction**: Remove all non-functional content (comments, whitespace, formatting)
2. **Obfuscation**: Mangle variable names and compress logic to protect implementation
3. **Performance**: Smaller files = faster load times = better user experience
4. **Font Optimization**: Deploy only WOFF2 format (modern, most compressed)

### Development vs Production

| Environment | Location | State | Purpose |
| --- | --- | --- | --- |
| **Development** | `src/` directory | Human-readable source | Active development, debugging, contributions |
| **Production** | GitHub Pages | Minified & obfuscated | Public deployment, optimal performance |
| **Repository** | GitHub | Full source available | Transparency, inspection, collaboration |

---

## Deployment Pipeline

### Workflow File

**Location:** `.github/workflows/deploy.yml`

**Triggers:**

- Push to `main` branch
- Successful completion of `update-plans.yml` workflow
- Manual workflow dispatch

### Build Steps

#### 1. Environment Preparation

```yaml
- Setup Node.js 20
- Setup Python 3.11
- Install minification tools:
  - html-minifier-terser (HTML)
  - csso-cli (CSS)
  - terser (JavaScript)
  - python-minifier (Python)
```

#### 2. Directory Structure Creation

```bash
_site/
├── assets/fonts/
│   ├── new_york/WOFF2/
│   └── san_francisco/WOFF2/
├── css/modules/
├── js/modules/
├── data/
└── scripts/
```

#### 3. HTML Minification

**Tool:** `html-minifier-terser`

**Operations:**

- Remove all HTML comments
- Collapse whitespace and newlines
- Remove redundant attributes (e.g., `type="text/javascript"`)
- Minify inline CSS and JavaScript
- Use short doctypes
- Strip optional closing tags where valid

**Command:**

```bash
html-minifier-terser \
  --collapse-whitespace \
  --remove-comments \
  --remove-redundant-attributes \
  --remove-script-type-attributes \
  --remove-style-link-type-attributes \
  --minify-css true \
  --minify-js true \
  --use-short-doctype \
  "$file" -o "$target"
```

**Result:**

- 40-60% file size reduction
- Single-line output
- Preserved functionality

#### 4. CSS Minification

**Tool:** `csso-cli` (CSS Optimizer)

**Operations:**

- Remove all comments
- Eliminate redundant selectors
- Merge duplicate rules
- Optimize shorthand properties
- Remove unused vendor prefixes
- Compress color values

**Command:**

```bash
csso "$file" --output "$target" --comments none
```

**Result:**

- 30-50% file size reduction
- Optimized selector efficiency
- Preserved visual output

#### 5. JavaScript Minification

**Tool:** `terser`

**Operations:**

- Remove all comments (including inline and block)
- Compress with 2 optimization passes
- Mangle variable and function names
- Remove unused code (tree-shaking)
- Optimize conditionals and loops
- Compress literals and constants

**Command:**

```bash
terser "$file" \
  --compress passes=2 \
  --mangle \
  --comments false \
  --output "$target"
```

**Configuration:**

- `passes=2`: Two compression passes for maximum optimization
- `--mangle`: Rename variables to single letters (a, b, c, etc.)
- `--comments false`: Strip all comments including license headers

**Result:**

- 50-70% file size reduction
- Obfuscated logic
- Preserved functionality

#### 6. Python Script Minification

**Tool:** `python-minifier`

**Operations:**

- Remove all docstrings (""" module docs """)
- Strip comments (# inline comments)
- Remove literal statements (unused strings)
- Remove assert statements
- Rename global and local variables
- Hoist literals for reuse
- Minimize whitespace

**Command:**

```bash
pyminify \
  --remove-literal-statements \
  --remove-asserts \
  --hoist-literals \
  --rename-globals \
  --rename-locals \
  "$file" > "$target"
```

**Fallback:**

If minification fails (syntax errors, unsupported features), the workflow copies the original file unchanged.

**Result:**

- 40-60% file size reduction
- Obfuscated variable names
- Preserved Python 3.11+ compatibility

**Important Note:**

Python scripts are **static downloads** on GitHub Pages. They are not executed server-side. Users can:

- Download and inspect the scripts
- Run them locally for data verification
- Understand the data fetching methodology
- Contribute improvements via pull requests

#### 7. Asset Optimization

**Fonts:**

- Only WOFF2 format deployed (best compression)
- Removes OTF and WOFF formats from production
- 30% smaller than WOFF, 50% smaller than OTF
- Supported by all modern browsers (95%+ global coverage)

**Data Files:**

- Copied without modification
- Integrity preservation for calculations
- JSON format maintained for client-side parsing

**Documentation:**

- LICENSE and README.md included
- Ensures transparency and attribution
- Provides context for users inspecting the site

#### 8. Deployment to GitHub Pages

**Method:** `actions/deploy-pages@v4`

**Process:**

1. Creates `.nojekyll` file (disables Jekyll processing)
2. Uploads `_site/` directory as Pages artifact
3. Deploys to `gh-pages` branch (or configured branch)
4. Updates GitHub Pages environment URL

**Deployment Summary:**

```markdown
## Deployment Summary
**Status:** ✅ Successfully deployed to GitHub Pages
**URL:** https://luisfork.github.io/light
**Date:** 2026-01-18 07:15:23 UTC

### Optimizations Applied
- ✓ HTML minified (comments removed, whitespace collapsed)
- ✓ CSS minified (CSSO with comment removal)
- ✓ JavaScript minified (Terser with compression and mangling)
- ✓ Python scripts minified (docstrings and comments removed)
- ✓ Fonts optimized (WOFF2 only)
```

---

## Minification Tool Selection

### HTML: `html-minifier-terser`

**Why chosen:**

- Industry standard (used by Webpack, Vite, Parcel)
- Comprehensive options for fine-grained control
- Active maintenance and security updates
- Handles inline CSS/JS minification
- Preserves HTML5 validity

**Alternatives considered:**

- `html-minifier`: Original but unmaintained since 2018
- `htmlnano`: Requires PostHTML ecosystem
- `html-minify`: Limited options

### CSS: `csso-cli`

**Why chosen:**

- Structural optimization (not just whitespace removal)
- Safe optimizations (no breaking changes)
- Excellent compression ratios (30-50%)
- Fast processing speed
- CLI-friendly for automation

**Alternatives considered:**

- `clean-css`: Good but less structural optimization
- `cssnano`: Requires PostCSS ecosystem
- `lightningcss`: Modern but less mature

### JavaScript: `terser`

**Why chosen:**

- Industry standard (used by Webpack, Rollup, Vite)
- Excellent compression (50-70% reduction)
- Safe mangling (preserves external API)
- Configurable passes for maximum optimization
- Active development and security patches

**Alternatives considered:**

- `uglify-js`: Predecessor to Terser, unmaintained
- `esbuild`: Fast but less aggressive compression
- `closure-compiler`: Over-engineered for this use case

### Python: `python-minifier`

**Why chosen:**

- Purpose-built for Python minification
- Preserves Python semantics and functionality
- Removes docstrings and comments
- Variable renaming for obfuscation
- Python 3.6+ compatibility

**Alternatives considered:**

- `pyminify`: Similar but less feature-rich
- Manual regex replacement: Fragile and error-prone
- `pyc` compilation: Not human-readable or inspectable

---

## GitHub Pages Limitations

### Python Scripts Are Static Files

**Reality:**

GitHub Pages serves **only static content** (HTML, CSS, JS, images, fonts, documents). Python scripts in the `scripts/` directory are static files available for download.

**Why include Python scripts?**

1. **Transparency**: Users can inspect data fetching methodology
2. **Verification**: Users can run scripts locally to verify data accuracy
3. **Education**: Shows how data is processed and transformed
4. **Contribution**: Enables community improvements and bug fixes

**What Python scripts do NOT do on GitHub Pages:**

- ❌ Execute server-side
- ❌ Fetch data dynamically
- ❌ Process user input
- ❌ Update files automatically

**What Python scripts ARE:**

- ✅ Documentation of data processing
- ✅ Reference implementations
- ✅ Downloadable utilities
- ✅ Open-source transparency

### Actual Data Pipeline

**Automated (GitHub Actions):**

1. `update-plans.yml` runs daily at 2 AM CT
2. Python scripts execute in GitHub Actions runner (Ubuntu)
3. Fetches data from Power to Choose API
4. Processes and saves to `data/plans.json`
5. Commits and pushes changes to repository
6. Triggers `deploy.yml` workflow
7. Minified site deployed to GitHub Pages

**User-Facing (GitHub Pages):**

1. User visits `https://luisfork.github.io/light`
2. Browser loads minified HTML/CSS/JS
3. JavaScript fetches `data/plans.json` (pre-fetched, static)
4. All calculations happen client-side in browser
5. No server-side processing occurs

---

## Performance Benefits

### File Size Reductions

| File Type | Original | Minified | Reduction |
| --- | --- | --- | --- |
| HTML | ~40 KB | ~20 KB | 50% |
| CSS | ~60 KB | ~30 KB | 50% |
| JavaScript | ~120 KB | ~45 KB | 62% |
| Python | ~30 KB | ~15 KB | 50% |
| **Total** | **~250 KB** | **~110 KB** | **56%** |

### Load Time Improvements

- **Faster downloads**: Smaller files transfer faster over network
- **Reduced parsing**: Less code for browser to parse
- **Better caching**: Smaller files cache more efficiently
- **Mobile-friendly**: Critical for users on cellular networks

### CDN Benefits

GitHub Pages provides free, global CDN:

- **HTTPS**: Automatic SSL certificates
- **Compression**: Gzip/Brotli compression
- **Caching**: Browser and edge caching
- **Reliability**: 99.9% uptime SLA

---

## Security & Transparency

### Source Code Availability

**All source code is public:**

- GitHub repository: `https://github.com/luisfork/light`
- Full commit history preserved
- Human-readable source in `src/` directory
- Development documentation in `docs/` directory

**What minification does NOT hide:**

- Calculation algorithms (documented in `docs/`)
- Data sources (Power to Choose API)
- Cost formulas (explained in README.md)
- Open-source license (MIT)

**What minification DOES protect:**

- Implementation details (variable names, code structure)
- Development comments (internal notes)
- Unused code paths (removed by tree-shaking)

### Integrity Verification

**Users can verify:**

1. Inspect source code on GitHub
2. Run scripts locally with same data
3. Compare results with production site
4. Review commit history for changes
5. Submit issues or pull requests

**Build reproducibility:**

The workflow is deterministic:

- Same source code → same minified output
- Same data → same calculations
- Same tools → same optimizations

---

## Development Workflow

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/luisfork/light.git
cd light

# 2. Serve locally (do NOT open file:// directly due to CORS)
python -m http.server 8000

# 3. Open http://localhost:8000/src/ in browser

# 4. Make changes to src/ files (human-readable source)

# 5. Test locally

# 6. Commit and push to main
git add .
git commit -m "feat: add new feature"
git push origin main

# 7. GitHub Actions automatically minifies and deploys
# 8. Production site updates within 2-3 minutes
```

### Testing Before Deployment

```bash
# Run unit tests
bun test tests/unit

# Run UI tests
bunx playwright test

# Lint code
bun run lint
```

### Manual Deployment (if needed)

```bash
# Trigger workflow manually via GitHub CLI
gh workflow run deploy.yml

# Or via GitHub UI: Actions → Build and Deploy to GitHub Pages → Run workflow
```

---

## Monitoring & Debugging

### Build Logs

All workflow runs are public:

- **URL:** `https://github.com/luisfork/light/actions`
- **Logs:** Complete console output for each step
- **Artifacts:** Downloadable `_site/` directory before deployment

### Deployment Status

Check current deployment:

```bash
# Using GitHub CLI
gh api /repos/luisfork/light/pages/builds/latest

# Check workflow status
gh run list --workflow=deploy.yml --limit 5
```

### Troubleshooting

**Common Issues:**

1. **Minification fails:**
   - Check syntax errors in source files
   - Review workflow logs for error messages
   - Fallback: Scripts copy original file on failure

2. **Deployment succeeds but site broken:**
   - Verify file paths in minified HTML/CSS/JS
   - Check browser console for 404 errors
   - Test locally with Python HTTP server

3. **Workflow doesn't trigger:**
   - Verify push to `main` branch (not other branches)
   - Check workflow file syntax with `actionlint`
   - Review repository Actions settings (may be disabled)

---

## Future Enhancements

### Potential Improvements

1. **Image Optimization:**
   - Compress and convert images to WebP/AVIF
   - Generate responsive image sizes

2. **Cache Busting:**
   - Add content hashes to filenames
   - Ensure users get latest versions

3. **Critical CSS:**
   - Inline above-the-fold CSS
   - Defer non-critical styles

4. **Preloading:**
   - Preload fonts and critical resources
   - Optimize resource hints

5. **Subresource Integrity (SRI):**
   - Generate SRI hashes for static assets
   - Enhance security against CDN compromise

### Not Planned

- **Server-side rendering**: Conflicts with static architecture
- **Client-side bundlers**: Adds build complexity
- **Node.js dependencies**: Increases attack surface

---

## Conclusion

The *Light* deployment pipeline achieves:

- ✅ **56% file size reduction** through aggressive minification
- ✅ **Fully automated** deployment on every push to main
- ✅ **Zero build dependencies** for end users
- ✅ **Complete transparency** through public source code
- ✅ **Optimal performance** via CDN and compression
- ✅ **Professional obfuscation** while maintaining inspectability

This architecture balances performance optimization, security, and transparency—delivering a fast, reliable, and trustworthy application for Texas electricity plan comparison.

---

**Last Updated:** January 18, 2026
