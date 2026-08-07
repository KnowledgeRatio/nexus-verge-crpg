import { gameState } from '../core/GameState.js';
import { filterByCampaign } from '../utils/campaignFilter.js';

/**
 * LevelUpManager - Handles all level-up logic, choices, and modal interactions
 *
 * Responsibilities:
 * - Load level progression data and content (abilities, spells, traits)
 * - Determine available choices for character's class/level
 * - Query and filter content based on class/level/filters
 * - Validate player selections
 * - Manage level-up modal state and rendering
 * - Apply final selections to character
 */
export default class LevelUpManager {
    constructor() {
        this.progressionData = null;
        this.abilitiesData = null;
        this.spellsData = null;
        this.traitsData = null;
        this.practicesData = null;
        this.specializationsData = null;

        // Current level-up state
        this.currentSelections = {
            asiChoice: null,
            abilities: [],
            spells: [],
            traits: [],
            practices: [],
            specialization: null,
            tactics: [],
            vows: []
        };

        this.availableChoices = [];
        this.modal = null;
    }

    /**
   * Initialize the level-up manager by loading all required data files
   */
    async initialize() {
        try {
            // Load level progression config
            const progressionResponse = await fetch('data/levelProgression.json');
            this.progressionData = await progressionResponse.json();

            // Load abilities data
            const abilitiesResponse = await fetch('data/abilities.json');
            this.abilitiesData = await abilitiesResponse.json();

            // Load spells data
            const spellsResponse = await fetch('data/spells.json');
            this.spellsData = await spellsResponse.json();

            // Load traits data
            const traitsResponse = await fetch('data/traits.json');
            this.traitsData = await traitsResponse.json();

            // Load practices data
            try {
                const practicesResponse = await fetch('data/practices.json');
                this.practicesData = await practicesResponse.json();
            } catch (e) {
                console.warn('No practices.json found, skipping:', e);
                this.practicesData = { practices: [] };
            }

            // Load specializations data
            try {
                const specializationsResponse = await fetch('data/specializations.json');
                this.specializationsData = await specializationsResponse.json();
            } catch (e) {
                console.warn('No specializations.json found, skipping:', e);
                this.specializationsData = { specializations: {} };
            }

            // Get modal reference
            this.modal = document.getElementById('levelUpModal');

            console.log('✅ LevelUpManager initialized');
        } catch (error) {
            console.error('Failed to initialize LevelUpManager:', error);
        }
    }

    /**
   * Get auto-granted features from progression data for display
   */
    getProgressionNewFeatures(classId, level) {
        if (!this.progressionData) {
            return [];
        }
        const classProgression = this.progressionData.progressionByClass[classId];
        if (!classProgression || !classProgression[level]) {
            return [];
        }
        return classProgression[level].newFeatures || [];
    }

    /**
   * Get available choices for a class at a specific level
   * @param {string} classId - The calling/class ID
   * @param {number} level - The target level
   * @returns {Array} Array of choice definitions
   */
    getAvailableChoices(classId, level) {
        if (!this.progressionData) {
            console.error('Progression data not loaded');
            return [];
        }

        const classProgression = this.progressionData.progressionByClass[classId];
        if (!classProgression) {
            console.warn(`No progression data for class: ${classId}`);
            return [];
        }

        const levelProgression = classProgression[level];
        if (!levelProgression) {
            // Use default progression if no specific level defined
            return this.progressionData.defaultProgression.choices || [];
        }

        return levelProgression.choices || [];
    }

    /**
   * Get abilities available for a calling at a specific level
   * @param {string} classId - The calling/class ID
   * @param {number} level - The character level
   * @param {object} filter - Optional additional filters
   * @returns {Array} Filtered abilities
   */
    getFilteredAbilities(classId, level, filter = {}) {
        if (!this.abilitiesData) {
            return [];
        }

        // Get abilities for this calling
        const callingAbilities = this.abilitiesData.abilities[classId] || [];

        // Filter by campaign
        const campaignId = gameState.get('worldConfig')?.campaignId || 'nexus-verge';
        let filteredAbilities = filterByCampaign(callingAbilities, campaignId);

        // Filter by level requirement
        filteredAbilities = filteredAbilities.filter(ability => {
            if (ability.levelRequired && ability.levelRequired > level) {
                return false;
            }
            return true;
        });

        // Apply additional filters from choice definition
        if (filter.levelRequired !== undefined) {
            filteredAbilities = filteredAbilities.filter(a => a.levelRequired === filter.levelRequired);
        }

        return filteredAbilities;
    }

