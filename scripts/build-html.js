#!/usr/bin/env node
/**
 * Build HTML from partials
 *
 * Usage:
 *   node scripts/build-html.js          # Build once
 *   node scripts/build-html.js --watch  # Watch for changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const OUTPUT_FILE = path.join(ROOT, 'index.html');

// Component order must match the original index.html
const SECTIONS = [
  {
    name: 'Simple Foundations',
    icon: '❧',
    folder: 'simple',
    components: ['counter', 'toggle', 'input-binding', 'class-toggle', 'conditional']
  },
  {
    name: 'Reactive Compositions',
    icon: '❧',
    folder: 'intermediate',
    components: ['todo-list', 'tabs', 'accordion', 'search-filter', 'star-rating']
  },
  {
    name: 'Advanced Compositions',
    icon: '❧',
    folder: 'complex',
    components: ['drag-drop', 'form-wizard', 'live-search', 'data-table', 'animation']
  },
  {
    name: 'The Masterpiece',
    icon: '🏆',
    folder: 'complex',
    components: ['kanban'],
    fullWidth: true
  }
];

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
    return '';
  }
}

function buildHTML() {
  console.log('Building HTML...');

  let html = '';

  // 1. Read head partial
  const headPath = path.join(SRC_DIR, '_partials', '_head.html');
  html += readFile(headPath);

  // 2. Read header partial
  const headerPath = path.join(SRC_DIR, '_partials', '_header.html');
  html += '\n' + readFile(headerPath);

  // 3. Build each section
  for (const section of SECTIONS) {
    // For fullWidth sections (kanban), the HTML file contains the full section
    if (section.fullWidth) {
      for (const component of section.components) {
        const componentPath = path.join(SRC_DIR, section.folder, component, `${component}.html`);
        const componentHTML = readFile(componentPath);
        if (componentHTML) {
          html += `\n${componentHTML}\n`;
        }
      }
      continue;
    }

    // Regular sections get wrapped
    const sectionClass = 'demo-section';

    html += `\n        <section class="${sectionClass}">\n`;
    html += `            <div class="demo-section__header">\n`;
    html += `                <span class="demo-section__icon">${section.icon}</span>\n`;
    html += `                <h2 class="demo-section__title">${section.name}</h2>\n`;
    html += `            </div>\n`;
    html += `            <div class="module-grid">\n`;

    // Add each component
    for (const component of section.components) {
      const componentPath = path.join(SRC_DIR, section.folder, component, `${component}.html`);
      const componentHTML = readFile(componentPath);
      if (componentHTML) {
        html += `${componentHTML}\n`;
      }
    }

    html += `            </div>\n`;
    html += `        </section>\n`;
  }

  // 4. Read footer partial
  const footerPath = path.join(SRC_DIR, '_partials', '_footer.html');
  html += '\n' + readFile(footerPath);

  // 5. Write output
  fs.writeFileSync(OUTPUT_FILE, html);
  console.log(`Built ${OUTPUT_FILE}`);
}

function watch() {
  console.log('Watching for HTML changes...');

  // Debounce multiple rapid changes
  let timeout;
  const debouncedBuild = () => {
    clearTimeout(timeout);
    timeout = setTimeout(buildHTML, 100);
  };

  // Watch the entire src directory recursively
  const watchDir = (dir) => {
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.html')) {
        console.log(`Changed: ${filename}`);
        debouncedBuild();
      }
    });
  };

  watchDir(SRC_DIR);
  buildHTML(); // Initial build
}

// Main
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watch();
} else {
  buildHTML();
}
