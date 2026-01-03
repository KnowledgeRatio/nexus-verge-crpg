# Azure Static Web Apps - Quick Start Guide
# Nexus Verge CRPG 5e

**Last Updated:** 2026-01-03

---

## ⚡ 5-Minute Setup

### Option 1: Use Azure's Auto-Generated Workflow (RECOMMENDED)

When you create the Azure Static Web App resource through the Azure Portal and connect it to GitHub, Azure will **automatically**:

1. ✅ Create the workflow file in your repository
2. ✅ Add the deployment token as a GitHub secret
3. ✅ Trigger the first deployment
4. ✅ Provide you with the live URL

**Steps:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** → Search for **"Static Web Apps"**
3. Fill in the form:
   - **Resource Group:** `rg-nexus-verge-prod` (create new)
   - **Name:** `swa-nexus-verge-prod`
   - **Plan type:** Free (for now)
   - **Region:** West US 2 (or closest to your users)
   - **Deployment source:** GitHub
   - **Organization:** KnowledgeRatio
   - **Repository:** nexus-verge-crpg
   - **Branch:** main-beta-quests
   - **Build preset:** Custom
   - **App location:** `/`
   - **API location:** _(leave empty)_
   - **Output location:** _(leave empty)_
4. Click **"Review + create"** → **"Create"**
5. **Done!** Azure handles everything automatically

**What Azure Creates:**

```yaml
# File: .github/workflows/azure-static-web-apps-<random-name>.yml
# Secret: AZURE_STATIC_WEB_APPS_API_TOKEN_<GENERATED_HOSTNAME>
```

The secret name will include a generated hostname (e.g., `AZURE_STATIC_WEB_APPS_API_TOKEN_HAPPY_OCEAN_123456`).

---

### Option 2: Use Our Pre-Built Workflow (Manual Setup)

If you prefer manual control or Azure's auto-generation fails, use our existing workflow.

**Current Workflow:** `.github/workflows/azure-static-web-apps.yml`

**Secret Required:** `AZURE_STATIC_WEB_APPS_API_TOKEN`

**Steps:**

1. **Create Azure Static Web App** (skip GitHub integration):
   - During creation, select **"Other"** for deployment source
   - Complete the resource creation

2. **Get Deployment Token:**
   - Go to your Static Web App in Azure Portal
   - Click **"Manage deployment token"**
   - Copy the token

3. **Add GitHub Secret:**
   - Go to: `https://github.com/KnowledgeRatio/nexus-verge-crpg/settings/secrets/actions`
   - Click **"New repository secret"**
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: Paste the token
   - Click **"Add secret"**

4. **Trigger Deployment:**
   ```bash
   git add .
   git commit -m "Trigger Azure deployment"
   git push origin main-beta-quests
   ```

5. **Monitor:** Check GitHub Actions for deployment status

---

## 🔄 Which Option Should I Use?

### Use **Option 1** (Auto-Generated) if:
- ✅ You want the fastest setup (5 minutes)
- ✅ You trust Azure to configure everything
- ✅ You don't need custom workflow modifications
- ✅ **This is your first time deploying**

### Use **Option 2** (Manual) if:
- ✅ You want full control over the workflow
- ✅ You need custom build steps in the future
- ✅ Azure's auto-generation failed
- ✅ You want consistent secret naming across projects

**Recommendation:** Start with **Option 1**. You can always switch to Option 2 later.

---

## 📝 Secret Name Differences

### Azure's Generated Secret Name
```yaml
azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_<HOSTNAME> }}
```
- Includes generated hostname in secret name
- Example: `AZURE_STATIC_WEB_APPS_API_TOKEN_HAPPY_OCEAN_123456`
- Unique per Static Web App resource
- Auto-created by Azure

### Our Generic Secret Name
```yaml
azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
```
- Generic, reusable secret name
- Same across all projects
- Manually created
- Easier to remember

**Both work perfectly!** It's just a naming convention.

---

## ✅ Post-Deployment Checklist

After deployment (either option), verify:

### 1. Check Deployment Status
- **GitHub Actions:** `https://github.com/KnowledgeRatio/nexus-verge-crpg/actions`
- Look for green checkmark ✅
- If failed, check logs for errors

