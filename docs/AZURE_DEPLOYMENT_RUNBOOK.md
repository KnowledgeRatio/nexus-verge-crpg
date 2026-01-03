# Azure Static Web Apps Deployment Runbook
# Nexus Verge - Procedural D&D 5e Roguelike CRPG

**Document Version:** 1.0
**Last Updated:** 2026-01-03
**Maintainer:** DevOps Team

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Deployment Process](#deployment-process)
4. [Configuration Management](#configuration-management)
5. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
6. [Rollback Procedures](#rollback-procedures)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Security & Compliance](#security--compliance)
9. [Cost Management](#cost-management)
10. [Appendix](#appendix)

---

## Prerequisites

### Required Access
- [ ] Azure subscription with Owner or Contributor role
- [ ] GitHub repository access (KnowledgeRatio/nexus-verge-crpg)
- [ ] Azure CLI installed (optional but recommended)

### Required Tools
- Web browser (Chrome, Edge, Firefox)
- Access to [Azure Portal](https://portal.azure.com)
- GitHub account with repository permissions

### Knowledge Requirements
- Basic understanding of Azure services
- Familiarity with GitHub Actions
- Understanding of static web applications

---

## Initial Setup

### Step 1: Create Azure Static Web App Resource

#### 1.1 Navigate to Azure Portal
1. Open browser and go to [https://portal.azure.com](https://portal.azure.portal)
2. Sign in with your Azure credentials
3. Click **"+ Create a resource"** in the top left corner

#### 1.2 Search for Static Web Apps
1. In the search box, type **"Static Web Apps"**
2. Click **"Static Web Apps"** from the results
3. Click **"Create"** button

#### 1.3 Configure Basics Tab
Fill in the following fields:

| Field | Value | Notes |
|-------|-------|-------|
| **Subscription** | Select your subscription | Choose appropriate billing subscription |
| **Resource Group** | Create new: `rg-nexus-verge-prod` | Or use existing group |
| **Name** | `swa-nexus-verge-prod` | Must be globally unique |
| **Plan type** | Free (for development) or Standard (for production) | See [pricing](#cost-management) |
| **Region** | Choose closest to users | Options: West US 2, Central US, East US 2, West Europe, East Asia |
| **Deployment details - Source** | GitHub | Select GitHub as deployment source |

#### 1.4 Configure GitHub Integration
1. Click **"Sign in with GitHub"** button
2. Authorize Azure Static Web Apps to access your GitHub account
3. Configure repository details:
   - **Organization:** `KnowledgeRatio`
   - **Repository:** `nexus-verge-crpg`
   - **Branch:** `main-beta-quests`

#### 1.5 Configure Build Details
Set the build configuration:

| Field | Value | Notes |
|-------|-------|-------|
| **Build Presets** | Custom | Our app has no build step |
| **App location** | `/` | Root directory |
| **Api location** | _(leave empty)_ | No backend API |
| **Output location** | _(leave empty)_ | No build output directory |

#### 1.6 Review and Create
1. Click **"Review + create"** button
2. Verify all settings are correct
3. Click **"Create"** button
4. Wait 2-3 minutes for deployment to complete

#### 1.7 Initial Deployment
Azure will automatically:
- Create a GitHub Actions workflow in your repository
- Add deployment token as GitHub secret (with generated hostname suffix)
- Trigger the first deployment
- Provide a temporary URL (e.g., `https://nice-ocean-12345.azurestaticapps.net`)

> **✅ RECOMMENDED:** Use Azure's auto-generated workflow for simplest setup. It works perfectly with our application and requires zero manual configuration.
>
> **Alternative:** If you prefer manual control, you can delete Azure's workflow and use our pre-built workflow at `.github/workflows/azure-static-web-apps.yml`. See [Step 3](#step-3-deploy-custom-workflow) for details.

---

### Step 2: Verify GitHub Secrets (Auto-Created)

> **✅ If you used Azure Portal's GitHub integration in Step 1, Azure has already created the secret for you. You can skip to Step 4 to verify deployment.**

#### 2.1 Verify Secret Exists
1. Open browser and go to your GitHub repository:
   ```
   https://github.com/KnowledgeRatio/nexus-verge-crpg/settings/secrets/actions
   ```
2. Look for a secret named like:
   ```
   AZURE_STATIC_WEB_APPS_API_TOKEN_<GENERATED_HOSTNAME>
   ```
   Example: `AZURE_STATIC_WEB_APPS_API_TOKEN_HAPPY_OCEAN_123456`

3. If the secret exists, **you're done!** Skip to [Step 4](#step-4-verify-deployment).

#### 2.2 Manual Secret Setup (Optional - Only if Azure didn't auto-create)

If the secret doesn't exist (rare), manually add it:

1. In Azure Portal, go to your Static Web App
2. Click **"Manage deployment token"** button
3. Copy the deployment token
4. In GitHub, click **"New repository secret"**
5. Configure:
   - **Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN` (or match your workflow file)
   - **Value:** Paste the deployment token
6. Click **"Add secret"**

---

### Step 3: Choose Workflow Approach (Optional)

> **✅ RECOMMENDED:** Keep Azure's auto-generated workflow. It's identical to ours and already working.
>
> **⏭️ SKIP THIS STEP** if you're happy with Azure's auto-generated workflow. Go to [Step 4](#step-4-verify-deployment).

#### 3.1 Option A: Use Azure's Auto-Generated Workflow (Default)

Azure created a workflow file like:
```
.github/workflows/azure-static-web-apps-<random-name>.yml
```

**What it does:**
- ✅ Triggers on push to `main-beta-quests`
- ✅ Triggers on pull requests
- ✅ Preview deployments for PRs
- ✅ Uses secret: `AZURE_STATIC_WEB_APPS_API_TOKEN_<HOSTNAME>`

**No action needed!** This workflow works perfectly.

#### 3.2 Option B: Switch to Our Custom Workflow (Advanced)

If you prefer a generic workflow with simpler secret naming:

**Step 1: Delete Azure's workflow**
```bash
# Find the Azure-generated file
ls .github/workflows/

# Delete it (replace <random> with actual name)
git rm .github/workflows/azure-static-web-apps-<random>.yml
git commit -m "Switch to custom workflow"
```

**Step 2: Rename the secret**
1. Go to GitHub repo → Settings → Secrets → Actions
2. Delete the old secret: `AZURE_STATIC_WEB_APPS_API_TOKEN_<HOSTNAME>`
3. Create new secret: `AZURE_STATIC_WEB_APPS_API_TOKEN` (no hostname suffix)
4. Use the same deployment token value

**Step 3: Use our workflow**
Our repository includes: `.github/workflows/azure-static-web-apps.yml`

This uses the simpler secret name and is easier to maintain across projects.

**Step 4: Push changes**
```bash
git push origin main-beta-quests
```

#### 3.3 Workflow Comparison

| Feature | Azure Auto-Generated | Our Custom Workflow |
|---------|---------------------|-------------------|
| **Setup time** | 0 minutes (automatic) | 5 minutes (manual) |
| **Secret name** | `..._TOKEN_<HOSTNAME>` | `..._TOKEN` |
| **Functionality** | Identical | Identical |
| **Maintenance** | Azure updates it | You update it |
| **Best for** | Quick setup, hands-off | Multi-project consistency |

**Recommendation:** Stick with Azure's auto-generated workflow unless you have specific reasons to customize.

---

### Step 4: Verify Deployment

#### 4.1 Get Application URL
1. In Azure Portal, go to your Static Web App resource
2. In the **Overview** page, find the **URL** field
3. Copy the URL (e.g., `https://nice-ocean-12345.azurestaticapps.net`)

#### 4.2 Test Application
Open the URL in a browser and verify:
- [ ] Index.html loads correctly
- [ ] Main menu appears
- [ ] Character creation works
- [ ] Data files load (check browser console for errors)
- [ ] Game starts successfully
- [ ] No 404 errors in browser console

#### 4.3 Test Data File Loading
1. Open browser Developer Tools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Verify these files load with 200 status:
   - `/data/races.json`
   - `/data/classes.json`
   - `/data/backgrounds.json`
   - `/data/items.json`
   - `/data/monsters.json`
   - `/data/terrains.json`
   - `/data/skills.json`
   - `/data/quests.json`
   - `/data/skillChallenges.json`

#### 4.4 Test Game Functionality
Complete a smoke test:
1. Click **"New Game"**
2. Enter a seed (e.g., `TEST-1234-ALPHA`)
3. Click **"Start Character Creation"**
4. Complete character creation (all steps)
5. Verify game world loads
6. Test WASD movement
7. Verify fog of war works
8. Test combat encounter (if possible)
9. Test inventory (I key)
10. Test character sheet (C key)

---

## Configuration Management

### Static Web App Configuration File

Our `staticwebapp.config.json` file controls:

#### Navigation Fallback (SPA Support)
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/data/*", "/src/*", "/assets/*"]
  }
}
```
- All routes redirect to `index.html` for client-side routing
- Excludes static assets from fallback

#### Caching Strategy
```json
{
  "routes": [
    {
      "route": "/data/*",
      "headers": {
        "Cache-Control": "public, max-age=3600"
      }
    }
  ]
}
```
- Data files cached for 1 hour (3600 seconds)
- Balance between freshness and performance

#### Security Headers
```json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
  }
}
```

### Modifying Configuration

#### To Change Cache Duration
1. Edit `staticwebapp.config.json`
2. Update `max-age` value (in seconds):
   - 1 hour: `3600`
   - 6 hours: `21600`
   - 1 day: `86400`
3. Commit and push changes
4. Deployment will pick up new configuration

#### To Add Custom Headers
1. Edit `staticwebapp.config.json`
2. Add to `routes` array:
   ```json
   {
     "route": "/path/*",
     "headers": {
       "Custom-Header": "value"
     }
   }
   ```
3. Commit and push changes

---

## Deployment Process

### Standard Deployment (Main Branch)

#### Automatic Deployment
Every push to `main-beta-quests` triggers automatic deployment:

1. Developer pushes code to `main-beta-quests`
2. GitHub Actions workflow triggers
3. Azure Static Web Apps builds and deploys
4. Application updates live in 2-5 minutes

#### Manual Deployment Trigger
To manually trigger deployment without code changes:

1. Go to GitHub Actions: `https://github.com/KnowledgeRatio/nexus-verge-crpg/actions`
2. Click on **"Azure Static Web Apps CI/CD"** workflow
3. Click **"Run workflow"** dropdown
4. Select `main-beta-quests` branch
5. Click **"Run workflow"** button

### Preview Deployments (Pull Requests)

#### Automatic PR Previews
When a pull request is created:

1. GitHub Actions creates a staging environment
2. Unique preview URL generated (e.g., `https://nice-ocean-12345-staging-1.azurestaticapps.net`)
3. Preview URL posted as comment on PR
4. Every push to PR updates preview environment

#### Testing PR Previews
1. Open the preview URL from PR comment
2. Test changes in isolation
3. Verify no regressions
4. Once approved, merge PR to deploy to production

#### Preview Cleanup
When PR is closed or merged:
- GitHub Actions automatically deletes the preview environment
- No manual cleanup required

---

## Monitoring & Troubleshooting

### Health Checks

#### Daily Health Check Procedure
1. Visit application URL
2. Verify homepage loads
3. Check browser console for errors
4. Test one complete game flow (character creation → exploration)

#### Automated Monitoring (Optional)
Set up Azure Application Insights:
1. In Azure Portal, create Application Insights resource
2. In Static Web App settings, enable Application Insights
3. Configure alerts for:
   - HTTP 5xx errors
   - High response times
   - Failed requests

### Common Issues

#### Issue 1: 404 Errors on Data Files

**Symptoms:**
- Game shows "Loading..." indefinitely
- Browser console shows 404 errors for `/data/*.json`

**Diagnosis:**
```bash
# Check deployment logs in GitHub Actions
# Verify files exist in repository
git ls-files data/
```

**Solution:**
1. Verify data files are committed to repository
2. Check `.gitignore` doesn't exclude data files
3. Redeploy:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin main-beta-quests
   ```

#### Issue 2: Deployment Fails

**Symptoms:**
- GitHub Actions workflow shows red X
- Azure Portal shows "Failed" deployment status

**Diagnosis:**
1. Check GitHub Actions logs: `https://github.com/KnowledgeRatio/nexus-verge-crpg/actions`
2. Look for error messages in build logs

**Common Causes & Solutions:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid API token" | Wrong or expired deployment token | Regenerate token in Azure, update GitHub secret |
| "App location not found" | Wrong `app_location` in workflow | Verify workflow has `app_location: "/"` |
| "Timeout" | Azure service issue | Wait 10 minutes, retry deployment |

#### Issue 3: Game Loads But Data Missing

**Symptoms:**
- Game starts but shows errors like "Race data not found"
- Character creation fails

**Diagnosis:**
```javascript
// Open browser console, check data loading:
fetch('/data/races.json').then(r => r.json()).then(console.log)
```

**Solution:**
1. Verify data files are valid JSON (no syntax errors)
2. Check file paths are correct (case-sensitive!)
3. Clear browser cache and reload
4. Check `staticwebapp.config.json` doesn't block data files

#### Issue 4: CORS Errors

**Symptoms:**
- Browser console shows "CORS policy" errors
- Assets fail to load

**Solution:**
1. Verify all assets are served from same domain (no external CDNs)
2. If using external resources, add to CSP in `staticwebapp.config.json`:
   ```json
   "Content-Security-Policy": "default-src 'self' https://cdn.example.com; ..."
   ```

### Viewing Logs

#### GitHub Actions Logs
1. Go to: `https://github.com/KnowledgeRatio/nexus-verge-crpg/actions`
2. Click on specific workflow run
3. Click on job name (e.g., "Build and Deploy Job")
4. Expand steps to see detailed logs

#### Azure Portal Logs
1. Go to Static Web App resource in Azure Portal
2. Click **"Log stream"** in left menu
3. View real-time application logs

---

## Rollback Procedures

### Emergency Rollback (Immediate)

#### Option 1: Revert via Git
```bash
# Find the last working commit
git log --oneline -10

# Revert to that commit
git revert <commit-hash>

# Push to trigger redeployment
git push origin main-beta-quests
```

#### Option 2: Redeploy Previous Version
1. Go to GitHub Actions
2. Find the last successful workflow run
3. Click **"Re-run all jobs"**
4. Deployment reverts to that version

#### Option 3: Manual Rollback in Azure
1. Go to Static Web App in Azure Portal
2. Click **"Deployments"** in left menu
3. Find previous successful deployment
4. Click **"..."** menu
5. Click **"Activate"**
6. Confirm activation

### Planned Rollback

If you need to rollback during maintenance window:

1. **Announce downtime** (if user-facing change)
2. Create rollback PR:
   ```bash
   git checkout main-beta-quests
   git revert <commit-range>
   git push origin rollback-<description>
   ```
3. Create pull request and review
4. Test in preview environment
5. Merge to deploy rollback

### Testing After Rollback
After rollback, verify:
- [ ] Application loads
- [ ] All critical paths work
- [ ] No console errors
- [ ] Data loads correctly

---

## Custom Domain Setup

### Prerequisites
- Domain name purchased (e.g., `nexusverge.com`)
- Access to domain DNS settings

### Step 1: Add Custom Domain in Azure

1. In Azure Portal, go to Static Web App resource
2. Click **"Custom domains"** in left menu
3. Click **"+ Add"** button
4. Choose domain type:
   - **Custom domain on other DNS:** For external registrars
   - **Custom domain on Azure DNS:** If using Azure DNS

5. Enter domain name: `www.nexusverge.com` or `nexusverge.com`
6. Click **"Next"** button

### Step 2: Configure DNS Records

Azure will provide DNS records to add. Example:

#### For CNAME (subdomain):
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | www | nice-ocean-12345.azurestaticapps.net | 3600 |

#### For Apex Domain (root):
| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | @ | validation-token-from-azure | 3600 |
| ALIAS/ANAME | @ | nice-ocean-12345.azurestaticapps.net | 3600 |

### Step 3: Add Records to DNS Provider

Example for common providers:

#### Cloudflare
1. Go to Cloudflare dashboard
2. Select your domain
3. Click **DNS** tab
4. Add records as specified by Azure
5. Set Proxy status to **DNS only** (gray cloud)

#### GoDaddy
1. Go to GoDaddy DNS Management
2. Add new records
3. Wait for propagation (up to 48 hours)

#### Namecheap
1. Go to Advanced DNS settings
2. Add records as specified
3. Wait for propagation

### Step 4: Verify Domain

1. In Azure Portal, click **"Validate"** button
2. Azure checks DNS records (may take a few minutes)
3. Once validated, domain shows as **"Active"**

### Step 5: Enable HTTPS (Automatic)

Azure Static Web Apps automatically provisions SSL certificate:
- Uses Let's Encrypt
- Auto-renews every 90 days
- Takes 5-10 minutes after domain validation

### Step 6: Test Custom Domain

1. Visit `https://www.nexusverge.com` (or your domain)
2. Verify SSL certificate is valid (lock icon in browser)
3. Test all game functionality

### Apex Domain Redirect (Optional)

To redirect `nexusverge.com` → `www.nexusverge.com`:

1. In DNS provider, add redirect rule
2. Or use Azure Static Web Apps routing in `staticwebapp.config.json`:
   ```json
   {
     "routes": [
       {
         "route": "/",
         "redirect": "https://www.nexusverge.com",
         "statusCode": 301
       }
     ]
   }
   ```

---

## Security & Compliance

### Security Headers Review

Current security headers in `staticwebapp.config.json`:

```json
{
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
  }
}
```

#### Header Explanations

| Header | Purpose | Value |
|--------|---------|-------|
| `X-Content-Type-Options` | Prevents MIME-sniffing | `nosniff` |
| `X-Frame-Options` | Prevents clickjacking | `DENY` |
| `Content-Security-Policy` | Restricts resource loading | See below |

#### CSP Breakdown
- `default-src 'self'` - Only load resources from same origin
- `script-src 'self' 'unsafe-eval'` - Allow scripts from same origin + eval (needed for game)
- `style-src 'self' 'unsafe-inline'` - Allow inline styles (needed for dynamic styling)
- `img-src 'self' data:` - Allow images from same origin + data URIs

### Access Control

#### Restricting Access (Optional)

To restrict access to specific IP ranges or Azure AD users:

1. In Azure Portal, go to Static Web App
2. Click **"Configuration"** in left menu
3. Scroll to **"Authentication"**
4. Configure authentication provider (Azure AD, GitHub, etc.)
5. Set **"Unauthenticated client action"** to **"Require login"**

#### Environment Variables (Secrets)

If you need to add environment variables:

1. In Azure Portal, go to Static Web App
2. Click **"Configuration"** → **"Application settings"**
3. Click **"+ Add"**
4. Enter name/value pairs
5. Access in JavaScript:
   ```javascript
   const apiKey = process.env.API_KEY;
   ```

### Compliance Checklist

- [ ] HTTPS enabled for all traffic
- [ ] Security headers configured
- [ ] No sensitive data in client-side code
- [ ] LocalStorage data encrypted (if storing sensitive info)
- [ ] CSP prevents XSS attacks
- [ ] Regular dependency updates (npm audit)

---

## Cost Management

### Pricing Tiers

#### Free Tier (Current)
- **Cost:** $0/month
- **Bandwidth:** 100 GB/month
- **Storage:** 0.5 GB
- **Custom domains:** 2
- **Staging environments:** 3
- **Suitable for:** Development, testing, low-traffic apps

#### Standard Tier
- **Cost:** ~$9/month (as of 2026)
- **Bandwidth:** 100 GB/month (then $0.20/GB)
- **Storage:** 0.5 GB (then $0.05/GB)
- **Custom domains:** 5
- **Staging environments:** Unlimited
- **SLA:** 99.95% uptime
- **Suitable for:** Production apps with moderate traffic

### Cost Estimation

#### Expected Costs (Free Tier)
| Resource | Usage | Cost |
|----------|-------|------|
| Static hosting | 100% | $0 |
| Bandwidth | <100 GB | $0 |
| Storage | ~50 MB | $0 |
| **Total** | | **$0** |

#### Expected Costs (Standard Tier - 10,000 users/month)
| Resource | Usage | Cost |
|----------|-------|------|
| Base cost | Per month | $9.00 |
| Bandwidth | 150 GB (50 GB overage @ $0.20/GB) | $10.00 |
| Storage | 0.5 GB | $0 |
| **Total** | | **~$19/month** |

### Cost Monitoring

#### Set Up Budget Alerts

1. In Azure Portal, go to **Cost Management + Billing**
2. Click **"Budgets"** in left menu
3. Click **"+ Add"** to create new budget
4. Configure:
   - **Name:** `nexus-verge-monthly-budget`
   - **Reset period:** Monthly
   - **Amount:** $50 (adjust as needed)
   - **Alert conditions:** 80%, 100%, 120%
   - **Alert recipients:** Your email

#### Review Costs Monthly

1. Go to **Cost Management + Billing** → **Cost analysis**
2. Filter by resource group: `rg-nexus-verge-prod`
3. Review charges by resource
4. Look for unexpected spikes

### Optimization Tips

1. **Enable caching** (already configured) - Reduces bandwidth
2. **Compress assets** - Use gzip/brotli compression
3. **Optimize images** - Use WebP format, lazy loading
4. **CDN usage** - Consider Azure CDN for global distribution
5. **Monitor bandwidth** - Set alerts for unusual traffic

---

## Appendix

### A. Useful Azure CLI Commands

#### Login to Azure
```bash
az login
```

#### List Static Web Apps
```bash
az staticwebapp list --output table
```

#### Get Deployment Token
```bash
az staticwebapp secrets list \
  --name swa-nexus-verge-prod \
  --resource-group rg-nexus-verge-prod \
  --query "properties.apiKey" \
  --output tsv
```

#### Trigger Manual Deployment
```bash
az staticwebapp update \
  --name swa-nexus-verge-prod \
  --resource-group rg-nexus-verge-prod
```

#### View Deployment History
```bash
az staticwebapp deployment list \
  --name swa-nexus-verge-prod \
  --resource-group rg-nexus-verge-prod \
  --output table
```

### B. GitHub Actions Workflow Reference

#### Workflow Triggers
```yaml
on:
  push:
    branches:
      - main-beta-quests
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main-beta-quests
```

#### Manual Workflow Trigger
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'production'
```

### C. Troubleshooting Decision Tree

```
Deployment Issue?
├─ GitHub Actions Failed?
│  ├─ Check workflow logs
│  ├─ Verify secrets are set
│  └─ Check Azure service status
├─ Deployment Succeeded but App Broken?
│  ├─ Check browser console
│  ├─ Verify data files load (Network tab)
│  └─ Test on different browser
└─ Slow Performance?
   ├─ Check bandwidth usage
   ├─ Verify caching headers
   └─ Consider CDN
```

### D. Emergency Contacts

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| Primary DevOps Engineer | devops@example.com | 1 hour |
| Backup DevOps Engineer | backup-devops@example.com | 2 hours |
| Azure Support | [Azure Portal Support] | 4 hours (Standard plan) |
| GitHub Support | support@github.com | 24 hours |

### E. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-01-03 | 1.0 | Initial runbook creation | DevOps Team |

### F. Maintenance Windows

**Recommended Maintenance Schedule:**
- **Routine updates:** 2nd Tuesday of each month, 2:00 AM - 4:00 AM UTC
- **Emergency patches:** As needed, with 30-minute notice
- **Platform updates:** Automatic (Azure handles infrastructure)

### G. Backup & Disaster Recovery

#### Backup Strategy
- **Code:** Backed up in GitHub repository (all commits preserved)
- **Configuration:** `staticwebapp.config.json` in repository
- **Secrets:** Deployment token backed up in secure password manager

#### Disaster Recovery Plan (RPO: 0 minutes, RTO: 15 minutes)

1. **Total Azure Outage:**
   - Deploy to alternative Azure region (15 minutes)
   - Update DNS to new endpoint (5 minutes propagation)

2. **Repository Corruption:**
   - Restore from GitHub's automatic backups
   - Contact GitHub Support if needed

3. **Configuration Error:**
   - Revert `staticwebapp.config.json` via Git
   - Redeploy (3-5 minutes)

---

## Quick Reference Card

### Key URLs
- **Azure Portal:** https://portal.azure.com
- **GitHub Repo:** https://github.com/KnowledgeRatio/nexus-verge-crpg
- **GitHub Actions:** https://github.com/KnowledgeRatio/nexus-verge-crpg/actions
- **Production URL:** https://[your-app].azurestaticapps.net

### Common Tasks
| Task | Action |
|------|--------|
| Deploy to production | Push to `main-beta-quests` |
| Create preview | Open pull request |
| View logs | GitHub Actions → Workflow run → Job |
| Rollback | Azure Portal → Deployments → Activate previous |
| Get deployment token | Azure Portal → Manage deployment token |

### Emergency Procedures
1. **Site Down:** Check Azure service status → Rollback to last known good deployment
2. **Deployment Failed:** Check GitHub Actions logs → Verify secrets → Retry
3. **Data Loading Errors:** Clear browser cache → Verify files in repo → Redeploy

---

**End of Runbook**

For questions or updates, contact: devops@example.com
