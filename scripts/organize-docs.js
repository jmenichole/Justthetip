#!/usr/bin/env node
/**
 * Documentation Organization Script for JustTheTip
 *
 * Organizes and validates all documentation files
 * Creates a comprehensive documentation index
 * Identifies orphaned or duplicate docs
 *
 * Usage: npm run organize-docs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Documentation categories
const DOC_CATEGORIES = {
  'Getting Started': ['README.md', 'CONTRIBUTING.md', 'QUICK_START', 'COMPLETE_SETUP_GUIDE'],
  'Deployment': ['DEPLOYMENT', 'RAILWAY', 'VERCEL', 'BOT_247', 'MAINNET'],
  'Development': ['DEVELOPER_GUIDE', 'IMPLEMENTATION', 'FEATURE_SUMMARY'],
  'Security': ['SECURITY', 'NON_CUSTODIAL'],
  'Integration': ['KICK', 'PASSKEY', 'WALLET', 'X402', 'CRYPTO_SUPPORT'],
  'Database': ['SCHEMA', 'SUPABASE', 'POSTGRESQL', 'MIGRATION'],
  'Architecture': ['SOLANA', 'TRUSTLESS_AGENT', 'MULTI_TOKEN'],
  'Operations': ['FIX_SUMMARY', 'ERROR', 'TROUBLESHOOT', 'CONFIG_TEST'],
  'Reference': ['QUICK_REFERENCE', 'DOCUMENTATION_INDEX', 'REPOSITORY_INDEX'],
  'Legal': ['terms.md', 'privacy.md'],
  'Changelog': ['CHANGELOG.md', 'RECENT_UPDATES', 'COMPLETION_SUMMARY']
};

function findAllDocs(dir = process.cwd(), docs = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip node_modules, .git, etc.
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    if (entry.isDirectory()) {
      findAllDocs(fullPath, docs);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      docs.push({
        name: entry.name,
        path: fullPath,
        relativePath: path.relative(process.cwd(), fullPath),
        category: null,
        size: fs.statSync(fullPath).size
      });
    }
  }

  return docs;
}

function categorizeDoc(doc) {
  const fileName = doc.name.toUpperCase();

  for (const [category, keywords] of Object.entries(DOC_CATEGORIES)) {
    for (const keyword of keywords) {
      if (fileName.includes(keyword.toUpperCase())) {
        return category;
      }
    }
  }

  return 'Uncategorized';
}

function analyzeDocLinks(docs) {
  const linkPattern = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
  const linkMap = new Map();

  for (const doc of docs) {
    try {
      const content = fs.readFileSync(doc.path, 'utf8');
      const links = [];

      let match;
      while ((match = linkPattern.exec(content)) !== null) {
        links.push({
          text: match[1],
          target: match[2]
        });
      }

      linkMap.set(doc.relativePath, links);
    } catch (error) {
      // Skip files that can't be read
    }
  }

  return linkMap;
}

function findDuplicates(docs) {
  const nameMap = new Map();

  for (const doc of docs) {
    const baseName = doc.name.toLowerCase();
    if (!nameMap.has(baseName)) {
      nameMap.set(baseName, []);
    }
    nameMap.set(baseName, [...nameMap.get(baseName), doc]);
  }

  return Array.from(nameMap.entries())
    .filter(([_, docs]) => docs.length > 1)
    .map(([name, docs]) => ({ name, docs }));
}

function generateDocIndex(docs) {
  const categorized = {};

  for (const doc of docs) {
    const category = doc.category || 'Uncategorized';
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push(doc);
  }

  let index = '# JustTheTip Documentation Index\n\n';
  index += '**Last Updated:** ' + new Date().toISOString().split('T')[0] + '\n\n';
  index += '## Table of Contents\n\n';

  // TOC
  for (const category of Object.keys(categorized).sort()) {
    const slug = category.toLowerCase().replace(/\s+/g, '-');
    index += `- [${category}](#${slug})\n`;
  }

  index += '\n---\n\n';

  // Content
  for (const category of Object.keys(categorized).sort()) {
    index += `## ${category}\n\n`;

    const docs = categorized[category].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const doc of docs) {
      const sizeKB = (doc.size / 1024).toFixed(1);
      index += `- [${doc.name}](./${doc.relativePath}) (${sizeKB} KB)\n`;
    }

    index += '\n';
  }

  index += '---\n\n';
  index += `**Total Documents:** ${docs.length}\n`;
  index += `**Total Size:** ${(docs.reduce((sum, d) => sum + d.size, 0) / 1024 / 1024).toFixed(2)} MB\n`;

  return index;
}

async function main() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║   Documentation Organization           ║', 'blue');
  log('╚════════════════════════════════════════╝\n', 'blue');

  // Find all docs
  log('📚 Scanning for documentation files...', 'blue');
  const docs = findAllDocs();
  log(`✅ Found ${docs.length} documentation files\n`, 'green');

  // Categorize
  log('🏷️  Categorizing documents...', 'blue');
  for (const doc of docs) {
    doc.category = categorizeDoc(doc);
  }

  const categories = {};
  for (const doc of docs) {
    if (!categories[doc.category]) categories[doc.category] = 0;
    categories[doc.category]++;
  }

  for (const [category, count] of Object.entries(categories).sort()) {
    log(`   ${category}: ${count} docs`, 'reset');
  }
  log('');

  // Find duplicates
  log('🔍 Checking for duplicate files...', 'blue');
  const duplicates = findDuplicates(docs);

  if (duplicates.length === 0) {
    log('✅ No duplicate filenames found\n', 'green');
  } else {
    log(`⚠️  Found ${duplicates.length} duplicate filenames:\n`, 'yellow');
    for (const { name, docs } of duplicates) {
      log(`   ${name}:`, 'yellow');
      for (const doc of docs) {
        log(`      - ${doc.relativePath}`, 'reset');
      }
    }
    log('');
  }

  // Analyze links
  log('🔗 Analyzing documentation links...', 'blue');
  const linkMap = analyzeDocLinks(docs);

  const brokenLinks = [];
  for (const [docPath, links] of linkMap.entries()) {
    for (const link of links) {
      const linkPath = path.resolve(path.dirname(path.join(process.cwd(), docPath)), link.target);
      if (!fs.existsSync(linkPath)) {
        brokenLinks.push({ doc: docPath, link: link.target });
      }
    }
  }

  if (brokenLinks.length === 0) {
    log('✅ No broken links found\n', 'green');
  } else {
    log(`⚠️  Found ${brokenLinks.length} broken links:\n`, 'yellow');
    for (const { doc, link } of brokenLinks.slice(0, 10)) {
      log(`   ${doc} -> ${link}`, 'yellow');
    }
    if (brokenLinks.length > 10) {
      log(`   ... and ${brokenLinks.length - 10} more\n`, 'yellow');
    }
  }

  // Generate index
  log('📝 Generating documentation index...', 'blue');
  const indexContent = generateDocIndex(docs);
  const indexPath = path.join(process.cwd(), 'DOCUMENTATION_INDEX_NEW.md');
  fs.writeFileSync(indexPath, indexContent);
  log(`✅ Created ${path.basename(indexPath)}\n`, 'green');

  // Summary
  log('═'.repeat(40), 'blue');
  log('\n📊 Summary:\n', 'bright');
  log(`   Total Documents: ${docs.length}`, 'reset');
  log(`   Categories: ${Object.keys(categories).length}`, 'reset');
  log(`   Duplicates: ${duplicates.length}`, duplicates.length > 0 ? 'yellow' : 'green');
  log(`   Broken Links: ${brokenLinks.length}`, brokenLinks.length > 0 ? 'yellow' : 'green');
  log('\n');

  log('💡 Recommendations:', 'blue');
  if (duplicates.length > 0) {
    log('   • Review and consolidate duplicate files', 'yellow');
  }
  if (brokenLinks.length > 0) {
    log('   • Fix broken documentation links', 'yellow');
  }
  if (categories['Uncategorized'] > 5) {
    log('   • Categorize uncategorized documents', 'yellow');
  }
  log('   • Review DOCUMENTATION_INDEX_NEW.md', 'blue');
  log('   • Consider moving all docs to docs/ directory\n', 'blue');
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}\n`, 'red');
  process.exit(1);
});
