# Server-Held Saves

**Status:** Approved (2026-08-15). Code is written and behind a flag; `RULES.saves.backend` still defaults to `'local'`. Rollout steps 1 and 3 are **done** — Azure infrastructure exists and the storage layer is verified against it (see Rollout). Steps 2, 4, and 5 (deploy, local playtest, production cutover) are outstanding, and **no player-facing behaviour has changed**. Authoritative record of what exists is ADR-017 in `.claude/rules/architecture.md`; operational setup is `docs/CLOUD_SAVES_SETUP.md`.

## Goal

The website holds the player's character and world. No downloading a `.json` file, no re-uploading it on the other device, no "don't clear your browser data or you lose your run."

Explicitly **not** a goal: making saves trustworthy. The rules engine runs entirely client-side, so the server stores whatever the client submits. Leaderboards, verified runs, or anti-cheat would need server-authoritative combat — a different project, weeks-to-months, not this one.

## Starting position

Better than expected, which is why this was days rather than weeks:

- `SaveManager` already separated serialization from storage — only 6 methods touched `localStorage`.
- `api/` was already scaffolded (host.json, package.json) and `api_location: "api"` was already set in the SWA deploy workflow, so Functions ship without touching CI.
- `serializeWorld()` already drops terrain (regenerated from seed) and stores sparse fog-of-war, so payloads are small enough for one blob per slot.
- The save/load UI had **already decayed to file export/import only** — `renderSaveSlots`/`renderLoadSlots` rendered nothing but a download and an upload button, and `saveToSlot`/`loadFromSlot`/`getSaveSlots`/`quickSave` had no UI callers at all. There was no live synchronous slot UI to break, which removed most of the anticipated async-migration risk.

## Decisions

### 1. No identity provider

Azure SWA's Free plan preconfigures only GitHub and Microsoft Entra ID. Custom providers (Google, any OIDC) require the **Standard plan**, and registering any custom provider **disables all preconfigured ones**.

| Option | Rejected because |
|---|---|
| Entra ID | "Sign in with your Microsoft work account" is a terrible front door for a CRPG |
| GitHub | Free and zero-code, but the players aren't developers |
| Google / custom OIDC | Standard plan (~$9/mo), and still gates play behind a login |

**Chosen:** the server issues the identity. No provider, no login wall, no PII — which also keeps this clear of the legal-compliance surface area.

### 2. Identity = player name + recovery code, both required

Originally specced as a code alone (100 bits, unguessable). Revised on review: a single value is a single point of both failure and exposure — codes get screenshotted, pasted into Discord, shoulder-surfed.

- **Player name** — chosen by the player. Normalized for key derivation: NFKC, trimmed, internal whitespace collapsed, lowercased.
- **Recovery code** — server-minted, 20 Crockford base32 chars (~100 bits), displayed `NV-XXXXX-XXXXX-XXXXX-XXXXX`. Crockford because it excludes I/L/O/U; the normalizer maps the ambiguous glyphs back to their digits so a player copying by eye lands in the right place.

Storage key is `HMAC-SHA256(username + ":" + code, SAVE_TOKEN_SECRET)`. Consequences, all deliberate:

