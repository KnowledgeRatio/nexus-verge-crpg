/**
 * Character Creation UI
 * Multi-step wizard for creating a D&D 5e character
 */

import { Character } from '../systems/Character.js';
import { gameState } from '../core/GameState.js';
import { RULES } from '../core/rulesEngine.js';

export class CharacterCreationUI {
    constructor() {
        this.container = document.getElementById('charCreationContent');
        this.currentStep = 1;
        this.maxSteps = 8; // Updated to include weapon masteries

        // Character creation data
        this.characterData = {
            name: '',
            race: null,
            class: null,
            background: null,
            baseAbilities: {
                str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10
            },
            skillChoices: [],
            weaponMasteries: [] // New: weapon mastery selections
        };

        // Loaded data
        this.racesData = null;
        this.classesData = null;
        this.backgroundsData = null;
        this.weaponMasteriesData = null; // New: weapon mastery data
    }

    /**
     * Load data files
     */
    async loadData() {
        try {
            const [races, classes, backgrounds, weaponMasteries] = await Promise.all([
                fetch('data/races.json').then(r => r.json()),
                fetch('data/classes.json').then(r => r.json()),
                fetch('data/backgrounds.json').then(r => r.json()),
                fetch('data/weaponMasteries.json').then(r => r.json())
            ]);

            this.racesData = races.races;
            this.classesData = classes.classes;
            this.backgroundsData = backgrounds.backgrounds;
            this.weaponMasteriesData = weaponMasteries.weaponMasteries;
        } catch (error) {
            console.error('Failed to load data:', error);
            this.container.innerHTML = '<p class="text-danger">Error loading character data. Please refresh.</p>';
        }
    }