    /**
   * Get spells available for a calling
   * @param {string} classId - The calling/class ID
   * @param {object} filter - Optional filters (e.g., { level: 0 } for cantrips)
   * @returns {Array} Filtered spells
   */
    getFilteredSpells(classId, filter = {}) {
        if (!this.spellsData) {
            return [];
        }

        const spellLists = this.spellsData.spellLists || {};
        const callingSpellIds = spellLists[classId];

        if (!callingSpellIds) {
            return [];
        }

        // Get campaign ID for filtering
        const campaignId = gameState.get('worldConfig')?.campaignId || 'nexus-verge';

        let availableSpells = [];

        // Filter by spell level if specified
        if (filter.level !== undefined) {
            const spellLevel = filter.level === 0 ? 'cantrips' : `level${filter.level}`;
            const spellIds = callingSpellIds[spellLevel] || [];
            const spells = this.spellsData.spells[spellLevel] || [];

            availableSpells = spells.filter(spell => spellIds.includes(spell.id));
        } else {
            // Get all spells for this calling
            ['cantrips', 'level1', 'level2'].forEach(spellLevel => {
                const spellIds = callingSpellIds[spellLevel] || [];
                const spells = this.spellsData.spells[spellLevel] || [];
                const levelSpells = spells.filter(spell => spellIds.includes(spell.id));
                availableSpells.push(...levelSpells);
            });
        }

        // Apply campaign filtering
        availableSpells = filterByCampaign(availableSpells, campaignId);

        return availableSpells;
    }

    /**
   * Get traits for a calling (optionally filtered by category)
   * @param {string} classId - The calling/class ID
   * @param {object} filter - Optional filters (e.g., { category: 'fightingStyle' })
   * @returns {Array} Filtered traits
   */
    getFilteredTraits(classId, filter = {}) {
        if (!this.traitsData) {
            return [];
        }

        let traits = this.traitsData.traits || [];

        // Filter by campaign
        const campaignId = gameState.get('worldConfig')?.campaignId || 'nexus-verge';
        traits = filterByCampaign(traits, campaignId);

        // Filter by calling
        traits = traits.filter(trait => trait.calling === classId);

        // Filter by category if specified
        if (filter.category) {
            traits = traits.filter(trait => trait.category === filter.category);
        }

        // Filter by specialization/tier if specified (e.g. the level-3 Oath aura choice)
        if (filter.specialization) {
            traits = traits.filter(trait => trait.specialization === filter.specialization);
        }
        if (filter.tier !== undefined) {
            traits = traits.filter(trait => trait.tier === filter.tier);
        }

        return traits;
    }

    /**
   * Open the level-up modal and populate with character data
   * @param {object} character - The character object
   */
    openLevelUpModal(character) {
        if (!character.pendingLevelUp) {
            console.warn('No pending level-up for character');
            return;
        }

        // Reset selections
        // NOTE: `tactics: []` must be present here — toggleChoiceSelection's checkbox branch
        // does `this.currentSelections.tactics.push(...)` with no optional chaining. Omitting
        // this key (as the pre-rename code did for `maneuvers`) throws the instant a player
        // checks a level-3 tactic box.
        this.currentSelections = {
            asiChoice: null,
            abilities: [],
            spells: [],
            traits: [],
            practices: [],
            specialization: null,
            tactics: [],
            vows: []
        };

        // Get available choices for this level
        this.availableChoices = this.getAvailableChoices(
            character.class.id,
            character.pendingLevelUp.newLevel
        );

        // Render modal content
        this.renderLevelUpModal(character);

        // Show modal
        this.modal.classList.add('active');

        // Validate initial state (disable confirm button)
        this.validateAndUpdateUI();
    }

    /**
   * Render the level-up modal content
   * @param {object} character - The character object
   */
    renderLevelUpModal(character) {
        const pending = character.pendingLevelUp;

        // Update level summary
        document.getElementById('newLevel').textContent = pending.newLevel;
        document.getElementById('oldHP').textContent = pending.oldHP;
        document.getElementById('newHP').textContent = pending.newHP;
        document.getElementById('hpGain').textContent = pending.hpGain;

        // Show proficiency bonus change if applicable
        const profBonusChange = document.getElementById('profBonusChange');
        if (pending.profBonusChanged) {
            document.getElementById('oldProfBonus').textContent = `+${pending.oldProfBonus}`;
            document.getElementById('newProfBonus').textContent = `+${pending.newProfBonus}`;
            profBonusChange.style.display = 'flex';
        } else {
            profBonusChange.style.display = 'none';
        }

        // Merge new features from class data AND progression data
        const classFeatures = pending.newFeatures || [];
        const progressionFeatures = this.getProgressionNewFeatures(character.class.id, pending.newLevel);
        const allNewFeatures = [...classFeatures, ...progressionFeatures];
        this.renderNewFeatures(allNewFeatures);

        // Render ASI selection
        this.renderASISelection(character);

        // Render dynamic choice sections
        this.renderChoiceSections(character);
    }

