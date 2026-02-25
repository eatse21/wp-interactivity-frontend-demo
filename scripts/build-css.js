#!/usr/bin/env node
/**
 * Build CSS from partials
 *
 * Usage:
 *   node scripts/build-css.js          # Build once
 *   node scripts/build-css.js --watch  # Watch for changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const OUTPUT_FILE = path.join(ROOT, 'styles', 'styles.css');

// Component order must match the HTML
const SECTIONS = [
  {
    folder: 'simple',
    components: ['counter', 'toggle', 'input-binding', 'class-toggle', 'conditional']
  },
  {
    folder: 'intermediate',
    components: ['todo-list', 'tabs', 'accordion', 'search-filter', 'star-rating']
  },
  {
    folder: 'complex',
    components: ['drag-drop', 'form-wizard', 'live-search', 'data-table', 'animation', 'kanban']
  }
];

// Base CSS files in order
const BASE_FILES = [
  '_base.css',
  '_layout.css',
  '_components.css',
  '_utilities.css'
];

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filePath}: ${err.message}`);
    return '';
  }
}

function buildCSS() {
  console.log('Building CSS...');

  let css = '';

  // 1. Add base CSS files
  for (const file of BASE_FILES) {
    const filePath = path.join(SRC_DIR, 'styles', file);
    const content = readFile(filePath);
    if (content) {
      css += `\n/* ===== ${file.replace('.css', '').replace('_', '').toUpperCase()} ===== */\n`;
      css += content;
    }
  }

  // 2. Add component CSS files in order
  for (const section of SECTIONS) {
    for (const component of section.components) {
      const componentPath = path.join(SRC_DIR, section.folder, component, `${component}.css`);
      const content = readFile(componentPath);
      if (content) {
        css += `\n/* ===== ${component.toUpperCase()} ===== */\n`;
        css += content;
      }
    }
  }

  // 3. Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 4. Write output
  fs.writeFileSync(OUTPUT_FILE, css);
  console.log(`Built ${OUTPUT_FILE}`);
}

function watch() {
  console.log('Watching for CSS changes...');

  // Debounce multiple rapid changes
  let timeout;
  const debouncedBuild = () => {
    clearTimeout(timeout);
    timeout = setTimeout(buildCSS, 100);
  };

  // Watch the entire src directory recursively
  fs.watch(SRC_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith('.css')) {
      console.log(`Changed: ${filename}`);
      debouncedBuild();
    }
  });

  buildCSS(); // Initial build
}

// Main
const args = process.argv.slice(2);
if (args.includes('--watch')) {
  watch();
} else {
  buildCSS();
}
