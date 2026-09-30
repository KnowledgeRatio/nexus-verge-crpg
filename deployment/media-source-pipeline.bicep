@description('Private account for approved runtime exports and editable art. No player saves.')
param sourceAccountName string = 'nexusvergeartsrc'

@description('Existing public media account. The CI identity receives access only to its media container.')
param publicMediaAccountName string = 'nexusvergemedia'

@description('GitHub repository whose release-branch workflow may exchange an OIDC token.')
param githubRepository string = 'KnowledgeRatio/nexus-verge-crpg'

@description('Only this branch may run the Azure-authenticated media promotion workflow.')
param githubBranch string = 'main-beta-quests'

@description('Optional operator object ID allowed to archive approved exports from a workstation.')
param archiveOperatorPrincipalId string = ''

resource sourceAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: sourceAccountName
  location: resourceGroup().location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
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
    workload: 'nexus-verge-private-art-source'
  }
}

resource sourceBlobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: sourceAccount
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: {
      enabled: true
      days: 90
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 90
    }
  }
}

resource approvedExports 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: sourceBlobService
  name: 'approved-exports'
  properties: {
    publicAccess: 'None'
  }
}

resource editableSources 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: sourceBlobService
  name: 'editable-sources'
  properties: {
    publicAccess: 'None'
  }
}

resource publicMediaAccount 'Microsoft.Storage/storageAccounts@2023-01-01' existing = {
  name: publicMediaAccountName
}

resource publicBlobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' existing = {
  parent: publicMediaAccount
  name: 'default'
}

resource publicMedia 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' existing = {
  parent: publicBlobService
  name: 'media'
}

resource ciIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'nexus-verge-media-release'
  location: resourceGroup().location
}

resource githubReleaseBranch 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: ciIdentity
  name: 'github-release-branch'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:${githubRepository}:ref:refs/heads/${githubBranch}'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

resource blobReader 'Microsoft.Authorization/roleDefinitions@2022-04-01' existing = {
  name: '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'
}

resource blobPublisher 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: guid(resourceGroup().id, 'nexus-verge-blob-publisher-no-delete')
  properties: {
    roleName: 'Nexus Verge Blob Publisher (No Delete)'
    description: 'Read and write approved media blobs without permission to delete blobs or containers.'
    type: 'CustomRole'
    assignableScopes: [
      resourceGroup().id
    ]
    permissions: [
      {
        actions: [
          'Microsoft.Storage/storageAccounts/blobServices/containers/read'
        ]
        notActions: []
        dataActions: [
          'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'
          'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write'
          'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/add/action'
        ]
        notDataActions: []
      }
    ]
  }
}

resource sourceRead 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(approvedExports.id, ciIdentity.id, blobReader.id)
  scope: approvedExports
  properties: {
    principalId: ciIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobReader.id
  }
}

resource publicWrite 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(publicMedia.id, ciIdentity.id, blobPublisher.id)
  scope: publicMedia
  properties: {
    principalId: ciIdentity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobPublisher.id
  }
}

resource operatorArchiveWrite 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(archiveOperatorPrincipalId)) {
  name: guid(approvedExports.id, archiveOperatorPrincipalId, blobPublisher.id)
  scope: approvedExports
  properties: {
    principalId: archiveOperatorPrincipalId
    principalType: 'User'
    roleDefinitionId: blobPublisher.id
  }
}

output sourceAccountName string = sourceAccount.name
output ciClientId string = ciIdentity.properties.clientId
output ciPrincipalId string = ciIdentity.properties.principalId
output sourceExportsContainerId string = approvedExports.id
output editableSourcesContainerId string = editableSources.id
