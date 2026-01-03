# 🚀 Azure Static Web Apps Deployment

**Nexus Verge - Procedural D&D 5e Roguelike CRPG**

This game is deployed to Azure Static Web Apps for global hosting with automatic CI/CD.

---

## ⚡ Quick Start (5 Minutes)

### 1. Create Azure Static Web App

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"** → Search **"Static Web Apps"**
3. Fill in the form:
   - **Resource Group:** `rg-nexus-verge-prod` (create new)
   - **Name:** `swa-nexus-verge-prod`
   - **Plan:** Free tier (upgrade later if needed)
   - **Region:** West US 2 (or closest to your users)
   - **Deployment source:** GitHub
   - **Repository:** `KnowledgeRatio/nexus-verge-crpg`
   - **Branch:** `main-beta-quests`
   - **Build preset:** Custom
   - **App location:** `/`
   - **API location:** _(leave empty)_
   - **Output location:** _(leave empty)_
4. Click **"Review + create"** → **"Create"**

### 2. Done! ✅

Azure automatically:
- ✅ Creates GitHub Actions workflow
- ✅ Adds deployment token as GitHub secret
- ✅ Triggers first deployment
- ✅ Provides live URL: `https://<your-app>.azurestaticapps.net`

**Deployment time:** 2-5 minutes

---

## 📚 Documentation

### Quick Reference
- **[Quick Start Guide](docs/AZURE_DEPLOYMENT_QUICK_START.md)** - 5-minute setup with troubleshooting
- **[Full Deployment Runbook](docs/AZURE_DEPLOYMENT_RUNBOOK.md)** - Complete operations manual (50+ pages)
- **[Workflow Documentation](.github/workflows/README.md)** - GitHub Actions workflow details

### What Gets Deployed

This repository contains a **static web application** with:
- ✅ No build step required
- ✅ No backend/API needed
- ✅ Pure client-side JavaScript
- ✅ All game logic runs in browser
- ✅ Data files loaded from `/data/*.json`

**Files deployed:**
```
/
├── index.html              # Main entry point
├── styles.css              # Global styles
├── staticwebapp.config.json # Azure SWA configuration
├── src/                    # JavaScript source code
│   ├── main.js            # Game bootstrap
│   ├── core/              # Game engine
│   ├── systems/           # Game systems
│   ├── ui/                # UI components
│   ├── rendering/         # Rendering engine
│   └── utils/             # Utilities
└── data/                  # Game content (JSON)
    ├── races.json
    ├── classes.json
    ├── items.json
    ├── monsters.json
    └── ... (more data files)
```

---

## 🔄 Continuous Deployment

### Automatic Deployments

Every push to `main-beta-quests` triggers automatic deployment:

```bash
# Make changes
git add .
git commit -m "Add new feature"
git push origin main-beta-quests

# GitHub Actions automatically deploys to Azure
# Live in 2-5 minutes!
```

