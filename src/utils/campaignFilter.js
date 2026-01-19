/**
 * Campaign Filtering Utility
 *
 * Filters data entries based on campaign ID. Supports inheritance (campaigns
 * that inherit from 'core' get all core content plus their own).
 *
 * Usage:
 *   import { filterByCampaign, getCampaignConfig } from './utils/campaignFilter.js';
 *
 *   const filteredItems = filterByCampaign(items, 'nexus-verge');
 *   const filteredClasses = filterByCampaign(classes, campaignId);
 */

// Default campaign ID if none specified
const DEFAULT_CAMPAIGN_ID = 'core';

// Campaign inheritance map (loaded from campaigns.json)
let campaignInheritance = null;
let campaignsData = null;

/**
 * Load campaigns configuration from data file
 * @returns {Promise<Object>} Campaigns data
 */
export async function loadCampaigns() {
    if (campaignsData) return campaignsData;

    try {
        const response = await fetch('data/campaigns.json');
        campaignsData = await response.json();

        // Build inheritance map
        campaignInheritance = {};
        for (const campaign of campaignsData.campaigns) {
            campaignInheritance[campaign.id] = campaign.inherits || [];
        }

        // Also check template campaigns (disabled ones)
        if (campaignsData.templateCampaigns) {
            for (const campaign of campaignsData.templateCampaigns) {
                campaignInheritance[campaign.id] = campaign.inherits || [];
            }
        }

        return campaignsData;
    } catch (error) {
        console.error('Failed to load campaigns.json:', error);
        // Fallback to default
        campaignsData = { campaigns: [{ id: 'core', inherits: [] }] };
        campaignInheritance = { core: [] };
        return campaignsData;
    }
}

/**
 * Get all campaign IDs that a campaign has access to (including inherited)
 * @param {string} campaignId - The campaign ID
 * @returns {string[]} Array of campaign IDs this campaign can access
 */
export function getEffectiveCampaignIds(campaignId) {
    if (!campaignInheritance) {
        // Not loaded yet, return default behavior
        return [campaignId, 'core'];
    }

    const effective = new Set([campaignId]);

    // Add inherited campaigns recursively
    const addInherited = (id) => {
        const inherited = campaignInheritance[id] || [];
        for (const parentId of inherited) {
            if (!effective.has(parentId)) {
                effective.add(parentId);
                addInherited(parentId);
            }
        }
    };

    addInherited(campaignId);
    return Array.from(effective);
}

/**
 * Check if an entry is available for a given campaign
 * @param {Object} entry - Data entry with optional campaignIds field
 * @param {string} campaignId - The active campaign ID
 * @returns {boolean} True if entry is available for this campaign
 */
export function isAvailableForCampaign(entry, campaignId) {
    if (!entry) return false;

    // If entry has no campaignIds, default to 'core' (available everywhere)
    const entryCampaigns = entry.campaignIds || ['core'];

    // Get all campaigns this campaign has access to
    const effectiveCampaigns = getEffectiveCampaignIds(campaignId);

    // Check if any of the entry's campaigns match
    return entryCampaigns.some(id => effectiveCampaigns.includes(id));
}

/**
 * Filter an array of entries by campaign ID
 * @param {Array} entries - Array of data entries
 * @param {string} campaignId - The active campaign ID
 * @returns {Array} Filtered array of entries available for this campaign
 */
export function filterByCampaign(entries, campaignId) {
    if (!Array.isArray(entries)) return entries;
    if (!campaignId) campaignId = DEFAULT_CAMPAIGN_ID;

    return entries.filter(entry => isAvailableForCampaign(entry, campaignId));
}

/**
 * Filter an object where values are arrays of entries (e.g., spells by level)
 * @param {Object} obj - Object with array values
 * @param {string} campaignId - The active campaign ID
 * @returns {Object} Object with filtered arrays
 */
export function filterObjectArraysByCampaign(obj, campaignId) {
    if (!obj || typeof obj !== 'object') return obj;
    if (!campaignId) campaignId = DEFAULT_CAMPAIGN_ID;

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
            result[key] = filterByCampaign(value, campaignId);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Get campaign configuration by ID
 * @param {string} campaignId - The campaign ID
 * @returns {Object|null} Campaign configuration or null if not found
 */
export function getCampaignConfig(campaignId) {
    if (!campaignsData) return null;

    // Check active campaigns
    const active = campaignsData.campaigns?.find(c => c.id === campaignId);
    if (active) return active;

    // Check template campaigns
    const template = campaignsData.templateCampaigns?.find(c => c.id === campaignId);
    return template || null;
}

/**
 * Get list of available (enabled) campaigns
 * @returns {Array} Array of enabled campaign objects
 */
export function getAvailableCampaigns() {
    if (!campaignsData) return [{ id: 'core', name: 'Core Rules' }];

    return campaignsData.campaigns.filter(c => !c.disabled);
}

/**
 * Get the default campaign ID
 * @returns {string} Default campaign ID
 */
export function getDefaultCampaignId() {
    return campaignsData?.defaultCampaignId || DEFAULT_CAMPAIGN_ID;
}

/**
 * Helper to filter data loaded from JSON files
 * Handles common data structures: arrays, objects with arrays, etc.
 *
 * @param {Object} data - Loaded JSON data
 * @param {string} campaignId - The active campaign ID
 * @param {Object} options - Options for filtering
 * @param {string[]} options.arrayKeys - Keys that contain arrays to filter
 * @param {string[]} options.nestedArrayKeys - Keys that contain objects with arrays
 * @returns {Object} Filtered data
 */
export function filterLoadedData(data, campaignId, options = {}) {
    if (!data) return data;
    if (!campaignId) campaignId = DEFAULT_CAMPAIGN_ID;

    const result = { ...data };

    // Filter top-level arrays
    if (options.arrayKeys) {
        for (const key of options.arrayKeys) {
            if (Array.isArray(result[key])) {
                result[key] = filterByCampaign(result[key], campaignId);
            }
        }
    }

    // Filter nested arrays (e.g., spells.cantrips, spells.level1)
    if (options.nestedArrayKeys) {
        for (const key of options.nestedArrayKeys) {
            if (result[key] && typeof result[key] === 'object') {
                result[key] = filterObjectArraysByCampaign(result[key], campaignId);
            }
        }
    }

    return result;
}

// Export default campaign ID constant
export { DEFAULT_CAMPAIGN_ID };