    /**
     * Initialize character creation
     */
    async init() {
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

        switch (this.currentStep) {
            case 1:
                this.renderNameStep(content);
                break;
            case 2:
                this.renderRaceStep(content);
                break;
            case 3:
                this.renderBackgroundStep(content);
                break;
            case 4:
                this.renderClassStep(content);
                break;
            case 5:
                this.renderAbilityScoresStep(content);
                break;
            case 6:
                this.renderSkillsStep(content);
                break;
            case 7:
                this.renderWeaponMasteriesStep(content);
                break;
            case 8:
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
                ${this.currentStep === 8 ? 'Create Character' : 'Next'}
            </button>
        `;
        this.container.appendChild(nav);

        // Bind navigation
        document.getElementById('prevBtn')?.addEventListener('click', () => this.previousStep());
        document.getElementById('nextBtn')?.addEventListener('click', () => this.nextStep());
    }

    /**
     * Render progress steps
     */
    renderProgressSteps() {
        const steps = ['Name', 'Culture', 'Background', 'Calling', 'Abilities', 'Skills', 'Masteries', 'Review'];
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
     * Step 2: Culture
     */
    renderRaceStep(container) {
        container.innerHTML = `
            <h3>Choose Your Culture</h3>
            <p class="step-description">Your culture determines your natural abilities and traits.</p>
            <div class="race-grid">
                ${this.racesData.map(race => `
                    <div class="race-card ${this.characterData.race?.id === race.id ? 'selected' : ''}"
                         data-race-id="${race.id}">
                        <h4>${race.name}</h4>
                        <p class="race-description">${race.description}</p>
                        <div class="race-stats">
                            <strong>Ability Increases:</strong> ${this.formatAbilityIncreases(race.abilityScoreIncrease)}
                        </div>
                        <div class="race-traits">
                            <strong>Traits:</strong>
                            <ul>
                                ${race.traits.map(trait => `<li><strong>${trait.name}:</strong> ${trait.description}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Bind race selection
        container.querySelectorAll('.race-card').forEach(card => {
            card.addEventListener('click', () => {
                const raceId = card.dataset.raceId;
                this.characterData.race = this.racesData.find(r => r.id === raceId);
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
                            <div><strong>Primary Abilities:</strong> ${cls.primaryAbility.map(a => a.toUpperCase()).join(', ')}</div>
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
     * Step 5: Ability Scores
     */
    renderAbilityScoresStep(container) {
        const standardArray = RULES.core.standardArray;
        const availableScores = [...standardArray];
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

        container.innerHTML = `
            <h3>Assign Ability Scores</h3>
            <p class="step-description">
                Use the Standard Array to assign your ability scores.
                <strong>Available scores: ${standardArray.join(', ')}</strong>
            </p>
            <div class="ability-assignment">
                ${abilities.map(ability => `
                    <div class="ability-row">
                        <label>${ability.toUpperCase()}</label>
                        <select id="ability-${ability}" class="ability-select">
                            <option value="">Select...</option>
                            ${standardArray.map(score => `
                                <option value="${score}" ${this.characterData.baseAbilities[ability] === score ? 'selected' : ''}>
                                    ${score}
                                </option>
                            `).join('')}
                        </select>
                        <span class="ability-modifier" id="mod-${ability}">
                            ${this.formatModifier(this.getAbilityModifier(this.characterData.baseAbilities[ability]))}
                        </span>
                        <span class="racial-bonus" id="racial-${ability}">
                            ${this.getRacialBonus(ability) > 0 ? `+${this.getRacialBonus(ability)} (racial)` : ''}
                        </span>
                    </div>
                `).join('')}
            </div>
            <p class="step-hint">Recommended for ${this.characterData.class.name}:
                ${this.characterData.class.primaryAbility.map(a => a.toUpperCase()).join(', ')}</p>
        `;

        // Bind ability selects
        abilities.forEach(ability => {
            const select = container.querySelector(`#ability-${ability}`);
            select.addEventListener('change', (e) => {
                this.characterData.baseAbilities[ability] = parseInt(e.target.value) || 10;
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

        container.innerHTML = `
            <h3>Choose Your Skills</h3>
            <p class="step-description">
                Choose <strong>${numToChoose}</strong> skills from your calling list.
                Your background grants additional skill proficiencies automatically.
            </p>
            <div class="skill-selection">
                <h4>Calling Skills (Choose ${numToChoose}):</h4>
                ${availableSkills.map(skill => `
                    <label class="skill-checkbox">
                        <input type="checkbox" value="${skill}"
                               ${this.characterData.skillChoices.includes(skill) ? 'checked' : ''}
                               class="skill-choice">
                        ${this.formatSkillName(skill)}
                    </label>
                `).join('')}
            </div>
            <div class="background-skills">
                <h4>Background Skills (Automatic):</h4>
                <p>${this.characterData.background.skillProficiencies.map(s => this.formatSkillName(s)).join(', ')}</p>
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
                        return `
                            <label class="mastery-option ${isSelected ? 'selected' : ''}">
                                <input type="checkbox"
                                       value="${option.masteryId}"
                                       ${isSelected ? 'checked' : ''}
                                       class="mastery-choice">
                                <div class="mastery-details">
                                    <div class="mastery-name">${option.mastery.name}</div>
                                    <div class="mastery-weapons">Weapons: ${option.mastery.weaponTypes.join(', ')}</div>
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
        // Calculate final abilities with racial bonuses
        const finalAbilities = { ...this.characterData.baseAbilities };
        if (this.characterData.race.abilityScoreIncrease) {
            for (const [ability, bonus] of Object.entries(this.characterData.race.abilityScoreIncrease)) {
                finalAbilities[ability] = (finalAbilities[ability] || 10) + bonus;
            }
        }

        container.innerHTML = `
            <h3>Review Your Character</h3>
            <p class="step-description">Review your choices before finalizing your character.</p>

            <div class="character-review">
                <div class="review-section">
                    <h4>Identity</h4>
                    <p><strong>Name:</strong> ${this.characterData.name}</p>
                    <p><strong>Culture:</strong> ${this.characterData.race.name}</p>
                    <p><strong>Calling:</strong> ${this.characterData.class.displayName || this.characterData.class.name}</p>
                    <p><strong>Background:</strong> ${this.characterData.background.name}</p>
                </div>

                <div class="review-section">
                    <h4>Ability Scores</h4>
                    ${Object.entries(finalAbilities).map(([ability, score]) => `
                        <div class="ability-review">
                            <span class="ability-name">${ability.toUpperCase()}</span>
                            <span class="ability-score">${score}</span>
                            <span class="ability-mod">(${this.formatModifier(this.getAbilityModifier(score))})</span>
                        </div>
                    `).join('')}
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

                <div class="review-section">
                    <h4>Starting Stats</h4>
                    <p><strong>Hit Points:</strong> ${this.characterData.class.hitDie + this.getAbilityModifier(finalAbilities.con)}</p>
                    <p><strong>Armor Class:</strong> ${10 + this.getAbilityModifier(finalAbilities.dex)}</p>
                    <p><strong>Speed:</strong> ${this.characterData.race.speed} ft</p>
                    <p><strong>Proficiency Bonus:</strong> +2</p>
                </div>
            </div>
        `;
    }

    /**
     * Update ability modifiers display
     */
    updateAbilityModifiers(container) {
        const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        abilities.forEach(ability => {
            const modSpan = container.querySelector(`#mod-${ability}`);
            if (modSpan) {
                const score = this.characterData.baseAbilities[ability];
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

        if (this.currentStep < 8) {
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
        switch (this.currentStep) {
            case 1:
                if (!this.characterData.name.trim()) {
                    alert('Please enter a character name.');
                    return false;
                }
                break;
            case 2:
                if (!this.characterData.race) {
                    alert('Please select a race.');
                    return false;
                }
                break;
            case 3:
                if (!this.characterData.background) {
                    alert('Please select a background.');
                    return false;
                }
                break;
            case 4:
                if (!this.characterData.class) {
                    alert('Please select a class.');
                    return false;
                }
                break;
            case 5:
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
            case 6:
                if (this.characterData.skillChoices.length !== this.characterData.class.skillChoices.choose) {
                    alert(`Please choose exactly ${this.characterData.class.skillChoices.choose} skills.`);
                    return false;
                }
                break;
            case 7:
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
        return true;
    }

    /**
     * Create character and start game
     */
    async createCharacter() {
        try {
            const character = new Character({
                name: this.characterData.name,
                race: this.characterData.race,
                class: this.characterData.class,
                background: this.characterData.background,
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
            .map(([ability, bonus]) => `${ability.toUpperCase()} +${bonus}`)
            .join(', ');
    }

    /**
     * Helper: Get racial bonus for ability
     */
    getRacialBonus(ability) {
        return this.characterData.race?.abilityScoreIncrease?.[ability] || 0;
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
}

export default CharacterCreationUI;
