# Security & Deployment Guide

## 🔒 Security Overview

This project follows security best practices:
- ✅ **No secrets in code** - All secrets use environment variables
- ✅ **Server-side authentication** - Roger AI endpoints protected by Azure Entra ID
- ✅ **Tenant restriction** - Only authorized Entra tenant users can access LLM
- ✅ **Defense in depth** - Multiple layers of auth validation

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
| `ROGER_ENTRA_CLIENT_ID` | Entra App Registration Client ID | Azure Portal → App Registrations |
| `ROGER_ENTRA_CLIENT_SECRET` | Entra App Registration Secret | Azure Portal → App Registrations → Certificates & Secrets |
| `ROGER_FOUNDRY_ENDPOINT` | Azure AI Foundry Project Endpoint | Azure Portal → AI Foundry → Your Project |
| `ROGER_FOUNDRY_API_KEY` | Azure AI Foundry API Key | Azure Portal → AI Foundry → Keys |
| `ROGER_CODEWHISPERER_AGENT_ID` | Foundry Agent ID (starts with `asst_`) | Azure AI Foundry → Agents |

### For Local Development

1. **Copy configuration templates:**
   ```bash
   # Environment variables
   cp .env.example .env

   # Azure Functions settings
   cp api/local.settings.json.example api/local.settings.json

   # Azure Static Web Apps config
   cp staticwebapp.config.json.example staticwebapp.config.json
   ```

2. **Get your Entra Tenant ID:**
   - Go to [Azure Portal](https://portal.azure.com)
   - Click **Microsoft Entra ID** (formerly Azure AD)
   - Copy **Tenant ID** from Overview page
   - Example: `12345678-1234-1234-1234-123456789abc`

3. **Fill in `staticwebapp.config.json`:**
   ```json
   "openIdIssuer": "https://login.microsoftonline.com/<YOUR_TENANT_ID>/v2.0"
   ```
   Replace `<YOUR_TENANT_ID>` with your actual tenant ID.

4. **Fill in real values** in `.env` and `api/local.settings.json` (get from Azure Portal)

5. **Start with Azure Static Web Apps CLI:**
   ```bash
   npm install -g @azure/static-web-apps-cli
   swa start . --port 8000
   ```

## 🛡️ Tenant ID Privacy

Your `staticwebapp.config.json` contains your Entra tenant ID, which is **specific to your organization**:
```json
"openIdIssuer": "https://login.microsoftonline.com/<YOUR_TENANT_ID>/v2.0"
```

**Why we gitignore it:**
- Makes the repo **portable** - contributors use their own tenant
- Avoids **confusion** - no hardcoded org-specific IDs in public code
- **Best practice** - treat deployment configs as environment-specific

**Note:** Microsoft states tenant IDs are [not secrets](https://learn.microsoft.com/en-us/entra/identity-platform/security-tokens#validate-tokens), but for open-source projects, it's cleaner to keep them out of the repo.

**Security still enforced by:**
- Client secret (which IS secret)
- Only authorized tenant users can sign in
- Server-side authentication in Azure Functions

## 📋 Pre-Open-Source Checklist

Before making your repo public:

- [ ] `.gitignore` includes `local.settings.json`
- [ ] `.env.example` created with placeholder values
- [ ] `api/local.settings.json.example` created
- [ ] No files with real secrets committed
- [ ] Search repo for API keys: `git log -p | grep -i "api.*key\|secret\|password"`
- [ ] Review commit history for accidentally committed secrets
- [ ] Update `README.md` with deployment instructions
- [ ] Document Azure services needed (Static Web Apps, AI Foundry, Entra ID)

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

- [Azure Static Web Apps Authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [Azure AI Foundry Agents](https://learn.microsoft.com/en-us/azure/ai-services/agents/)
- [Entra ID App Registration](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
