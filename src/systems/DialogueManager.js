/**
 * DialogueManager - Dynamic Dialogue System
 *
 * Generates contextual NPC dialogue from a combination of:
 * - Static pools (tone, role, personality, filler lines from dialogueTemplates.json)
 * - Dynamic templates (world-aware lines referencing real dungeons, settlements, terrain)
 *
 * All dialogue content is data-driven from JSON — no hardcoded lines.
 */

import { gameState } from '../core/GameState.js';

export default class DialogueManager {
    constructor() {
        this.dialogueData = null;
        this.dungeonData = null;
        this.config = null; // dynamicDialogue config from dungeons.json
    }

    /**
     * Initialize by loading dialogue templates and dungeon data
     */
    async init() {
        try {
            const [dialogueResp, dungeonResp] = await Promise.all([
                fetch(`data/dialogueTemplates.json?v=${Date.now()}`),
                fetch(`data/dungeons.json?v=${Date.now()}`)
            ]);

            this.dialogueData = await dialogueResp.json();
            this.dungeonData = await dungeonResp.json();
            this.config = this.dungeonData.dynamicDialogue || {
                scanRadius: 5,
                maxDungeonLines: 2,
                maxSettlementLines: 1,
                maxTerrainLines: 1,
                distanceLabels: {
                    near: { max: 2, label: 'nearby' },
                    medium: { max: 4, label: "a day's travel away" },
                    far: { max: 6, label: 'far to the' }
                }
            };

            console.log('💬 DialogueManager initialized');
        } catch (e) {
            console.error('Failed to load dialogue data:', e);
        }
    }

    /**
     * Get a greeting for an NPC based on role, personality, and relation tone
     * Falls back through: tone-specific → neutral tone → flat personality → generic
     * @param {Object} npc - NPC object
     * @param {string} tone - Relation tone (e.g., 'warm', 'hostile', 'neutral')
     * @returns {string} Greeting text
     */
    getGreeting(npc, tone) {
        if (!this.dialogueData?.greetings) {
            return npc.dialogue?.greeting || 'Hello.';
        }

        const roleGreetings = this.dialogueData.greetings[npc.role];
        if (!roleGreetings) {
            return npc.dialogue?.greeting || 'Hello.';
        }

        const personalityGreetings = roleGreetings[npc.personality];
        if (!personalityGreetings) {
            return npc.dialogue?.greeting || 'Hello.';
        }

        // Try tone-specific greeting
        if (typeof personalityGreetings === 'object' && !Array.isArray(personalityGreetings)) {
            // New format: { hostile: [...], neutral: [...], warm: [...] }
            const toneLines = personalityGreetings[tone];
            if (toneLines && toneLines.length > 0) {
                return toneLines[Math.floor(Math.random() * toneLines.length)];
            }
            // Fallback to neutral tone
            const neutralLines = personalityGreetings['neutral'];
            if (neutralLines && neutralLines.length > 0) {
                return neutralLines[Math.floor(Math.random() * neutralLines.length)];
            }
        }

        // Fallback to flat array (old format / backwards compat)
        if (Array.isArray(personalityGreetings)) {
            return personalityGreetings[Math.floor(Math.random() * personalityGreetings.length)];
        }

        return npc.dialogue?.greeting || 'Hello.';
    }

