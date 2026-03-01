/**
 * POST /api/roger-chat
 *
 * Proxies a chat message to an Azure AI Project agent using Conversations API.
 * Route is protected by SWA - only authenticated users reach this function.
 *
 * Request body:
 *   { agentId: string, message: string, conversationId?: string }
 *
 * Response body:
 *   { reply: string, conversationId: string }
 *
 * Required Application Settings (Azure Portal → Static Web Apps → Configuration):
 *   ROGER_PROJECT_ENDPOINT     - e.g. https://<name>.services.ai.azure.com/api/projects/<project>
 *   ROGER_AGENT_NAME           - Agent name (default: "Roger")
 *
 * Optional Application Settings:
 *   ROGER_AGENT_VERSION        - Agent version (omit to use latest version)
 */

const { DefaultAzureCredential } = require("@azure/identity");
const { AIProjectClient } = require("@azure/ai-projects");

module.exports = async function (context, req) {
    try {
        // --- Auth guard ---
        const principalHeader = req.headers['x-ms-client-principal'];
        if (!principalHeader) {
            context.res = { status: 401, body: { error: 'Unauthorized' } };
            return;
        }

        // Parse and validate principal
        let principal;
        try {
            principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString('utf-8'));
            if (!principal.userId || !principal.userDetails) {
                context.res = { status: 401, body: { error: 'Invalid principal' } };
                return;
            }
        } catch (parseError) {
            context.log.error('Failed to parse principal:', parseError);
            context.res = { status: 401, body: { error: 'Invalid principal' } };
            return;
        }

        // Optional: Log authenticated user for audit trail
        context.log(`Roger chat request from user: ${principal.userDetails} (${principal.userId})`);

        // --- Parse request ---
        const { agentId, message, conversationId } = req.body || {};
        if (!agentId || !message) {
            context.res = { status: 400, body: { error: 'agentId and message are required' } };
            return;
        }

        // --- Get configuration ---
        const projectEndpoint = process.env.ROGER_PROJECT_ENDPOINT;
        const agentName = process.env.ROGER_AGENT_NAME || "Roger";
        const agentVersion = process.env.ROGER_AGENT_VERSION; // Optional - omit to use latest

        if (!projectEndpoint) {
            context.res = { status: 503, body: { error: 'Roger not configured (missing ROGER_PROJECT_ENDPOINT)' } };
            return;
        }

        // --- Create AI Project client ---
        // Use DefaultAzureCredential for managed identity in Azure
        // Falls back to environment variables, Azure CLI, etc. for local dev
        const credential = new DefaultAzureCredential();
        const projectClient = new AIProjectClient(projectEndpoint, credential);

        // Get OpenAI client for conversations
        const openAIClient = await projectClient.getOpenAIClient();

        // --- Create or continue conversation ---
        let activeConversationId = conversationId;

        if (!activeConversationId) {
            // Create new conversation with initial user message
            context.log('Creating new conversation...');
            const conversation = await openAIClient.conversations.create({
                items: [
                    { type: "message", role: "user", content: message }
                ]
            });
            activeConversationId = conversation.id;
            context.log(`Created conversation: ${activeConversationId}`);
        } else {
            // Add message to existing conversation
            context.log(`Adding message to conversation: ${activeConversationId}`);
            await openAIClient.conversations.update(activeConversationId, {
                items: [
                    { type: "message", role: "user", content: message }
                ]
            });
        }

        // --- Generate response using agent ---
        const versionLog = agentVersion ? `v${agentVersion}` : 'latest';
        context.log(`Generating response with agent: ${agentName} ${versionLog}`);

        // Build agent reference - only include version if specified
        const agentRef = {
            name: agentName,
            type: "agent_reference"
        };
        if (agentVersion) {
            agentRef.version = agentVersion;
        }

        const response = await openAIClient.responses.create(
            {
                conversation: activeConversationId,
            },
            {
                body: { agent: agentRef },
            }
        );

        // Extract reply text
        const reply = response.output_text || "No response from agent";

        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
                reply,
                conversationId: activeConversationId
            }
        };

    } catch (error) {
        context.log.error('Roger chat error:', error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Internal error calling agent', details: error.message }
        };
    }
};
