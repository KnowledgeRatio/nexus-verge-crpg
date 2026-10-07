# GitHub Actions Workflows

## Azure Static Web Apps deployment

`azure-static-web-apps-victorious-stone-02afeaa03.yml` validates a release package
on pushes and pull requests targeting `main-beta-quests`. Only pushes deploy to
the production Static Web App; PRs upload a `web-app-release` artifact for review.

The workflow installs locked dependencies, verifies legal artifacts, and runs
the existing `build:web` script with the tracked
`deployment/media-releases/combat-d9b7ff1f6eb7.json` lock. It verifies all published
media responses and production CORS before uploading `dist/app`. The `api/`
directory remains a separate managed Functions deployment for saves.

The release uses the existing public media origin
`https://nexusvergemedia.blob.core.windows.net/media`. Changing that origin or lock
requires publishing and verifying the media first. The current media CORS policy
allows the production hostname only; automatic PR browser previews are disabled
until their origins are explicitly supported. PR checks require no deployment
secret, including for forked PRs.

The maintained Azure action is pinned to
`4d27395796ac319302594769cfe812bd207490b1`, which declares `github_id_token`.
The ambiguous `@v1` reference previously resolved to an older tag that did not
declare this input. OIDC uses the bundled Actions client; no ad hoc npm installation is
needed. The existing
`AZURE_STATIC_WEB_APPS_API_TOKEN_VICTORIOUS_STONE_02AFEAA03` secret is also passed
after masking and trimming surrounding whitespace. Empty tokens and embedded
whitespace produce a specific error before Azure runs.

Do not upload the repository root or rely on `.staticwebappignore`. The old
directory-removal step left dangling skill symlinks after deleting `.claude`;
tracked media and authoring files also exceeded the Free-plan package limit.
The allowlisted builder copies regular app files, excludes authoring/tooling
directories, checks tracked sources, and enforces its package-size budget.

### Local validation

```bash
npm run legal:verify
WEB_MEDIA_LOCK=deployment/media-releases/combat-d9b7ff1f6eb7.json WEB_MEDIA_ORIGIN=https://nexusvergemedia.blob.core.windows.net/media WEB_REQUIRE_TRACKED_APP=1 npm run build:web
WEB_MEDIA_LOCK=deployment/media-releases/combat-d9b7ff1f6eb7.json WEB_MEDIA_ORIGIN=https://nexusvergemedia.blob.core.windows.net/media WEB_APP_ORIGIN=https://victorious-stone-02afeaa03.2.azurestaticapps.net node scripts/verify-web-media.mjs
```

If Azure still reports `No matching static site found`, verify the repository,
branch and app hostname in Azure, then refresh the named GitHub deployment
secret from that app's current deployment token. Never print the token or rotate
`SAVE_TOKEN_SECRET`. An `unknown exception` is not by itself proof of a bad token:
retain the job logs and inspect the failing phase.

Repair evidence and remaining release verification:
[7 October CI investigation](../../docs/reports/2026-10-07-ci-deployment.md).

---

## Legal Compliance Check (`legal-compliance.yml`)

### Purpose
Verifies all legal requirements are met including SRD attribution, licenses, SBOMs, and asset attributions.

### Triggers
- Push to `main` or `main-beta-quests` branches
- Pull requests targeting these branches
- Manual dispatch (Actions → Legal Compliance Check → Run workflow)

### What It Checks
- ✅ SRD 5.2.1 attribution (D&D 5e content)
- ✅ Thomas Devlin audio attribution
- ✅ LICENSE file exists
- ✅ SBOM files generated (npm + CycloneDX JSON/XML)
- ✅ Website legal modal integration
- ✅ Third-party notices consolidated

### Artifacts Uploaded
- `legal-compliance-report` - Compliance verification report (30 days)
- `sbom-cyclonedx-json` - CycloneDX JSON SBOM (90 days)
- `sbom-cyclonedx-xml` - CycloneDX XML SBOM (90 days)
- `sbom-all-formats` - All SBOM formats (90 days)

### Running Locally
```bash
npm run legal:generate  # Generate SBOMs and legal artifacts
npm run legal:verify    # Verify compliance
npm run legal:all       # Both commands
```

