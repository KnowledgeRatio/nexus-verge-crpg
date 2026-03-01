/**
 * GET /api/roger-agents
 *
 * Returns the list of available AI agents for Roger.
 * Route is protected by SWA - only authenticated users reach this function
 * (see staticwebapp.config.json: /api/roger* requires "authenticated" role).
 *
 * The SWA runtime injects the authenticated user via the
 * x-ms-client-principal header (base64-encoded JSON).
 */
module.exports = async function (context, req) {
    try {
        // SWA injects auth principal - parse it
        const principalHeader = req.headers['x-ms-client-principal'];
        if (!principalHeader) {
            context.res = { status: 401, body: { error: 'Unauthorized' } };
            return;
        }

        let principal;
        try {
            principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString('utf-8'));
        } catch (parseError) {
            context.log.error('Failed to parse principal header:', parseError);
            context.res = { status: 401, body: { error: 'Invalid principal' } };
            return;
        }

        // Check if Roger is configured
        const isConfigured = !!process.env.ROGER_PROJECT_ENDPOINT;
        const agentName = process.env.ROGER_AGENT_NAME || "Roger";
        const agentVersion = process.env.ROGER_AGENT_VERSION; // Optional

        // Return the catalogue of available agents.
        // Add new agents here as needed.
        const agent = {
            id: 'roger',
            name: agentName,
            description: 'AI assistant for Nexus Verge development',
            icon: '🤖'
        };
        if (agentVersion) {
            agent.version = agentVersion;
        }

        const agents = isConfigured ? [agent] : [];

        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: {
                agents,
                user: {
                    name: principal.userDetails,
                    id: principal.userId
                },
                configured: isConfigured
            }
        };
    } catch (error) {
        context.log.error('Unexpected error in roger-agents:', error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Internal server error', details: error.message }
        };
    }
};