    /**
     * Get flavor dialogue lines for an NPC, mixing static pools with dynamic world lines
     * @param {Object} npc - NPC object
     * @param {string} tone - Relation tone
     * @param {number} [count=2] - Number of lines to return
     * @returns {string[]} Array of dialogue lines
     */
    getFlavorLines(npc, tone, count = 2) {
        const lines = [];

        // Gather candidate lines from all pools
        const candidates = [];

        // 1. Tone-specific lines (weight: 3)
        const tonePool = this.dialogueData?.toneDialogue?.[tone];
        if (tonePool) {
            for (const line of tonePool) {
                candidates.push({ line, weight: 3 });
            }
        }

        // 2. Role-specific lines (weight: 2)
        const rolePool = this.dialogueData?.roleDialogue?.[npc.role];
        if (rolePool) {
            for (const line of rolePool) {
                candidates.push({ line, weight: 2 });
            }
        }

        // 3. Personality-specific lines (weight: 2)
        const personalityPool = this.dialogueData?.personalityDialogue?.[npc.personality];
        if (personalityPool) {
            for (const line of personalityPool) {
                candidates.push({ line, weight: 2 });
            }
        }

        // 4. NPC's own flavor dialogue (weight: 2)
        if (npc.dialogue?.flavorDialogue) {
            for (const line of npc.dialogue.flavorDialogue) {
                candidates.push({ line, weight: 2 });
            }
        }

        // 5. Filler lines (weight: 1)
        const fillerPool = this.dialogueData?.fillerDialogue;
        if (fillerPool) {
            for (const line of fillerPool) {
                candidates.push({ line, weight: 1 });
            }
        }

        // 6. Dynamic world-aware lines (weight: 3 — important for immersion)
        const dynamicLines = this.getDynamicLines(npc);
        for (const line of dynamicLines) {
            candidates.push({ line, weight: 3 });
        }

        // Weighted random selection without replacement
        const selected = new Set();
        for (let i = 0; i < count && candidates.length > 0; i++) {
            const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
            let roll = Math.random() * totalWeight;

            for (let j = 0; j < candidates.length; j++) {
                roll -= candidates[j].weight;
                if (roll <= 0) {
                    lines.push(candidates[j].line);
                    candidates.splice(j, 1); // Remove to prevent duplicates
                    break;
                }
            }
        }

        // Fallback if we got nothing
        if (lines.length === 0 && npc.dialogue?.flavorDialogue?.length > 0) {
            lines.push(npc.dialogue.flavorDialogue[Math.floor(Math.random() * npc.dialogue.flavorDialogue.length)]);
        }

        return lines;
    }

    /**
     * Generate dynamic dialogue lines based on real world data near the NPC's settlement
     * Only references things that actually exist in the generated world
     * @param {Object} npc - NPC object
     * @returns {string[]} Array of world-aware dialogue lines
     */
    getDynamicLines(npc) {
        const lines = [];
        const templates = this.dialogueData?.dynamicTemplates;
        if (!templates) {
            return lines;
        }

        const world = gameState.get('world');
        if (!world?.generatedRegions) {
            return lines;
        }

        // Get settlement position
        const settlementId = npc.settlementId;
        if (!settlementId) {
            return lines;
        }

        const [sx, sy] = settlementId.split('_').map(Number);
        if (isNaN(sx) || isNaN(sy)) {
            return lines;
        }

        const radius = this.config.scanRadius;

        // Scan nearby features
        const nearbyDungeons = [];
        const nearbySettlements = [];
        const dominantTerrains = {};

        for (const regionKey of Object.keys(world.generatedRegions)) {
            const region = world.generatedRegions[regionKey];
            if (!region?.features) {
                continue;
            }

            for (const feature of region.features) {
                const dist = this._tileDistance(sx, sy, feature.x, feature.y);
                if (dist > radius * 32 || dist === 0) {
                    continue;
                } // Skip self and far features

                if (feature.type === 'dungeon' && feature.name) {
                    nearbyDungeons.push({
                        ...feature,
                        direction: this._getDirection(sx, sy, feature.x, feature.y),
                        distanceLabel: this._getDistanceLabel(dist)
                    });
                } else if (feature.type === 'settlement' && feature.name) {
                    nearbySettlements.push({
                        ...feature,
                        direction: this._getDirection(sx, sy, feature.x, feature.y),
                        distanceLabel: this._getDistanceLabel(dist)
                    });
                }
            }

            // Sample terrain from region tiles
            if (region.tiles) {
                for (const tile of region.tiles) {
                    const dist = this._tileDistance(sx, sy, tile.x, tile.y);
                    if (dist <= radius * 16 && dist > 3) {
                        const dir = this._getDirection(sx, sy, tile.x, tile.y);
                        const terrainKey = `${tile.terrain}_${dir}`;
                        dominantTerrains[terrainKey] = (dominantTerrains[terrainKey] || 0) + 1;
                    }
                }
            }
        }

        // Generate dungeon lines
        if (templates.dungeon && nearbyDungeons.length > 0) {
            const shuffled = [...nearbyDungeons].sort(() => Math.random() - 0.5);
            const max = this.config.maxDungeonLines;
            for (let i = 0; i < Math.min(max, shuffled.length); i++) {
                const d = shuffled[i];
                const template = templates.dungeon[Math.floor(Math.random() * templates.dungeon.length)];
                lines.push(this._fillTemplate(template, {
                    dungeonName: d.name,
                    direction: d.direction,
                    distance: d.distanceLabel,
                    creatureType: d.creatureType || 'monsters'
                }));
            }
        }

        // Generate settlement lines
        if (templates.settlement && nearbySettlements.length > 0) {
            const shuffled = [...nearbySettlements].sort(() => Math.random() - 0.5);
            const max = this.config.maxSettlementLines;
            for (let i = 0; i < Math.min(max, shuffled.length); i++) {
                const s = shuffled[i];
                const template = templates.settlement[Math.floor(Math.random() * templates.settlement.length)];
                lines.push(this._fillTemplate(template, {
                    settlementName: s.name,
                    direction: s.direction,
                    distance: s.distanceLabel
                }));
            }
        }

        // Generate terrain warning lines
        if (templates.terrain) {
            // Find most dominant terrain-direction combo
            const sorted = Object.entries(dominantTerrains)
                .sort(([, a], [, b]) => b - a)
                .slice(0, this.config.maxTerrainLines);

            for (const [key] of sorted) {
                const [terrain, direction] = key.split('_');
                // Only warn about interesting/dangerous terrain
                const warnTerrains = ['swamp', 'desert', 'mountain', 'jungle', 'tundra', 'denseForest'];
                if (warnTerrains.includes(terrain)) {
                    const template = templates.terrain[Math.floor(Math.random() * templates.terrain.length)];
                    lines.push(this._fillTemplate(template, {
                        terrainType: this._formatTerrain(terrain),
                        direction
                    }));
                }
            }
        }

        // Generate quest-aware lines (completed quests in the area)
        if (templates.questComplete) {
            const quests = gameState.get('quests');
            if (quests?.completed) {
                const localCompleted = quests.completed.filter(q =>
                    q.questGiver?.settlementId === settlementId
                );
                if (localCompleted.length > 0) {
                    const q = localCompleted[Math.floor(Math.random() * localCompleted.length)];
                    const template = templates.questComplete[Math.floor(Math.random() * templates.questComplete.length)];
                    lines.push(this._fillTemplate(template, {
                        questName: q.name,
                        npcName: q.questGiver?.npcName || 'someone'
                    }));
                }
            }
        }

        return lines;
    }