**Monitor deployment:**
- **GitHub Actions:** [Actions tab](https://github.com/KnowledgeRatio/nexus-verge-crpg/actions)
- **Azure Portal:** Static Web App → Deployments

### Preview Deployments (Staging)

Pull requests automatically get preview environments:

```bash
# Create feature branch
git checkout -b feature/new-quest-system
git push origin feature/new-quest-system

# Open pull request on GitHub
# Azure creates staging environment automatically
# Preview URL posted as comment on PR
```

**Preview URL example:**
```
https://nice-ocean-12345-staging-pr42.azurestaticapps.net
```

**Cleanup:**
- PR merged or closed → staging environment auto-deleted
- No manual cleanup needed

---

## ⚙️ Configuration

### Static Web App Config

File: `staticwebapp.config.json`

**What it does:**
- ✅ SPA routing (all routes → `index.html`)
- ✅ Cache headers (data files cached 1 hour)
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ MIME types (proper JSON content type)
- ✅ 404 fallback (graceful error handling)

**Modify configuration:**
1. Edit `staticwebapp.config.json`
2. Commit and push
3. Deployment picks up new config automatically

### Environment Variables

If you need to add secrets or environment variables:

1. Azure Portal → Static Web App → **Configuration**
2. Click **"Application settings"**
3. Add name/value pairs
4. Variables available at runtime

---

## 🌐 Custom Domain (Optional)

### Add Your Own Domain

1. **In Azure Portal:**
   - Static Web App → **Custom domains**
   - Click **"+ Add"**
   - Enter your domain (e.g., `www.nexusverge.com`)

2. **In DNS Provider:**
   - Add CNAME record: `www` → `<your-app>.azurestaticapps.net`
   - Add TXT record for validation (Azure provides value)

3. **Verify:**
   - Azure validates DNS records (2-10 minutes)
   - SSL certificate auto-provisioned (5-10 minutes)
   - Domain active with HTTPS

**Full instructions:** [Custom Domain Setup](docs/AZURE_DEPLOYMENT_RUNBOOK.md#custom-domain-setup)

---

## 📊 Monitoring & Health

### Health Checks

**Daily verification:**
1. Visit production URL
2. Check browser console (no errors)
3. Test character creation → game start
4. Verify data files load (Network tab)

### Application Insights (Optional)

Enable monitoring for production apps:

1. Azure Portal → Create **Application Insights** resource
2. Static Web App → Settings → Enable Application Insights
3. Configure alerts:
   - HTTP 5xx errors
   - High response times
   - Failed requests

**Benefits:**
- Real-time monitoring
- Error tracking
- Performance metrics
- User analytics

---

## 💰 Cost & Pricing

### Current Setup: Free Tier

**Included:**
- 100 GB bandwidth/month
- 0.5 GB storage
- 2 custom domains
- 3 staging environments
- **Cost: $0/month**

**Perfect for:**
- Development
- Testing
- Low-traffic production (<10k users/month)

### Standard Tier (Optional Upgrade)

**Pricing:** ~$9/month + usage

**Included:**
- 100 GB bandwidth (then $0.20/GB)
- 0.5 GB storage (then $0.05/GB)
- 5 custom domains
- Unlimited staging environments
- 99.95% SLA uptime guarantee

**Upgrade when:**
- >100 GB bandwidth/month
- Need SLA for production
- >3 staging environments needed

**Cost calculator:** [Azure Pricing](https://azure.microsoft.com/pricing/details/app-service/static/)

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: Data files 404 (Not Found)

**Symptoms:**
- Game shows "Loading..." forever
- Browser console: 404 for `/data/races.json`

**Solution:**
```bash
# Verify files exist
git ls-files data/

# Redeploy
git commit --allow-empty -m "Force redeploy"
git push origin main-beta-quests
```

#### Issue: Deployment fails

**Symptoms:**
- GitHub Actions shows ❌ red X
- Azure shows "Failed" status

**Solutions:**
1. Check GitHub Actions logs for errors
2. Verify GitHub secret exists (Settings → Secrets → Actions)
3. Regenerate deployment token in Azure Portal
4. Update GitHub secret with new token
5. Re-run workflow

#### Issue: Slow performance

**Solutions:**
1. Check bandwidth usage (Azure Portal → Cost Management)
2. Verify cache headers in `staticwebapp.config.json`
3. Consider enabling Azure CDN
4. Optimize assets (compress images, minify JS)

**Full troubleshooting guide:** [Runbook - Troubleshooting](docs/AZURE_DEPLOYMENT_RUNBOOK.md#monitoring--troubleshooting)

---

## 🔄 Rollback

### Emergency Rollback (Immediate)

**Option 1: Via Git**
```bash
# Find last working commit
git log --oneline -10

# Revert to it
git revert <commit-hash>
git push origin main-beta-quests
```

**Option 2: Via Azure Portal**
1. Static Web App → **Deployments**
2. Find previous successful deployment
3. Click **"..."** → **"Activate"**
4. Confirm activation

**Rollback time:** 2-5 minutes

**Full rollback procedures:** [Runbook - Rollback](docs/AZURE_DEPLOYMENT_RUNBOOK.md#rollback-procedures)

---

## 🔒 Security

### Current Security Features

**Headers configured:**
```json
{
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-eval'; ..."
}
```

**What this protects against:**
- ✅ XSS attacks (Content Security Policy)
- ✅ Clickjacking (X-Frame-Options)
- ✅ MIME-sniffing (X-Content-Type-Options)
- ✅ HTTPS enforced (automatic)

**Security checklist:**
- [x] HTTPS enabled
- [x] Security headers configured
- [x] No secrets in client-side code
- [x] CSP prevents unauthorized scripts
- [ ] Regular dependency updates (run `npm audit` if using npm)

---

## 📞 Support & Contact

### Documentation
- **Quick Start:** [docs/AZURE_DEPLOYMENT_QUICK_START.md](docs/AZURE_DEPLOYMENT_QUICK_START.md)
- **Full Runbook:** [docs/AZURE_DEPLOYMENT_RUNBOOK.md](docs/AZURE_DEPLOYMENT_RUNBOOK.md)
- **Workflow Docs:** [.github/workflows/README.md](.github/workflows/README.md)

### External Resources
- **Azure Static Web Apps Docs:** https://learn.microsoft.com/azure/static-web-apps/
- **GitHub Actions Docs:** https://docs.github.com/actions
- **Azure Support:** Available in Azure Portal

### Repository
- **Issues:** [GitHub Issues](https://github.com/KnowledgeRatio/nexus-verge-crpg/issues)
- **Pull Requests:** [GitHub PRs](https://github.com/KnowledgeRatio/nexus-verge-crpg/pulls)
- **Discussions:** [GitHub Discussions](https://github.com/KnowledgeRatio/nexus-verge-crpg/discussions)

---

## 🎯 Quick Reference

### Important URLs
| Resource | URL |
|----------|-----|
| **Azure Portal** | https://portal.azure.com |
| **GitHub Repo** | https://github.com/KnowledgeRatio/nexus-verge-crpg |
| **GitHub Actions** | https://github.com/KnowledgeRatio/nexus-verge-crpg/actions |
| **GitHub Secrets** | https://github.com/KnowledgeRatio/nexus-verge-crpg/settings/secrets/actions |

### Common Commands
```bash
# Deploy to production
git push origin main-beta-quests

# Force redeploy (no code changes)
git commit --allow-empty -m "Force redeploy"
git push origin main-beta-quests

# View deployment status
gh run list --workflow=azure-static-web-apps

# View workflow file
cat .github/workflows/azure-static-web-apps*.yml
```

### Key Files
```
staticwebapp.config.json          # Azure SWA configuration
.github/workflows/*.yml           # GitHub Actions workflows
docs/AZURE_DEPLOYMENT_RUNBOOK.md  # Full operations manual
docs/AZURE_DEPLOYMENT_QUICK_START.md  # Quick setup guide
```

---

**Status:** ✅ Ready for deployment
**Last Updated:** 2026-01-03
**Maintainer:** DevOps Team

For questions or issues, see the documentation links above or open a GitHub issue.
