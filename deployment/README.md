# Web media release staging

The current production SWA workflow still deploys the repository root. The opt-in
`Web delivery package check` workflow only builds and checks a release artifact;
it does not deploy. The source of truth for this candidate media release is
`media-releases/combat-d9b7ff1f6eb7.json`. It records hashes and sizes for 107
published combat assets; a future lock alone does not grant publication rights. The 29
local ElevenLabs audio candidates are absent and bundled sounds remain the web
fallback. Do not upload audio from `data/audio/local/`.

The 32 overworld/cartographic PNGs directly under `data/graphics/` (about
57 MiB) are tracked in Git and included in `dist/app` on SWA. They are not in
the 107-file combat Blob lock or the private `approved-exports`
archive. This workflow does not move or delete them. Their committed versions
remain recoverable from Git; editable originals, if separate, need their own
source-art backup policy.

## Changing assets and preparing a release

1. Change the existing content references or replace an export in
   `data/graphics/combat/`, then run `npm run lock:web-media`. This builds the
   local preview, discovers referenced art and external GLB dependencies, and
   writes `media-releases/combat-<content hash>.json`. An unchanged asset set
   reuses the existing lock; the command refuses to change an existing lock.
   Review the selected files and attribution before publishing. A new export
   with the same filename still gets a new release ID when its bytes change.
2. Set `WEB_MEDIA_LOCK` to that new lock and run
   `node scripts/publish-web-media.mjs` without `--apply`. This verifies every
   local byte against the lock and makes no Azure changes. Upload can be
   resumed; the publisher checks existing blobs and refuses an overwrite.
3. Build the app and a same-origin local preview with
   `WEB_RELEASE_ID=<release-id> npm run build:web` and
   `npm run preview:web`. The preview is at `http://127.0.0.1:4173/`.
   Confirm cards, optional 3D, missing-art fallback, save/load and repeated
   encounters in a browser. The local preview has no cloud save API.
4. The CI app-only build uses `WEB_MEDIA_LOCK`, `WEB_MEDIA_ORIGIN`, and
   `WEB_REQUIRE_TRACKED_APP=1`. The tracked-source guard currently reports 32
   untracked runtime/config/lock files; review and commit only approved app
   sources before expecting a clean-checkout build. Never commit generated audio
   binaries, local credentials or source `.blend` files.

The checked-in lock records the exact published bytes and release URL. The
large source exports are currently untracked and Git LFS is not configured. The
107 approved runtime exports are now archived in private versioned Blob storage,
and the branch-bound CI identity is provisioned. The opt-in workflow can consume
that archive after the workflow files are committed and its three repository
variables are configured. Until then, an authorized operator must run the
publisher from the export workspace. Treat
the lock and the public immutable blobs as retained release records, not as a
backup of editable source art. Archive source exports and attribution records
separately before deleting local files. Do not automatically delete old Blob
release prefixes: open tabs and rollbacks may still refer to them.

`media-source-pipeline.bicep` now defines a separate **private** versioned
source-art account with `approved-exports` and `editable-sources` containers,
90-day blob/container soft deletion, and a GitHub OIDC identity bound to the
`main-beta-quests` branch. Its data roles are scoped to read approved exports
and write the public `media` container; it has no save-storage access. A custom
publisher role grants only container read plus blob read/write/add actions,
**not blob or container deletion**, to the CI identity and the named archive
operator. The operator's assignment is scoped to `approved-exports` only. It
was deployed in the existing `nexus-verge` resource group on 2026-09-29 after
Azure what-if showed ten creates and no planned changes to existing resources.
The 107 locked exports (438.52 MiB) were uploaded to private
`approved-exports`; all 107 blobs were listed under the locked release prefix.
Anonymous HTTP access to this account returned `PublicAccessNotPermitted`.
The `editable-sources` container is empty; editable source files still need a
reviewed archive and an independent backup location.
In-account soft deletion/versioning is a recovery layer, not a separate backup;
an independent source-art backup policy is still required.

