import { filterByCampaign, loadCampaigns } from '../utils/campaignFilter.js';
import { RULES } from '../core/rulesEngine.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const words = value => String(value).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
const files = ['classes', 'abilities', 'traits', 'practices', 'specializations', 'levelProgression', 'callingReferences'];
let catalogue;

export function buildCallingReference(data, callingId, character = null) {
    const calling = data.classes.classes.find(entry => entry.id === callingId);
    const reference = data.callingReferences[callingId];
    const progression = data.levelProgression.progressionByClass[callingId];
    const abilities = data.abilities.abilities[callingId] || [];
    const traits = data.traits.traits;
    const specializations = data.specializations.specializations[callingId] || [];
    const current = character?.class?.id === callingId ? character : null;
    const entries = [...abilities, ...traits];
    const byId = id => entries.find(entry => entry.id === id);
    const grants = feature => [...(feature?.autoGrantTraits || []), ...(feature?.autoGrantAbilities || [])]
        .map(byId).filter(Boolean);
    const levels = Array.from({ length: data.levelProgression.maxLevel }, (_, index) => {
        const level = index + 1;
        const step = progression[level] || {};
        const shared = abilities.filter(entry => !entry.specialization && entry.levelRequired === level);
        const features = (step.newFeatures || []).filter(feature => !shared.some(entry => entry.name === feature.name));
        const paths = Object.fromEntries(specializations.map(spec => {
            const feature = step.specializationFeatures?.[spec.id];
            const dice = Object.values(progression).find(row => row.specializationFeatures?.[spec.id]?.tacticDie)
                ?.specializationFeatures[spec.id].tacticDie;
            const die = dice && (level === spec.chosenAtLevel || dice[level])
                ? Object.entries(dice).filter(([threshold]) => Number(threshold) <= level)
                    .sort(([left], [right]) => Number(left) - Number(right)).at(-1)?.[1] : null;
            return [spec.id, { grants: grants(feature),
                choices: (step.choices || []).filter(choice => choice.requiresSpecialization === spec.id),
                die: level >= spec.chosenAtLevel ? die : null,
                milestones: reference.milestones.filter(item => item.level === level && item.specialization === spec.id) }];
        }));
        return { level, shared, features, paths, current: current?.level === level,
            choices: (step.choices || []).filter(choice => !choice.requiresSpecialization),
            milestones: reference.milestones.filter(item => item.level === level && !item.specialization) };
    });
    const known = entry => {
        if (!current || (entry.specialization && entry.specialization !== current.specialization)) {
            return false;
        }
        const required = entry.levelRequired ?? entry.tier ?? 1;
        if (current.level < required) {
            return false;
        }
        const chosen = [current.selectedAbilities, current.selectedTraits, current.knownTactics, current.knownVows,
            current.practices].flatMap(list => (list || []).map(item => typeof item === 'string' ? item : item.id));
        const style = `fighting_style_${(current.fightingStyle || '').replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)}`;
        const autoGranted = levels.filter(row => row.level <= current.level)
            .flatMap(row => row.paths[current.specialization]?.grants || []);
        return chosen.includes(entry.id) || entry.id === style || autoGranted.some(item => item.id === entry.id)
            || (!entry.specialization && abilities.includes(entry));
    };
    const styleIds = calling.features[1].find(feature => feature.choices)?.choices.from
        .map(id => `fighting_style_${id.replace(/[A-Z]/g, char => `_${char.toLowerCase()}`)}`) || [];
    const pools = { abilities, traits, combined: entries, styles: traits.filter(entry => styleIds.includes(entry.id)),
        practices: data.practices.practices.filter(entry => !entry.callings || entry.callings.includes(callingId)) };
    const sections = reference.sections.map(section => ({ ...section, entries: pools[section.pool]
        .filter(entry => (!section.shared || !entry.specialization)
            && (!section.specialization || entry.specialization === section.specialization)
            && (!section.tag || entry.tags?.includes(section.tag))
            && (!section.excludeTag || !entry.tags?.includes(section.excludeTag))
            && (!section.tier || entry.tier === section.tier))
        .map(entry => ({ ...entry, known: known(entry) })) }));
    return { calling, reference, levels, specializations, sections, character: current };
}

