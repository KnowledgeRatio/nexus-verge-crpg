# Nexus Verge
## Procedural D&D 5e Roguelike CRPG

Nexus Verge is a browser-based, procedurally generated CRPG inspired by D&D 5e SRD 5.2.1.

This README is dual-purpose:
- Deployment and sharing guide (Azure Static Web Apps)
- Player manual (how to play, controls, progression, and strategy)

---

## Deploy The Game (Azure Static Web Apps)

This project is deployed via GitHub Actions to Azure Static Web Apps.

### Current Deployment Model

- Hosting: Azure Static Web Apps
- Branch: `main-beta-quests`
- Workflow: `.github/workflows/azure-static-web-apps-victorious-stone-02afeaa03.yml`
- Deployment token secret: `AZURE_STATIC_WEB_APPS_API_TOKEN_VICTORIOUS_STONE_02AFEAA03`
- App location: `/`
- API location: `api`
- Build: skipped (`skip_app_build: true`)

### One-Time Setup

1. In Azure Portal, create Static Web App:
   - Name: `swa-nexus-verge-prod`
   - Source: GitHub
   - Repo: `KnowledgeRatio/nexus-verge-crpg`
   - Branch: `main-beta-quests`
   - Build preset: Custom
   - App location: `/`
   - API location: `api`
   - Output location: empty
2. Let Azure auto-create the workflow and secret.
3. Verify workflow exists in `.github/workflows/`.

### Deploy Updates

```bash
git add .
git commit -m "Update Nexus Verge"
git push origin main-beta-quests
```

A push to `main-beta-quests` triggers deployment automatically.

### Verify Deployment

1. Open GitHub Actions and confirm latest workflow run is green.
2. Open production URL.
3. Verify:
   - Main menu loads
   - New Game flow works
   - Data files load (no `/data/*.json` 404 errors)

### PR Preview Deployments

Opening a PR to `main-beta-quests` creates a preview environment automatically.

Use preview URLs for QA before merge.

### Common Deployment Issues

#### Invalid API token
- Regenerate token in Azure Static Web App -> Manage deployment token.
- Update GitHub secret.
- Re-run failed workflow.

#### Data files return 404
- Ensure all `data/*.json` files are committed.
- Confirm no incorrect exclusions in deployment steps.
- Trigger redeploy:

```bash
git commit --allow-empty -m "Force redeploy"
git push origin main-beta-quests
```

---

## Share The Game

### Public URL

Set this once and keep it current:

- Production URL: `https://<your-app>.azurestaticapps.net`

If you do not know the current URL:
1. Open Azure Portal.
2. Go to Static Web App resource `swa-nexus-verge-prod`.
3. Copy the `URL` value from Overview.
4. Update the line above in this README.

### Fast Share Text

Use this message when sharing with testers or players:

```text
Play Nexus Verge in your browser:
https://<your-app>.azurestaticapps.net

No install needed. Create a character, explore, fight, and survive.
Press H in-game for quick help.
```

---

## Local Run (Development)

Requirements:
- Modern browser (Chrome, Edge, Firefox, Safari)
- Optional local server for best behavior

Run locally:

```bash
git clone <repository-url>
cd nexus-verge-crpg
python -m http.server 8000
```

Open `http://localhost:8000`.

---

## Player Manual

## 1. Core Loop

1. Start a new run with a seed.
2. Create a character.
3. Explore regions.
4. Fight encounters.
5. Loot, quest, trade, and level up.
6. Manage rests and resources.
7. Survive and progress campaign quests.

## 2. New Game Setup

At game start:
- Enter a seed (or use random)
- Choose map size and difficulty
- Proceed to character creation

Seed-based generation means the same seed produces the same world layout.

## 3. Character Creation

Choose:
- Culture
- Background
- Calling
- Ability score method
- Skills and proficiencies

### Cultures In The Game

- Kethara
- Vaethori
- Verathi
- Delhari
- Sirathi
- Vethri

### Callings

- Dedication: martial, STR + CON, uses Focus
- Curiosity: caster, INT + CON, uses Mana + Arcane Recovery
- Audacity: hybrid, DEX + CHA, uses Mana

### Classes In The Game

The game uses callings as classes:

- Dedication
- Curiosity (coming soon label shown in class data)
- Audacity (coming soon label shown in class data)

### Ability Scores

- Uses D&D-style modifiers: `floor((score - 10) / 2)`
- Stats affect hit chance, damage, defenses, and checks

## 4. Controls

### Exploration

- Move: `WASD` or arrow keys
- Inventory: `I`
- Character sheet: `C`
- Quest log: `Q`
- Rest menu: `R`
- Enter settlement: `E`
- Help: `H`
- Zoom: `+` / `-`
- Save menu: `ESC`

### Combat

- Click action buttons (Attack, Off-Hand, End Turn, Flee)
- Click target enemy card
- Follow initiative order shown in the tracker

## 5. Combat Basics

- Turn order uses individual initiative rolls.
- Action economy uses Action, Bonus Action, and Reaction concepts.
- Two-weapon fighting uses off-hand attacks as bonus actions.
- Weapon masteries are active when proficient with the weapon.
- Flee check scales with danger.

### Weapon Mastery Note

The game is non-grid combat. Movement-only tabletop effects are adapted to meaningful non-grid effects.

