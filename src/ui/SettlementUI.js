/**
 * Settlement UI Component
 * Handles all settlement and building UI rendering
 */

import { RULES } from '../core/rulesEngine.js';

class SettlementUI {
    constructor(settlementManager, merchantManager = null) {
        this.settlementManager = settlementManager;
        this.merchantManager = merchantManager;
        this.currentMerchant = null;
        this.merchantInventory = [];
        this.initializeEventListeners();
    }

    /**
   * Initialize all event listeners for settlement UI
   */
    initializeEventListeners() {
    // Close settlement modal button
        const closeSettlementBtn = document.getElementById('closeSettlementBtn');
        if (closeSettlementBtn) {
            closeSettlementBtn.addEventListener('click', () => {
                this.settlementManager.exitSettlement();
            });
        }

        // Leave settlement button
        const leaveSettlementBtn = document.getElementById('leaveSettlementBtn');
        if (leaveSettlementBtn) {
            leaveSettlementBtn.addEventListener('click', () => {
                this.settlementManager.exitSettlement();
            });
        }

        // Building enter buttons
        document.querySelectorAll('.building .enter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const building = e.target.closest('.building');
                if (building) {
                    const buildingType = building.dataset.building;
                    this.settlementManager.enterBuilding(buildingType);
                }
            });
        });

        // Close building modal button
        const closeBuildingBtn = document.getElementById('closeBuildingBtn');
        if (closeBuildingBtn) {
            closeBuildingBtn.addEventListener('click', () => {
                this.settlementManager.exitBuilding();
            });
        }

        // Leave building button
        const leaveBuildingBtn = document.getElementById('leaveBuildingBtn');
        if (leaveBuildingBtn) {
            leaveBuildingBtn.addEventListener('click', () => {
                this.settlementManager.exitBuilding();
            });
        }

        console.log('🏘️ Settlement UI event listeners initialized');
    }

    /**
   * Show settlement town map modal
   * @param {Object} settlement - Settlement data
   */
    showSettlementModal(settlement) {
    // Hide game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.style.display = 'none';
        }

        // Show settlement modal
        const settlementModal = document.getElementById('settlementModal');
        if (!settlementModal) {
            console.error('Settlement modal not found in HTML');
            return;
        }

        settlementModal.style.display = 'flex';

        // Update settlement info
        this.renderSettlementInfo(settlement);

        // Populate quest board with available quests for this settlement
        if (window.game?.renderQuestBoard) {
            const settlementId = settlement.id || `${settlement.x},${settlement.y}`;
            window.game.renderQuestBoard(settlementId);
        }

        // Render active consequence flags
        this.renderSettlementFlags(settlement);
    }

    /**
   * Hide settlement modal and return to game screen
   */
    hideSettlementModal() {
    // Hide settlement modal
        const settlementModal = document.getElementById('settlementModal');
        if (settlementModal) {
            settlementModal.style.display = 'none';
        }

        // Hide any open building interiors
        const buildingModal = document.getElementById('buildingModal');
        if (buildingModal) {
            buildingModal.style.display = 'none';
        }

        // Show game screen
        const gameScreen = document.getElementById('gameScreen');
        if (gameScreen) {
            gameScreen.style.display = 'flex';
        }
    }

    /**
   * Render settlement information (name, type, population)
   * @param {Object} settlement - Settlement data
   */
    renderSettlementInfo(settlement) {
        if (!settlement) {
            return;
        }

        const nameEl = document.getElementById('settlementName');
        const typeEl = document.getElementById('settlementType');

        if (nameEl) {
            nameEl.textContent = settlement.name;
        }
        if (typeEl) {
            const type = settlement.settlementType || 'village';
            typeEl.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        }

        const popEl = document.getElementById('settlementPopulation');
        if (popEl && settlement.population) {
            popEl.textContent = `Population: ${settlement.population}`;
        }
    }

    /**
   * Show building interior modal
   * @param {string} buildingType - Type of building ('tavern', 'merchant', etc.)
   */
    showBuildingModal(buildingType) {
        const buildingModal = document.getElementById('buildingModal');
        if (!buildingModal) {
            console.error('Building modal not found in HTML');
            return;
        }

        // Hide settlement town map
        const settlementModal = document.getElementById('settlementModal');
        if (settlementModal) {
            settlementModal.style.display = 'none';
        }

        buildingModal.style.display = 'flex';

        // Update building title
        const titleEl = document.getElementById('buildingTitle');
        if (titleEl) {
            titleEl.textContent = this.getBuildingName(buildingType);
        }

        // Render building-specific content
        this.renderBuildingContent(buildingType);
    }

    /**
   * Hide building modal and return to settlement town map
   */
    hideBuildingModal() {
    // Hide building modal
        const buildingModal = document.getElementById('buildingModal');
        if (buildingModal) {
            buildingModal.style.display = 'none';
        }

        // Show settlement town map again
        const settlementModal = document.getElementById('settlementModal');
        if (settlementModal) {
            settlementModal.style.display = 'flex';
        }
    }

    /**
   * Render building-specific content
   * @param {string} buildingType - Type of building
   */
    renderBuildingContent(buildingType) {
        const contentEl = document.getElementById('buildingContent');
        if (!contentEl) return;

        const settlement = this.settlementManager?.currentSettlement;
        if (!settlement) return;

        const buildingNPCs = settlement.npcs?.filter(npc => npc.building === buildingType) || [];

        let html = `
      <div class="building-interior">
        <h3>${this.getBuildingName(buildingType)}</h3>
        <p class="building-description">${this.getBuildingDescription(buildingType)}</p>
    `;

        if (buildingNPCs.length > 0) {
            html += `<div class="npc-list">`;
            buildingNPCs.forEach(npc => {
                const relationManager = window.game?.relationManager;
                const relation = relationManager ? relationManager.getRelation(npc) : null;
                const canOfferQuest = relationManager ? relationManager.canOfferQuest(npc) : true;
                const questBadge = (npc.offersQuest && canOfferQuest) ? '<span class="quest-badge">!</span>' : '';
                const relationBadge = relation ? `<span class="relation-badge" style="color:${relation.color}" title="Relation: ${relation.effectiveScore}">${relation.tierLabel}</span>` : '';
                html += `
        <div class="npc-card" data-npc-id="${npc.id}">
          <div class="npc-header">
            <h4>${npc.name}${questBadge}</h4>
            <span class="npc-role">${this.formatRole(npc.role)} ${relationBadge}</span>
          </div>
          <p class="npc-personality">${npc.personality}</p>
          <button class="btn-primary talk-btn" data-npc-id="${npc.id}">Talk</button>
        </div>
      `;
            });
            html += `</div>`;
        }

        if (buildingType === 'greathall') {
            html += this._renderRecruitmentSection();
        }

        html += `</div>`;
        contentEl.innerHTML = html;

        contentEl.querySelectorAll('.talk-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const npcId = e.target.dataset.npcId;
                const npc = buildingNPCs.find(n => n.id === npcId);
                if (npc) this.showNPCDialogue(npc);
            });
        });

        if (buildingType === 'greathall') {
            contentEl.querySelectorAll('.recruit-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const idx = parseInt(e.target.dataset.candidateIndex);
                    await this._recruitCandidate(idx);
                });
            });
        }
    }

    _renderRecruitmentSection() {
        const candidates = gameState.get('party')?.candidates || [];
        const character = gameState.get('character');
        const playerGold = character?.gold || 0;
        const playerLevel = character?.level || 1;
        const party = gameState.get('party');
        const companionCount = party?.companions?.length || 0;
        const maxCompanions = window.RULES?.party?.maxCompanions ?? 3;
        const costTable = window.RULES?.party?.recruitmentCostByLevel || [];
        const cost = costTable[Math.min(playerLevel, costTable.length - 1)] || 50;

        const callingColors = { dedication: '#c0392b', curiosity: '#8e44ad', audacity: '#16a085' };
        const callingLabels = { dedication: 'Dedication', curiosity: 'Curiosity', audacity: 'Audacity' };

        let html = `
        <div class="recruitment-section">
            <h4 class="recruitment-heading">Looking for Work</h4>
        `;

        if (candidates.length === 0) {
            html += `<p class="recruitment-empty">No adventurers seeking work in this settlement.</p>`;
        } else {
            candidates.forEach((candidate, index) => {
                const callingId = candidate.class?.id || 'dedication';
                const callingColor = callingColors[callingId] || '#7f8c8d';
                const callingLabel = callingLabels[callingId] || callingId;
                const skills = candidate.companionMeta?.skillAssignments || [];
                const alreadyInParty = party?.companions?.some(c => c.id === candidate.id);
                const partyFull = companionCount >= maxCompanions;
                const canAfford = playerGold >= cost;

                let btnLabel = `Recruit (${cost}g)`;
                let btnDisabled = '';
                if (alreadyInParty)  { btnLabel = 'In Party';    btnDisabled = 'disabled'; }
                else if (partyFull)  { btnLabel = 'Party Full';  btnDisabled = 'disabled'; }
                else if (!canAfford) { btnLabel = `Need ${cost}g`; btnDisabled = 'disabled'; }

                html += `
                <div class="candidate-card">
                    <div class="candidate-header">
                        <span class="candidate-name">${candidate.name}</span>
                        <span class="candidate-calling" style="color:${callingColor}">${callingLabel}</span>
                    </div>
                    <div class="candidate-details">
                        <span class="candidate-level">Lvl ${candidate.level}</span>
                        <span class="candidate-skills">${skills.join(', ')}</span>
                        <span class="candidate-motivation" title="Their true motivations remain hidden until you travel together">??? Motivation</span>
                    </div>
                    <button class="btn-primary recruit-btn" data-candidate-index="${index}" ${btnDisabled}>${btnLabel}</button>
                </div>
                `;
            });
        }

        html += `</div>`;
        return html;
    }

    async _recruitCandidate(candidateIndex) {
        const party = gameState.get('party');
        const candidates = party?.candidates || [];
        const candidate = candidates[candidateIndex];
        if (!candidate) return;

        const character = gameState.get('character');
        const playerLevel = character?.level || 1;
        const costTable = window.RULES?.party?.recruitmentCostByLevel || [];
        const cost = costTable[Math.min(playerLevel, costTable.length - 1)] || 50;
        const cm = window.game?.companionManager;

        if (!cm) {
            gameState.addMessage('Companion system unavailable.', 'error');
            return;
        }
        if (!cm.canRecruit()) {
            gameState.addMessage('Your party is already full.', 'warning');
            return;
        }
        if ((character.gold || 0) < cost) {
            gameState.addMessage(`You need ${cost} gold to hire a companion.`, 'warning');
            return;
        }

        character.gold -= cost;
        gameState.set('character', character);

        const success = cm.addCompanion(candidate);
        if (!success) {
            character.gold += cost;
            gameState.set('character', character);
            gameState.addMessage('Could not recruit companion.', 'error');
            return;
        }

        party.candidates = candidates.filter((_, i) => i !== candidateIndex);
        gameState.set('party', party);

        gameState.addMessage(`${candidate.name} joins your party!`, 'success');
        this.renderBuildingContent('greathall');
    }

    /**
   * Get building description text
   * @param {string} buildingType - Building type
   * @returns {string} Description
   */
    getBuildingDescription(buildingType) {
        const descriptions = {
            'tavern': 'The smell of roasted meat and stale ale fills the air. The kind of place where loose lips and coin change hands — if you know how to listen.',
            'merchant': 'Shelves lined with goods and supplies. The merchant eyes you with interest.',
            'blacksmith': 'The heat from the forge warms the room. Tools and weapons line the walls.',
            'greathall': 'The civic heart of the settlement. The leader holds court here, quests are posted on the board, and capable souls looking for work make themselves known.'
        };
        return descriptions[buildingType] || '';
    }

    /**
   * Format role name for display
   * @param {string} role - Role ID
   * @returns {string} Formatted role
   */
    formatRole(role) {
        const roleNames = {
            'innkeeper': 'Innkeeper',
            'patron': 'Patron',
            'merchant': 'Merchant',
            'blacksmith': 'Blacksmith',
            'leader': 'Settlement Leader',
            'guard': 'Guard',
            'citizen': 'Citizen'
        };
        return roleNames[role] || role;
    }

    /**
   * Show NPC dialogue modal
   * @param {Object} npc - NPC data
   */
    showNPCDialogue(npc) {
        const modal = document.getElementById('npcDialogueModal');
        if (!modal) {
            console.error('NPC dialogue modal not found');
            return;
        }

        // Get relation info
        const relationManager = window.game?.relationManager;
        const relation = relationManager ? relationManager.getRelation(npc) : null;
        const canSpeak = relationManager ? relationManager.canSpeak(npc) : true;
        const canTrade = relationManager ? relationManager.canTrade(npc) : true;
        const canOfferQuest = relationManager ? relationManager.canOfferQuest(npc) : true;

        // Update modal content
        const nameEl = document.getElementById('npcDialogueName');
        const roleEl = document.getElementById('npcDialogueRole');
        const textEl = document.getElementById('npcDialogueText');
        const optionsEl = document.getElementById('npcDialogueOptions');

        if (nameEl) {
            nameEl.textContent = npc.name;
        }
        if (roleEl) {
            let roleText = this.formatRole(npc.role);
            if (relation) {
                roleText += ` — <span style="color:${relation.color}">${relation.tierLabel}</span>`;
            }
            roleEl.innerHTML = roleText;
        }

        // Select greeting based on relation tone (use DialogueManager if available)
        if (textEl) {
            if (!canSpeak) {
                textEl.textContent = '...'; // Hostile NPCs refuse to speak
            } else {
                const dm = window.game?.dialogueManager;
                const tone = relation?.tone || 'neutral';
                textEl.textContent = dm ? dm.getGreeting(npc, tone) : npc.dialogue.greeting;
            }
        }

        // Run passive Empathy check for intel (silent, once per NPC)
        this._checkPassiveIntel(npc, relation);
        this._runPassiveApproachChecks(npc, relation);

        // Append passive flag context clues to dialogue text
        if (textEl) {
            const flags = npc.passiveFlags || {};
            let clue = '';
            if (flags.atmosphereRead === true)      clue = ' The common room feels tense tonight.';
            else if (flags.innkeeperWorried === true) clue = ' The innkeeper keeps glancing toward the door.';
            else if (flags.goodsOverpriced === true)  clue = ' You notice the prices marked higher than they should be.';
            else if (flags.guardDistracted === true)  clue = ' The guard seems distracted, eyes elsewhere.';
            else if (flags.leaderStressed === true)   clue = ' There are lines of worry around their eyes.';
            if (clue) textEl.textContent = (textEl.textContent || '') + clue;
        }

        // Debug logging for NPC quest status
        console.log(`💬 Showing dialogue for ${npc.name} (${npc.role}) [${relation?.tierLabel || 'unknown'}]`);
        console.log(`   - offersQuest: ${npc.offersQuest}, canOfferQuest: ${canOfferQuest}`);
        console.log('   - questIds:', npc.questIds);
        console.log(`   - relation: ${relation?.score || 0} (effective: ${relation?.effectiveScore || 0})`);
        console.log(`   - hasIntel: ${npc.hasIntel}, intelStatus: ${npc.intelStatus}`);

        // Build dialogue options
        let optionsHTML = '';

        // If hostile, only show goodbye
        if (!canSpeak) {
            optionsHTML += `
        <button class="dialogue-option" data-action="goodbye">
          👋 Leave
        </button>
      `;
            if (optionsEl) {
                optionsEl.innerHTML = optionsHTML;
            }
            modal.querySelectorAll('.dialogue-option').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.handleDialogueOption(e.target.dataset.action, npc);
                });
            });
            modal.style.display = 'flex';
            return;
        }

        // Flavor dialogue option
        if (npc.dialogue.flavorDialogue && npc.dialogue.flavorDialogue.length > 0) {
            optionsHTML += `
        <button class="dialogue-option" data-action="flavor">
          💬 Chat
        </button>
      `;
        }

        // Quest option (gated by relation tier)
        if (npc.offersQuest && npc.questIds && npc.questIds.length > 0 && canOfferQuest) {
            console.log('   ✅ Adding "Ask about work" button');
            optionsHTML += `
        <button class="dialogue-option quest-option" data-action="quest">
          ❗ Ask about work
        </button>
      `;
        } else if (npc.offersQuest && npc.questIds && npc.questIds.length > 0 && !canOfferQuest) {
            console.log('   ⛔ NPC has quests but relation too low to offer');
        }

        // Trade option (gated by relation tier)
        if ((npc.role === 'merchant' || npc.role === 'blacksmith') && canTrade) {
            optionsHTML += `
        <button class="dialogue-option" data-action="trade">
          💰 Trade
        </button>
      `;
        }

        // Rest option (for innkeepers)
        if (npc.role === 'innkeeper') {
            optionsHTML += `
        <button class="dialogue-option" data-action="rest">
          🛏️ Rest
        </button>
      `;
        }

        // Skill challenge option (contextual based on NPC role)
        if (window.skillChallengeManager && window.skillChallengeManager.terrainChallengesData) {
            const challenges = this.getContextualSkillChallenges(npc);
            if (challenges.length > 0) {
                optionsHTML += `
          <button class="dialogue-option skill-challenge-option" data-action="skill-challenge">
            ⚡ Test Your Skills
          </button>
        `;
            }
        }

        // Intel option (only if passive Empathy check passed or already revealed)
        if (npc.intelStatus === 'available') {
            optionsHTML += `
        <button class="dialogue-option intel-option" data-action="intel">
          🗺️ Ask about local dangers
        </button>
      `;
        } else if (npc.intelStatus === 'revealed') {
            optionsHTML += `
        <button class="dialogue-option intel-option" data-action="intel-recall">
          🗺️ Tell me again about the area
        </button>
      `;
        }

        // Goodbye option
        optionsHTML += `
      <button class="dialogue-option" data-action="goodbye">
        👋 Goodbye
      </button>
    `;

        if (optionsEl) {
            optionsEl.innerHTML = optionsHTML;
        }

        // Add event listeners
        modal.querySelectorAll('.dialogue-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleDialogueOption(e.target.dataset.action, npc);
            });
        });

        // Show modal
        modal.style.display = 'flex';
    }

    /**
   * Handle dialogue option selection
   * @param {string} action - Action type
   * @param {Object} npc - NPC data
   */
    handleDialogueOption(action, npc) {
        const textEl = document.getElementById('npcDialogueText');
        const optionsEl = document.getElementById('npcDialogueOptions');
        if (!textEl || !optionsEl) {
            return;
        }

        switch (action) {
            case 'flavor': {
                // Show flavor dialogue (use DialogueManager if available for richer variety)
                const dm = window.game?.dialogueManager;
                const relationManager = window.game?.relationManager;
                const tone = relationManager ? relationManager.getDialogueTone(npc) : 'neutral';
                if (dm) {
                    const lines = dm.getFlavorLines(npc, tone, 1);
                    textEl.textContent = lines[0] || npc.dialogue.flavorDialogue?.[0] || 'Hmm.';
                } else {
                    const flavorLine = npc.dialogue.flavorDialogue[
                        Math.floor(Math.random() * npc.dialogue.flavorDialogue.length)
                    ];
                    textEl.textContent = flavorLine;
                }
                break;
            }

            case 'quest':
                // Show available quests from this NPC
                this.showQuestOptions(npc, textEl, optionsEl);
                break;

            case 'trade': {
                // Check if settlement has been sacked — merchants have fled
                const currentSettlement = gameState.get('ui.currentSettlement');
                if (currentSettlement?.merchantLocked) {
                    gameState.addMessage('💀 The merchants have fled. There is nothing to trade here.', 'warning');
                    break;
                }
                // Open trading UI
                this.closeNPCDialogue();
                this.openTradingModal(npc);
                break;
            }

            case 'rest':
                // Open rest menu
                this.closeNPCDialogue();
                import('../systems/RestManager.js').then(module => {
                    module.default.openRestMenu();
                });
                break;

            case 'skill-challenge':
                // Show skill challenge options
                this.showSkillChallengeOptions(npc, textEl, optionsEl);
                break;

            case 'intel':
                this._handleIntelCheck(npc, textEl, optionsEl);
                break;

            case 'intel-recall':
                this._showIntelLines(npc, textEl);
                break;

            case 'goodbye':
                textEl.textContent = npc.dialogue.goodbye;
                setTimeout(() => {
                    this.closeNPCDialogue();
                }, 1000);
                break;
        }
    }

    /**
     * Run passive Empathy check silently when opening dialogue with an intel NPC
     * Only runs once per NPC — result is permanent
     * @param {Object} npc - NPC object
     * @param {Object|null} relation - Relation info from RelationManager
     */
    _checkPassiveIntel(npc, relation) {
        // Only check NPCs that have intel and haven't been checked yet
        if (!npc.hasIntel || npc.intelStatus !== null) {
            return;
        }

        const config = window.game?.relationManager?.config?.intel;
        if (!config) {
            return;
        }

        const character = gameState.get('character');
        if (!character) {
            return;
        }

        // Passive Empathy = 10 + empathy modifier
        const empathyMod = character.skillBonuses?.empathy ?? character.abilityModifiers?.wis ?? 0;
        const passiveEmpathy = 10 + empathyMod;

        // DC modified by relation tier
        const tierId = relation?.tier?.id || 'neutral';
        const tierMod = config.dcModifierByTier[tierId] ?? 0;
        const dc = config.passiveEmpathyBaseDC + tierMod;

        if (passiveEmpathy >= dc) {
            npc.intelStatus = 'available';
            console.log(`🔍 Passive Empathy passed for ${npc.name} (${passiveEmpathy} >= DC ${dc}) — intel available`);
        } else {
            npc.intelStatus = 'locked';
            console.log(`🔍 Passive Empathy failed for ${npc.name} (${passiveEmpathy} < DC ${dc}) — intel locked permanently`);
        }
    }

    _runPassiveApproachChecks(npc, relation) {
        if (!npc?.role) return;
        const config = window.game?.relationManager?.config;
        if (!config?.passiveApproachChecks) return;

        const checksForRole = config.passiveApproachChecks[npc.role] || [];
        if (!checksForRole.length) return;

        const character = window.gameState?.get('character');
        if (!character) return;

        if (!npc.passiveFlags) npc.passiveFlags = {};

        const tierMod = config.intel?.dcModifierByTier?.[relation?.tier?.id || 'neutral'] ?? 0;

        for (const check of checksForRole) {
            if (npc.passiveFlags[check.flag] !== undefined) continue; // already run

            const skillMod = window.skillChallengeManager
                ? window.skillChallengeManager.getSkillModifier(character, check.skill)
                : (character.skillBonuses?.[check.skill] ?? character.abilityModifiers?.[this._skillToAbility(check.skill)] ?? 0);

            const passiveScore = 10 + skillMod;
            const dc = check.dc + tierMod;
            const passed = passiveScore >= dc;

            npc.passiveFlags[check.flag] = passed;

            if (passed && check.setsIntel) {
                npc.intelStatus = 'available';
            }

            console.log(`🔍 Passive ${check.skill} (${check.flag}): ${passiveScore} vs DC ${dc} → ${passed ? 'pass' : 'fail'}`);
        }
    }

    _skillToAbility(skillId) {
        // Prefer delegating to data/skills.json (already loaded by SkillChallengeManager at
        // game init — window.skillChallengeManager.skillsData) instead of maintaining a second
        // hardcoded copy. This is only a fallback path anyway (see the caller at
        // _runPassiveApproachChecks — it's used only when window.skillChallengeManager itself
        // is unavailable), so the static map below exists purely as a last-resort safety net
        // for that edge case, not as the primary source of truth.
        const skillData = window.skillChallengeManager?.skillsData?.find(s => s.id === skillId);
        if (skillData) {
            return RULES.attributes.system === 'NVSystem'
                ? (skillData.attributeNVSystem || skillData.ability)
                : skillData.ability;
        }

        const legacyMap = {
            athletics: 'str', acrobatics: 'dex', sleightOfHand: 'dex',
            endurance: 'con', academia: 'int', arcana: 'int', investigation: 'int',
            perception: 'wis', cunning: 'wis', creativity: 'wis', empathy: 'wis',
            influence: 'cha', deception: 'cha'
        };
        const sixAttributeMap = {
            athletics: 'prowess', acrobatics: 'prowess', sleightOfHand: 'prowess',
            endurance: 'vitality', academia: 'intellect', arcana: 'intellect', investigation: 'intellect',
            perception: 'insight', cunning: 'insight', creativity: 'composure', empathy: 'insight',
            influence: 'presence', deception: 'composure'
        };
        const map = RULES.attributes.system === 'NVSystem' ? sixAttributeMap : legacyMap;
        return map[skillId] || (RULES.attributes.system === 'NVSystem' ? 'insight' : 'wis');
    }

    /**
     * Handle active Influence check when player asks for intel
     * @param {Object} npc - NPC object
     * @param {HTMLElement} textEl - Dialogue text element
     * @param {HTMLElement} optionsEl - Dialogue options element
     */
    _handleIntelCheck(npc, textEl, optionsEl) {
        const config = window.game?.relationManager?.config?.intel;
        const relationManager = window.game?.relationManager;
        if (!config || !relationManager) {
            return;
        }

        const character = gameState.get('character');
        if (!character) {
            return;
        }

        const relation = relationManager.getRelation(npc);
        const tierId = relation?.tier?.id || 'neutral';
        const tierMod = config.dcModifierByTier[tierId] ?? 0;
        const dc = config.activeInfluenceBaseDC + tierMod;

        // Roll d20 + Influence skill bonus
        const influenceMod = character.skillBonuses?.influence ?? character.abilityModifiers?.cha ?? 0;
        const roll = Math.floor(Math.random() * 20) + 1;
        const total = roll + influenceMod;
        const passed = total >= dc;

        // Show roll result in message log
        const { addMessage } = gameState;
        gameState.addMessage(
            `🎲 Influence check: rolled ${roll} + ${influenceMod} = ${total} vs DC ${dc} — ${passed ? 'SUCCESS' : 'FAILED'}`,
            passed ? 'success' : 'warning'
        );

        if (passed) {
            npc.intelStatus = 'revealed';

            // Relation bonus for passing
            if (config.relationChangeOnActivePass) {
                relationManager.modifyRelation(npc, config.relationChangeOnActivePass);
            }

            // Show the intel
            this._showIntelLines(npc, textEl);
        } else {
            npc.intelStatus = 'locked';

            // Relation penalty for failing
            if (config.relationChangeOnActiveFail) {
                relationManager.modifyRelation(npc, config.relationChangeOnActiveFail);
            }

            // Show failure response from data
            const dm = window.game?.dialogueManager;
            const failLines = dm?.dialogueData?.intelDialogue?.fail || ["I can't help you with that."];
            textEl.textContent = failLines[Math.floor(Math.random() * failLines.length)];

            // Remove the intel button and replace with locked state
            if (optionsEl) {
                const intelBtn = optionsEl.querySelector('[data-action="intel"]');
                if (intelBtn) {
                    intelBtn.remove();
                }
            }

            const lockedMsgs = dm?.dialogueData?.intelDialogue?.lockedMessage || ["{npcName} won't share information with you."];
            const lockedMsg = lockedMsgs[Math.floor(Math.random() * lockedMsgs.length)].replace(/{npcName}/g, npc.name);
            gameState.addMessage(lockedMsg, 'warning');
        }
    }

    /**
     * Display dynamic intel lines from DialogueManager
     * @param {Object} npc - NPC object
     * @param {HTMLElement} textEl - Dialogue text element
     */
    _showIntelLines(npc, textEl) {
        const dm = window.game?.dialogueManager;
        const intelDlg = dm?.dialogueData?.intelDialogue;

        if (!dm) {
            const fallback = intelDlg?.fallbackIntro || ["I've heard a few things about the area..."];
            textEl.textContent = fallback[Math.floor(Math.random() * fallback.length)];
            return;
        }

        const dynamicLines = dm.getDynamicLines(npc);
        if (dynamicLines.length === 0) {
            const noIntel = intelDlg?.noIntel || ['Things have been quiet around here.'];
            textEl.textContent = noIntel[Math.floor(Math.random() * noIntel.length)];
            return;
        }

        // Pick a random intro line, then show all intel lines
        const intros = intelDlg?.successIntro || ["Here's what I know."];
        const intro = intros[Math.floor(Math.random() * intros.length)];
        textEl.innerHTML = `<p style="margin: 4px 0;">${intro}</p>${
            dynamicLines.map(line =>
                `<p style="margin: 4px 0;">• ${line}</p>`
            ).join('')}`;
    }

    /**
   * Show quest options from NPC
   * @param {Object} npc - NPC data
   * @param {HTMLElement} textEl - Dialogue text element
   * @param {HTMLElement} optionsEl - Dialogue options element
   */
    showQuestOptions(npc, textEl, optionsEl) {
        if (!window.questManager) {
            textEl.textContent = "I might have some work for you, but I can't quite remember... (Quest system not initialized)";
            return;
        }

        // Debug logging
        console.log(`🔍 Checking quests for NPC: ${npc.name} (ID: ${npc.id})`);
        console.log(`   - offersQuest: ${npc.offersQuest}`);
        console.log('   - questIds:', npc.questIds);
        console.log('   - availableQuests in manager:', window.questManager.availableQuests?.length || 0);

        // Get quests from this NPC
        const availableQuests = window.questManager.getQuestsFromNPC(npc.id, 'available');
        const activeQuests = window.questManager.getQuestsFromNPC(npc.id, 'active');
        const completedQuests = window.questManager.getQuestsFromNPC(npc.id, 'completed');

        console.log(`   - Available quests found: ${availableQuests.length}`);
        console.log(`   - Active quests found: ${activeQuests.length}`);
        console.log(`   - Completed quests found: ${completedQuests.length}`);

        // Check if player has completed quests ready to turn in
        const readyToTurnIn = activeQuests.filter(q => window.questManager.isQuestReadyToComplete(q.id));

        if (readyToTurnIn.length > 0) {
            // Show turn-in options
            textEl.textContent = "Ah, you've completed your tasks! Let me see...";

            let optionsHTML = '<div class="quest-turn-in-list">';
            for (const quest of readyToTurnIn) {
                optionsHTML += `
          <button class="dialogue-option quest-turn-in" data-quest-id="${quest.id}">
            ✅ Turn in: ${quest.name}
          </button>
        `;
            }
            optionsHTML += `
        <button class="dialogue-option" data-action="back">
          ← Back
        </button>
      `;
            optionsHTML += '</div>';

            optionsEl.innerHTML = optionsHTML;

            // Add event listeners for turn-in
            optionsEl.querySelectorAll('.quest-turn-in').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.turnInQuest(e.target.dataset.questId, npc);
                });
            });

            // Back button
            optionsEl.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                this.showNPCDialogue(npc);
            });

        } else if (availableQuests.length > 0) {
            // Show available quest offers
            textEl.textContent = npc.dialogue.questOffer || "I have some work that needs doing, if you're interested.";

            let optionsHTML = '<div class="quest-offer-list">';
            for (const quest of availableQuests) {
                const difficultyIcon = this.getQuestDifficultyIcon(quest.difficulty);
                optionsHTML += `
          <button class="dialogue-option quest-offer" data-quest-id="${quest.id}">
            ${difficultyIcon} ${quest.name}
          </button>
        `;
            }
            optionsHTML += `
        <button class="dialogue-option" data-action="back">
          ← Back
        </button>
      `;
            optionsHTML += '</div>';

            optionsEl.innerHTML = optionsHTML;

            // Add event listeners for quest details
            optionsEl.querySelectorAll('.quest-offer').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.showQuestDetails(e.target.dataset.questId, npc);
                });
            });

            // Back button
            optionsEl.querySelector('[data-action="back"]')?.addEventListener('click', () => {
                this.showNPCDialogue(npc);
            });

        } else if (activeQuests.length > 0) {
            // Player has active quests but not completed
            textEl.textContent = "You're still working on the tasks I gave you. Come back when you're done!";
        } else if (completedQuests.length > 0) {
            // No more quests available
            textEl.textContent = "I don't have any more work for you right now. Check back later!";
        } else {
            // No quests at all
            textEl.textContent = "I don't have any work available at the moment.";
        }
    }

    /**
   * Show detailed quest information
   * @param {string} questId - Quest ID
   * @param {Object} npc - NPC data
   */
    showQuestDetails(questId, npc) {
        const quest = window.questManager.getQuest(questId);
        if (!quest) {
            console.error(`Quest ${questId} not found`);
            return;
        }

        const textEl = document.getElementById('npcDialogueText');
        const optionsEl = document.getElementById('npcDialogueOptions');

        // Show quest details
        const objectivesText = quest.objectives.map(obj => obj.description).join('; ');
        const rewardText = `${quest.rewards.xp} XP, ${quest.rewards.gold} gold`;

        textEl.innerHTML = `
      <div class="quest-details">
        <h4>${quest.name}</h4>
        <p class="quest-difficulty">Difficulty: ${quest.difficulty}</p>
        <p class="quest-description">${quest.description}</p>
        <p class="quest-objectives"><strong>Objectives:</strong> ${objectivesText}</p>
        <p class="quest-rewards"><strong>Rewards:</strong> ${rewardText}</p>
      </div>
    `;

        // Show accept/decline options
        optionsEl.innerHTML = `
      <button class="dialogue-option btn-primary" data-action="accept-quest" data-quest-id="${questId}">
        ✅ Accept Quest
      </button>
      <button class="dialogue-option" data-action="decline-quest">
        ❌ Decline
      </button>
    `;

        // Add event listeners
        optionsEl.querySelector('[data-action="accept-quest"]')?.addEventListener('click', (e) => {
            this.acceptQuest(e.target.dataset.questId, npc);
        });

        optionsEl.querySelector('[data-action="decline-quest"]')?.addEventListener('click', () => {
            this.showNPCDialogue(npc);
        });
    }

    /**
   * Accept a quest from an NPC
   * @param {string} questId - Quest ID
   * @param {Object} npc - NPC data
   */
    acceptQuest(questId, npc) {
        if (!window.questManager) {
            console.error('QuestManager not initialized');
            return;
        }

        const success = window.questManager.acceptQuest(questId);

        if (success) {
            const textEl = document.getElementById('npcDialogueText');
            if (textEl) {
                textEl.textContent = npc.dialogue.questAccepted || "Thank you! I'm counting on you. Good luck!";
            }

            // Show notification
            if (window.showQuestNotification) {
                const quest = window.questManager.getQuest(questId);
                window.showQuestNotification('Quest Accepted', quest.name, 'success');
            }

            // Close dialogue after a moment
            setTimeout(() => {
                this.closeNPCDialogue();
            }, 1500);
        } else {
            const textEl = document.getElementById('npcDialogueText');
            if (textEl) {
                textEl.textContent = "Hmm, something's not right. Perhaps you already have this quest?";
            }
        }
    }

    /**
   * Turn in a completed quest
   * @param {string} questId - Quest ID
   * @param {Object} npc - NPC data
   */
    turnInQuest(questId, npc) {
        if (!window.questManager) {
            console.error('QuestManager not initialized');
            return;
        }

        const result = window.questManager.completeQuest(questId);

        if (result.success) {
            const textEl = document.getElementById('npcDialogueText');
            if (textEl) {
                textEl.innerHTML = `
          <div class="quest-complete">
            <p>${npc.dialogue.questComplete || "Excellent work! Here's your reward."}</p>
            <p class="rewards-received">
              <strong>Received:</strong><br>
              ${result.rewards.xp} XP<br>
              ${result.rewards.gold} Gold
              ${result.rewards.items && result.rewards.items.length > 0 ? `<br>${  result.rewards.items.join(', ')}` : ''}
            </p>
          </div>
        `;
            }

            // Show notification
            if (window.showQuestNotification) {
                window.showQuestNotification('Quest Complete!', result.quest.name, 'success');
            }

            // Close dialogue after showing rewards
            setTimeout(() => {
                this.closeNPCDialogue();
            }, 3000);
        } else {
            const textEl = document.getElementById('npcDialogueText');
            if (textEl) {
                textEl.textContent = "Hmm, you haven't completed all the objectives yet. Come back when you're done!";
            }
        }
    }

    /**
   * Get difficulty icon for quest
   * @param {string} difficulty - Quest difficulty
   * @returns {string} Icon
   */
    getQuestDifficultyIcon(difficulty) {
        const icons = {
            'easy': '⭐',
            'normal': '⭐⭐',
            'hard': '⭐⭐⭐',
            'deadly': '💀'
        };
        return icons[difficulty?.toLowerCase()] || '❓';
    }

    /**
     * Render the settlement consequence flags panel.
     * Shows nothing if no active flags.
     * @param {Object} settlement - Settlement feature object
     */
    renderSettlementFlags(settlement) {
        const panel = document.getElementById('settlementFlagsPanel');
        const list  = document.getElementById('settlementFlagsList');
        if (!panel || !list) return;

        const activeFlags = window.consequenceManager
            ? window.consequenceManager.getActiveFlags(settlement)
            : (settlement.flags || []).filter(f => f.active);

        if (activeFlags.length === 0) {
            panel.style.display = 'none';
            return;
        }

        panel.style.display = '';

        const FLAG_META = {
            vendetta_active:   { icon: '⚔️', label: 'Vendetta Active',    desc: 'Hostile agents may ambush you on entry.' },
            watch_suspicious:  { icon: '👁️', label: 'Under Suspicion',    desc: 'Merchants have raised prices by 25%.' },
            cursed:            { icon: '💀', label: 'Cursed',             desc: 'Long rests here restore only half your hit dice.' },
            settlement_sacked: { icon: '💥', label: 'Settlement Sacked',  desc: 'The quest board is bare. Merchants have fled.' },
            disease_spreading: { icon: '🤒', label: 'Disease Spreading',  desc: 'Resting here risks catching the disease.' }
        };

        const VERB_LABELS = {
            confront:  '⚔️ Confront',
            negotiate: '🤝 Negotiate',
            cleanse:   '✨ Cleanse',
            outlast:   '⏳ Outlast'
        };

        const rulesConsequences = window.RULES?.consequences || {};
        const flagTypeDefs = rulesConsequences.flagTypes || {
            vendetta_active:   { validVerbs: ['confront', 'negotiate'] },
            watch_suspicious:  { validVerbs: ['negotiate', 'outlast'] },
            cursed:            { validVerbs: ['cleanse', 'confront'] },
            settlement_sacked: { validVerbs: ['cleanse'] },
            disease_spreading: { validVerbs: ['cleanse', 'outlast'] }
        };

        list.innerHTML = activeFlags.map(flag => {
            const meta   = FLAG_META[flag.type] || { icon: '⚠️', label: flag.type, desc: '' };
            const verbs  = flagTypeDefs[flag.type]?.validVerbs || [];
            const verbBtns = verbs.map(v =>
                `<button class="flag-verb-btn" data-flag="${flag.type}" data-verb="${v}">${VERB_LABELS[v] || v}</button>`
            ).join('');

            return `
<div class="flag-card" data-flag-type="${flag.type}">
  <div class="flag-card-header">
    <span class="flag-icon">${meta.icon}</span>
    <span class="flag-label">${meta.label}</span>
  </div>
  <div class="flag-description">${meta.desc}</div>
  <div class="flag-verbs">${verbBtns}</div>
</div>`;
        }).join('');

        // Wire verb buttons
        list.querySelectorAll('.flag-verb-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const flagType = btn.dataset.flag;
                const verb     = btn.dataset.verb;
                this._handleFlagResolution(settlement, flagType, verb);
            });
        });
    }

    /**
     * Attempt to resolve a settlement flag via verb.
     * Re-renders the flags panel on success.
     * @param {Object} settlement
     * @param {string} flagType
     * @param {string} verb
     */
    _handleFlagResolution(settlement, flagType, verb) {
        if (!window.consequenceManager) {
            window.gameState?.addMessage('Consequence system not available.', 'warning');
            return;
        }

        const result = window.consequenceManager.resolveFlag(settlement, flagType, verb);

        if (result.success) {
            this.renderSettlementFlags(settlement);
        } else {
            window.gameState?.addMessage(result.message, 'warning');
        }
    }

    /**
   * Close NPC dialogue modal
   */
    closeNPCDialogue() {
        const modal = document.getElementById('npcDialogueModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
   * Get friendly name for building type
   * @param {string} buildingType - Building type ID
   * @returns {string} Display name
   */
    getBuildingName(buildingType) {
        const names = {
            'tavern': 'Tavern',
            'merchant': 'General Goods',
            'blacksmith': 'Blacksmith',
            'greathall': 'Great Hall'
        };
        return names[buildingType] || buildingType;
    }

    /**
   * Open trading modal with merchant/blacksmith
   * @param {Object} npc - NPC merchant data
   */
    async openTradingModal(npc) {
        if (!this.merchantManager) {
            console.error('MerchantManager not initialized');
            return;
        }

        // Get character from gameState
        const character = window.gameState?.get('character');
        if (!character) {
            console.error('No character found');
            return;
        }

        // Store current merchant
        this.currentMerchant = npc;

        // Generate merchant inventory
        const settlement = this.settlementManager?.currentSettlement;
        const merchantType = npc.role; // 'merchant' or 'blacksmith'
        this.merchantInventory = await this.merchantManager.generateMerchantInventory(
            settlement,
            merchantType
        );

        // Update modal content
        const modal = document.getElementById('tradingModal');
        if (!modal) {
            console.error('Trading modal not found');
            return;
        }

        // Set merchant name and shop name
        const merchantNameEl = document.getElementById('tradingMerchantName');
        const shopNameEl = document.getElementById('tradingShopName');
        if (merchantNameEl) {
            merchantNameEl.textContent = npc.name;
        }
        if (shopNameEl) {
            shopNameEl.textContent = npc.shopName || 'Shop';
        }

        // Initialize state
        this.selectedItem = null;
        this.tradeMode = 'buy'; // 'buy' or 'sell'
        this.tradeQuantity = 1;

        // Render initial view
        this.renderTradingView();

        // Setup event listeners
        this.setupTradingEventListeners();

        // Show modal
        modal.style.display = 'flex';
    }

    /**
   * Setup trading modal event listeners
   */
    setupTradingEventListeners() {
    // Close button (header)
        const closeBtn = document.getElementById('closeTradingBtn');
        if (closeBtn) {
            closeBtn.replaceWith(closeBtn.cloneNode(true)); // Remove old listeners
            document.getElementById('closeTradingBtn').addEventListener('click', () => {
                this.closeTradingModal();
            });
        }

        // Close button (footer)
        const closeFooterBtn = document.getElementById('closeTradingFooterBtn');
        if (closeFooterBtn) {
            closeFooterBtn.replaceWith(closeFooterBtn.cloneNode(true));
            document.getElementById('closeTradingFooterBtn').addEventListener('click', () => {
                this.closeTradingModal();
            });
        }

        // Tab buttons
        const buyTab = document.getElementById('buyTab');
        const sellTab = document.getElementById('sellTab');
        if (buyTab) {
            buyTab.replaceWith(buyTab.cloneNode(true));
            document.getElementById('buyTab').addEventListener('click', () => {
                this.switchTradeMode('buy');
            });
        }
        if (sellTab) {
            sellTab.replaceWith(sellTab.cloneNode(true));
            document.getElementById('sellTab').addEventListener('click', () => {
                this.switchTradeMode('sell');
            });
        }

        // Quantity buttons
        const qtyDecrease = document.getElementById('qtyDecrease');
        const qtyIncrease = document.getElementById('qtyIncrease');
        const qtyInput = document.getElementById('qtyInput');

        if (qtyDecrease) {
            qtyDecrease.replaceWith(qtyDecrease.cloneNode(true));
            document.getElementById('qtyDecrease').addEventListener('click', () => {
                this.changeQuantity(-1);
            });
        }
        if (qtyIncrease) {
            qtyIncrease.replaceWith(qtyIncrease.cloneNode(true));
            document.getElementById('qtyIncrease').addEventListener('click', () => {
                this.changeQuantity(1);
            });
        }
        if (qtyInput) {
            qtyInput.replaceWith(qtyInput.cloneNode(true));
            document.getElementById('qtyInput').addEventListener('change', (e) => {
                this.setQuantity(parseInt(e.target.value) || 1);
            });
        }

        // Trade button
        const tradeBtn = document.getElementById('executeTrade');
        if (tradeBtn) {
            tradeBtn.replaceWith(tradeBtn.cloneNode(true));
            document.getElementById('executeTrade').addEventListener('click', () => {
                this.executeTrade();
            });
        }
    }

    /**
   * Render the trading view (items list + transaction panel)
   */
    renderTradingView() {
    // Update tab states
        const buyTab = document.getElementById('buyTab');
        const sellTab = document.getElementById('sellTab');
        if (buyTab) {
            buyTab.classList.toggle('active', this.tradeMode === 'buy');
        }
        if (sellTab) {
            sellTab.classList.toggle('active', this.tradeMode === 'sell');
        }

        // Render items list
        this.renderTradingItems();

        // Render transaction panel
        this.renderTransactionPanel();
    }

    /**
   * Render items list (merchant inventory or player inventory)
   */
    renderTradingItems() {
        const itemsListEl = document.getElementById('tradingItemsList');
        if (!itemsListEl) {
            return;
        }

        const character = window.gameState?.get('character');
        if (!character) {
            return;
        }

        const items = this.tradeMode === 'buy' ? this.merchantInventory : (character.inventory || []);

        if (items.length === 0) {
            itemsListEl.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p>No items available</p>
        </div>
      `;
            return;
        }

        let html = '';
        items.forEach((item, index) => {
            const isSelected = this.selectedItem?.id === item.id;
            const price = this.tradeMode === 'buy'
                ? this.merchantManager.calculateBuyPrice(item, character, this.currentMerchant)
                : this.merchantManager.calculateSellPrice(item, character, this.currentMerchant);

            const stockText = this.tradeMode === 'buy' && item.stock !== undefined
                ? `Stock: ${item.stock}`
                : (item.quantity > 1 ? `Owned: ${item.quantity}` : '');

            html += `
        <div class="trading-item ${isSelected ? 'selected' : ''}" data-item-index="${index}">
          <div class="trading-item-icon">${this.getItemIcon(item.type)}</div>
          <div class="trading-item-details">
            <div class="trading-item-name">${item.name}</div>
            <div class="trading-item-description">${item.description || ''}</div>
            <div class="trading-item-stats">
              ${item.weight ? `<span class="trading-item-weight">⚖️ ${item.weight} lb</span>` : ''}
              ${item.rarity ? `<span class="item-rarity ${item.rarity}">${item.rarity}</span>` : ''}
            </div>
          </div>
          <div class="trading-item-price-info">
            <div class="trading-item-price">${price} gp</div>
            ${stockText ? `<div class="trading-item-stock">${stockText}</div>` : ''}
          </div>
        </div>
      `;
        });

        itemsListEl.innerHTML = html;

        // Add click handlers
        itemsListEl.querySelectorAll('.trading-item').forEach(itemEl => {
            itemEl.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.itemIndex);
                const item = items[index];
                this.selectItem(item);
            });
        });
    }

    /**
   * Render transaction panel (selected item + quantity + total)
   */
    renderTransactionPanel() {
        const selectedItemEl = document.getElementById('selectedItemDisplay');
        const qtyInput = document.getElementById('qtyInput');
        const totalPriceEl = document.getElementById('totalPrice');
        const tradeBtnEl = document.getElementById('executeTrade');

        const character = window.gameState?.get('character');
        if (!character) {
            return;
        }

        // Update selected item display
        if (!this.selectedItem) {
            if (selectedItemEl) {
                selectedItemEl.innerHTML = '<div class="no-selection">Select an item to trade</div>';
            }
            if (qtyInput) {
                qtyInput.disabled = true;
            }
            if (tradeBtnEl) {
                tradeBtnEl.disabled = true;
            }
            if (totalPriceEl) {
                totalPriceEl.textContent = '0 gp';
            }
            return;
        }

        // Calculate prices
        const unitPrice = this.tradeMode === 'buy'
            ? this.merchantManager.calculateBuyPrice(this.selectedItem, character)
            : this.merchantManager.calculateSellPrice(this.selectedItem, character);
        const totalPrice = unitPrice * this.tradeQuantity;

        // Update selected item display
        if (selectedItemEl) {
            selectedItemEl.innerHTML = `
        <div class="selected-item-header">
          <div class="icon">${this.getItemIcon(this.selectedItem.type)}</div>
          <div class="selected-item-info">
            <h4>${this.selectedItem.name}</h4>
            <p>${this.selectedItem.description || ''}</p>
          </div>
        </div>
        <div class="selected-item-details">
          <div class="detail-row">
            <span class="label">Unit Price:</span>
            <span class="value">${unitPrice} gp</span>
          </div>
          ${this.selectedItem.weight ? `
            <div class="detail-row">
              <span class="label">Weight:</span>
              <span class="value">${this.selectedItem.weight} lb</span>
            </div>
          ` : ''}
          ${this.selectedItem.rarity ? `
            <div class="detail-row">
              <span class="label">Rarity:</span>
              <span class="value item-rarity ${this.selectedItem.rarity}">${this.selectedItem.rarity}</span>
            </div>
          ` : ''}
        </div>
      `;
        }

        // Update quantity input
        if (qtyInput) {
            qtyInput.disabled = false;
            qtyInput.value = this.tradeQuantity;
            qtyInput.max = this.tradeMode === 'buy'
                ? (this.selectedItem.stock || 99)
                : (this.selectedItem.quantity || 1);
        }

        // Update total price
        if (totalPriceEl) {
            totalPriceEl.textContent = `${totalPrice} gp`;
        }

        // Update trade button
        if (tradeBtnEl) {
            const canAfford = this.tradeMode === 'buy'
                ? character.gold >= totalPrice
                : true;
            const hasStock = this.tradeMode === 'buy'
                ? (this.selectedItem.stock || 0) >= this.tradeQuantity
                : (this.selectedItem.quantity || 0) >= this.tradeQuantity;

            tradeBtnEl.disabled = !canAfford || !hasStock;
            tradeBtnEl.textContent = this.tradeMode === 'buy' ? 'BUY' : 'SELL';
            tradeBtnEl.className = `trade-btn${  this.tradeMode === 'sell' ? ' sell-mode' : ''}`;

            if (!canAfford) {
                tradeBtnEl.title = 'Not enough gold';
            } else if (!hasStock) {
                tradeBtnEl.title = this.tradeMode === 'buy' ? 'Out of stock' : 'Not enough items';
            } else {
                tradeBtnEl.title = '';
            }
        }

        // Update pricing hint (relation tier + Influence skill)
        const chaHintEl = document.getElementById('chaHint');
        if (chaHintEl) {
            const relationManager = window.game?.relationManager;
            if (relationManager && this.currentMerchant) {
                const summary = relationManager.getPricingSummary(this.currentMerchant, character);
                chaHintEl.innerHTML = `<span style="color:${relationManager.getRelation(this.currentMerchant).color}">${summary.tierLabel}</span>: ${summary.tierEffect} | Influence: <span class="cha-bonus">${summary.influenceEffect}</span>`;
            } else {
                const influenceBonus = character.getSkillBonus ? character.getSkillBonus('influence') : 0;
                const influencePercent = Math.abs(influenceBonus);
                const direction = this.tradeMode === 'buy' ? 'discount' : 'bonus';
                chaHintEl.innerHTML = `Your Influence gives you a <span class="cha-bonus">${influencePercent}% ${direction}</span> on prices`;
            }
        }
    }

    /**
   * Switch between buy and sell modes
   * @param {string} mode - 'buy' or 'sell'
   */
    switchTradeMode(mode) {
        this.tradeMode = mode;
        this.selectedItem = null;
        this.tradeQuantity = 1;
        this.renderTradingView();
    }

    /**
   * Select an item for trading
   * @param {Object} item - Item data
   */
    selectItem(item) {
        this.selectedItem = item;
        this.tradeQuantity = 1;
        this.renderTradingView();
    }

    /**
   * Change quantity by delta
   * @param {number} delta - Amount to change (-1 or +1)
   */
    changeQuantity(delta) {
        if (!this.selectedItem) {
            return;
        }

        const maxQty = this.tradeMode === 'buy'
            ? (this.selectedItem.stock || 99)
            : (this.selectedItem.quantity || 1);

        this.tradeQuantity = Math.max(1, Math.min(maxQty, this.tradeQuantity + delta));
        this.renderTransactionPanel();
    }

    /**
   * Set quantity to specific value
   * @param {number} qty - Quantity value
   */
    setQuantity(qty) {
        if (!this.selectedItem) {
            return;
        }

        const maxQty = this.tradeMode === 'buy'
            ? (this.selectedItem.stock || 99)
            : (this.selectedItem.quantity || 1);

        this.tradeQuantity = Math.max(1, Math.min(maxQty, qty));
        this.renderTransactionPanel();
    }

    /**
   * Execute the trade (buy or sell)
   */
    executeTrade() {
        if (!this.selectedItem || !this.merchantManager) {
            return;
        }

        const character = window.gameState?.get('character');
        if (!character) {
            return;
        }

        try {
            let result;
            if (this.tradeMode === 'buy') {
                result = this.merchantManager.buyItem(this.selectedItem, character, this.tradeQuantity, this.currentMerchant);
            } else {
                result = this.merchantManager.sellItem(this.selectedItem, character, this.tradeQuantity, this.currentMerchant);
            }

            if (result.success) {
                // Add message to log
                const action = this.tradeMode === 'buy' ? 'Bought' : 'Sold';
                const message = `${action} ${this.tradeQuantity}x ${this.selectedItem.name} for ${result.totalCost} gp`;
                window.gameState?.addMessage(message, 'success');

                // Update merchant inventory stock
                if (this.tradeMode === 'buy' && this.selectedItem.stock !== undefined) {
                    this.selectedItem.stock -= this.tradeQuantity;
                }

                // Reset selection
                this.selectedItem = null;
                this.tradeQuantity = 1;

                // Re-render view
                this.renderTradingView();

                // Update HUD
                if (window.game?.updateHUD) {
                    window.game.updateHUD();
                }
            } else {
                // Show error message
                window.gameState?.addMessage(result.error || 'Trade failed', 'combat');
            }
        } catch (error) {
            console.error('Trade failed:', error);
            window.gameState?.addMessage(`Trade failed: ${  error.message}`, 'combat');
        }
    }

    /**
   * Close trading modal
   */
    closeTradingModal() {
        const modal = document.getElementById('tradingModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentMerchant = null;
        this.merchantInventory = [];
        this.selectedItem = null;
    }

    /**
   * Get contextual skill challenges for an NPC
   * @param {Object} npc - NPC data
   * @returns {Array<Object>} Available challenges
   */
    getContextualSkillChallenges(npc) {
        if (!window.skillChallengeManager || !window.skillChallengeManager.terrainChallengesData) {
            return [];
        }

        const allChallenges = window.skillChallengeManager.terrainChallengesData.challenges || {};
        const availableChallenges = [];

        // Map NPC roles to appropriate challenge types
        const roleChallengeMap = {
            'merchant':   ['market_haggle', 'appraise_goods', 'detect_lie'],
            'blacksmith': ['identify_item_quality', 'craft_assistance'],
            'innkeeper':  ['gather_rumors', 'detect_lie'],
            'leader':     ['intimidate_npc', 'negotiate', 'persuade_npc'],
            'guard':      ['intimidate_npc', 'detect_lie', 'gather_information']
        };

        const possibleChallengeIds = roleChallengeMap[npc.role] || [];

        // Find challenges that match and player can attempt
        for (const challengeId of possibleChallengeIds) {
            const challenge = allChallenges[challengeId];
            if (challenge && window.skillChallengeManager.canAttemptChallenge(challengeId)) {
                availableChallenges.push(challenge);
            }
        }

        return availableChallenges;
    }

    /**
   * Show skill challenge options to player
   * @param {Object} npc - NPC data
   * @param {HTMLElement} textEl - Dialogue text element
   * @param {HTMLElement} optionsEl - Dialogue options element
   */
    showSkillChallengeOptions(npc, textEl, optionsEl) {
        const challenges = this.getContextualSkillChallenges(npc);

        if (challenges.length === 0) {
            textEl.textContent = "I don't have any challenges for you right now. Perhaps come back later?";
            return;
        }

        textEl.textContent = npc.dialogue.skillChallengeOffer || 'Care to test your skills? I have something in mind...';

        let optionsHTML = '<div class="skill-challenge-list">';
        for (const challenge of challenges) {
            const difficultyStars = this.getChallengeDifficultyStars(challenge);
            optionsHTML += `
        <button class="dialogue-option skill-challenge-offer" data-challenge-id="${challenge.id}">
          ${difficultyStars} ${challenge.name}
        </button>
      `;
        }
        optionsHTML += `
      <button class="dialogue-option" data-action="back">
        ← Back
      </button>
    `;
        optionsHTML += '</div>';

        optionsEl.innerHTML = optionsHTML;

        // Add event listeners
        optionsEl.querySelectorAll('.skill-challenge-offer').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.startSkillChallenge(e.target.dataset.challengeId, npc);
            });
        });

        // Back button
        optionsEl.querySelector('[data-action="back"]')?.addEventListener('click', () => {
            this.showNPCDialogue(npc);
        });
    }

    /**
   * Start a skill challenge from NPC dialogue
   * @param {string} challengeId - Challenge ID
   * @param {Object} npc - NPC data
   */
    async startSkillChallenge(challengeId, npc) {
        if (!window.skillChallengeManager || !window.game) {
            console.error('Skill challenge system not initialized');
            return;
        }

        const challenge = window.skillChallengeManager.terrainChallengesData?.challenges?.[challengeId];
        if (!challenge) {
            console.error(`Challenge ${challengeId} not found`);
            return;
        }

        this.closeNPCDialogue();

        const character = window.gameState?.get('character');
        if (!character) return;

        window.skillChallengeManager.recordChallengeAttempt(challengeId);

        // Relation-aware DC
        const relationManager = window.game?.relationManager;
        const relation = relationManager?.getRelation(npc);
        const tierConfig = relationManager?.config?.intel?.dcModifierByTier || {};
        const tierMod = tierConfig[relation?.tier?.id || 'neutral'] ?? 0;

        const effectiveType = challenge.type === 'contested' ? 'single' : challenge.type;
        const skillField = challenge.type === 'contested' ? challenge.playerSkill : challenge.skill;
        const baseDC = challenge.baseDC ?? challenge.dc ?? challenge.stages?.[0]?.baseDC ?? 14;
        const adjustedDC = Math.min(25, baseDC + tierMod);

        const config = {
            title: challenge.name,
            description: challenge.description,
            skill: skillField,
            dc: adjustedDC
        };

        let result;
        if (effectiveType === 'single') {
            result = await window.game.promptSkillCheck(config, challenge, null);
        } else if (effectiveType === 'sequential') {
            await window.game.player.handleSequentialSkillChallenge(challenge);
            return;
        } else if (effectiveType === 'choice') {
            await window.game.player.handleChoiceSkillChallenge(challenge, adjustedDC);
            return;
        }

        if (result?.attempted) {
            this._applyNPCChallengeOutcome(challengeId, npc, challenge, result.success, relation);
            window.questManager?.onSkillChallengeCompleted(challengeId, result);
        }
    }

    _applyNPCChallengeOutcome(challengeId, npc, challenge, success, relation) {
        const outcomeBlock = success ? challenge.onSuccess : challenge.onFailure;
        if (!outcomeBlock) return;

        // Delegate XP and gold to the existing consequence system
        const character = window.gameState?.get('character');
        if (character && window.skillChallengeManager) {
            window.skillChallengeManager.applyConsequences(
                character, challenge, outcomeBlock,
                { success, rollTotal: 0, naturalRoll: 0, dc: 0, succeeded: success }
            );
        }

        // Relation change via named event key
        if (outcomeBlock.relationChange && window.game?.relationManager && npc) {
            window.game.relationManager.applyRelationEvent(npc, outcomeBlock.relationChange);
        }

        // NPC flag for downstream dialogue/pricing
        if (outcomeBlock.npcFlag && npc) {
            if (!npc.passiveFlags) npc.passiveFlags = {};
            npc.passiveFlags[outcomeBlock.npcFlag] = true;
        }

        // Intel reveal
        if (outcomeBlock.revealIntel && npc) {
            npc.intelStatus = 'available';
        }

        const msg = outcomeBlock.message || (success ? 'You succeeded.' : 'You failed.');
        window.gameState?.addMessage(`${npc?.name ?? 'NPC'}: ${msg}`, success ? 'success' : 'info');
    }

    /**
   * Get difficulty stars for challenge
   * @param {Object} challenge - Challenge template
   * @returns {string} Star rating
   */
    getChallengeDifficultyStars(challenge) {
        const dc = challenge.baseDC || challenge.stages?.[0]?.baseDC || 10;
        if (dc >= 20) {
            return '⭐⭐⭐';
        } // Hard
        if (dc >= 15) {
            return '⭐⭐';
        } // Medium
        return '⭐'; // Easy
    }

    /**
   * Get icon for item type
   * @param {string} type - Item type
   * @returns {string} Emoji icon
   */
    getItemIcon(type) {
        const icons = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'consumable': '🧪',
            'misc': '📦',
            'tool': '🔧',
            'shield': '🛡️'
        };
        return icons[type] || '📦';
    }

}

export default SettlementUI;
