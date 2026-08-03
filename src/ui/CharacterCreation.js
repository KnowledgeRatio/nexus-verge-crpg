/**
 * Character Creation UI
 * Multi-step wizard for creating a D&D 5e character
 */

import { Character } from '../systems/Character.js';
import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';
import { loadCampaigns, filterByCampaign, getDefaultCampaignId } from '../utils/campaignFilter.js';

export class CharacterCreationUI {
    constructor() {
        this.container = document.getElementById('charCreationContent');
        this.currentStep = 1;
        this.campaignId = null; // Campaign ID for filtering content

        // Character creation data
        this.characterData = {
            name: '',
            avatar: null,
            species: null,
            class: null,
            kit: null, // New: selected kit (custom or preset)
            customClassName: '', // New: custom class name (if using custom kit)
            background: null,
            fightingStyle: null, // New: fighting style selection (if applicable)
            baseAbilities: {
                str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
            },
            skillChoices: [],
            weaponMasteries: [] // New: weapon mastery selections
        };

        this.avatarOptions = [
            { id: 'knight', name: 'Knight', filename: 'knight.png' },
            { id: 'monk', name: 'Monk', filename: 'monk.png' }
        ];
        this.avatarPath = 'data/graphics/';


        // Loaded data (raw, before filtering)
        this.rawSpeciesData = null;
        this.rawClassesData = null;
        this.rawBackgroundsData = null;
        this.rawWeaponMasteriesData = null;
        this.rawKitsData = null;
        this.rawAttributesData = null;

        // Filtered data (based on campaign)
        this.speciesData = null;
        this.classesData = null;
        this.backgroundsData = null;
        this.weaponMasteriesData = null;
        this.kitsData = null;
        this.attributesData = null; // NVSystem source of truth (data/attributes.json) — only meaningful when RULES.attributes.system === 'NVSystem'
    }

    /**
     * Load data files
     */
    async loadData() {
        try {
            // Load campaign data first for filtering
            await loadCampaigns();

            // Add cache-busting parameter to force reload of updated data
            const cacheBust = Date.now();
            const [species, classes, backgrounds, weaponMasteries, kits, attributes] = await Promise.all([
                fetch(`data/races.json?v=${cacheBust}`).then(r => r.json()),
                fetch(`data/classes.json?v=${cacheBust}`).then(r => r.json()),
                fetch(`data/backgrounds.json?v=${cacheBust}`).then(r => r.json()),
                fetch(`data/weaponMasteries.json?v=${cacheBust}`).then(r => r.json()),
                fetch(`data/kits.json?v=${cacheBust}`).then(r => r.json()),
                fetch(`data/attributes.json?v=${cacheBust}`).then(r => r.json())
            ]);

            // Store raw data
            this.rawSpeciesData = species.races;
            this.rawClassesData = classes.classes;
            this.rawBackgroundsData = backgrounds.backgrounds;
            this.rawWeaponMasteriesData = weaponMasteries.weaponMasteries;
            this.rawKitsData = kits;
            this.rawAttributesData = attributes.attributes;

            // Apply campaign filtering
            this.applyFiltering();
        } catch (error) {
            console.error('Failed to load data:', error);
            this.container.innerHTML = '<p class="text-danger">Error loading character data. Please refresh.</p>';
        }
    }

    /**
     * Apply campaign filtering to all loaded data
     */
    applyFiltering() {
        const campaignId = this.campaignId || getDefaultCampaignId();
        console.log(`🎯 Filtering character creation data for campaign: ${campaignId}`);

        this.speciesData = filterByCampaign(this.rawSpeciesData, campaignId);
        this.classesData = filterByCampaign(this.rawClassesData, campaignId);
        this.backgroundsData = filterByCampaign(this.rawBackgroundsData, campaignId);
        this.weaponMasteriesData = filterByCampaign(this.rawWeaponMasteriesData, campaignId);
        this.attributesData = filterByCampaign(this.rawAttributesData, campaignId);

        // Filter kits if they have campaignIds
        if (this.rawKitsData?.kits) {
            this.kitsData = {
                ...this.rawKitsData,
                kits: filterByCampaign(this.rawKitsData.kits, campaignId)
            };
        } else {
            this.kitsData = this.rawKitsData;
        }

        console.log(`📊 Filtered: ${this.speciesData?.length || 0} species, ${this.classesData?.length || 0} classes, ${this.backgroundsData?.length || 0} backgrounds`);
    }

    /**
     * Set the campaign ID and re-filter data if already loaded
     * @param {string} campaignId - The campaign ID to filter by
     */
    setCampaignId(campaignId) {
        this.campaignId = campaignId;
        if (this.rawSpeciesData) {
            // Data already loaded, re-filter
            this.applyFiltering();
        }
    }

    /**
     * Initialize character creation
     * @param {string} campaignId - Optional campaign ID for filtering content
     */
    async init(campaignId = null) {
        if (campaignId) {
            this.campaignId = campaignId;
        }
        await this.loadData();
        this.renderStep();
    }

