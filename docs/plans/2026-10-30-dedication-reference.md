**Status:** Implemented — 2026-10-30 (local implementation; browser and print visual acceptance outstanding).

# Dedication reference page implementation plan

**Goal:** Give players a branded HTML reference for Dedication's two pathways, levels 1–10, and ability choices, accessible as an additional character-sheet page.

**Architecture:** A shared read-only renderer serves `dedication.html` and the character sheet. Load existing JSON catalogues; derive progression and choice pools from live progression data. Avoid legacy class feature descriptions. Use scoped teal, parchment, brass and oxblood styling, existing illustrated environment art, responsive pathway rows and printable ability cards. The reference never changes character choices.

**Tech stack:** Native HTML, CSS and ES modules; Vitest. No dependencies or Git operations.

1. Test the reference model with production JSON: shared unlocks, subclass grants and choices, optional practices, current/selected status for restored plain characters, and escaped text.
2. Implement the model, shared HTML renderer and recoverable asynchronous loader. Include complete ability, aura, fighting-style and practice catalogues.
3. Add the standalone HTML page and character-sheet page navigation. Include standalone files in the existing web packaging allowlist.
4. Verify relevant tests, full JavaScript tests, lint/build, and desktop/mobile browser navigation and presentation. Record any unavailable checks exactly.
5. Hand settled changes and validation evidence to the documentation agent; inspect its scoped updates. Leave all changes unstaged.

## Presentation decision

Use a single scrolling codex page with a comparison timeline and visible ability cards. A separate static hand-authored sheet would drift from game data; a full build planner adds decisions beyond this request. Keep both subclass paths visible and mark the current character's level and selected path without implying future abilities have been learned.

## Local implementation and verification

`dedication.html` and the character sheet's **Dedication pathways** page share `src/ui/CallingReference.js`; `data/callingReferences.json` supplies reference section metadata and explicitly unavailable milestones. The standalone page has a Print / Save as PDF control. Its rules load from the served JSON files; it does not read a saved character. The web build's application file list includes the HTML and CSS.

Focused validation passes 20 tests across three files covering the calling reference, quest-reputation sheet subscriptions and iconography; scoped ESLint reports no errors. Regressions construct a real `Character`, serialize it to a plain object and check learned choices without mistaking the attribute-score bag for an ability list, alongside level-3 d6 manoeuvre-die and saving-throw attribute labels. The final `build:web` run passed with 371 application files. A full run with two thread workers completed with 155 passing/6 failing files and 1,728 passing/18 failing tests; reported failures concern missing agent-skill parity files, a missing Azure CLI, retained asset hashes and `BuildingInteriorArt`, outside this reference change. Broader lint checks also fail elsewhere in the repository. All 14 standalone-page resources return HTTP 200 from the local web preview. Browser access was unavailable and native-app approval timed out, so desktop/mobile navigation, layout and printed output have not received visual acceptance. No deployment is claimed.
