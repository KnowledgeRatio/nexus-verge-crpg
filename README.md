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
- Scholar: caster, INT + CON, uses Mana + Arcane Recovery
- Wanderlust: hybrid, DEX + CHA, uses Mana

### Classes In The Game

The game uses callings as classes:

- Dedication
- Scholar (coming soon label shown in class data)
- Wanderlust (coming soon label shown in class data)

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

At settlements you can:
- Rest (especially long rest in safe locations)
- Buy and sell gear
- Accept quests
- Interact with NPCs

### Quests

- Main campaign quests progress major story beats
- Side quests offer XP, gold, and item rewards
- Track objectives and progress in Quest Log (`Q`)

## 7. Resources, Rest, and Survival

- HP and resources are limited between fights.
- Short rest supports tactical sustain.
- Long rest restores more, but depends on safe context.
- Poor rest and repeated strain can lead to fatigue pressure.

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