## 6. Exploration, Settlements, and Quests

### Exploration

- Move across procedural terrain
- Trigger encounters while traveling
- Reveal and revisit generated regions

### Settlements

At ordinary or fully restored settlements you can:
- Rest (especially long rest in safe locations)
- Buy and sell gear
- Accept quests
- Interact with NPCs

Some settlements begin under hostile occupation, usually in neighbouring patches with occasional isolated sites. Their map marker is crossed swords. **Entering starts combat**; victory opens a local exploration challenge and a survivor conversation. Choose a repair or relief crew to help with later rebuilding checks.

Liberation changes the marker to tools, but services remain closed until you finish three local recovery projects, including a relief commission. The first project becomes available after two long rests elsewhere; each completed project takes another two long rests before the next. Failed rebuilding checks delay retry by one long rest. Progress and choices survive saving, and restoration opens the existing settlement rather than adding another town.

### Quests

- Main campaign quests progress major story beats
- Side quests offer XP, gold, and item rewards
- Use **Track** in Quest Log (`Q`) to follow one active quest; **Untrack** clears it. The overworld/dungeon HUD and world map show the next required step.
- Guidance reflects information actually received: an exact entrance, a search area, a reported direction from the giver, or an unknown location. Finding the site makes its location exact. Once required fieldwork is done, guidance returns to the giver; optional investigation is not required for that return step. Tracking survives saving and clears when the job ends.
- Drag the world map with a mouse, touch or pen to inspect offscreen guidance; mouse-wheel zoom remains available.
- Newly generated town jobs can combine investigation, combat and recovery, with visible consequences for local danger, supplies or discovered places.
- Urgent jobs start their countdown when accepted. Long rests advance it; completing the required work stops it before you return for payment. Check the journal before resting or abandoning work.
- Some jobs unlock a single enchanted item for sale. This is a shop opportunity, with its price shown, rather than a free item reward.
- Quest standing rewards name the cultures that benefit. Offers preview the reward; turn-in reports the actual change after score limits. The character sheet shows current culture standing. If a required community cannot be identified, completion still pays its other rewards and clearly reports that standing was unavailable.

## 7. Resources, Rest, and Survival

- HP and resources are limited between fights.
- Short rest supports tactical sustain.
- Long rest restores more, but depends on safe context.
- One long rest advances the shared quest and rebuilding clock by one week. Short rests, travel and real time do not advance it. You can long-rest at a safe inn while fully recovered, still consuming supplies and advancing urgent deadlines; hostile and rebuilding settlements cannot provide that rest.
- Poor rest and repeated strain can lead to fatigue pressure.
- Merchants sell Expedition Supplies that refill your supply meter directly, up to its carry limit. One supply supports one camp action or one long rest.
- New worlds contain edible plants and game tracks on wilderness ground, plus provision clues at some shelters. On a supply object, press **E** or use touch **Interact** to gather with Survival; it does not provide shelter or rest. Shelter clues also open through the rest menu. Each site allows one attempt per run; success adds one supply. Full supplies and cancelling preserve the opportunity. Resting or reloading never refreshes it. Plant/track symbols appear over visible terrain and dim when spent; a green `+` marks an available revealed shelter source. Provisioning is intended to extend travel where buying supplies is difficult.
- Perception can detect dungeon traps. Avoiding leaves a marked, armed trap; stepping onto it again deals damage once and spends it. Before leaving, press `E` or use **Interact** to attempt Finesse disarming. Successfully disarmed traps are safe.

Use rests proactively, not only at crisis.

## 8. Progression

- Gain XP from combat and quest completion.
- Level progression is tuned for a 1-10 campaign arc.
- Callings branch into specializations after early levels.

## 9. Practical Starter Tips

- Prioritize accuracy and survivability early.
- Do not hoard healing options too long.
- Use settlements regularly to stabilize runs.
- Pick fights based on current HP/resources, not only reward.
- If a run turns risky, disengage and reset position rather than forcing every encounter.

---

## Architecture Snapshot

- Frontend: Vanilla JavaScript (ES modules)
- Rendering: HTML5 Canvas + DOM UI
- Data source: JSON files in `data/`
- Rules and tunables: `src/core/rulesEngine.js`
- State model: Observer pattern through game state subscriptions
- World generation: Seeded deterministic generation for map content

---

## Project Structure

```text
nexus-verge-crpg/
|- index.html
|- styles.css
|- src/
|  |- main.js
|  |- core/
|  |- systems/
|  |- rendering/
|  |- ui/
|  |- utils/
|- data/
|- docs/
|- legal/
|- api/
```

---

## Legal

- License: MIT (`LICENSE`)
- Rules content basis: D&D SRD 5.2 (CC BY 4.0)
- SRD attribution: `legal/SRD_ATTRIBUTION.md`
- Third-party notices: `legal/THIRD_PARTY_NOTICES.md`
- Asset attributions: `legal/ASSET_ATTRIBUTIONS.md`

Compliance commands:

```bash
npm run legal:verify
npm run legal:generate
```

---

## Supporting Docs

- Deployment quick start: `docs/AZURE_DEPLOYMENT_QUICK_START.md`
- Deployment runbook: `docs/AZURE_DEPLOYMENT_RUNBOOK.md`
- Architecture: `.claude/rules/architecture.md`
- Changelog: `docs/CHANGELOG.md`
