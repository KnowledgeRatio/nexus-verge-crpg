# Security & Deployment Guide

## 🔒 Security Overview

This project follows security best practices:
- ✅ **No secrets in code** - All secrets use environment variables
- ✅ **No identity provider, no PII** - Cloud saves are keyed to a player-chosen name plus a
  server-minted recovery code; the game stores no email, password, or account record
- ✅ **Credentials never stored** - The save storage key is `HMAC-SHA256(name + code, secret)`,
  so the raw recovery code never appears in storage
- ✅ **Defense in depth** - Name and code are both required; neither alone unlocks a save

## 🚨 What NOT to Commit

**NEVER commit these files:**
- `.env` - Local environment variables
- `api/local.settings.json` - Azure Functions local config (contains API keys)
- `staticwebapp.config.json` - Azure SWA config (contains your tenant ID)
- Any file with `CLIENT_SECRET` or `API_KEY` in it

**Safe to commit:**
- `.env.example` - Template with placeholder values
- `api/local.settings.json.example` - Template for Azure Functions
- `staticwebapp.config.json.example` - Template for Azure SWA config

## 🔑 Required Secrets

### For Production (Azure Static Web Apps)

Set these in **Azure Portal → Static Web Apps → Configuration → Application Settings**:

| Setting Name | Description | Where to Get It |
|--------------|-------------|-----------------|
| `SAVE_STORAGE_CONNECTION` | Storage account connection string for cloud saves | Azure Portal → Storage account → Access keys |
| `SAVE_TOKEN_SECRET` | HMAC signing secret for save storage keys | Generate once: `openssl rand -base64 48` |

> ⚠️ **`SAVE_TOKEN_SECRET` can never be rotated once players have saves.** Every save's storage
> path derives from it, so changing it orphans every save simultaneously with no way to recover
> them. Back it up somewhere durable before going live. See `docs/CLOUD_SAVES_SETUP.md`.

Image generation (`tools/image-gen`) additionally reads `AZURE_FOUNDRY_ENDPOINT` and
`AZURE_FOUNDRY_API_KEY` from a local `.env` — see `.env.example`. These are developer tooling
credentials and are never needed in production.

### For Local Development

1. **Copy configuration templates:**
   ```bash
   # Environment variables (image generation tooling only)
   cp .env.example .env

   # Azure Functions settings
   cp api/local.settings.json.example api/local.settings.json

   # Azure Static Web Apps config
   cp staticwebapp.config.json.example staticwebapp.config.json
   ```

2. **Fill in real values** in `api/local.settings.json`. For saves against local storage
   emulation, set `SAVE_STORAGE_CONNECTION=UseDevelopmentStorage=true` and run Azurite.

3. **Start with Azure Static Web Apps CLI:**
   ```bash
   npm install -g @azure/static-web-apps-cli
   swa start . --api-location api --port 8000
   ```

## 📋 Pre-Open-Source Checklist

Before making your repo public:

- [ ] `.gitignore` includes `local.settings.json`
- [ ] `.env.example` created with placeholder values
- [ ] `api/local.settings.json.example` created
- [ ] No files with real secrets committed
- [ ] Search repo for API keys: `git log -p | grep -i "api.*key\|secret\|password"`
- [ ] Review commit history for accidentally committed secrets
- [ ] Update `README.md` with deployment instructions
- [ ] Document Azure services needed (Static Web Apps, Storage account, AI Foundry for tooling)

## 🔍 Verify No Secrets

Run these commands to check:

```bash
# Check for common secret patterns
git grep -i "api.*key\|client.*secret\|password" -- ':!SECURITY.md' ':!*.example'

# Check for Azure keys (start with specific patterns)
git grep -E "(sk-|asst_|[a-zA-Z0-9]{32,})" -- ':!*.example' ':!legal/' ':!node_modules/'

# List all .env files (should only see .env.example)
find . -name ".env*" -not -name "*.example"
```

## 🚨 If You Accidentally Committed Secrets

1. **Rotate the secret immediately** in Azure Portal
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch path/to/secret/file' \
   --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (⚠️ coordinate with team):
   ```bash
   git push origin --force --all
   ```

## 📚 Resources

- [Cloud Saves Setup](docs/CLOUD_SAVES_SETUP.md)
- [Azure Static Web Apps application settings](https://learn.microsoft.com/azure/static-web-apps/application-settings)
- [Azure Blob Storage security](https://learn.microsoft.com/azure/storage/blobs/security-recommendations)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