    // --- Utility Methods ---

    /**
     * Fill a template string with values
     * @param {string} template - Template with {placeholders}
     * @param {Object} values - Key-value pairs to substitute
     * @returns {string} Filled template
     */
    _fillTemplate(template, values) {
        let result = template;
        for (const [key, value] of Object.entries(values)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    }

    /**
     * Get compass direction from one point to another
     */
    _getDirection(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;

        // Note: in tile coords, positive Y is typically south
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (angle >= -22.5 && angle < 22.5) {
            return 'east';
        }
        if (angle >= 22.5 && angle < 67.5) {
            return 'southeast';
        }
        if (angle >= 67.5 && angle < 112.5) {
            return 'south';
        }
        if (angle >= 112.5 && angle < 157.5) {
            return 'southwest';
        }
        if (angle >= 157.5 || angle < -157.5) {
            return 'west';
        }
        if (angle >= -157.5 && angle < -112.5) {
            return 'northwest';
        }
        if (angle >= -112.5 && angle < -67.5) {
            return 'north';
        }
        if (angle >= -67.5 && angle < -22.5) {
            return 'northeast';
        }

        return 'nearby';
    }

    /**
     * Get a vague distance label
     */
    _getDistanceLabel(tileDist) {
        const labels = this.config.distanceLabels;
        if (tileDist <= labels.near.max * 32) {
            return labels.near.label;
        }
        if (tileDist <= labels.medium.max * 32) {
            return labels.medium.label;
        }
        return labels.far.label;
    }

    /**
     * Simple tile distance (Manhattan)
     */
    _tileDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    /**
     * Format terrain ID for display
     */
    _formatTerrain(terrainId) {
        const names = {
            grassland: 'grasslands', forest: 'forest', denseForest: 'dense forest',
            mountain: 'mountains', hills: 'hills', swamp: 'swamps',
            desert: 'desert', plains: 'plains', tundra: 'tundra',
            snowyPlains: 'frozen wastes', jungle: 'jungle', savanna: 'savanna',
            beach: 'coastline'
        };
        return names[terrainId] || terrainId;
    }
}
