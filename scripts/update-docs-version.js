#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '../package.json');
const package = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = package.version;

// Read coverpage template
const coverpagePath = path.join(__dirname, '../docs/_coverpage.md');
let coverpage = fs.readFileSync(coverpagePath, 'utf8');

// Update version in coverpage
coverpage = coverpage.replace(/# Synapse <small>.*<\/small>/, `# Synapse <small>${version}</small>`);

// Write updated coverpage
fs.writeFileSync(coverpagePath, coverpage);

console.log(`Updated coverpage version to ${version}`);
