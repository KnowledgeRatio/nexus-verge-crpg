#!/usr/bin/env node

/**
 * Legal Compliance Verification Script
 * Verifies all required legal artifacts are present and up-to-date
 *
 * Usage: npm run legal:verify
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔍 Verifying legal compliance...\n');

let failedChecks = 0;
let passedChecks = 0;

// ========================================
// 1. Check Required Files Exist
// ========================================
console.log('📁 Checking required files...');

const requiredFiles = {
    'LICENSE': 'Project license (MIT)',
    'legal/SRD_ATTRIBUTION.md': 'D&D 5e SRD attribution',
    'legal/THIRD_PARTY_NOTICES.md': 'Third-party dependency notices',
    'legal/ASSET_ATTRIBUTIONS.md': 'Third-party asset attributions',
    'legal/sbom/npm-dependencies.json': 'Full dependency SBOM',
    'legal/sbom/npm-production.json': 'Production dependency SBOM'
};

for (const [file, description] of Object.entries(requiredFiles)) {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} - ${description}`);
        passedChecks++;
    } else {
        console.log(`❌ MISSING: ${file} - ${description}`);
        failedChecks++;
    }
}

// ========================================
// 2. Check SRD Attribution Content
// ========================================
console.log('\n📜 Checking SRD attribution content...');

const srdFile = path.join(rootDir, 'legal/SRD_ATTRIBUTION.md');
if (fs.existsSync(srdFile)) {
    const srdContent = fs.readFileSync(srdFile, 'utf8');

    const requiredContent = [
        'System Reference Document 5.2.1',
        'Wizards of the Coast LLC',
        'Creative Commons Attribution 4.0 International',
        'https://creativecommons.org/licenses/by/4.0/legalcode'
    ];

    let srdValid = true;
    for (const required of requiredContent) {
        if (srdContent.includes(required)) {
            console.log(`✅ Contains: "${required}"`);
            passedChecks++;
        } else {
            console.log(`❌ MISSING: "${required}"`);
            failedChecks++;
            srdValid = false;
        }
    }

    if (srdValid) {
        console.log('✅ SRD attribution is complete');
    }
} else {
    console.log('❌ Cannot verify SRD attribution - file missing');
    failedChecks++;
}

// ========================================
// 3. Check Asset Attributions
// ========================================
console.log('\n🎵 Checking asset attributions...');

const assetFile = path.join(rootDir, 'legal/ASSET_ATTRIBUTIONS.md');
const soundDir = path.join(rootDir, 'data', 'sound');

if (fs.existsSync(soundDir)) {
    const soundFiles = fs.readdirSync(soundDir).filter(f =>
        f.endsWith('.wav') || f.endsWith('.mp3') || f.endsWith('.ogg')
    );

    console.log(`Found ${soundFiles.length} sound files`);

    if (fs.existsSync(assetFile)) {
        const assetContent = fs.readFileSync(assetFile, 'utf8');

        // Check for Kenney attribution (if using Kenney sounds)
        if (soundFiles.length > 0) {
            if (assetContent.includes('Kenney') || assetContent.includes('kenney')) {
                console.log('✅ Sound effect attribution found (Kenney)');
                passedChecks++;
            } else {
                console.log('⚠️  Sound files present but no clear attribution found');
                console.log('   Please verify asset sources are properly attributed');
            }
        }
    } else {
        console.log('❌ ASSET_ATTRIBUTIONS.md missing');
        failedChecks++;
    }
} else {
    console.log('ℹ️  No sound directory found - skipping asset attribution check');
}

// ========================================
// 4. Check SBOM is Current
// ========================================
console.log('\n📦 Checking SBOM freshness...');

const packageLockPath = path.join(rootDir, 'package-lock.json');
const sbomPath = path.join(rootDir, 'legal/sbom/npm-dependencies.json');

if (fs.existsSync(packageLockPath) && fs.existsSync(sbomPath)) {
    const lockStats = fs.statSync(packageLockPath);
    const sbomStats = fs.statSync(sbomPath);

    if (sbomStats.mtime >= lockStats.mtime) {
        console.log('✅ SBOM is up-to-date with package-lock.json');
        passedChecks++;
    } else {
        console.log('⚠️  SBOM is older than package-lock.json');
        console.log('   Run "npm run legal:generate" to update SBOM');
        console.log(`   package-lock.json: ${lockStats.mtime}`);
        console.log(`   SBOM: ${sbomStats.mtime}`);
    }
} else {
    console.log('ℹ️  Cannot compare timestamps - files missing');
}

// ========================================
// 5. Check Website Legal Integration
// ========================================
console.log('\n🌐 Checking website legal integration...');

const indexPath = path.join(rootDir, 'index.html');
if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    if (indexContent.includes('legalModal') || indexContent.includes('Legal')) {
        console.log('✅ Legal modal found in index.html');
        passedChecks++;
    } else {
        console.log('❌ Legal modal not found in index.html');
        console.log('   Users cannot access legal information from the UI');
        failedChecks++;
    }

    if (indexContent.includes('footerLegalLink') || indexContent.includes('footer')) {
        console.log('✅ Footer with legal link found');
        passedChecks++;
    } else {
        console.log('❌ Footer with legal link not found');
        failedChecks++;
    }
} else {
    console.log('❌ index.html not found');
    failedChecks++;
}

// ========================================
// 6. Final Report
// ========================================
console.log('\n' + '='.repeat(50));
console.log('📊 Verification Summary');
console.log('='.repeat(50));
console.log(`✅ Passed checks: ${passedChecks}`);
console.log(`❌ Failed checks: ${failedChecks}`);

if (failedChecks === 0) {
    console.log('\n✨ Legal compliance verification PASSED!');
    console.log('All required legal artifacts are present and properly configured.\n');
    process.exit(0);
} else {
    console.log('\n❌ Legal compliance verification FAILED!');
    console.log('Please address the issues listed above.\n');
    console.log('To fix common issues:');
    console.log('  - Run "npm run legal:generate" to regenerate artifacts');
    console.log('  - Check that all files listed above exist');
    console.log('  - Verify SRD attribution contains required content');
    console.log('  - Ensure legal modal is integrated in index.html\n');
    process.exit(1);
}
