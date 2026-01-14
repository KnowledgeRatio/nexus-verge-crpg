# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment, security scanning, and legal compliance.

## Azure Static Web Apps Deployment

### Current Setup

When you create the Azure Static Web App through the Azure Portal with GitHub integration, Azure **automatically** creates a workflow file in this directory.

**Auto-generated file pattern:**
```
azure-static-web-apps-<random-identifier>.yml
```

**Example:**
```
azure-static-web-apps-happy-ocean-12345.yml
```

### Workflow Files

You will see **one** of the following:

#### Option 1: Azure's Auto-Generated Workflow (Recommended)
- **File:** `azure-static-web-apps-<random>.yml`
- **Created by:** Azure Portal during resource creation
- **Secret used:** `AZURE_STATIC_WEB_APPS_API_TOKEN_<GENERATED_HOSTNAME>`
- **Status:** ✅ Fully functional, no setup needed

#### Option 2: Our Custom Workflow (Manual Setup)
- **File:** `azure-static-web-apps.yml`
- **Created by:** Manual setup (this repository)
- **Secret used:** `AZURE_STATIC_WEB_APPS_API_TOKEN`
- **Status:** Alternative for manual control

### Which One Should I Use?

**Use Azure's auto-generated workflow** (Option 1) unless you have specific reasons to customize.

**Reasons to use Azure's workflow:**
- ✅ Zero configuration required
- ✅ Automatically created and configured
- ✅ Azure maintains it
- ✅ Secret auto-created
- ✅ First deployment happens automatically

**Reasons to use our custom workflow:**
- ✅ Simpler secret naming (no hostname suffix)
- ✅ Easier to maintain across multiple projects
- ✅ Full control over workflow configuration
- ✅ Custom build steps (if needed in future)

### How to Switch Between Workflows

#### From Azure Auto-Generated → Our Custom Workflow

1. **Delete Azure's workflow:**
   ```bash
   git rm .github/workflows/azure-static-web-apps-<random>.yml
   git commit -m "Switch to custom workflow"
   ```

2. **Update GitHub Secret:**
   - Go to: Settings → Secrets → Actions
   - Delete: `AZURE_STATIC_WEB_APPS_API_TOKEN_<HOSTNAME>`
   - Create: `AZURE_STATIC_WEB_APPS_API_TOKEN` (use same token value)

3. **Verify our workflow exists:**
   - File: `.github/workflows/azure-static-web-apps.yml`
   - Secret name in file: `AZURE_STATIC_WEB_APPS_API_TOKEN`

4. **Push changes:**
   ```bash
   git push origin main-beta-quests
   ```

#### From Our Custom Workflow → Azure Auto-Generated

1. **Delete our workflow:**
   ```bash
   git rm .github/workflows/azure-static-web-apps.yml
   git commit -m "Use Azure auto-generated workflow"
   ```

2. **In Azure Portal:**
   - Go to Static Web App → Configuration
   - Disconnect GitHub integration
   - Reconnect GitHub integration
   - Azure will recreate the workflow

### Workflow Configuration

Both workflows are configured identically:

```yaml
on:
  push:
    branches:
      - main-beta-quests  # Auto-deploy on push
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main-beta-quests  # Preview deployments for PRs

jobs:
  build_and_deploy_job:
    # Build and deploy on push or PR open
    # Creates staging environment for PRs

  close_pull_request_job:
    # Clean up staging environment when PR closes
```

**App Configuration:**
- **App location:** `/` (root directory)
- **API location:** _(empty - no backend API)_
- **Output location:** _(empty - no build step)_

### Troubleshooting

#### Workflow doesn't trigger
1. Check branch name is exactly: `main-beta-quests` (case-sensitive)
2. Verify workflow file exists in `.github/workflows/`
3. Check GitHub Actions is enabled (Settings → Actions → General)

#### Deployment fails with "Invalid API token"
1. Go to Azure Portal → Static Web App → **Manage deployment token**
2. Copy the token
3. Update GitHub secret (Settings → Secrets → Actions)
4. Re-run the workflow

#### Multiple workflows running
If both workflows exist, **delete one**:
- Keep Azure's: Delete `azure-static-web-apps.yml`
- Keep ours: Delete `azure-static-web-apps-<random>.yml`

### Learn More

- **Quick Start:** [docs/AZURE_DEPLOYMENT_QUICK_START.md](../../docs/AZURE_DEPLOYMENT_QUICK_START.md)
- **Full Runbook:** [docs/AZURE_DEPLOYMENT_RUNBOOK.md](../../docs/AZURE_DEPLOYMENT_RUNBOOK.md)
- **Azure Docs:** https://learn.microsoft.com/azure/static-web-apps/

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
5. **Comment on PRs** - Posts security summary as PR comment

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