- Code alone unlocks nothing.
- The raw code never appears in storage — a storage-side breach yields no usable credential.
- No password reset. Losing both loses any save not cached on a device.
- Changing the name moves the saves (it's an input to the key), via `POST /api/player/rotate`.

**The failure mode to watch:** a name/code that doesn't match shows an *empty save list*, not an error — the server cannot distinguish "wrong name" from "new player." Client and server normalization must stay byte-identical forever. This is the single most important invariant in the feature and is the reason the identity tests exist.

### 3. One code covers all 5 slots (account-level, not per-save)

| | Account-level (chosen) | Per-save code |
|---|---|---|
| Player manages | 1 name + 1 code | Up to 5 codes |
| Load screen | Server returns all slot metadata → real slot list works | **Breaks** — no "my saves" concept; every slot needs a code typed first |
| Losing credentials | Loses everything not on a device | Loses one run |
| Sharing a run | Not possible without handing over everything | Natural |

The load-screen row decided it. Sharing a single run is already served by the export file, which stays as a deliberate second mechanism — a snapshot, not an identity. Don't merge the two.

### 4. Fork behind a flag, per ADR-015

`RULES.saves.backend` (`'local'` | `'cloud'`). The local path stays byte-identical and fully functional. `'local'` is the default and the rollback path.

`SaveManager` keeps serialization and gives up persistence entirely, to a store contract: `getSlots()` / `read(slot)` / `write(slot, save, metadata)` / `remove(slot)`, all async. No `localStorage` reference may return to `SaveManager`.

### 5. Cloud wraps local as a write-through cache

`CloudSaveStore` does not replace `LocalSaveStore` — it holds one and writes to it **first**, then to the API. Every cloud path falls back to the cache on failure.

Writes return `{ synced, warning }` so the UI can say "saved on this device only" rather than reporting a false success. A player who never sets a name plays normally; saves just stay local. This is what makes an unreachable API a degradation rather than data loss.

## Constraints discovered in the Azure docs

Each of these changed the implementation:

| Constraint | Consequence |
|---|---|
| SWA managed functions allow **HTTP triggers/bindings only** | Blob access uses the `@azure/storage-blob` SDK directly — no input/output bindings |
| Node 18 EOL'd May 2025; SWA supports `node:20`/`node:22` | `platform.apiRuntime` added to `staticwebapp.config.json`; `api/package.json` bumped to `>=20` |
| Functions v4 Node model needs a `main` field | Added (`src/functions/*.js`) — the app registers nothing without it |
| Reserved app-setting prefixes (`AZUREBLOBSTORAGE_`, `AZURE_FUNCTION_`, `WEBSITE_`, `FUNCTIONS_`, `AzureWeb*`) | Settings named `SAVE_STORAGE_CONNECTION` / `SAVE_TOKEN_SECRET` to avoid them |

## Azure resources

One new resource. A storage account (StorageV2, Standard_LRS, Hot) — the container auto-creates. Plus two app settings. **No** Entra registration, Key Vault, Cosmos, or Standard plan; the SWA Free plan is sufficient and managed Functions are included. Cost is a few cents a month.

## What is built

| Area | |
|---|---|
| `api/src/identity.js` | Code generation, normalization, key derivation |
| `api/src/store.js` | Blob layout `{playerKey}/index.json` + `{playerKey}/slot-{n}.json`; player move for rotation |
| `api/src/functions/saves.js` | `POST /api/player`, `POST /api/player/rotate`, `GET /api/saves`, `GET|PUT|DELETE /api/saves/{slot}` |
| `src/systems/PlayerIdentity.js` | Client-side name/code storage, register, adopt, rotate |
| `src/systems/saveStores/` | `LocalSaveStore`, `CloudSaveStore`, shared slot metadata |
| `src/systems/SaveManager.js` | Serialization only; async store contract |
| `src/main.js` | Restored 5-slot save/load UI, identity + device-linking panels |
| Tests | 19 new — code normalization round-trips, ambiguous-glyph mapping, name/code both-required key derivation, offline fallback, 404-as-empty |

Full suite: 579 passing, 0 lint errors.

## Rollout

The cutover is a human decision, not a milestone (ADR-015). Order:

1. ✅ **Done 2026-08-15.** Storage account `nexusvergesaves` (Standard_LRS, StorageV2, Hot, West Europe, TLS 1.2 min, public blob access disabled, 30-day soft delete) created in RG `nexus-verge`. `SAVE_STORAGE_CONNECTION` and `SAVE_TOKEN_SECRET` set on SWA `Nexus-Verge-CRPG` (Free plan).
2. ⬜ Deploy with the flag still `'local'` — confirms the Functions app builds and the v4 model registers under SWA's managed runtime, with zero player-facing risk. **This is the next step and it needs a commit + push.**
3. ✅ **Done 2026-08-15**, at the storage layer. A live integration run against the real account verified: container auto-creation, byte-exact save round-trip, index listing, unwritten slot reading as `null`, **wrong username seeing nothing**, **wrong code seeing nothing**, rotation moving all blobs with the old key ceasing to resolve, and delete. 10/10 passed; test blobs cleaned up. The HTTP/Functions-host layer above `store.js` is still unverified and is what step 2 exercises.
4. ⬜ Flip `RULES.saves.backend` to `'cloud'` locally and play a real session end to end.
5. ⬜ Flip in production, with `'local'` as the documented rollback.

**Back up `SAVE_TOKEN_SECRET` somewhere durable before step 1.** Every save's storage path derives from it — rotating it orphans every save simultaneously, with no way to find them again. It is not a credential that can be cycled on a schedule, and that is a permanent operational constraint, not a launch-week caveat.

## Known limitations, accepted

- **Last-write-wins across devices.** Two devices saving to one slot: the later write wins, no merge, no conflict prompt. Acceptable for single-player; revisit if it bites.
- **No recovery if both values are lost** and no device holds a cached copy. Deliberate — the alternative is collecting an email.
- **`index.json` read-modify-write races** on simultaneous saves. Same tolerance as above.
- **Bearer-style credential**: whoever holds name + code holds the saves. Rotation exists for the "I leaked it" case.

## Deferred, not rejected

- **Passkeys/WebAuthn** as a second recovery factor — no provider, no password, syncs via iCloud/Google Password Manager. Binds to the same derived key, so nothing here is wasted if it happens.
- **Email binding** as an alternative recovery path, if players actually lose codes in practice.
- **Autosave to the cloud.** `quickSave()` still has no callers; wiring autosave is a separate decision about cadence and write volume, not a gap in this work.
