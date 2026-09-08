# Cloud Saves — Azure Setup

Server-held save games for Nexus Verge. The site holds the player's character and world; no
export/import file juggling, and no identity provider.

## Azure resources required

| Resource | Needed? | Notes |
|---|---|---|
| Static Web App | Already exists | **Free plan is sufficient.** `api_location: "api"` is already set in the deploy workflow |
| **Storage account** | **New — the only resource to create** | StorageV2, Standard_LRS, Hot tier. The blob container is created by the API on first use |
| Blob container | Created automatically | `nexus-verge-saves` |
| Entra app registration | **No** | No identity provider is used |
| Key Vault | No | App settings are encrypted at rest |
| Cosmos DB / SQL | No | Saves are blobs, not queried |
| SWA Standard plan | No | Only needed for custom auth providers, which this design avoids |

Managed Azure Functions come with the Static Web App at no extra cost. Expected running cost is
a few cents per month — blob storage at roughly $0.02/GB plus transactions.

## Create the storage account

```bash
RG=<your-resource-group>
STORAGE=nexusvergesaves          # must be globally unique, lowercase, 3-24 chars
SWA_NAME=<your-static-web-app>

az storage account create \
  --name "$STORAGE" \
  --resource-group "$RG" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false
```

Enable soft delete so an accidental overwrite or delete is recoverable:

```bash
az storage account blob-service-properties update \
  --account-name "$STORAGE" \
  --resource-group "$RG" \
  --enable-delete-retention true \
  --delete-retention-days 30
```

## Configure the two app settings

```bash
CONNECTION=$(az storage account show-connection-string \
  --name "$STORAGE" --resource-group "$RG" --query connectionString -o tsv)

SECRET=$(openssl rand -base64 48)

az staticwebapp appsettings set \
  --name "$SWA_NAME" \
  --setting-names \
    "SAVE_STORAGE_CONNECTION=$CONNECTION" \
    "SAVE_TOKEN_SECRET=$SECRET"
```

> **`SAVE_TOKEN_SECRET` must never change once players have saves.** The blob path for a player is
> derived from `HMAC(username + recovery code, SAVE_TOKEN_SECRET)`. Rotating the secret changes
> every derived path at once, orphaning every existing save with no way to find them again.
> Store a copy somewhere durable before going live.

Neither setting name collides with the prefixes SWA reserves for its own use (`AZUREBLOBSTORAGE_`,
`AZURE_FUNCTION_`, `WEBSITE_`, `FUNCTIONS_`, `AzureWeb*`, and others).

## Turn it on

Cloud saves are behind a flag, off by default:

```javascript
// src/core/rulesEngine.js
saves: {
    backend: 'cloud',   // 'local' keeps the original LocalStorage-only behaviour
}
```

Flip it only after hands-on testing against a deployed API. `'local'` remains the rollback path.

## Identity model

A player is identified by **two values that must both match**:

1. **Player name** — chosen by the player, normalized (case, accents, and internal whitespace do
   not affect the derived key)
2. **Recovery code** — server-generated, 20 Crockford base32 characters (~100 bits), shown as
   `NV-XXXXX-XXXXX-XXXXX-XXXXX`

The storage key is `HMAC-SHA256(username + ":" + code, SAVE_TOKEN_SECRET)`. Consequences:

- A leaked or guessed code alone unlocks nothing — the name is also required.
- The raw code never appears in storage, so a storage-side breach yields no usable credentials.
- There is no password reset. Losing both values loses any save not cached on a device.
- Changing the player name moves the saves (`POST /api/player/rotate` with a new username).

This is a continuity mechanism, not an anti-cheat one. The rules engine runs entirely client-side,
so the server stores whatever state the client submits.

## API surface

All routes are anonymous at the Functions level; authorization is the name + code pair, sent as
`Authorization: Bearer <code>` and `X-Player-Name: <name>`.

| Route | Method | Purpose |
|---|---|---|
| `/api/player` | POST | Mint a recovery code for a new player name |
| `/api/player/rotate` | POST | Issue a new code (and optionally a new name), moving saves across |
| `/api/saves` | GET | Slot metadata for the slot list |
| `/api/saves/{slot}` | GET / PUT / DELETE | Read, write, or clear one slot (1–5) |

Blob layout is `{playerKey}/index.json` for slot metadata plus `{playerKey}/slot-{n}.json` per save.

## Local development

```bash
cp api/local.settings.json.example api/local.settings.json
# set SAVE_STORAGE_CONNECTION=UseDevelopmentStorage=true (Azurite) and any SAVE_TOKEN_SECRET
cd api && npm install && func start
```

`local.settings.json` is gitignored.

## Offline behaviour

`CloudSaveStore` writes to LocalStorage first, then to the API. If the API is unreachable the save
still succeeds locally and the player is told it is device-only. Reads fall back to the same cache.
A player with no name/code set can play normally; saves simply stay on that device.
