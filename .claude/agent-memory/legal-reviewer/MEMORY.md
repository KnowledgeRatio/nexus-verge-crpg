# Legal Reviewer - Persistent Memory

## Project Legal Status (as of 2026-03-15)

### Audit Complete - Key Findings
- All monsters confirmed SRD-compliant (no Product Identity monsters found)
- Two critical issues identified: unverified audio license + "D&D" trademark in HTML title/subtitle
- `data/campaigns.json` contains "Ravenloft" and "mistsOfRavenloft" references (disabled template but still in shipped code)
- `package.json` uses "D&D 5e" in description field (npm-facing, low risk but should be fixed)

### Key File Locations
- Legal docs: `legal/SRD_ATTRIBUTION.md`, `legal/ASSET_ATTRIBUTIONS.md`, `legal/THIRD_PARTY_NOTICES.md`
- SRD attribution: Complete with correct CC BY 4.0 links and WotC trademark notice
- In-game legal modal: Present in `index.html` at `id="legalModal"` — properly structured
- Audio assets: 13 files from Thomas Devlin (tommusic.itch.io) — LICENSE NOT VERIFIED

### Monster List Verified (all SRD-safe)
Goblin, Wolf, Skeleton, Orc, Bandit, Zombie, Giant Rat, Bugbear, Commoner, Kobold, Stirge, Giant Spider, Dire Wolf, Gnoll, Shadow, Scout, Ghoul, Giant Hyena, Specter, Spy, Ogre, Ghast, Berserker, Gargoyle, Minotaur, Wight, Owlbear, Veteran, Flameskull, Ettin, Troll, Wraith, Hill Giant, Young White Dragon, Young Green Dragon, Young Red Dragon, Goblin Archer, Bandit Crossbowman, Manticore, Mage, Medusa

### Callings Legal Status
Dedication, Scholar, Wanderlust — original class names, no trademark concerns.
Classes.json also references Pact, Bond, Oath, Instinct (all original names, not in SRD, no trademark issue).

### Trademark Issues Found
1. `index.html` title tag: "Nexus Verge - D&D 5e Roguelike CRPG" — MEDIUM RISK
2. `index.html` subtitle text: "A 5E Roguelike Roleplaying Game" — OK (5E is not a trademark)
3. `README.md` uses "D&D 5e" extensively — borderline, referential use acceptable
4. `package.json` description: "implements D&D 5e 2024 rules" — low risk (internal npm metadata)
5. `data/campaigns.json` "ravenloft" and "mistsOfRavenloft" — BLOCKER (WotC Product Identity)
6. `data/campaigns.json` "dark-sun" — BLOCKER (WotC Product Identity campaign setting)

### Audio License Gap (BLOCKER)
ASSET_ATTRIBUTIONS.md notes: "Please verify specific license terms at source"
No confirmed license type (CC, commercial, royalty-free) documented for Thomas Devlin assets.
Must obtain written confirmation before commercial release.