function choiceMarkup(choice) {
    return `<p class="codex-choice"><strong>${escape(choice.label || choice.name)}</strong> · ${choice.count}${choice.required ? ' required' : ' optional'}</p>`;
}

function milestoneMarkup(item) {
    return `<p class="codex-planned"><strong>${escape(item.name)}</strong><span>Not yet available</span></p>`;
}

function grantMarkup(entry) {
    return `<p><strong>${escape(entry.name)}</strong></p>`;
}

function referenceDescription(entry) {
    if (RULES.attributes.system !== 'NVSystem') {
        return entry.description;
    }
    if (entry.descriptionNVSystem) {
        return entry.descriptionNVSystem;
    }
    const title = value => value.charAt(0).toUpperCase() + value.slice(1);
    const legacyNames = { Strength: 'str', Dexterity: 'dex', Constitution: 'con',
        Intelligence: 'int', Wisdom: 'wis', Charisma: 'cha' };
    const saveType = Object.values(entry.effects || {}).find(effect => effect?.saveType)?.saveType;
    let description = entry.description;
    if (saveType) {
        description = description.replace(/\b(?:STR|DEX|CON|INT|WIS|CHA) saving throw/g,
            `${title(saveType)} saving throw`);
    }
    return description.replace(/\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/g,
        name => title(RULES.attributes.legacyToNew[legacyNames[name]]));
}

function cardMarkup(entry) {
    const cost = entry.resolveCost === 'variable' ? '1–3 Resolve'
        : entry.resolveCost ? `${entry.resolveCost} Resolve` : entry.usesPerShortRest
            ? `${entry.usesPerShortRest} / short rest` : 'Passive';
    return `<article class="codex-card${entry.known ? ' is-known' : ''}">
        <div class="codex-card-meta"><span>${escape(entry.actionType ? words(entry.actionType) : 'passive')}</span>
        ${entry.known ? '<span class="codex-known">Learned</span>' : ''}</div>
        <h4>${escape(entry.name)}</h4><p>${escape(referenceDescription(entry))}</p>
        <div class="codex-card-foot"><span>${escape(cost)}</span>
        ${entry.levelRequired || entry.tier ? `<span>Level ${escape(entry.levelRequired || entry.tier)}</span>` : ''}</div>
    </article>`;
}