For later releases, the release operator archives approved runtime exports
from the working directory with
`WEB_MEDIA_ACCOUNT=nexusvergeartsrc WEB_MEDIA_CONTAINER=approved-exports
WEB_MEDIA_LOCK=<lock> node scripts/publish-web-media.mjs --apply`. The same
command without `--apply` verifies hashes without writing. Editable source art
needs its own reviewed inventory and archive into `editable-sources`; it must
never be copied into the public `media` container. Keep the source inventory
tied to attribution and licensing records.

The opt-in `.github/workflows/web-media-release.yml` is prepared to fetch the
locked exports from private storage, verify their hashes, promote them to a new
immutable public prefix, verify public HTTP/CORS, build the app and retain an
artifact for review. It does **not** deploy SWA. It requires repository variables
`AZURE_MEDIA_CLIENT_ID` (from the Bicep output), `AZURE_TENANT_ID`, and
`AZURE_SUBSCRIPTION_ID`, as well as committed runtime/config/lock files. The
workflow is restricted to the federated release branch. Until that setup is
complete, the earlier operator-run publisher remains the working path. This
approach avoids putting large evolving art into ordinary Git history. Git LFS
remains an alternative if repository-based art review is preferred.
The 2026-09-29 private-to-public promotion dry run downloaded and hash-checked
all 107 archived exports without writing to the public account.

## Azure preview after art approval

The separate Hot Blob account `nexusvergemedia` and `media` container have been
created in `nexus-verge` from `media-storage.bicep`. The 107 assets in the first
locked release were uploaded on 2026-09-28 and passed the live HTTP verifier.
Blob-level anonymous read allows a visitor with a file URL to download it, but
does not allow anonymous
listing or writing. Shared-key access is disabled; upload uses a narrowly
scoped Storage Blob Data Contributor assignment. The private `nexusvergesaves`
account is separate. The storage template currently allows the production SWA
origin for CORS; add each preview origin before browser testing there. Do not
put saves or API responses on this origin.

Set `WEB_MEDIA_ACCOUNT` and `WEB_MEDIA_LOCK`, then run
`node scripts/publish-web-media.mjs --apply`. The command checks all local hashes
before any write, uploads with no-overwrite conditions, and verifies existing
blobs before resuming a partial publication. Its Azure CLI calls use Entra
login and require Storage Blob Data Contributor on the media account.

For direct Blob pilot delivery, set `WEB_MEDIA_ORIGIN` to
`https://nexusvergemedia.blob.core.windows.net/media/`. Run
`WEB_MEDIA_LOCK=deployment/media-releases/combat-d9b7ff1f6eb7.json
WEB_MEDIA_ORIGIN=<origin> WEB_APP_ORIGIN=<swa-origin>
node scripts/verify-web-media.mjs` to check every published response, MIME,
length, immutable caching, a real 404 and browser CORS preflight. The exact
command can be entered as environment variables on one line. Then manually run
the opt-in GitHub workflow with those origins; it uploads `dist/app` for review.
No deployment switch occurs in that workflow.

For each later asset revision, repeat the lock, dry run, publish, HTTP verify,
app-only build and preview steps in that order. Publish media before changing
the app manifest to its new release ID; rollback the app artifact to its old
lock while retaining both Blob prefixes. Review storage inventory periodically
and agree a retention window before deleting unreferenced releases.

Before public release, configure the Front Door Standard media route, rerun the
HTTP/CORS verifier through its hostname, conduct cold/warm browser playthroughs
and a rollback drill, and record actual traffic cost. Publish media before the
SWA app that refers to it. Keep old release prefixes available to open tabs and
rollback builds. Only after sponsor acceptance should the existing SWA workflow
be changed to upload `dist/app`.

Architecture and gates: `../docs/plans/2026-09-27-web-delivery-architecture.md`.
Backlog: [web delivery #53](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/53),
[audio rights #54](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues/54).