    /**
     * Render current step
     */
    renderStep() {
        this.container.innerHTML = '';

        // Progress indicator
        const progress = document.createElement('div');
        progress.className = 'creation-progress';
        progress.innerHTML = `
            <div class="progress-steps">
                ${this.renderProgressSteps()}
            </div>
        `;
        this.container.appendChild(progress);

        // Step content
        const content = document.createElement('div');
        content.className = 'creation-step';

        // Dynamically render step based on current position
        const steps = this.getSteps();
        const currentStepName = steps[this.currentStep - 1];

        switch (currentStepName) {
            case 'Name':
                this.renderNameStep(content);
                break;
            case 'Avatar':
                this.renderAvatarStep(content);
                break;
            case 'Species':
                this.renderSpeciesStep(content);
                break;
            case 'Background':
                this.renderBackgroundStep(content);
                break;
            case 'Calling':
                this.renderClassStep(content);
                break;
            case 'Kit':
                this.renderKitStep(content);
                break;
            case 'Custom Class Name':
                this.renderCustomClassNameStep(content);
                break;
            case 'Fighting Style':
                this.renderFightingStyleStep(content);
                break;
            case 'Abilities':
                this.renderAbilityScoresStep(content);
                break;
            case 'Skills':
                this.renderSkillsStep(content);
                break;
            case 'Masteries':
                this.renderWeaponMasteriesStep(content);
                break;
            case 'Review':
                this.renderReviewStep(content);
                break;
        }

        this.container.appendChild(content);

        // Navigation buttons
        const nav = document.createElement('div');
        nav.className = 'creation-nav';
        nav.innerHTML = `
            <button id="prevBtn" class="menu-btn secondary" ${this.currentStep === 1 ? 'disabled' : ''}>
                Previous
            </button>
            <button id="nextBtn" class="menu-btn">
                ${this.currentStep === this.getSteps().length ? 'Create Character' : 'Next'}
            </button>
        `;
        this.container.appendChild(nav);

        // Bind navigation
        document.getElementById('prevBtn')?.addEventListener('click', () => this.previousStep());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextStep());
    }

    /**
     * Get dynamic step list based on selected class and kit
     */
    getSteps() {
        const baseSteps = ['Name', 'Avatar', 'Species', 'Calling'];

        // Always add Kit step after Calling
        if (this.characterData.class) {
            baseSteps.push('Kit');
        }

        // If custom kit is selected, show all customization steps
        if (this.characterData.kit && this.characterData.kit.isCustom) {
            baseSteps.push('Custom Class Name'); // New: Custom class name input
            baseSteps.push('Background');

            // Conditionally add Fighting Style if class has it at level 1
            if (this.hasFightingStyleAtLevel1()) {
                baseSteps.push('Fighting Style');
            }

            baseSteps.push('Abilities', 'Skills', 'Masteries');
        }

        baseSteps.push('Review');
        return baseSteps;
    }

    /**
     * Check if selected class gets Fighting Style at level 1
     */
    hasFightingStyleAtLevel1() {
        if (!this.characterData.class) {
            return false;
        }

        const level1Features = this.characterData.class.features?.['1'] || [];
        return level1Features.some(f => f.name === 'Fighting Style');
    }

    /**
     * Get step number for a given step type
     */
    getStepNumber(stepType) {
        const steps = this.getSteps();
        return steps.indexOf(stepType) + 1;
    }

    /**
     * Render progress steps
     */
    renderProgressSteps() {
        const steps = this.getSteps();
        return steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === this.currentStep;
            const isComplete = stepNum < this.currentStep;
            return `
                <div class="progress-step ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}">
                    <div class="step-number">${stepNum}</div>
                    <div class="step-label">${step}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Step 1: Name
     */
    renderNameStep(container) {
        container.innerHTML = `
            <h3>What is your name?</h3>
            <p class="step-description">Choose a name for your character.</p>
            <div class="form-group">
                <label for="charName">Character Name:</label>
                <input type="text" id="charName" value="${this.characterData.name}"
                       placeholder="Enter your name" autofocus>
            </div>
        `;

        const input = container.querySelector('#charName');
        input.addEventListener('input', (e) => {
            this.characterData.name = e.target.value;
        });
    }


    /**
     * Step 1.5: Avatar
     */
    renderAvatarStep(container) {
        const avatars = this.avatarOptions;

        container.innerHTML = `
            <h3>Choose Your Avatar</h3>
            <p class="step-description">Select a portrait to represent your character.</p>
            <div class="avatar-grid">
                ${avatars.map(avatar => `
                    <button type="button"
                            class="avatar-card ${this.characterData.avatar?.id === avatar.id ? 'selected' : ''}"
                            data-avatar-id="${avatar.id}">
                        <img src="${this.avatarPath}${avatar.filename}"
                             alt="${avatar.name} avatar"
                             class="avatar-image">
                        <span class="avatar-name">${avatar.name}</span>
                    </button>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.avatar-card').forEach(card => {
            card.addEventListener('click', () => {
                const avatarId = card.dataset.avatarId;
                this.characterData.avatar = avatars.find(a => a.id === avatarId) || null;
                this.renderStep();
            });
        });
    }


    /**
     * Step 2: Species
     */
    renderSpeciesStep(container) {
        container.innerHTML = `
            <h3>Choose Your Species</h3>
            <p class="step-description">Your species shapes your body — size, speed, and instinct.</p>
            <div class="species-grid">
                ${this.speciesData.map(species => `
                    <div class="species-card ${this.characterData.species?.id === species.id ? 'selected' : ''}"
                         data-species-id="${species.id}">
                        <h4>${species.name}</h4>
                        <p class="species-description">${species.description}</p>
                        <div class="species-stats">
                            <strong>Ability Increases:</strong> ${this.formatAbilityIncreases(species.abilityScoreIncrease)}
                        </div>
                        <div class="species-traits">
                            <strong>Traits:</strong>
                            <ul>
                                ${species.traits.map(trait => `<li><strong>${trait.name}:</strong> ${trait.description}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind species selection
        container.querySelectorAll('.species-card').forEach(card => {
            card.addEventListener('click', () => {
                const speciesId = card.dataset.speciesId;
                this.characterData.species = this.speciesData.find(s => s.id === speciesId);
                this.renderStep();
            });
        });
    }

    /**
     * Step 3: Calling
     */
    renderClassStep(container) {
        container.innerHTML = `
            <h3>Choose Your Calling</h3>
            <p class="step-description">Your calling determines your abilities and role in combat.</p>
            <div class="class-grid">
                ${this.classesData.map(cls => `
                    <div class="class-card ${this.characterData.class?.id === cls.id ? 'selected' : ''}"
                         data-class-id="${cls.id}">
                        <h4>${cls.displayName || cls.name}</h4>
                        <p class="class-description">${cls.description}</p>
                        <div class="class-stats">
                            <div><strong>Hit Die:</strong> d${cls.hitDie}</div>
                            <div><strong>Primary Abilities:</strong> ${cls.primaryAbility.map(a => this.formatLegacyAbilityLabel(a)).join(', ')}</div>
                            <div><strong>Armor:</strong> ${cls.armorProficiencies.join(', ') || 'None'}</div>
                            <div><strong>Weapons:</strong> ${cls.weaponProficiencies.join(', ')}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind class selection
        container.querySelectorAll('.class-card').forEach(card => {
            card.addEventListener('click', () => {
                const classId = card.dataset.classId;
                this.characterData.class = this.classesData.find(c => c.id === classId);
                this.renderStep();
            });
        });
    }

    /**
     * Step: Kit Selection
     */
    renderKitStep(container) {
        const callingId = this.characterData.class.id;
        const kits = this.kitsData[callingId] || [];

        container.innerHTML = `
            <h3>Choose Your Kit</h3>
            <p class="step-description">Select a preset character build or customize your own.</p>
            <div class="kit-grid">
                ${kits.map(kit => `
                    <div class="kit-card ${this.characterData.kit?.id === kit.id ? 'selected' : ''}"
                         data-kit-id="${kit.id}">
                        <h4>${kit.name}</h4>
                        <p class="kit-description">${kit.description}</p>
                        ${!kit.isCustom && kit.preset ? `
                            <div class="kit-preset-details">
                                <div class="kit-detail"><strong>Fighting Style:</strong> ${this.formatFightingStyleName(kit.preset.fightingStyle)}</div>
                                <div class="kit-detail"><strong>Background:</strong> ${this.formatBackgroundName(kit.preset.background)}</div>
                                <div class="kit-detail"><strong>Abilities:</strong>
                                    ${this.formatKitPresetAbilities(kit.preset)}
                                </div>
                                <div class="kit-detail"><strong>Skills:</strong> ${kit.preset.skills.map(s => this.formatSkillName(s)).join(', ')}</div>
                                <div class="kit-detail"><strong>Weapon Masteries:</strong> ${kit.preset.weaponMasteries.map(m => this.formatMasteryName(m)).join(', ')}</div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;

        // Bind kit selection
        container.querySelectorAll('.kit-card').forEach(card => {
            card.addEventListener('click', () => {
                const kitId = card.dataset.kitId;
                const selectedKit = kits.find(k => k.id === kitId);
                this.characterData.kit = selectedKit;

                // If preset kit (not custom), apply all presets
                if (!selectedKit.isCustom && selectedKit.preset) {
                    this.applyKitPreset(selectedKit.preset);
                }

                this.renderStep();
            });
        });
    }

    /**
     * Apply kit preset to character data
     */
    applyKitPreset(preset) {
        // Apply fighting style
        if (preset.fightingStyle) {
            this.characterData.fightingStyle = preset.fightingStyle;
        }

        // Apply background
        if (preset.background) {
            this.characterData.background = this.backgroundsData.find(b => b.id === preset.background);
        }

        // Apply abilities. `baseAbilities` is always legacy-keyed (see
        // renderAbilityScoresStep) regardless of RULES.attributes.system, so an
        // NVSystem-mode preset's native `abilitiesNVSystem` block is converted
        // back through the locked bijection before being written — kits.json's native
        // block is still the operative source in that mode, it just lands in the same
        // legacy-shaped bag Character.js's constructor expects.
        if (this.isSixAttributeMode() && preset.abilitiesNVSystem) {
            const newToLegacy = this.getNewToLegacyMap();
            const legacyAbilities = {};
            for (const [newKey, score] of Object.entries(preset.abilitiesNVSystem)) {
                legacyAbilities[newToLegacy[newKey]] = score;
            }
            this.characterData.baseAbilities = legacyAbilities;
        } else if (preset.abilities) {
            this.characterData.baseAbilities = { ...preset.abilities };
        }

        // Apply skills
        if (preset.skills) {
            this.characterData.skillChoices = [...preset.skills];
        }

        // Apply weapon masteries
        if (preset.weaponMasteries) {
            this.characterData.weaponMasteries = [...preset.weaponMasteries];
        }
    }

    /**
     * Formats a kit preset's ability block for display. `preset.abilities` is always
     * legacy-keyed. `preset.abilitiesNVSystem` (data-agent, 2026-08-01) is kits.json's
     * native NVSystem block, used directly in NVSystem mode instead of translating
     * through the bijection — falls back to a bijection conversion for any preset that
     * doesn't have one yet (defensive; every current preset does).
     */
    formatKitPresetAbilities(preset) {
        if (this.isSixAttributeMode()) {
            const abilities = preset.abilitiesNVSystem
                || this.convertLegacyToSixAttributeDisplay(preset.abilities);
            return this.getSixAttributeIds()
                .map(newKey => `${this.getAttributeName(newKey)} ${abilities[newKey]}`)
                .join(', ');
        }
        return ['str', 'dex', 'con', 'int', 'wis', 'cha']
            .map(key => `${key.toUpperCase()} ${preset.abilities[key]}`)
            .join(', ');
    }

    /**
     * Step: Custom Class Name (only for custom kit)
     */
    renderCustomClassNameStep(container) {
        container.innerHTML = `
            <h3>Name Your Class</h3>
            <p class="step-description">Give your custom class a unique name that represents your character's path.</p>
            <div class="form-group">
                <label for="customClassNameInput">Class Name:</label>
                <input type="text"
                       id="customClassNameInput"
                       value="${this.characterData.customClassName || ''}"
                       placeholder="Enter your class name (e.g., Battle Mage, Shadow Knight)"
                       maxlength="30"
                       autofocus />
                <p class="input-hint" style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary); font-style: italic;">
                    Examples: Battle Mage, Shadow Knight, Arcane Warrior, Divine Protector, Fist of the North Star
                </p>
            </div>
        `;

        // Bind input handler
        const input = container.querySelector('#customClassNameInput');
        input.addEventListener('input', (e) => {
            this.characterData.customClassName = e.target.value;
        });
    }

    /**
     * Format fighting style name for display
     */
    formatFightingStyleName(styleId) {
        const styles = {
            marksmanship: 'Marksmanship',
            defense: 'Defense',
            dueling: 'Dueling',
            greatWeaponFighting: 'Great Weapon Fighting',
            protection: 'Protection',
            twoWeaponFighting: 'Two-Weapon Fighting'
        };
        return styles[styleId] || styleId;
    }

    /**
     * Format background name for display
     */
    formatBackgroundName(bgId) {
        const bg = this.backgroundsData.find(b => b.id === bgId);
        return bg ? bg.name : bgId;
    }

    /**
     * Format mastery name for display
     */
    formatMasteryName(masteryId) {
        const names = {
            cleave: 'Cleave',
            graze: 'Graze',
            nick: 'Nick',
            push: 'Push',
            sap: 'Sap',
            slow: 'Slow',
            topple: 'Topple',
            vex: 'Vex'
        };
        return names[masteryId] || masteryId;
    }

    /**
     * Step 4: Background
     */
    renderBackgroundStep(container) {
        container.innerHTML = `
            <h3>Choose Your Background</h3>
            <p class="step-description">Your background represents your life before adventuring.</p>
            <div class="background-grid">
                ${this.backgroundsData.map(bg => `
                    <div class="background-card ${this.characterData.background?.id === bg.id ? 'selected' : ''}"
                         data-background-id="${bg.id}">
                        <h4>${bg.name}</h4>
                        <p class="background-description">${bg.description}</p>
                        <div class="background-stats">
                            <div><strong>Skills:</strong> ${bg.skillProficiencies.map(s => this.formatSkillName(s)).join(', ')}</div>
                            <div><strong>Feature:</strong> ${bg.feature.name}</div>
                            <p class="feature-desc">${bg.feature.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind background selection
        container.querySelectorAll('.background-card').forEach(card => {
            card.addEventListener('click', () => {
                const bgId = card.dataset.backgroundId;
                this.characterData.background = this.backgroundsData.find(b => b.id === bgId);
                this.renderStep();
            });
        });
    }

    /**
     * Step: Fighting Style (conditional - only for callings with Fighting Style at level 1)
     */
    renderFightingStyleStep(container) {
        // Get fighting style options from class features
        const level1Features = this.characterData.class.features?.['1'] || [];
        const fightingStyleFeature = level1Features.find(f => f.name === 'Fighting Style');

        if (!fightingStyleFeature || !fightingStyleFeature.choices) {
            container.innerHTML = '<p>Error: Fighting Style feature not found.</p>';
            return;
        }

        const fightingStyles = {
            marksmanship: {
                name: 'Marksmanship',
                description: 'You gain a +2 bonus to attack rolls you make with ranged weapons',
                icon: '🏹'
            },
            defense: {
                name: 'Defense',
                description: '+1 AC while wearing armor',
                icon: '🛡️'
            },
            dueling: {
                name: 'Dueling',
                description: '+2 damage when wielding a melee weapon in one hand with no weapon in the other hand',
                icon: '⚔️'
            },
            greatWeaponFighting: {
                name: 'Great Weapon Fighting',
                description: 'When you roll a 1 or 2 on a damage die for an attack with a two-handed or versatile melee weapon, you can reroll the die (must use new roll)',
                icon: '🪓'
            },
            mariner: {
                name: 'Mariner',
                description: 'As long as you are not wearing heavy armor or wielding a shield: you can traverse deep water terrain and you gain a +1 bonus to AC',
                icon: '🌊'
            },
            unarmedFighting: {
                name: 'Unarmed Fighting',
                description: 'Your unarmed strikes deal 1d6 + STR damage (1d8 if both hands are free). When you grapple a creature, you can deal 1d4 damage at the start of each of your turns',
                icon: '👊'
            }
        };

        const availableStyles = fightingStyleFeature.choices.from;

        container.innerHTML = `
            <h3>Choose Your Fighting Style</h3>
            <p class="step-description">Your fighting style represents your preferred combat technique.</p>
            <div class="fighting-style-grid">
                ${availableStyles.map(styleId => {
        const style = fightingStyles[styleId];
        return `
                        <div class="fighting-style-card ${this.characterData.fightingStyle === styleId ? 'selected' : ''}"
                             data-style-id="${styleId}">
                            <h4>${style.icon} ${style.name}</h4>
                            <p class="style-description">${style.description}</p>
                        </div>
                    `;
    }).join('')}
            </div>
        `;

        // Bind fighting style selection
        container.querySelectorAll('.fighting-style-card').forEach(card => {
            card.addEventListener('click', () => {
                const styleId = card.dataset.styleId;
                this.characterData.fightingStyle = styleId;
                this.renderStep();
            });
        });
    }

    /**
     * Step: Ability Scores
     *
     * `characterData.baseAbilities` is always legacy-keyed (str/dex/con/int/wis/cha) —
     * that's the shape Character.js's constructor expects and it is not being changed
     * by this task. In NVSystem mode this step natively shows and collects
     * Prowess/Insight/Vitality/Intellect/Composure/Presence (real working keys for this
     * form, not a label swap): each select's id/label is the new attribute id, and on
     * change the value is written into baseAbilities through the locked bijection
     * (getNewToLegacyMap) immediately — the legacy bag is a live mirror of what the
     * player picked, not the other way around.
     */
    renderAbilityScoresStep(container) {
        const standardArray = RULES.core.standardArray;
        const sixMode = this.isSixAttributeMode();
        const newToLegacy = sixMode ? this.getNewToLegacyMap() : null;
        const keys = sixMode ? this.getSixAttributeIds() : ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        container.innerHTML = `
            <h3>Assign Ability Scores</h3>
            <p class="step-description">
                Use the Standard Array to assign your ability scores.
                <strong>Available scores: ${standardArray.join(', ')}</strong>
            </p>
            <div class="ability-assignment">
                ${keys.map(key => {
        const legacyKey = sixMode ? newToLegacy[key] : key;
        const currentScore = this.characterData.baseAbilities[legacyKey];
        return `
                    <div class="ability-row">
                        <label>${sixMode ? this.getAttributeName(key) : key.toUpperCase()}</label>
                        <select id="ability-${key}" class="ability-select">
                            <option value="">Select...</option>
                            ${standardArray.map(score => `
                                <option value="${score}" ${currentScore === score ? 'selected' : ''}>
                                    ${score}
                                </option>
                            `).join('')}
                        </select>
                        <span class="ability-modifier" id="mod-${key}">
                            ${this.formatModifier(this.getAbilityModifier(currentScore))}
                        </span>
                        <span class="racial-bonus" id="racial-${key}">
                            ${this.getSpeciesBonus(key) > 0 ? `+${this.getSpeciesBonus(key)} (species)` : ''}
                        </span>
                    </div>
                `;
    }).join('')}
            </div>
            <p class="step-hint">Recommended for ${this.characterData.class.name}:
                ${this.characterData.class.primaryAbility.map(a => this.formatLegacyAbilityLabel(a)).join(', ')}</p>
        `;

        // Bind ability selects
        keys.forEach(key => {
            const select = container.querySelector(`#ability-${key}`);
            select.addEventListener('change', (e) => {
                const legacyKey = sixMode ? newToLegacy[key] : key;
                this.characterData.baseAbilities[legacyKey] = parseInt(e.target.value) || 10;
                this.updateAbilityModifiers(container);
            });
        });
    }

    /**
     * Step 6: Skills
     */
    renderSkillsStep(container) {
        const skillChoices = this.characterData.class.skillChoices;
        const availableSkills = skillChoices.from;
        const numToChoose = skillChoices.choose;

        // Get background skill proficiencies to filter them out
        const backgroundSkills = this.characterData.background.skillProficiencies || [];

        // Clean up any accidentally selected skills that overlap with background
        this.characterData.skillChoices = this.characterData.skillChoices.filter(
            skill => !backgroundSkills.includes(skill)
        );

        container.innerHTML = `
            <h3>Choose Your Skills</h3>
            <p class="step-description">
                Choose <strong>${numToChoose}</strong> skills from your calling list.
                Your background grants additional skill proficiencies automatically.
            </p>
            <div class="skill-selection">
                <h4>Calling Skills (Choose ${numToChoose}):</h4>
                ${availableSkills.map(skill => {
        const isFromBackground = backgroundSkills.includes(skill);
        const isSelected = this.characterData.skillChoices.includes(skill);
        return `
                        <label class="skill-checkbox ${isFromBackground ? 'disabled' : ''}">
                            <input type="checkbox" value="${skill}"
                                   ${isSelected ? 'checked' : ''}
                                   ${isFromBackground ? 'disabled' : ''}
                                   class="skill-choice">
                            ${this.formatSkillName(skill)}
                            ${isFromBackground ? '<span class="skill-note">(from background)</span>' : ''}
                        </label>
                    `;
    }).join('')}
            </div>
            <div class="background-skills">
                <h4>Background Skills (Automatic):</h4>
                <p>${backgroundSkills.map(s => this.formatSkillName(s)).join(', ')}</p>
            </div>
        `;

        // Bind skill checkboxes
        const checkboxes = container.querySelectorAll('.skill-choice');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const skill = e.target.value;
                if (e.target.checked) {
                    if (this.characterData.skillChoices.length < numToChoose) {
                        this.characterData.skillChoices.push(skill);
                    } else {
                        e.target.checked = false;
                        alert(`You can only choose ${numToChoose} skills.`);
                    }
                } else {
                    const index = this.characterData.skillChoices.indexOf(skill);
                    if (index > -1) {
                        this.characterData.skillChoices.splice(index, 1);
                    }
                }
            });
        });
    }

    /**
     * Step 7: Weapon Masteries
     */
    renderWeaponMasteriesStep(container) {
        const callingId = this.characterData.class.id;
        const masteryProgression = this.weaponMasteriesData.callingMasteryProgression[callingId];
        const numToChoose = masteryProgression ? masteryProgression['1'] : 0;

        // Get all available masteries
        const masteries = this.weaponMasteriesData.masteries;

        // Build list of unique masteries (no duplicates)
        const weaponMasteryOptions = Object.entries(masteries).map(([masteryId, mastery]) => ({
            masteryId,
            mastery
        }));

        container.innerHTML = `
            <h3>Choose Your Weapon Masteries</h3>
            <p class="step-description">
                ${numToChoose === 0
        ? 'Your calling does not grant weapon masteries at level 1.'
        : `Choose <strong>${numToChoose}</strong> weapon mastery. Weapon masteries are special techniques you can use when proficient with a weapon.`
}
            </p>
            ${numToChoose > 0 ? `
                <div class="weapon-mastery-selection">
                    ${weaponMasteryOptions.map(option => {
        const isSelected = this.characterData.weaponMasteries.includes(option.masteryId);
        const weaponNames = option.mastery.weaponTypes.map(id => this.formatWeaponName(id)).join(', ');
        return `
                            <label class="mastery-option ${isSelected ? 'selected' : ''}">
                                <input type="checkbox"
                                       value="${option.masteryId}"
                                       ${isSelected ? 'checked' : ''}
                                       class="mastery-choice">
                                <div class="mastery-details">
                                    <div class="mastery-name">${option.mastery.name}</div>
                                    <div class="mastery-weapons">Weapons: ${weaponNames}</div>
                                    <div class="mastery-description">${option.mastery.description}</div>
                                    ${option.mastery.usesPerTurn ? `<div class="mastery-uses">Uses: ${option.mastery.usesPerTurn} per turn</div>` : ''}
                                </div>
                            </label>
                        `;
    }).join('')}
                </div>
            ` : '<p style="text-align: center; margin-top: 20px;">You will gain weapon masteries at higher levels.</p>'}
        `;

        if (numToChoose > 0) {
            // Bind mastery checkboxes
            const checkboxes = container.querySelectorAll('.mastery-choice');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const masteryId = e.target.value;
                    if (e.target.checked) {
                        if (this.characterData.weaponMasteries.length < numToChoose) {
                            this.characterData.weaponMasteries.push(masteryId);
                            e.target.closest('.mastery-option').classList.add('selected');
                        } else {
                            e.target.checked = false;
                            alert(`You can only choose ${numToChoose} weapon mastery.`);
                        }
                    } else {
                        const index = this.characterData.weaponMasteries.indexOf(masteryId);
                        if (index > -1) {
                            this.characterData.weaponMasteries.splice(index, 1);
                            e.target.closest('.mastery-option').classList.remove('selected');
                        }
                    }
                });
            });
        }
    }

    /**
     * Step 8: Review
     */
    renderReviewStep(container) {
        // Calculate final abilities with species bonuses (baseAbilities and
        // species.abilityScoreIncrease are always legacy-keyed — see renderAbilityScoresStep)
        const finalAbilities = { ...this.characterData.baseAbilities };
        if (this.characterData.species.abilityScoreIncrease) {
            for (const [ability, bonus] of Object.entries(this.characterData.species.abilityScoreIncrease)) {
                finalAbilities[ability] = (finalAbilities[ability] || 10) + bonus;
            }
        }

        // Display-only view: NVSystem-keyed in NVSystem mode, legacy otherwise.
        const sixMode = this.isSixAttributeMode();
        const displayAbilities = sixMode ? this.convertLegacyToSixAttributeDisplay(finalAbilities) : finalAbilities;

        // Determine the class display name (custom name, kit name, or calling name)
        let classDisplayName;
        if (this.characterData.kit.isCustom && this.characterData.customClassName) {
            classDisplayName = this.characterData.customClassName;
        } else if (this.characterData.kit && !this.characterData.kit.isCustom) {
            classDisplayName = this.characterData.kit.name;
        } else {
            classDisplayName = this.characterData.class.displayName || this.characterData.class.name;
        }

        // Build fighting style display (if applicable)
        const fightingStyleDisplay = this.characterData.fightingStyle ?
            `<p><strong>Fighting Style:</strong> ${this.formatFightingStyleName(this.characterData.fightingStyle)}</p>` : '';

        // Build weapon masteries display
        const masteriesDisplay = this.characterData.weaponMasteries.length > 0 ?
            `<p><strong>Weapon Masteries:</strong> ${this.characterData.weaponMasteries.map(m => this.formatMasteryName(m)).join(', ')}</p>` : '';

        const avatarDisplay = this.characterData.avatar ?
            `<div class="avatar-review">
                <span class="avatar-review-label">Avatar:</span>
                <img src="${this.avatarPath}${this.characterData.avatar.filename}"
                     alt="${this.characterData.avatar.name} avatar"
                     class="avatar-review-image">
                <span class="avatar-review-name">${this.characterData.avatar.name}</span>
            </div>` : '';

        // Build class features display
        const level1Features = this.characterData.class.features?.['1'] || [];
        const featuresDisplay = level1Features.length > 0 ?
            `<div class="review-section">
                <h4>Class Features (Level 1)</h4>
                ${level1Features.map(feature => `
                    <div class="feature-review">
                        <p><strong>${feature.name}</strong></p>
                        <p class="feature-desc">${feature.description}</p>
                    </div>
                `).join('')}
            </div>` : '';

        container.innerHTML = `
            <h3>Review Your Character</h3>
            <p class="step-description">Review your choices before finalizing your character.</p>

            <div class="character-review">
                <div class="review-section">
                    <h4>Identity</h4>
                    <p><strong>Name:</strong> ${this.characterData.name}</p>
                    ${avatarDisplay}
                    <p><strong>Species:</strong> ${this.characterData.species.name}</p>
                    <p><strong>Calling:</strong> ${this.characterData.class.displayName || this.characterData.class.name}</p>
                    <p><strong>Class:</strong> ${classDisplayName}</p>
                    <p><strong>Background:</strong> ${this.characterData.background.name}</p>
                </div>

                <div class="review-section">
                    <h4>Ability Scores</h4>
                    ${Object.entries(displayAbilities).map(([ability, score]) => `
                        <div class="ability-review">
                            <span class="ability-name">${sixMode ? this.getAttributeName(ability) : ability.toUpperCase()}</span>
                            <span class="ability-score">${score}</span>
                            <span class="ability-mod">(${this.formatModifier(this.getAbilityModifier(score))})</span>
                        </div>
                    `).join('')}
                </div>

                <div class="review-section">
                    <h4>Combat Options</h4>
                    ${fightingStyleDisplay}
                    ${masteriesDisplay}
                </div>

                <div class="review-section">
                    <h4>Proficiencies</h4>
                    <p><strong>Skills:</strong> ${[
        ...this.characterData.skillChoices,
        ...this.characterData.background.skillProficiencies
    ].map(s => this.formatSkillName(s)).join(', ')}</p>
                    <p><strong>Armor:</strong> ${this.characterData.class.armorProficiencies.join(', ') || 'None'}</p>
                    <p><strong>Weapons:</strong> ${this.characterData.class.weaponProficiencies.join(', ')}</p>
                </div>

                ${featuresDisplay}

                <div class="review-section">
                    <h4>Starting Stats</h4>
                    <p><strong>Hit Points:</strong> ${this.characterData.class.hitDie + this.getAbilityModifier(sixMode ? displayAbilities.vitality : finalAbilities.con)}</p>
                    <p><strong>Armor Class:</strong> ${10 + this.getAbilityModifier(sixMode ? displayAbilities.insight : finalAbilities.dex)}</p>
                    <p><strong>Speed:</strong> ${this.characterData.species.speed} ft</p>
                    <p><strong>Proficiency Bonus:</strong> +2</p>
                </div>
            </div>
        `;
    }

    /**
     * Update ability modifiers display
     */
    updateAbilityModifiers(container) {
        const sixMode = this.isSixAttributeMode();
        const newToLegacy = sixMode ? this.getNewToLegacyMap() : null;
        const keys = sixMode ? this.getSixAttributeIds() : ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        keys.forEach(key => {
            const modSpan = container.querySelector(`#mod-${key}`);
            if (modSpan) {
                const legacyKey = sixMode ? newToLegacy[key] : key;
                const score = this.characterData.baseAbilities[legacyKey];
                modSpan.textContent = this.formatModifier(this.getAbilityModifier(score));
            }
        });
    }

    /**
     * Navigate to previous step
     */
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.renderStep();
        }
    }

    /**
     * Navigate to next step
     */
    nextStep() {
        // Validate current step
        if (!this.validateStep()) {
            return;
        }

        const totalSteps = this.getSteps().length;
        if (this.currentStep < totalSteps) {
            this.currentStep++;
            this.renderStep();
        } else {
            // Create character
            this.createCharacter();
        }
    }

    /**
     * Validate current step
     */
    validateStep() {
        const steps = this.getSteps();
        const currentStepName = steps[this.currentStep - 1];

        switch (currentStepName) {
            case 'Name':
                if (!this.characterData.name.trim()) {
                    alert('Please enter a character name.');
                    return false;
                }
                break;
            case 'Avatar':
                if (!this.characterData.avatar) {
                    alert('Please select an avatar.');
                    return false;
                }
                break;
            case 'Species':
                if (!this.characterData.species) {
                    alert('Please select a species.');
                    return false;
                }
                break;
            case 'Background':
                if (!this.characterData.background) {
                    alert('Please select a background.');
                    return false;
                }
                break;
            case 'Calling':
                if (!this.characterData.class) {
                    alert('Please select a calling.');
                    return false;
                }
                break;
            case 'Kit':
                if (!this.characterData.kit) {
                    alert('Please select a kit.');
                    return false;
                }
                break;
            case 'Custom Class Name':
                if (!this.characterData.customClassName.trim()) {
                    alert('Please enter a name for your custom class.');
                    return false;
                }
                break;
            case 'Fighting Style':
                if (!this.characterData.fightingStyle) {
                    alert('Please select a fighting style.');
                    return false;
                }
                break;
            case 'Abilities': {
                // Check all abilities assigned
                const abilities = Object.values(this.characterData.baseAbilities);
                const standardArray = RULES.core.standardArray;

                // Check if valid assignment
                const sorted = [...abilities].sort((a, b) => a - b);
                const sortedStandard = [...standardArray].sort((a, b) => a - b);

                if (JSON.stringify(sorted) !== JSON.stringify(sortedStandard)) {
                    alert('Please assign all ability scores from the standard array.');
                    return false;
                }
                break;
            }
            case 'Skills':
                if (this.characterData.skillChoices.length !== this.characterData.class.skillChoices.choose) {
                    alert(`Please choose exactly ${this.characterData.class.skillChoices.choose} skills.`);
                    return false;
                }
                break;
            case 'Masteries': {
                // Get number of weapon masteries for this calling at level 1
                const callingId = this.characterData.class.id;
                const masteryProgression = this.weaponMasteriesData.callingMasteryProgression[callingId];
                const requiredMasteries = masteryProgression ? masteryProgression['1'] : 0;

                if (this.characterData.weaponMasteries.length !== requiredMasteries) {
                    alert(`Please choose exactly ${requiredMasteries} weapon mastery.`);
                    return false;
                }
                break;
            }
        }
        return true;
    }

    /**
     * Create character and start game
     */
    async createCharacter() {
        try {
            // Determine the display name for the class
            // If custom kit with custom name, use that; otherwise use kit name
            const classData = { ...this.characterData.class };
            if (this.characterData.kit.isCustom && this.characterData.customClassName) {
                classData.displayName = this.characterData.customClassName;
            } else if (this.characterData.kit && !this.characterData.kit.isCustom) {
                classData.displayName = this.characterData.kit.name;
            } else {
                // Fallback to class name
                classData.displayName = classData.displayName || classData.name;
            }

            const character = new Character({
                name: this.characterData.name,
                avatar: this.characterData.avatar,
                species: this.characterData.species,
                class: classData,
                background: this.characterData.background,
                fightingStyle: this.characterData.fightingStyle, // Pass fighting style if selected
                baseAbilities: this.characterData.baseAbilities,
                skillChoices: this.characterData.skillChoices,
                weaponMasteries: this.characterData.weaponMasteries,
                level: 1,
                xp: 0
            });

            // Apply starting equipment and gold (async)
            await character.applyStartingEquipment();

            // Set character in game state
            gameState.setCharacter(character);
            gameState.addMessage(`Welcome, ${character.name}!`, 'success');
            gameState.addMessage(`You start with ${character.gold} gold pieces.`, 'info');
            gameState.changeScreen('game');

            console.log('Character created:', character);
        } catch (error) {
            console.error('Failed to create character:', error);
            alert('Failed to create character. Please try again.');
        }
    }

    /**
     * Helper: Format ability increases
     */
    formatAbilityIncreases(increases) {
        return Object.entries(increases)
            .map(([ability, bonus]) => `${this.formatLegacyAbilityLabel(ability)} +${bonus}`)
            .join(', ');
    }

    /**
     * Helper: Get species bonus for ability
     * `ability` is whatever key-space the caller is currently working in (legacy in
     * '5EClassic' mode, a new NVSystem id in 'NVSystem' mode) — races.json itself
     * is not migrated yet, so in NVSystem mode this translates back to the single
     * legacy source key before reading the (still-legacy-keyed) data.
     */
    getSpeciesBonus(ability) {
        const legacyKey = this.isSixAttributeMode() ? this.getNewToLegacyMap()[ability] : ability;
        return this.characterData.species?.abilityScoreIncrease?.[legacyKey] || 0;
    }

    /**
     * Whether chargen should natively collect the six new attributes
     * (Prowess/Insight/Vitality/Intellect/Composure/Presence) instead of the legacy six.
     */
    isSixAttributeMode() {
        return RULES.attributes.system === 'NVSystem';
    }

    /**
     * Inverse of RULES.attributes.legacyToNew — the mapping is a locked bijection
     * (docs/plans/2026-07-30-attribute-system-remap.md), so this inversion is lossless
     * and always well-defined.
     */
    getNewToLegacyMap() {
        const map = {};
        for (const [legacyKey, newKey] of Object.entries(RULES.attributes.legacyToNew)) {
            map[newKey] = legacyKey;
        }
        return map;
    }

    /**
     * Ordered list of the six new attribute ids (domain-grid order, from data/attributes.json).
     * Falls back to RULES.attributes.legacyToNew's value set if the data file hasn't loaded.
     */
    getSixAttributeIds() {
        if (this.attributesData?.length) {
            return this.attributesData.map(a => a.id);
        }
        return Object.values(RULES.attributes.legacyToNew);
    }

    /**
     * Display name for a new-system attribute id (e.g. 'prowess' -> 'Prowess').
     */
    getAttributeName(newKey) {
        return this.attributesData?.find(a => a.id === newKey)?.name || newKey;
    }

    /**
     * Formats a raw legacy ability key (as found in unmigrated data: classes.json,
     * races.json, backgrounds.json, kits.json) into its current display label.
     * In NVSystem mode this translates through the locked bijection for display
     * purposes only — the underlying data files are not edited by this.
     */
    formatLegacyAbilityLabel(legacyKey) {
        if (this.isSixAttributeMode()) {
            return this.getAttributeName(RULES.attributes.legacyToNew[legacyKey]);
        }
        return legacyKey.toUpperCase();
    }

    /**
     * Converts a legacy-keyed ability bag (e.g. characterData.baseAbilities, always
     * legacy-shaped — see renderAbilityScoresStep) into an NVSystem-keyed bag for
     * display, ordered by the domain grid.
     */
    convertLegacyToSixAttributeDisplay(legacyBag) {
        const newToLegacy = this.getNewToLegacyMap();
        const result = {};
        for (const newKey of this.getSixAttributeIds()) {
            result[newKey] = legacyBag[newToLegacy[newKey]] ?? 10;
        }
        return result;
    }

    /**
     * Helper: Calculate ability modifier
     */
    getAbilityModifier(score) {
        return Math.floor((score - 10) / 2);
    }

    /**
     * Helper: Format modifier with sign
     */
    formatModifier(mod) {
        return mod >= 0 ? `+${mod}` : `${mod}`;
    }

    /**
     * Helper: Format skill name (camelCase to Title Case)
     */
    formatSkillName(skill) {
        return skill.replace(/([A-Z])/g, ' $1').trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Helper: Format weapon ID to display name
     */
    formatWeaponName(weaponId) {
        const weaponNameMap = {
            // Simple Melee
            'club': 'Club',
            'dagger': 'Dagger',
            'greatclub': 'Greatclub',
            'handaxe': 'Handaxe',
            'javelin': 'Javelin',
            'lightHammer': 'Light Hammer',
            'mace': 'Mace',
            'quarterstaff': 'Quarterstaff',
            'sickle': 'Sickle',
            'spear': 'Spear',
            // Simple Ranged
            'dart': 'Dart',
            'lightCrossbow': 'Light Crossbow',
            'shortbow': 'Shortbow',
            'sling': 'Sling',
            // Martial Melee
            'battleaxe': 'Battleaxe',
            'flail': 'Flail',
            'glaive': 'Glaive',
            'greataxe': 'Greataxe',
            'greatsword': 'Greatsword',
            'halberd': 'Halberd',
            'lance': 'Lance',
            'longsword': 'Longsword',
            'maul': 'Maul',
            'morningstar': 'Morningstar',
            'pike': 'Pike',
            'rapier': 'Rapier',
            'scimitar': 'Scimitar',
            'shortsword': 'Shortsword',
            'trident': 'Trident',
            'warhammer': 'Warhammer',
            'warpick': 'War Pick',
            'whip': 'Whip',
            // Martial Ranged
            'blowgun': 'Blowgun',
            'handCrossbow': 'Hand Crossbow',
            'heavyCrossbow': 'Heavy Crossbow',
            'longbow': 'Longbow'
        };

        return weaponNameMap[weaponId] || weaponId;
    }
}

export default CharacterCreationUI;
