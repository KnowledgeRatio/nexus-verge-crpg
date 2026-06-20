# Setup Guide

Quick guide to get Nexus Verge running locally or deploy to Azure.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm
- Azure subscription (for Roger AI features)
- Azure Static Web Apps CLI

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/nexus-verge-crpg-5e.git
cd nexus-verge-crpg-5e
npm install
```

### 2. Create Configuration Files

```bash
# Copy templates (keep these files LOCAL, don't commit!)
cp .env.example .env
cp api/local.settings.json.example api/local.settings.json
cp staticwebapp.config.json.example staticwebapp.config.json
```

### 3. Configure Your Tenant ID

**Get your Entra Tenant ID:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID**
3. Copy the **Tenant ID** from the Overview page

**Update `staticwebapp.config.json`:**
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/YOUR-TENANT-ID-HERE/v2.0"
        }
      }
    }
  }
}
```

### 4. Set Up Azure Resources

#### Create Entra ID App Registration
1. Go to **Azure Portal** → **Microsoft Entra ID** → **App Registrations**
2. Click **New registration**
3. Name: `Nexus Verge - Roger AI`
4. Supported account types: **Single tenant**
5. Redirect URI: `https://your-app.azurestaticapps.net/.auth/login/aad/callback`
6. Click **Register**

**Get credentials:**
- Copy **Application (client) ID**
- Create **Client Secret** (Certificates & secrets → New client secret)
- Save both to `.env` and `api/local.settings.json`

#### Create Azure AI Foundry Project
1. Go to **Azure Portal** → **AI Foundry**
2. Create new project
3. Copy **Endpoint URL** (e.g., `https://project-name.services.ai.azure.com/api/projects/project-name`)
4. Create an Agent named "Roger" (or your preferred name)

**Update your configs:**

`.env`:
```bash
ROGER_ENTRA_CLIENT_ID=your-client-id-here
ROGER_ENTRA_CLIENT_SECRET=your-client-secret-here
ROGER_PROJECT_ENDPOINT=https://your-name.services.ai.azure.com/api/projects/your-project
ROGER_AGENT_NAME=Roger
# ROGER_AGENT_VERSION=7  # Optional - omit to always use latest agent version
```

`api/local.settings.json`:
```json
{
  "Values": {
    "ROGER_ENTRA_CLIENT_ID": "same-as-above",
    "ROGER_ENTRA_CLIENT_SECRET": "same-as-above",
    "ROGER_PROJECT_ENDPOINT": "same-as-above",
    "ROGER_AGENT_NAME": "Roger"
  }
}
```
**Note:** `ROGER_AGENT_VERSION` is optional - omit it to automatically use the latest agent version.

### 5. Run Locally

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Start local dev server
swa start . --port 8000
```

Open http://localhost:8000

**Without Roger AI (no Azure setup):**
```bash
# Simple HTTP server (Roger won't work)
python -m http.server 8000
# or
npx serve .
```

## ☁️ Deploy to Azure Static Web Apps

### 1. Create Static Web App
```bash
# Using Azure CLI
az staticwebapp create \
  --name nexus-verge \
  --resource-group your-resource-group \
  --source https://github.com/yourusername/nexus-verge-crpg-5e \
  --location "East US 2" \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location ""
```

### 2. Configure Application Settings
In **Azure Portal** → **Static Web Apps** → **Configuration**:

| Setting | Value | Required |
|---------|-------|----------|
| `ROGER_ENTRA_CLIENT_ID` | Your Entra client ID | Yes |
| `ROGER_ENTRA_CLIENT_SECRET` | Your Entra client secret | Yes |
| `ROGER_PROJECT_ENDPOINT` | Your AI Foundry project endpoint | Yes |
| `ROGER_AGENT_NAME` | Your agent name (e.g., "Roger") | Yes |
| `ROGER_AGENT_VERSION` | Your agent version (e.g., "7") | **No** - omit to use latest |

### 3. Update Entra Redirect URI
Go to **App Registration** → **Authentication** → **Redirect URIs**

Add:
```
https://your-actual-app-name.azurestaticapps.net/.auth/login/aad/callback
```

### 4. Deploy
```bash
# Deploy via GitHub Actions (automatic on push to main)
git push origin main

# Or manually with SWA CLI
swa deploy
```

## 🎮 Features Available Without Azure

Most of the game works **without Azure setup**:
- ✅ Character creation
- ✅ Exploration & procedural world
- ✅ Combat system
- ✅ Quests
- ✅ Trading & inventory
- ✅ Save/load (LocalStorage)
- ❌ Roger AI assistant (requires Azure)
- ❌ Dev Mode toggle (requires authentication in production)

## 🔒 Security Notes

- **Never commit** `.env`, `api/local.settings.json`, or `staticwebapp.config.json`
- Keep templates (`.example` files) up to date
- See [SECURITY.md](SECURITY.md) for full security guide

## 📚 More Info

- [Azure Static Web Apps Docs](https://learn.microsoft.com/en-us/azure/static-web-apps/)
- [Azure AI Foundry Agents](https://learn.microsoft.com/en-us/azure/ai-services/agents/)
- [Entra ID Authentication](https://learn.microsoft.com/en-us/entra/identity-platform/)