### 2. Get Your Live URL
- **Azure Portal** → Your Static Web App → **Overview**
- Copy the URL (e.g., `https://nice-ocean-12345.azurestaticapps.net`)

### 3. Test the Application
Open the URL and verify:
- [ ] Homepage loads
- [ ] No 404 errors in browser console (F12 → Console)
- [ ] Can start character creation
- [ ] Data files load (Network tab shows 200 for `/data/*.json`)
- [ ] Game functions correctly

### 4. Test Data Loading
Open browser console (F12) and run:
```javascript
// Test data file loading
fetch('/data/races.json').then(r => r.json()).then(d => console.log('Races:', d));
fetch('/data/classes.json').then(r => r.json()).then(d => console.log('Classes:', d));
fetch('/data/items.json').then(r => r.json()).then(d => console.log('Items:', d));
```

All should return JSON data, not 404 errors.

---

## 🐛 Common Issues

### Issue: "Invalid API token"

**Symptom:** GitHub Actions fails with "Invalid API token" error

**Solution:**
1. Go to Azure Portal → Static Web App → **"Manage deployment token"**
2. Copy the token again
3. Update GitHub secret:
   - Go to repo → Settings → Secrets → Actions
   - Click on the secret name
   - Click **"Update"**
   - Paste new token
   - Save
4. Re-run the failed workflow

---

### Issue: "404 Not Found" for data files

**Symptom:** Game loads but shows errors, browser console shows 404 for `/data/races.json`, etc.

**Solution:**
1. Verify files exist in repository:
   ```bash
   git ls-files data/
   ```
2. Check `.gitignore` doesn't exclude data files
3. Redeploy:
   ```bash
   git commit --allow-empty -m "Force redeploy"
   git push origin main-beta-quests
   ```

---

### Issue: Workflow doesn't trigger

**Symptom:** Push to `main-beta-quests` but no GitHub Actions run

**Solution:**
1. Check workflow file exists: `.github/workflows/azure-static-web-apps*.yml`
2. Verify branch name is exactly `main-beta-quests` (case-sensitive)
3. Check GitHub Actions is enabled:
   - Repo → Settings → Actions → General
   - Ensure "Allow all actions" is selected

---

## 🚀 Next Steps

Once deployment is working:

1. **Add Custom Domain** (optional)
   - See full runbook: [docs/AZURE_DEPLOYMENT_RUNBOOK.md](./AZURE_DEPLOYMENT_RUNBOOK.md#custom-domain-setup)

2. **Set Up Monitoring** (optional)
   - Enable Application Insights in Azure Portal
   - Configure alerts for errors

3. **Configure Custom Rules**
   - Edit `staticwebapp.config.json` for routing/headers
   - See [Configuration Management](./AZURE_DEPLOYMENT_RUNBOOK.md#configuration-management)

4. **Enable Preview Deployments**
   - Already enabled! Create a PR to get a preview URL
   - Azure automatically creates staging environment

---

## 📚 Full Documentation

For complete details, troubleshooting, and advanced configuration:
- **Full Runbook:** [docs/AZURE_DEPLOYMENT_RUNBOOK.md](./AZURE_DEPLOYMENT_RUNBOOK.md)

---

## 🆘 Quick Reference

### Important URLs
- **Azure Portal:** https://portal.azure.com
- **GitHub Actions:** https://github.com/KnowledgeRatio/nexus-verge-crpg/actions
- **GitHub Secrets:** https://github.com/KnowledgeRatio/nexus-verge-crpg/settings/secrets/actions

### Key Files
- **Workflow:** `.github/workflows/azure-static-web-apps*.yml`
- **Config:** `staticwebapp.config.json`
- **Main App:** `index.html`

### Common Commands
```bash
# Check deployment status
gh run list --workflow=azure-static-web-apps.yml

# View workflow file
cat .github/workflows/azure-static-web-apps.yml

# Force redeploy
git commit --allow-empty -m "Force redeploy" && git push
```

---

**Questions?** See the full runbook or open an issue in the repository.