    /**
   * Render new class features
   * @param {Array} newFeatures - Array of new features
   */
    renderNewFeatures(newFeatures) {
        const section = document.getElementById('newFeaturesSection');
        const list = document.getElementById('newFeaturesList');

        if (!newFeatures || newFeatures.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        list.innerHTML = newFeatures.map(feature => `
      <div class="feature-item">
        <div class="feature-name">${feature.name}</div>
        ${feature.description ? `<div class="feature-description">${feature.description}</div>` : ''}
      </div>
    `).join('');
    }

    /**
   * Render ASI selection buttons
   * @param {object} character - The character object
   */
    renderASISelection(character) {
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        abilities.forEach(ability => {
            const value = character.abilities[ability];
            const btn = document.querySelector(`.ability-score-btn[data-ability="${ability}"]`);
            if (btn) {
                btn.querySelector('.ability-value').textContent = value;
                btn.querySelector('.ability-increase').textContent = `+1 → ${value + 1}`;
                btn.classList.remove('selected');
            }
        });
    }

    /**
   * Get practices available for a character (filtered by campaign and calling restrictions)
   * @param {string} classId - The calling/class ID
   * @param {object} filter - Optional filters
   * @returns {Array} Filtered practices
   */
    getFilteredPractices(classId, filter = {}) {
        if (!this.practicesData) {
            return [];
        }

        let practices = this.practicesData.practices || [];

        // Filter by campaign
        const campaignId = gameState.get('worldConfig')?.campaignId || 'nexus-verge';
        practices = filterByCampaign(practices, campaignId);

        // Filter by calling restriction (null = available to all)
        practices = practices.filter(p => !p.callings || p.callings.includes(classId));

        // Exclude practices already known at their max rank. Rank is just occurrence
        // count in character.practices (a flat string[]) — no separate rank field.
        // maxRank defaults to 1, so Forgecraft/Hearthcraft (no maxRank) keep today's
        // exclude-if-known behavior unchanged.
        const character = gameState.get('character');
        const knownPractices = character?.practices || [];
        practices = practices.filter(p => {
            const maxRank = p.maxRank || 1;
            const currentRank = knownPractices.filter(id => id === p.id).length;
            return currentRank < maxRank;
        });

        return practices;
    }

    /**
   * Render dynamic choice sections (abilities, spells, traits, practices, specializations)
   * @param {object} character - The character object
   */
    renderChoiceSections(character) {
        this.availableChoices.forEach(choice => {
            switch (choice.type) {
                case 'ability':
                    this.renderAbilityChoice(character, choice);
                    break;
                case 'spell':
                    this.renderSpellChoice(character, choice);
                    break;
                case 'trait':
                    this.renderTraitChoice(character, choice);
                    break;
                case 'practice':
                    this.renderPracticeChoice(character, choice);
                    break;
                case 'specialization':
                    this.renderSpecializationChoice(character, choice);
                    break;
                case 'tactic':
                    this.renderTacticChoice(character, choice);
                    break;
                case 'vow':
                    this.renderVowChoice(character, choice);
                    break;
            }
        });

        // Hide sections with no choices
        if (this.availableChoices.length === 0 || !this.availableChoices.some(c => c.type === 'ability')) {
            document.getElementById('abilityChoiceSection').style.display = 'none';
        }
        if (this.availableChoices.length === 0 || !this.availableChoices.some(c => c.type === 'spell')) {
            document.getElementById('spellChoiceSection').style.display = 'none';
        }
        if (this.availableChoices.length === 0 || !this.availableChoices.some(c => c.type === 'trait')) {
            document.getElementById('traitChoiceSection').style.display = 'none';
        }
        if (this.availableChoices.length === 0 || !this.availableChoices.some(c => c.type === 'practice')) {
            document.getElementById('practiceChoiceSection').style.display = 'none';
        }
        if (this.availableChoices.length === 0 || !this.availableChoices.some(c => c.type === 'specialization')) {
            document.getElementById('specializationSection').style.display = 'none';
        }
        if (this.availableChoices.length === 0 || !this.availableChoices.some(c => c.type === 'vow')) {
            const vowSection = document.getElementById('vowChoiceSection');
            if (vowSection) {
                vowSection.style.display = 'none';
            }
        }
        // Tactic section: shown immediately if the character already has the required
        // persisted specialization (levels 7/9 growth choices — no specialization choice
        // appears that level, so there's nothing to click to reveal it). Otherwise hidden
        // until the player picks the matching specialization in this same modal (level 3 —
        // toggleChoiceSelection's specialization branch handles that reveal).
        const tacticSection = document.getElementById('tacticChoiceSection');
        if (tacticSection) {
            const tacticChoice = this.availableChoices.find(c => c.type === 'tactic');
            const alreadyHasSpec = !!tacticChoice && character.specialization === (tacticChoice.requiresSpecialization || 'exemplar');
            tacticSection.style.display = alreadyHasSpec ? 'block' : 'none';
        }
        // Trait section: same specialization gate as tactic, for choices that declare
        // requiresSpecialization (currently only the level-3 Oath Aura pick). Without this,
        // renderTraitChoice's unconditional 'block' above would show the Aura choice to
        // Exemplar characters too, and its required:true would block their confirm button.
        // Hidden by default; toggleChoiceSelection's specialization branch reveals it on pick.
        const traitSection = document.getElementById('traitChoiceSection');
        if (traitSection) {
            const traitChoice = this.availableChoices.find(c => c.type === 'trait' && c.requiresSpecialization);
            if (traitChoice) {
                const alreadyHasSpec = character.specialization === traitChoice.requiresSpecialization;
                traitSection.style.display = alreadyHasSpec ? 'block' : 'none';
            }
        }
        // Vow section: same gate, but no specialization choice occurs at these levels
        // (5/7/9 — spec was already chosen at level 3), so this is the only gate needed.
        const vowSection = document.getElementById('vowChoiceSection');
        if (vowSection) {
            const vowChoice = this.availableChoices.find(c => c.type === 'vow' && c.requiresSpecialization);
            if (vowChoice) {
                const alreadyHasSpec = character.specialization === vowChoice.requiresSpecialization;
                vowSection.style.display = alreadyHasSpec ? 'block' : 'none';
            }
        }
    }

    /**
   * Render ability choice section
   */
    renderAbilityChoice(character, choice) {
        const section = document.getElementById('abilityChoiceSection');
        const list = document.getElementById('abilityChoiceList');
        const countSpan = document.getElementById('abilityChoiceCount');

        section.style.display = 'block';
        countSpan.textContent = `Choose ${choice.count}${choice.required ? ' - Required' : ''}`;

        const abilities = this.getFilteredAbilities(character.class.id, character.pendingLevelUp.newLevel, choice.filter);

        list.innerHTML = abilities.map(ability => `
      <div class="choice-item" data-choice-type="ability" data-choice-id="${ability.id}">
        <div class="choice-item-header">
          <input type="checkbox" class="choice-checkbox">
          <span class="choice-name">${ability.name}</span>
        </div>
        <div class="choice-description">${ability.description}</div>
      </div>
    `).join('');
    }

    /**
   * Render spell choice section
   */
    renderSpellChoice(character, choice) {
        const section = document.getElementById('spellChoiceSection');
        const list = document.getElementById('spellChoiceList');
        const countSpan = document.getElementById('spellChoiceCount');

        section.style.display = 'block';
        countSpan.textContent = `Choose ${choice.count}${choice.required ? ' - Required' : ''}`;

        const spells = this.getFilteredSpells(character.class.id, choice.filter);

        list.innerHTML = spells.map(spell => `
      <div class="choice-item" data-choice-type="spell" data-choice-id="${spell.id}">
        <div class="choice-item-header">
          <input type="checkbox" class="choice-checkbox">
          <span class="choice-name">${spell.name}</span>
          <span class="spell-level">${spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</span>
        </div>
        <div class="choice-description">${spell.description}</div>
      </div>
    `).join('');
    }

    /**
   * Render trait choice section
   */
    renderTraitChoice(character, choice) {
        const section = document.getElementById('traitChoiceSection');
        const list = document.getElementById('traitChoiceList');
        const countSpan = document.getElementById('traitChoiceCount');

        section.style.display = 'block';
        countSpan.textContent = `Choose ${choice.count}${choice.required ? ' - Required' : ''}`;

        const traits = this.getFilteredTraits(character.class.id, choice.filter);

        list.innerHTML = traits.map(trait => `
      <div class="choice-item" data-choice-type="trait" data-choice-id="${trait.id}">
        <div class="choice-item-header">
          <input type="${choice.count === 1 ? 'radio' : 'checkbox'}" name="trait" class="choice-${choice.count === 1 ? 'radio' : 'checkbox'}">
          <span class="choice-name">${trait.name}</span>
        </div>
        <div class="choice-description">${trait.description}</div>
      </div>
    `).join('');
    }

    /**
   * Render vow choice section (Oath only — levels 5/7/9). Candidate pool merges
   * abilities.dedication (specialization: 'oath', tags includes 'vow') and traits (same
   * filter, e.g. Conviction), excluding vows the character already knows.
   */
    renderVowChoice(character, choice) {
        const section = document.getElementById('vowChoiceSection');
        const list = document.getElementById('vowChoiceList');
        const countSpan = document.getElementById('vowChoiceCount');
        if (!section || !list) {
            return;
        }

        section.style.display = 'block';
        countSpan.textContent = `Choose ${choice.count}${choice.required ? ' — Required' : ' (optional)'}`;

        const abilityPool = (this.abilitiesData?.abilities?.dedication || []).filter(ab =>
            ab.specialization === 'oath' && ab.tags?.includes('vow')
        );
        const traitPool = (this.traitsData?.traits || []).filter(t =>
            t.specialization === 'oath' && t.tags?.includes('vow')
        );
        const vows = [...abilityPool, ...traitPool].filter(v => !character.knownVows?.includes(v.id));

        list.innerHTML = vows.map(v => `
      <div class="choice-item" data-choice-type="vow" data-choice-id="${v.id}">
        <div class="choice-item-header">
          <input type="checkbox" class="choice-checkbox">
          <span class="choice-name">${v.name}</span>
        </div>
        <div class="choice-description">${v.description}</div>
      </div>
    `).join('');
    }

    /**
   * Render practice choice section
   */
    renderPracticeChoice(character, choice) {
        const section = document.getElementById('practiceChoiceSection');
        const list = document.getElementById('practiceChoiceList');
        const countSpan = document.getElementById('practiceChoiceCount');

        section.style.display = 'block';
        countSpan.textContent = `Choose ${choice.count}${choice.required ? ' - Required' : ''}`;

        const practices = this.getFilteredPractices(character.class.id);
        const knownPractices = character.practices || [];

        list.innerHTML = practices.map(practice => {
            const currentRank = knownPractices.filter(id => id === practice.id).length;
            const displayName = currentRank > 0 ? `${practice.name} (Rank ${currentRank + 1})` : practice.name;
            return `
      <div class="choice-item practice-choice" data-choice-type="practice" data-choice-id="${practice.id}">
        <div class="choice-item-header">
          <input type="${choice.count === 1 ? 'radio' : 'checkbox'}" name="practice" class="choice-${choice.count === 1 ? 'radio' : 'checkbox'}">
          <span class="choice-name">${displayName}</span>
        </div>
        <div class="choice-description">${practice.description}</div>
      </div>
    `;
        }).join('');
    }

    /**
   * Render specialization choice section
   */
    renderSpecializationChoice(character, choice) {
        const section = document.getElementById('specializationSection');
        const list = document.getElementById('specializationList');

        section.style.display = 'block';
        section.querySelector('h3').innerHTML = `${choice.label || 'Choose Specialization'} <span class="required-badge">Required</span>`;

        // For now, options are just IDs - in future could fetch full specialization data
        list.innerHTML = choice.options.map(optionId => `
      <div class="choice-item specialization-choice" data-choice-type="specialization" data-choice-id="${optionId}">
        <div class="choice-item-header">
          <input type="radio" name="specialization" class="choice-radio">
          <span class="choice-name">${this.formatSpecializationName(optionId)}</span>
        </div>
        <div class="choice-description">${this.getSpecializationDescription(optionId)}</div>
      </div>
    `).join('');
    }

    /**
   * Render tactic choice section (Exemplar only — shown after spec selection, or
   * immediately at levels with no spec choice but a persisted Exemplar specialization)
   */
    renderTacticChoice(character, choice) {
        const section = document.getElementById('tacticChoiceSection');
        const list = document.getElementById('tacticChoiceList');
        const countSpan = document.getElementById('tacticChoiceCount');
        if (!section || !list) {
            return;
        }

        countSpan.textContent = `Choose ${choice.count}${choice.required ? ' — Required' : ' (optional)'}`;

        // Gather all Exemplar tactics from loaded abilities, excluding ones already known
        // (relevant at levels 7/9, where the character already knows tactics from level 3+)
        const allAbilities = this.abilitiesData?.abilities?.dedication || [];
        const tactics = allAbilities.filter(ab =>
            ab.specialization === 'exemplar' &&
            ab.tags?.includes('tactic') &&
            ab.levelRequired <= (character.pendingLevelUp?.newLevel || character.level) &&
            !character.knownTactics?.includes(ab.id)
        );

        list.innerHTML = tactics.map(t => `
      <div class="choice-item maneuver-choice" data-choice-type="tactic" data-choice-id="${t.id}">
        <div class="choice-item-header">
          <input type="checkbox" class="choice-checkbox">
          <span class="choice-name">${t.name}</span>
          <span class="maneuver-cost">1 Resolve</span>
        </div>
        <div class="choice-description">${t.description}</div>
      </div>
    `).join('');

    // Section visibility is controlled by renderChoiceSections/toggleChoiceSelection
    }

    /**
   * Format specialization ID to display name
   */
    formatSpecializationName(id) {
        return id.split(/(?=[A-Z])/).map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    /**
   * Get specialization description from data/specializations.json
   */
    getSpecializationDescription(id) {
        if (this.specializationsData) {
            // Support both flat array and calling-keyed object structures
            const allSpecs = Array.isArray(this.specializationsData.specializations)
                ? this.specializationsData.specializations
                : Object.values(this.specializationsData.specializations).flat();
            const spec = allSpecs.find(s => s.id === id);
            if (spec) return spec.description;
        }
        return 'A powerful specialization path';
    }

    /**
   * Handle ASI selection
   * @param {string} ability - The ability score chosen (str, dex, con, int, wis, cha)
   */
    selectASI(ability) {
        this.currentSelections.asiChoice = ability;
        this.validateAndUpdateUI();
    }

    /**
   * Toggle a choice selection (checkbox or radio)
   * @param {HTMLElement} choiceElement - The choice item element
   */
    toggleChoiceSelection(choiceElement) {
        const choiceType = choiceElement.dataset.choiceType;
        const choiceId = choiceElement.dataset.choiceId;
        const checkbox = choiceElement.querySelector('.choice-checkbox, .choice-radio');

        if (choiceType === 'specialization') {
            // Radio button - only one selection
            document.querySelectorAll('.specialization-choice').forEach(el => el.classList.remove('selected'));
            choiceElement.classList.add('selected');
            checkbox.checked = true;
            this.currentSelections.specialization = choiceId;

            // Show/hide tactic section depending on spec choice
            const maneuverSection = document.getElementById('tacticChoiceSection');
            const tacticChoice = this.availableChoices.find(c => c.type === 'tactic');
            if (maneuverSection && tacticChoice) {
                const shouldShow = choiceId === (tacticChoice.requiresSpecialization || 'exemplar');
                maneuverSection.style.display = shouldShow ? 'block' : 'none';
                if (!shouldShow) {
                    // Clear tactic selections if switching away from Exemplar
                    this.currentSelections.tactics = [];
                    document.querySelectorAll('.maneuver-choice').forEach(el => {
                        el.classList.remove('selected');
                        const cb = el.querySelector('.choice-checkbox');
                        if (cb) {
                            cb.checked = false;
                        }
                    });
                }
            }

            // Show/hide trait section depending on spec choice (e.g. Oath's level-3 Aura pick)
            const traitSection = document.getElementById('traitChoiceSection');
            const traitChoice = this.availableChoices.find(c => c.type === 'trait' && c.requiresSpecialization);
            if (traitSection && traitChoice) {
                const shouldShowTrait = choiceId === traitChoice.requiresSpecialization;
                traitSection.style.display = shouldShowTrait ? 'block' : 'none';
                if (!shouldShowTrait) {
                    // Clear trait selections if switching away from the specialization that requires them
                    this.currentSelections.traits = [];
                    traitSection.querySelectorAll('.choice-item').forEach(el => {
                        el.classList.remove('selected');
                        const cb = el.querySelector('.choice-checkbox, .choice-radio');
                        if (cb) {
                            cb.checked = false;
                        }
                    });
                }
            }
        } else {
            const maxCount = this.getMaxCountForChoiceType(choiceType);

            if (maxCount === 1) {
                // Radio - single selection, always replaces any prior pick in this group
                document.querySelectorAll(`.choice-item[data-choice-type="${choiceType}"]`).forEach(el => {
                    el.classList.remove('selected');
                    const cb = el.querySelector('.choice-checkbox, .choice-radio');
                    if (cb) {
                        cb.checked = false;
                    }
                });
                choiceElement.classList.add('selected');
                checkbox.checked = true;
                this.currentSelections[`${choiceType}s`] = [choiceId];
                this.validateAndUpdateUI();
                return;
            }

            // Checkbox - multiple selections possible
            const isSelected = choiceElement.classList.contains('selected');
            const currentCount = this.currentSelections[`${choiceType}s`]?.length || 0;

            if (isSelected) {
                // Deselect
                choiceElement.classList.remove('selected');
                checkbox.checked = false;
                const index = this.currentSelections[`${choiceType}s`].indexOf(choiceId);
                if (index > -1) {
                    this.currentSelections[`${choiceType}s`].splice(index, 1);
                }
            } else {
                // Select if not at max count
                if (currentCount < maxCount) {
                    choiceElement.classList.add('selected');
                    checkbox.checked = true;
                    this.currentSelections[`${choiceType}s`].push(choiceId);
                }
            }
        }

        this.validateAndUpdateUI();
    }

    /**
   * Get max count for a choice type
   */
    getMaxCountForChoiceType(choiceType) {
        const choice = this.availableChoices.find(c => c.type === choiceType);
        return choice ? choice.count : 0;
    }

    /**
   * Validate selections and update UI accordingly
   */
    validateAndUpdateUI() {
        const confirmBtn = document.getElementById('confirmLevelUpBtn');
        const hint = document.getElementById('levelUpHint');

        // Check ASI selection (always required)
        if (!this.currentSelections.asiChoice) {
            confirmBtn.disabled = true;
            hint.textContent = 'Select an ability score to increase';
            return;
        }

        // Check required choices
        for (const choice of this.availableChoices) {
            if (choice.required) {
                if (choice.type === 'specialization' && !this.currentSelections.specialization) {
                    confirmBtn.disabled = true;
                    hint.textContent = `Select a ${choice.label || 'specialization'}`;
                    return;
                }

                // Tactic choice: only required when the matching spec is selected in THIS
                // modal (level 3 — the only level where a specialization choice coexists
                // with a required tactic choice). At levels 7/9 the tactic choice is
                // required: false, so it never reaches this branch.
                if (choice.type === 'tactic') {
                    const specRequired = choice.requiresSpecialization;
                    if (specRequired && this.currentSelections.specialization === specRequired) {
                        const selected = this.currentSelections.tactics?.length || 0;
                        if (selected < choice.count) {
                            confirmBtn.disabled = true;
                            hint.textContent = `Choose ${choice.count} tactics (${selected}/${choice.count} selected)`;
                            return;
                        }
                    }
                    continue;
                }

                // Trait choice with requiresSpecialization (e.g. Oath's level-3 Aura pick):
                // same shape as the tactic case above — only required once the matching
                // specialization is actually selected in this modal.
                if (choice.type === 'trait' && choice.requiresSpecialization) {
                    if (this.currentSelections.specialization === choice.requiresSpecialization) {
                        const selected = this.currentSelections.traits?.length || 0;
                        if (selected < choice.count) {
                            confirmBtn.disabled = true;
                            hint.textContent = `Select ${choice.count} ${choice.label || 'trait'}(s)`;
                            return;
                        }
                    }
                    continue;
                }

                const selectedCount = this.currentSelections[`${choice.type}s`]?.length || 0;
                if (selectedCount < choice.count) {
                    confirmBtn.disabled = true;
                    hint.textContent = `Select ${choice.count} ${choice.type}(s)`;
                    return;
                }
            }
        }

        // All validations passed
        confirmBtn.disabled = false;
        hint.textContent = 'Ready to level up!';
    }

    /**
   * Confirm level-up and apply all selections to character.
   * When called without arguments, operates on the player character (existing behavior).
   * When called with a companion Character object, persists changes to party.companions instead.
   *
   * @param {Object|null} [targetCharacter=null] - Companion character object, or null for player
   */
    confirmLevelUp(targetCharacter = null) {
        const character = targetCharacter || gameState.get('character');

        if (!character.pendingLevelUp) {
            console.error('No pending level-up to confirm');
            return;
        }

        const newLevel = character.pendingLevelUp.newLevel;

        // Apply selections to character (existing logic, unchanged)
        character.applyLevelUpSelections(this.currentSelections);

        // --- Process autoGrantAbilities from specializationFeatures ---
        // When a specialization was chosen THIS level (level 3), currentSelections carries
        // it. At later levels with their own specializationFeatures entries (e.g. level 5's
        // Vanguard's Charge, or future exemplar/oath growth) there is no specialization
        // *choice* that level — currentSelections.specialization stays null — so fall back
        // to the character's already-persisted specialization.
        const specKey = this.currentSelections.specialization || character.specialization;
        if (specKey && this.progressionData) {
            const classProgression = this.progressionData.progressionByClass[character.class?.id];
            const levelData = classProgression?.[newLevel];
            const specFeatures = levelData?.specializationFeatures?.[specKey];
            const autoGrant = specFeatures?.autoGrantAbilities;

            if (Array.isArray(autoGrant) && autoGrant.length > 0) {
                if (!character.selectedAbilities) {
                    character.selectedAbilities = [];
                }
                for (const abilityId of autoGrant) {
                    if (!character.selectedAbilities.includes(abilityId)) {
                        character.selectedAbilities.push(abilityId);
                        console.log(`  ✨ Auto-granted ability: ${abilityId}`);
                    }
                }
            }

            const autoGrantTraits = specFeatures?.autoGrantTraits;

            if (Array.isArray(autoGrantTraits) && autoGrantTraits.length > 0) {
                if (!character.selectedTraits) {
                    character.selectedTraits = [];
                }
                for (const traitId of autoGrantTraits) {
                    if (!character.selectedTraits.includes(traitId)) {
                        character.selectedTraits.push(traitId);
                        console.log(`  ✨ Auto-granted trait: ${traitId}`);
                    }
                }
            }
        }

        // --- Process grantedResource from newFeatures ---
        // Any newFeatures entry with a grantedResource sub-object adds that resource to the character.
        // This works for any calling — reads id, formula, minimum, recharge from data.
        if (this.progressionData) {
            const classProgression = this.progressionData.progressionByClass[character.class?.id];
            const levelData = classProgression?.[newLevel];
            const newFeatures = levelData?.newFeatures || [];

            for (const feature of newFeatures) {
                const res = feature.grantedResource;
                if (!res || !res.id) {
                    continue;
                }

                // Evaluate formula: only + and identifier tokens (con, level, etc.)
                // Use the same context as formulaEvaluator
                const mods = character.abilityModifiers || {};
                const formulaCtx = {
                    level: character.level,
                    con: mods.con || 0,
                    str: mods.str || 0,
                    dex: mods.dex || 0,
                    int: mods.int || 0,
                    wis: mods.wis || 0,
                    cha: mods.cha || 0,
                    proficiency: character.proficiencyBonus || 2
                };

                let maxValue = 0;
                const formulaStr = res.formula || '0';
                // Substitute named tokens (longest first to avoid substring collisions)
                const tokenMap = [
                    ['proficiency', formulaCtx.proficiency],
                    ['level', formulaCtx.level],
                    ['conMod', formulaCtx.con],
                    ['con', formulaCtx.con],
                    ['str', formulaCtx.str],
                    ['dex', formulaCtx.dex],
                    ['int', formulaCtx.int],
                    ['wis', formulaCtx.wis],
                    ['cha', formulaCtx.cha]
                ].sort((a, b) => b[0].length - a[0].length);

                let evalFormula = formulaStr;
                for (const [name, val] of tokenMap) {
                    evalFormula = evalFormula.split(name).join(String(val));
                }

                try {
                    // eslint-disable-next-line no-new-func
                    maxValue = Math.max(
                        res.minimum ?? 0,
                        Math.floor(Function(`"use strict"; return (${evalFormula})`)())
                    );
                } catch (e) {
                    console.warn(`LevelUpManager: grantedResource formula eval failed for ${res.id}:`, evalFormula, e);
                    maxValue = res.minimum ?? 1;
                }

                // Store on character — use the resource's own id as the key
                // Naming convention: maxXxxPoints + xxxPoints (e.g. maxResolvePoints + resolvePoints)
                const capId = res.id.charAt(0).toUpperCase() + res.id.slice(1);
                const maxKey = `max${capId}Points`;
                const curKey = `${res.id}Points`;

                character[maxKey] = maxValue;
                character[curKey] = maxValue; // Start at full
                character[`${res.id}Recharge`] = res.recharge || 'shortRest';

                console.log(`  💎 Granted resource: ${res.id} = ${maxValue} (recharge: ${res.recharge || 'shortRest'}) [formula: "${formulaStr}" → ${evalFormula} = ${maxValue}]`);
            }
        }

        // Persist to correct location
        if (targetCharacter) {
            // Companion level-up: write back to party.companions array
            const companions = gameState.get('party')?.companions || [];
            const idx = companions.findIndex(c => c.id === character.id);
            if (idx >= 0) {
                companions[idx] = character;
                gameState.set('party.companions', companions);
                console.log(`✅ Companion ${character.name} leveled up to ${character.level}`);
            } else {
                console.warn(`⚠️ LevelUpManager: companion id ${character.id} not found in party.companions`);
            }
        } else {
            // Player level-up: existing behavior
            gameState.set('character', character);
        }

        // Show success message
        gameState.addMessage(`🎉 Level ${character.level}! You are now stronger!`, 'success');

        // Close modal
        this.closeModal();

        // Only update HUD for player level-ups (companions don't appear in player HUD)
        if (!targetCharacter && window.game && window.game.updateHUD) {
            window.game.updateHUD(gameState.get('character'));
        }
    }

    /**
   * Close the level-up modal
   */
    closeModal() {
        this.modal.classList.remove('active');
        this.currentSelections = {
            asiChoice: null,
            abilities: [],
            spells: [],
            traits: [],
            practices: [],
            specialization: null,
            tactics: [],
            vows: []
        };
    }
}
