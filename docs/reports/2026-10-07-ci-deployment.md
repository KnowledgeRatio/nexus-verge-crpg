# CI deployment investigation — 7 October 2026

Status: repair prepared locally; no commit, push, deployment, secret change, or
Azure resource change has been performed. Live GitHub verification is pending.

## Observed failures

- The latest production push at `7381458` passed Tests, Legal Compliance and
  Security Scan, but [Azure deployment failed](https://github.com/KnowledgeRatio/nexus-verge-crpg/actions/runs/37238549916).
  Four examined push logs fail after selecting `staticwebapp.config.json`, with
  `An unknown exception has occurred`, before API build or upload progress.
- [PR security scanning](https://github.com/KnowledgeRatio/nexus-verge-crpg/actions/runs/37238283658)
  completes its scan and artifact uploads, then fails while commenting:
  `Resource not accessible by integration` (HTTP 403).
- [PR cleanup](https://github.com/KnowledgeRatio/nexus-verge-crpg/actions/runs/37238549874)
  fails with `No matching static site found`. Azure lists no preview environments.
- The last successful push run is 1 March, `3230ad1`; the next push, `2848ff9`,
  fails. Their historical job logs have expired (GitHub HTTP 410), so the original
  March trigger cannot be established from those logs. Later defects must not be
  presented as proof of the original cause.

## Verified current defects

1. The workflow uploads the repository root after deleting `.claude`, but retains
   twelve tracked `.agents/skills` symlinks pointing inside that deleted directory.
   These become dangling links in the deployment input.
2. Tracked `data/` files alone total about 907 MiB. The existing Azure resource is
   Free tier. The root deployment includes oversized media and authoring files;
   `.staticwebappignore` is not an explicit release package.
3. GitHub resolves `Azure/static-web-apps-deploy@v1` to tag commit
   `1a947af9992250f3bc2e68ad0754c0b0c11566c9`. Its action manifest does not declare
   `github_id_token`, producing a warning. The maintained branch commit
   `4d27395796ac319302594769cfe812bd207490b1` declares it. Both wrappers invoke the
   same container client, so the warning alone does not prove OIDC was ignored.
4. The PR security comment requires write permission its token does not have.

The Azure resource exists at the expected hostname, points to this repository
and `main-beta-quests`, and has no recent resource-group activity in the checked
seven-day window. The deployment secret name exists and was last updated on
3 January. Its value was not read. A stale or malformed secret remains an
unverified possibility; the generic exception does not establish that diagnosis.

## Prepared repair

- Use the existing tracked `build:web` pipeline and
  `deployment/media-releases/combat-d9b7ff1f6eb7.json` lock, with the already
  published `https://nexusvergemedia.blob.core.windows.net/media` origin.
- Verify legal artifacts, tracked sources, package size, all published media
  responses and production CORS before deploying `dist/app`. Keep `api/` as the
  separate managed Functions source.
- Pin the maintained Azure action. Obtain OIDC through the bundled Actions
  client, eliminating the ad hoc npm installation. Mask and trim the existing
  deployment token; fail explicitly for missing tokens or embedded whitespace.
- Validate PR packages and upload a review artifact. Deploy only on branch
  pushes. Automatic PR preview creation/cleanup is removed because Blob CORS
  currently permits only the production origin. This is the proposed default;
  automatic previews require a separate origin/CORS decision.
- Publish security reports to the Actions run summary and retain existing
  artifacts, removing the failing PR-comment request without broadening access.

This activates the staged media-delivery path when pushed. Sponsor review is
required before that deployment cutover; preparing these files does not claim
completion of all browser, rollback or Front Door acceptance work for issue #53.

## Validation

- A fresh local clone of committed `7381458`, without worktree changes, builds
  successfully using only Node and tracked sources: **175 files, 66,105,306 bytes
  (63.04 MiB)**. The artifact contains no symlinks, `.blend`/`.psd` sources,
  agent/tooling directories, Git metadata, root dependencies or API source.
- All **107** existing public media entries pass live HTTP size, MIME and
  immutable-cache checks; missing media returns 404 and production CORS passes.
- `actionlint` 1.7.12 accepts both modified workflows. The actual credential-step
  script passes checks for whitespace trimming, missing/invalid token rejection
  and OIDC outputs. `git diff --check` passes.
- `npm run legal:verify` passes (12 checks; existing SBOM-age and attribution
  warnings remain).
- A headless desktop browser opens the clean package, completes real character
  creation using a preset, saves and loads a local slot, and downloads a locked
  5,218,564-byte model from Blob. App requests are fulfilled locally at the
  production browser origin; media requests use the real service and CORS.
  No app JavaScript exceptions or HTTP errors are observed in that flow.
- Mobile pointer testing at 390 × 844 finds the existing footer intercepting
  the character wizard's Next button. The packaged stylesheet is unchanged;
  this is recorded separately from deployment verification, not counted as a
  successful mobile pointer playthrough.
- `npm test` initially reports 1,242 passes and two five-second rendering-test
  timeouts. Both affected suites pass in isolation (14 tests). A bounded-worker
  full rerun still hits timeouts, including media promotion. A serial run reports
  1,243 passes and one skeleton-animation timeout. These are local timing
  failures, not passing full-suite evidence.
- `npm run lint` reports 205 errors and 1,057 warnings in both the worktree and
  untouched `7381458` clone. `npm run lint:all` reports 3,281 errors and 1,817
  warnings across existing broader paths. No JavaScript, test or lint
  configuration is changed by this repair.

## Remaining live verification

Review and commit only the CI repair files, leaving the separate blood-damage
worktree changes out. Run the PR/package check, then obtain approval for a push
to the deployment branch and verify the Azure job actually succeeds. Check
the deployed shell, combat media and save API. If Azure still rejects site
authorization, refresh only the deployment secret from the correct app's
current token; do not rotate save identity secrets or recreate the resource.