---

## Security Scan (`security-scan.yml`)

### Purpose
Scans dependencies for vulnerabilities, generates SBOMs, and optionally uploads to Dependency-Track for continuous security monitoring.

### Triggers
- Push to `main` or `main-beta-quests` branches
- Pull requests targeting these branches
- **Weekly schedule** (Sundays at 00:00 UTC)
- Manual dispatch (Actions → Security Scan → Run workflow)

### What It Does
1. **Generate SBOM** - Creates CycloneDX SBOMs (JSON + XML)
2. **Run npm audit** - Checks for known vulnerabilities
3. **Upload to Dependency-Track** (optional, requires secrets)
4. **Generate security summary** - Creates detailed security report
5. **Publish the run summary** - Shows the report in GitHub Actions without PR write permissions

### Artifacts Uploaded
- `security-summary` - Security analysis report (90 days)
- `npm-audit-report` - npm audit output (90 days)
- `sbom-security-scan` - All SBOM formats (90 days)

### Optional: Dependency-Track Integration

To enable automatic SBOM upload to Dependency-Track:

1. **Set up Dependency-Track** (self-hosted or cloud)
   - See: [legal/DEPENDENCY_TRACK_GUIDE.md](../../legal/DEPENDENCY_TRACK_GUIDE.md)

2. **Configure GitHub Secrets:**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add two secrets:
     - `DEPENDENCY_TRACK_URL` - e.g., `https://dependencytrack.example.com`
     - `DEPENDENCY_TRACK_API_KEY` - Get from Dependency-Track → Administration → Teams → API Key

3. **Push to main branch** - SBOM will auto-upload on next push

### Manual Dependency-Track Upload
```bash
# Generate SBOM
npm run legal:generate

# Upload via curl
curl -X POST "https://your-dependencytrack.example.com/api/v1/bom" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "project=nexus-verge-crpg-5e" \
  -F "bom=@legal/sbom/cyclonedx.json"
```

### Security Posture

**Risk Level:** 🟢 **LOW**

**Why?**
- **Zero runtime dependencies** - 100% vanilla JavaScript
- **Client-side only** - No backend to compromise
- **No build step** - Source code = production code
- **Dev dependencies only** - Vulnerabilities don't affect production

**Total Dependencies:**
- Runtime: **0**
- Development: **2 direct** (eslint, @cyclonedx/cyclonedx-npm)
- Transitive: **~124**
- Total: **~126** (all dev-only)

---

## Workflow Schedule

| Workflow | Frequency | Purpose |
|----------|-----------|---------|
| Azure Deployment | On push to main-beta-quests | Deploy to Azure Static Web Apps |
| Legal Compliance | On every push/PR | Ensure legal requirements met |
| Security Scan | **Weekly (Sundays)** + Push/PR | Continuous vulnerability monitoring |

**Weekly Schedule:**
- Security scans run every **Sunday at 00:00 UTC**
- Automatically checks for new vulnerabilities
- No manual intervention required

---

## Related Documentation

- **Dependency-Track Guide:** [legal/DEPENDENCY_TRACK_GUIDE.md](../../legal/DEPENDENCY_TRACK_GUIDE.md)
- **Legal Compliance:** [legal/README.md](../../legal/README.md)
- **SBOM Files:** [legal/sbom/](../../legal/sbom/)
- **Asset Attributions:** [legal/ASSET_ATTRIBUTIONS.md](../../legal/ASSET_ATTRIBUTIONS.md)

---

## Troubleshooting

### Legal Compliance Failures

**Common issues:**
- Missing SBOM files → Run `npm run legal:generate`
- Outdated SBOMs → Run `npm run legal:generate` after `npm install`
- Missing attributions → Update `legal/ASSET_ATTRIBUTIONS.md`

### Security Scan Failures

**Common issues:**
- Critical vulnerabilities → Run `npm audit fix` or `npm update <package>`
- Dependency-Track upload fails → Check secrets configuration
- npm audit errors → Review `npm-audit-report` artifact

**Note:** Security scan failures in dev dependencies do NOT block PRs (continue-on-error: true)
