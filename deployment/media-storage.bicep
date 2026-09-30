@description('Dedicated public-media account. Never use the private save account here.')
param accountName string = 'nexusvergemedia'

@description('SWA origins allowed to read media in a browser.')
param allowedOrigins array = [
  'https://victorious-stone-02afeaa03.2.azurestaticapps.net'
]

resource mediaAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: accountName
  location: resourceGroup().location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: true
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    allowCrossTenantReplication: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
  tags: {
    workload: 'nexus-verge-public-media'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: mediaAccount
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    cors: {
      corsRules: [
        {
          allowedOrigins: allowedOrigins
          allowedMethods: [
            'GET'
            'HEAD'
            'OPTIONS'
          ]
          allowedHeaders: [
            '*'
          ]
          exposedHeaders: [
            'ETag'
            'Content-Length'
            'Content-Range'
            'Accept-Ranges'
            'Cache-Control'
            'Content-Type'
          ]
          maxAgeInSeconds: 3600
        }
      ]
    }
  }
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'media'
  properties: {
    publicAccess: 'Blob'
  }
}

output mediaOrigin string = 'https://${mediaAccount.name}.blob.${environment().suffixes.storage}/media/'
output mediaAccountId string = mediaAccount.id
