/**
 * GET /api/roger-agents
 *
 * Returns the list of available Foundry agents for Roger.
 * Route is protected by SWA - only authenticated users reach this function
 * (see staticwebapp.config.json: /api/roger* requires "authenticated" role).
 *
 * The SWA runtime injects the authenticated user via the
 * x-ms-client-principal header (base64-encoded JSON).
 */
module.exports = async function (context, req) {
    // SWA injects auth principal - parse it
    const principalHeader = req.headers['x-ms-client-principal'];
    if (!principalHeader) {
        context.res = { status: 401, body: { error: 'Unauthorized' } };
        return;
    }

    let principal;
    try {
        principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString('utf-8'));
    } catch {
        context.res = { status: 401, body: { error: 'Invalid principal' } };
        return;
    }

    // Return the catalogue of available agents.
    // Add new agents here as they are created in AI Foundry.
    const agents = [
        {
            id: 'codewhisperer',
            name: 'Codewhisperer',
            description: 'AI coding assistant for Nexus Verge development',
            icon: '🤖',
            // Set ROGER_CODEWHISPERER_AGENT_ID in Azure Static Web Apps Application Settings
            foundryAgentId: process.env.ROGER_CODEWHISPERER_AGENT_ID || null
        }
    ];

    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
            agents,
            user: {
                name: principal.userDetails,
                id: principal.userId
            }
        }
    };
};
