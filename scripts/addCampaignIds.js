/**
 * Script to add campaignIds field to all entries in data JSON files
 * Run with: node scripts/addCampaignIds.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to process and their array property names
const filesToProcess = [
    { file: 'items.json', arrays: ['weapons', 'armor', 'consumables', 'gear'] },
    { file: 'monsters.json', arrays: ['monsters'] },
    { file: 'terrains.json', arrays: ['terrains'] },
    { file: 'traits.json', arrays: ['traits'] },
    { file: 'magicItems.json', arrays: ['magicItems'] },
    { file: 'specializations.json', arrays: ['specializations'] },
    { file: 'kits.json', arrays: ['kits'] },
    { file: 'lootTables.json', arrays: ['tables'] },
];

// Files with nested structures by key (e.g., abilities organized by calling)
const nestedArrayFiles = [
    { file: 'abilities.json', containerKey: 'abilities' },
    { file: 'spells.json', containerKey: 'spells' },
];

// Files with nested challenge structures
const challengeFiles = [
    { file: 'skillChallenges.json', objectKey: 'challenges' },
    { file: 'quests.json', arrays: ['campaignQuests', 'sideQuestTemplates'] },
];

// Files with name pools
const nameFiles = [
    { file: 'npcNames.json', addToNamePools: true },
];

const dataDir = path.join(__dirname, '..', 'data');

function addCampaignIdsToArray(arr, defaultIds = ['core']) {
    if (!Array.isArray(arr)) return 0;

    let modified = 0;
    for (const item of arr) {
        if (item && typeof item === 'object' && item.id && !item.campaignIds) {
            item.campaignIds = defaultIds;
            modified++;
        }
    }
    return modified;
}

function addCampaignIdsToObject(obj, defaultIds = ['core']) {
    if (!obj || typeof obj !== 'object') return 0;

    let modified = 0;
    for (const key of Object.keys(obj)) {
        const item = obj[key];
        if (item && typeof item === 'object' && item.id && !item.campaignIds) {
            item.campaignIds = defaultIds;
            modified++;
        }
    }
    return modified;
}

function processFile(filename, config) {
    const filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  File not found: ${filename}`);
        return;
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        let totalModified = 0;

        // Process arrays
        if (config.arrays) {
            for (const arrayName of config.arrays) {
                if (data[arrayName]) {
                    const modified = addCampaignIdsToArray(data[arrayName]);
                    totalModified += modified;
                    if (modified > 0) {
                        console.log(`    - ${arrayName}: ${modified} entries`);
                    }
                }
            }
        }

        // Process object keys (for skillChallenges)
        if (config.objectKey && data[config.objectKey]) {
            const modified = addCampaignIdsToObject(data[config.objectKey]);
            totalModified += modified;
            if (modified > 0) {
                console.log(`    - ${config.objectKey}: ${modified} entries`);
            }
        }

        if (totalModified > 0) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
            console.log(`  ✅ ${filename}: ${totalModified} total entries updated`);
        } else {
            console.log(`  ⏭️  ${filename}: No changes needed`);
        }

    } catch (error) {
        console.error(`  ❌ Error processing ${filename}: ${error.message}`);
    }
}

function addCampaignIdsToNamePools(filename) {
    const filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  File not found: ${filename}`);
        return;
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        let modified = false;

        // Add campaignIds to each name pool (e.g., humanFirstNames, elfFirstNames, etc.)
        for (const key of Object.keys(data)) {
            if (key === 'description' || key === 'version') continue;

            const pool = data[key];
            if (pool && typeof pool === 'object' && !pool.campaignIds) {
                pool.campaignIds = ['core'];
                modified = true;
                console.log(`    - ${key}: added campaignIds`);
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
            console.log(`  ✅ ${filename}: Name pools updated`);
        } else {
            console.log(`  ⏭️  ${filename}: No changes needed`);
        }

    } catch (error) {
        console.error(`  ❌ Error processing ${filename}: ${error.message}`);
    }
}

function processNestedArrayFile(filename, config) {
    const filePath = path.join(dataDir, filename);

    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  File not found: ${filename}`);
        return;
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        let totalModified = 0;

        const container = data[config.containerKey];
        if (!container || typeof container !== 'object') {
            console.log(`  ⚠️  Container '${config.containerKey}' not found in ${filename}`);
            return;
        }

        // Process each key in the container (e.g., 'dedication', 'scholar', 'cantrips', 'level1')
        for (const key of Object.keys(container)) {
            if (key === 'description' || key === 'version') continue;

            const items = container[key];
            if (Array.isArray(items)) {
                const modified = addCampaignIdsToArray(items);
                totalModified += modified;
                if (modified > 0) {
                    console.log(`    - ${key}: ${modified} entries`);
                }
            }
        }

        if (totalModified > 0) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
            console.log(`  ✅ ${filename}: ${totalModified} total entries updated`);
        } else {
            console.log(`  ⏭️  ${filename}: No changes needed`);
        }

    } catch (error) {
        console.error(`  ❌ Error processing ${filename}: ${error.message}`);
    }
}

console.log('🚀 Adding campaignIds to data files...\n');

console.log('📁 Processing standard data files:');
for (const config of filesToProcess) {
    processFile(config.file, config);
}

console.log('\n📁 Processing nested array files:');
for (const config of nestedArrayFiles) {
    processNestedArrayFile(config.file, config);
}

console.log('\n📁 Processing challenge/quest files:');
for (const config of challengeFiles) {
    processFile(config.file, config);
}

console.log('\n📁 Processing name files:');
for (const config of nameFiles) {
    addCampaignIdsToNamePools(config.file);
}

console.log('\n✨ Done!');