export function renderCallingReference(model) {
    const { calling, reference, levels, specializations, sections, character } = model;
    return `<article class="calling-codex" aria-label="${escape(calling.name)} calling reference">
        <header class="codex-hero"><div class="codex-brand">NEXUS <span>◆</span> VERGE <small>FIELD CODEX / CALLINGS</small></div>
        <p class="codex-eyebrow">${escape(reference.eyebrow)}</p><h1>${escape(calling.name)}</h1>
        <p class="codex-subtitle">${escape(reference.subtitle)}</p>
        <div class="codex-hero-rule"></div><p class="codex-flavor">${escape(calling.flavor)}</p></header>
        <div class="codex-toolbar"><p>${character ? `${escape(character.name)} · Level ${character.level}${character.specialization ? ` · ${escape(character.specialization)}` : ' · Path not yet chosen'}` : 'A guide to levels 1–10 · Compare both paths'}</p>
        <a href="dedication.html" target="_blank" rel="noopener">Open full page</a></div>
        <section class="codex-intro"><p>${escape(calling.description)}</p>
        <dl><div><dt>Hit die</dt><dd>d${calling.hitDie}</dd></div><div><dt>Armour</dt><dd>${escape(calling.armorProficiencies.join(' · '))}</dd></div>
        <div><dt>Weapons</dt><dd>${escape(calling.weaponProficiencies.join(' · '))}</dd></div></dl></section>
        <section class="codex-section"><p class="codex-eyebrow">I · The road ahead</p><h2>A discipline becomes a calling</h2>
        <p>${escape(reference.growth)}</p><p>${escape(reference.foundation)}</p>
        <div class="codex-path-intros">${specializations.map(spec => `<section class="codex-path-intro${character?.specialization === spec.id ? ' is-chosen' : ''}"><p class="codex-eyebrow">Level ${spec.chosenAtLevel} · ${character?.specialization === spec.id ? 'Your path' : 'Specialization'}</p><h3>${escape(spec.name)}</h3><p>${escape(spec.flavorText)}</p></section>`).join('')}</div>
        <div class="codex-timeline" role="table" aria-label="Calling progression">
        <div class="codex-level-row codex-table-head" role="row"><div role="columnheader">Level</div><div role="columnheader">Shared discipline</div>${specializations.map(spec => `<div role="columnheader">${escape(spec.name)}</div>`).join('')}</div>
        ${levels.map(row => `<div class="codex-level-row${row.current ? ' is-current' : ''}" role="row">
        <div class="codex-level" role="rowheader"><span>${String(row.level).padStart(2, '0')}</span>${row.current ? '<small>YOU ARE HERE</small>' : ''}</div>
        <div class="codex-shared" role="cell"><span class="codex-mobile-label">Shared discipline</span>${row.shared.map(grantMarkup).join('')}${row.features.map(grantMarkup).join('')}${row.choices.map(choiceMarkup).join('')}${row.milestones.map(milestoneMarkup).join('') || (!row.shared.length && !row.features.length && !row.choices.length ? '<p class="codex-muted">Deepen your discipline</p>' : '')}</div>
        ${specializations.map(spec => {
        const path = row.paths[spec.id];
        return `<div role="cell"><span class="codex-mobile-label">${escape(spec.name)}</span>${path.grants.map(grantMarkup).join('')}${path.choices.map(choiceMarkup).join('')}${path.die ? `<p class="codex-die">Manoeuvre die <strong>${escape(path.die)}</strong></p>` : ''}${path.milestones.map(milestoneMarkup).join('')}</div>`;
    }).join('')}</div>`).join('')}</div>
        <aside class="codex-resolve"><h3>Resolve · the cost of conviction</h3><p>${escape(levels.flatMap(row => row.features).find(feature => feature.grantedResource)?.description)}</p>
        <p>Short and long rests restore your pool. Learned labels show your confirmed choices; unmarked cards are reference options.</p></aside></section>
        <section class="codex-section"><p class="codex-eyebrow">II · The arts of dedication</p><h2>Your arsenal of choices</h2>
        <nav class="codex-index" aria-label="Ability reference sections">${sections.map(section => `<a href="#codex-${escape(section.id)}">${escape(section.title.split(' · ').pop())}</a>`).join('')}</nav>
        ${sections.map(section => `<section class="codex-ability-section" id="codex-${escape(section.id)}"><h3>${escape(section.title)}</h3><p class="codex-section-intro">${escape(section.intro)}</p><div class="codex-card-grid">${section.entries.map(cardMarkup).join('')}</div></section>`).join('')}</section>
        <footer class="codex-footer"><span>NEXUS VERGE</span><p>Dedication · Levels 1–10 · A reference, not a character builder.</p><p>Milestones marked “Not yet available” do not currently grant their described combat benefit.</p><a href="legal/SRD_ATTRIBUTION.md">Rules attribution</a></footer></article>`;
}

export async function mountCallingReference(host, character = null, campaignId = 'core') {
    host.textContent = 'Opening the field codex…';
    try {
        catalogue ||= Promise.all(files.map(async name => {
            const response = await fetch(`data/${name}.json`);
            if (!response.ok) {
                throw new Error(`Unable to load ${name}`);
            }
            return [name, await response.json()];
        })).then(Object.fromEntries).catch(error => {
            catalogue = null;
            throw error;
        });
        const [data] = await Promise.all([catalogue, loadCampaigns()]);
        if (!host.isConnected) {
            return;
        }
        const filtered = { ...data,
            abilities: { abilities: { dedication: filterByCampaign(data.abilities.abilities.dedication, campaignId) } },
            traits: { traits: filterByCampaign(data.traits.traits, campaignId) },
            practices: { practices: filterByCampaign(data.practices.practices, campaignId) },
            specializations: { specializations: {
                dedication: filterByCampaign(data.specializations.specializations.dedication, campaignId)
            } } };
        host.innerHTML = renderCallingReference(buildCallingReference(filtered, 'dedication', character));
    } catch (error) {
        console.error('Calling reference unavailable:', error);
        host.textContent = 'The codex could not be opened. ';
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.textContent = 'Try again';
        retry.addEventListener('click', () => {
            void mountCallingReference(host, character, campaignId);
        });
        host.append(retry);
    }
}
