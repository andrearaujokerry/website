// Lighthouse CI: mobile Lighthouse runs on key pages of the built site, checked against the
// budgets in REQUIREMENTS.md §6. Run `npm run build` first, then `npm run lighthouse`.
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: ['/', '/projects/', '/projects/leadme/', '/about/', '/resume/'],
      numberOfRuns: 3,
      settings: {
        // Chrome's sandbox can't start on GitHub's Ubuntu runners.
        chromeFlags: process.env.CI ? '--no-sandbox' : '',
        // Until launch every page is deliberately noindex, which this audit would penalise.
        // Remove this line at launch (WORKPLAN.md, Phase 7).
        skipAudits: ['is-crawlable'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        // Core Web Vitals, as lab values on Lighthouse's throttled mobile profile.
        'largest-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        // Transfer per page, excluding images: 150 KB in total, with JavaScript well under 50 KB.
        'resource-summary:document:size': ['error', { maxNumericValue: 30 * 1024 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 20 * 1024 }],
        'resource-summary:font:size': ['error', { maxNumericValue: 70 * 1024 }],
        'resource-summary:script:size': ['error', { maxNumericValue: 30 * 1024 }],
      },
    },
    // Keep reports local (CI uploads them as a build artifact) rather than on a public server.
    upload: { target: 'filesystem', outputDir: './.lighthouseci/reports' },
  },
};
