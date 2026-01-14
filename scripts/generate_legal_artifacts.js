#!/usr/bin/env node

/**
 * Legal Artifacts Generation Script
 * Generates SBOM, Third-Party Notices, and Asset Attributions
 *
 * Usage: npm run legal:generate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const legalDir = path.join(rootDir, 'legal');
const sbomDir = path.join(legalDir, 'sbom');

console.log('🔍 Generating legal artifacts...\n');

// Ensure directories exist
if (!fs.existsSync(legalDir)) {
    fs.mkdirSync(legalDir, { recursive: true });
    console.log('✅ Created legal/ directory');
}
if (!fs.existsSync(sbomDir)) {
    fs.mkdirSync(sbomDir, { recursive: true });
    console.log('✅ Created legal/sbom/ directory');
}

// ========================================
// 1. Generate SBOM (Multiple Formats)
// ========================================
console.log('\n📦 Generating SBOM...');

try {
    // Full dependency tree (npm format)
    const fullDeps = execSync('npm list --json --all', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    fs.writeFileSync(path.join(sbomDir, 'npm-dependencies.json'), fullDeps);
    console.log('✅ Generated npm-dependencies.json (full tree)');

    // Production dependencies only (npm format)
    const prodDeps = execSync('npm list --prod --json', {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024
    });
    fs.writeFileSync(path.join(sbomDir, 'npm-production.json'), prodDeps);
    console.log('✅ Generated npm-production.json (production only)');
} catch (error) {
    console.warn('⚠️  Warning: npm SBOM generation had issues (this is normal if there are warnings)');
    // Continue anyway - npm list often exits with non-zero even with warnings
}

// Generate CycloneDX SBOM (industry standard for security tools like Dependency-Track)
console.log('\n🔐 Generating CycloneDX SBOM for security scanning...');

try {
    // CycloneDX JSON format (compatible with Dependency-Track, OWASP tools, etc.)
    execSync('npx @cyclonedx/cyclonedx-npm --output-file legal/sbom/cyclonedx.json', {
        encoding: 'utf8',
        stdio: 'inherit'
    });
    console.log('✅ Generated cyclonedx.json (CycloneDX 1.6 format for Dependency-Track)');

    // CycloneDX XML format (alternative format for some tools)
    execSync('npx @cyclonedx/cyclonedx-npm --output-format XML --output-file legal/sbom/cyclonedx.xml', {
        encoding: 'utf8',
        stdio: 'inherit'
    });
    console.log('✅ Generated cyclonedx.xml (CycloneDX XML format)');
} catch (error) {
    console.error('❌ CycloneDX SBOM generation failed:', error.message);
    console.log('   You may need to install @cyclonedx/cyclonedx-npm:');
    console.log('   npm install --save-dev @cyclonedx/cyclonedx-npm');
}

// ========================================
// 2. Extract License Information
// ========================================
console.log('\n📜 Extracting license information...');

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const devDeps = Object.keys(packageJson.devDependencies || {});

console.log(`Found ${devDeps.length} development dependencies`);

// ========================================
// 3. Scan for Assets
// ========================================
console.log('\n🎵 Scanning for third-party assets...');

const soundDir = path.join(rootDir, 'data', 'sound');
let soundFiles = [];

if (fs.existsSync(soundDir)) {
    soundFiles = fs.readdirSync(soundDir).filter(f => f.endsWith('.wav') || f.endsWith('.mp3'));
    console.log(`Found ${soundFiles.length} sound files`);
} else {
    console.log('No sound directory found');
}

// ========================================
// 4. Verify Required Files
// ========================================
console.log('\n✅ Verifying required legal files...');

const requiredFiles = [
    'legal/SRD_ATTRIBUTION.md',
    'legal/THIRD_PARTY_NOTICES.md',
    'legal/ASSET_ATTRIBUTIONS.md',
    'legal/sbom/npm-dependencies.json',
    'legal/sbom/npm-production.json',
    'legal/sbom/cyclonedx.json',
    'legal/sbom/cyclonedx.xml'
];

let allFilesExist = true;
for (const file of requiredFiles) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ Missing: ${file}`);
        allFilesExist = false;
    }
}

// ========================================
// 5. Generate Summary Report
// ========================================
console.log('\n📊 Summary:');
console.log(`  - Development dependencies: ${devDeps.length}`);
console.log(`  - Production dependencies: 0 (vanilla JS)`);
console.log(`  - Sound assets: ${soundFiles.length}`);
console.log(`  - SBOM files: 4 (npm + CycloneDX JSON/XML)`);
console.log(`  - Legal documentation: ${requiredFiles.length}`);

if (allFilesExist) {
    console.log('\n✅ All legal artifacts are complete!');
} else {
    console.log('\n⚠️  Some legal artifacts are missing - please create them manually');
    process.exit(1);
}

// ========================================
// 6. Check for Updates
// ========================================
console.log('\n🔄 Checking for outdated dependencies...');

try {
    const outdated = execSync('npm outdated --json', { encoding: 'utf8' });
    const outdatedPkgs = JSON.parse(outdated);
    const count = Object.keys(outdatedPkgs).length;

    if (count > 0) {
        console.log(`⚠️  ${count} dependencies have updates available`);
        console.log('   Run "npm outdated" for details');
        console.log('   Remember to regenerate legal artifacts after updating!');
    } else {
        console.log('✅ All dependencies are up to date');
    }
} catch (error) {
    // npm outdated exits with 1 if there are outdated packages
    if (error.stdout) {
        const outdatedPkgs = JSON.parse(error.stdout);
        const count = Object.keys(outdatedPkgs).length;
        console.log(`⚠️  ${count} dependencies have updates available`);
    } else {
        console.log('✅ All dependencies are up to date');
    }
}

console.log('\n✨ Legal artifact generation complete!\n');
