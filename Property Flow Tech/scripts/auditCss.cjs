// scripts/auditCss.cjs
// Run with: npm run audit:css

const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');

const CONTENT_GLOBS = [
  'src/**/*.{js,jsx,ts,tsx,html}',
];

const CSS_GLOBS = [
  'src/styles/**/*.css',
];

const OUTPUT_DIR = 'src/styles/clean'; // non-destructive: writes new files here
const REPORT_FILE = 'scripts/css-unused-report.json';

async function run() {
  console.log('🔎 Running CSS audit with PurgeCSS...');
  console.log('  Content:', CONTENT_GLOBS.join(', '));
  console.log('  CSS:', CSS_GLOBS.join(', '));

  const purgeCSSResults = await new PurgeCSS().purge({
    content: CONTENT_GLOBS,
    css: CSS_GLOBS,

    // IMPORTANT:
    // If you have dynamic classNames (like "status-" + status),
    // add safelist patterns here so they don't get stripped.
    safelist: {
      standard: [
        // Example:
        // /^status-/,
        // /^priority-/,
        // /^pf-/,
      ],
    },
  });

  // Ensure output dir exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const report = [];

  for (const result of purgeCSSResults) {
    const { file, css, rejected = [] } = result;

    const originalPath = path.resolve(file);
    const baseName = path.basename(file);
    const outPath = path.join(OUTPUT_DIR, baseName);

    // Write purged CSS copy
    fs.writeFileSync(outPath, css, 'utf8');

    // Collect report data
    report.push({
      file: originalPath,
      output: path.resolve(outPath),
      removedSelectorsCount: rejected.length,
      removedSelectors: rejected,
    });

    console.log(
      `✅ Processed ${baseName} → ${path.relative(process.cwd(), outPath)} (${rejected.length} selectors removed)`
    );
  }

  // Write JSON report
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n📄 CSS audit report written to:', REPORT_FILE);
  console.log('⚠️ Review the report and clean CSS files before swapping them into active use.');
}

run().catch((err) => {
  console.error('❌ CSS audit failed:', err);
  process.exit(1);
});
