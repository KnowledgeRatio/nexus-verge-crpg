# Setup Guide

Quick guide to get Nexus Verge running locally or deploy to Azure.

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+ and npm
- Azure subscription (only for cloud saves — the game runs fully without one)
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

### 3. Set Up Cloud Saves (optional)

Cloud saves are off by default (`RULES.saves.backend: 'local'`). To develop against them,
fill in `api/local.settings.json`:

```json
{
  "Values": {
    "SAVE_STORAGE_CONNECTION": "UseDevelopmentStorage=true",
    "SAVE_TOKEN_SECRET": "any-value-for-local-dev"
  }
}
```

`UseDevelopmentStorage=true` targets [Azurite](https://learn.microsoft.com/azure/storage/common/storage-use-azurite).
For the full Azure setup, see [docs/CLOUD_SAVES_SETUP.md](docs/CLOUD_SAVES_SETUP.md).

### 4. Run Locally

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Start local dev server (frontend + saves API)
swa start . --api-location api --port 8000
```

Open http://localhost:8000

**Frontend only (no API, no cloud saves):**
```bash
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
In **Azure Portal** → **Static Web Apps** → **Environment variables** (cloud saves only):

| Setting | Value | Required |
|---------|-------|----------|
| `SAVE_STORAGE_CONNECTION` | Storage account connection string | For cloud saves |
| `SAVE_TOKEN_SECRET` | `openssl rand -base64 48` — **never rotate this** | For cloud saves |

Full walkthrough including the storage account: [docs/CLOUD_SAVES_SETUP.md](docs/CLOUD_SAVES_SETUP.md).

### 3. Deploy
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
- ✅ Save/load (LocalStorage) and save file export/import
- ❌ Cloud saves across devices (requires a storage account)

## 🔒 Security Notes

- **Never commit** `.env`, `api/local.settings.json`, or `staticwebapp.config.json`
- Keep templates (`.example` files) up to date
- See [SECURITY.md](SECURITY.md) for full security guide

## 📚 More Info

- [Azure Static Web Apps Docs](https://learn.microsoft.com/azure/static-web-apps/)
- [Cloud Saves Setup](docs/CLOUD_SAVES_SETUP.md)
- [Azure Functions Node.js reference](https://learn.microsoft.com/azure/azure-functions/functions-reference-node)
