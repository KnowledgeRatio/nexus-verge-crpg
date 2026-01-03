# GitHub Actions Workflows

This directory contains GitHub Actions workflows for automated deployment and CI/CD.

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
