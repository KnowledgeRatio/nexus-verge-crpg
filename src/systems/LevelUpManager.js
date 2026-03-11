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

    // Current level-up state
    this.currentSelections = {
      asiChoice: null,
      abilities: [],
      spells: [],
      traits: [],
      practices: [],
      specialization: null
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
    if (!this.progressionData) return [];
    const classProgression = this.progressionData.progressionByClass[classId];
    if (!classProgression || !classProgression[level]) return [];
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
    this.currentSelections = {
      asiChoice: null,
      abilities: [],
      spells: [],
      traits: [],
      practices: [],
      specialization: null
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
    if (!this.practicesData) return [];

    let practices = this.practicesData.practices || [];

    // Filter by campaign
    const campaignId = gameState.get('worldConfig')?.campaignId || 'nexus-verge';
    practices = filterByCampaign(practices, campaignId);

    // Filter by calling restriction (null = available to all)
    practices = practices.filter(p => !p.callings || p.callings.includes(classId));

    // Exclude already-known practices
    const character = gameState.get('character');
    const knownPractices = character?.practices || [];
    practices = practices.filter(p => !knownPractices.includes(p.id));

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
          <input type="checkbox" class="choice-checkbox">
          <span class="choice-name">${trait.name}</span>
        </div>
        <div class="choice-description">${trait.description}</div>
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

    list.innerHTML = practices.map(practice => `
      <div class="choice-item practice-choice" data-choice-type="practice" data-choice-id="${practice.id}">
        <div class="choice-item-header">
          <input type="${choice.count === 1 ? 'radio' : 'checkbox'}" name="practice" class="choice-${choice.count === 1 ? 'radio' : 'checkbox'}">
          <span class="choice-name">${practice.name}</span>
        </div>
        <div class="choice-description">${practice.description}</div>
      </div>
    `).join('');
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
   * Format specialization ID to display name
   */
  formatSpecializationName(id) {
    return id.split(/(?=[A-Z])/).map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Get specialization description (placeholder)
   */
  getSpecializationDescription(id) {
    // TODO: Load from specializations.json when implemented
    const descriptions = {
      exemplar: 'Tactical weapon master. Spends Resolve on combat maneuvers for precision, control, and defense.',
      oath: 'Divine warrior. Spends Resolve on smite (burst damage) or healing. Every smite point is healing you don\'t have.',
      champion: 'Master of physical combat and critical strikes',
      battleMaster: 'Tactical fighter with combat maneuvers',
      eldritchKnight: 'Warrior who blends magic with martial prowess',
      evocation: 'Master of destructive spells',
      abjuration: 'Specialist in protective magic',
      enchantment: 'Weaver of mind-affecting spells',
    };
    return descriptions[id] || 'A powerful specialization path';
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
    } else {
      // Checkbox - multiple selections possible
      const isSelected = choiceElement.classList.contains('selected');
      const maxCount = this.getMaxCountForChoiceType(choiceType);
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

    // Apply selections to character (existing logic, unchanged)
    character.applyLevelUpSelections(this.currentSelections);

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
      specialization: null
    };
  }
}
