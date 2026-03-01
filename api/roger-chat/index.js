/**
 * POST /api/roger-chat
 *
 * Proxies a chat message to an Azure AI Foundry agent and returns the response.
 * Route is protected by SWA - only authenticated users reach this function.
 *
 * Request body:
 *   { agentId: string, message: string, threadId?: string }
 *
 * Response body:
 *   { reply: string, threadId: string }
 *
 * Required Application Settings (Azure Portal → Static Web Apps → Configuration):
 *   ROGER_FOUNDRY_ENDPOINT     - e.g. https://<name>.services.ai.azure.com/api/projects/<project>
 *   ROGER_FOUNDRY_API_KEY      - API key from AI Foundry project
 *   ROGER_CODEWHISPERER_AGENT_ID - Foundry agent ID (asst_xxx) for Codewhisperer
 *
 * Paste your Foundry agent code into the appropriate section below.
 */
module.exports = async function (context, req) {
    // --- Auth guard ---
    const principalHeader = req.headers['x-ms-client-principal'];
    if (!principalHeader) {
        context.res = { status: 401, body: { error: 'Unauthorized' } };
        return;
    }

    // --- Parse request ---
    const { agentId, message, threadId } = req.body || {};
    if (!agentId || !message) {
        context.res = { status: 400, body: { error: 'agentId and message are required' } };
        return;
    }

    // --- Resolve Foundry agent ID from catalogue ---
    const agentMap = {
        codewhisperer: process.env.ROGER_CODEWHISPERER_AGENT_ID
        // Add more agents here as: agentKey: process.env.ROGER_<NAME>_AGENT_ID
    };

    const foundryAgentId = agentMap[agentId];
    if (!foundryAgentId) {
        context.res = { status: 404, body: { error: `Agent '${agentId}' not configured` } };
        return;
    }

    const endpoint = process.env.ROGER_FOUNDRY_ENDPOINT;
    const apiKey = process.env.ROGER_FOUNDRY_API_KEY;
    const apiVersion = '2025-05-01';

    if (!endpoint || !apiKey) {
        context.res = { status: 503, body: { error: 'Foundry not configured on server' } };
        return;
    }

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'api-key': apiKey
    };

    try {
        // ---------------------------------------------------------------
        // PASTE YOUR FOUNDRY AGENT CODE BELOW if you have custom setup.
        // The standard Foundry Agents REST flow is implemented here:
        //   1. Create thread (or reuse existing threadId)
        //   2. Add user message to thread
        //   3. Create a run (agent processes the thread)
        //   4. Poll run status until complete
        //   5. Retrieve the assistant's reply message
        // ---------------------------------------------------------------

        // Step 1: Create or reuse thread
        let activeThreadId = threadId;
        if (!activeThreadId) {
            const threadRes = await fetch(
                `${endpoint}/threads?api-version=${apiVersion}`,
                { method: 'POST', headers, body: '{}' }
            );
            if (!threadRes.ok) {
                const err = await threadRes.text();
                context.log.error('Thread create failed:', err);
                context.res = { status: 502, body: { error: 'Failed to create Foundry thread' } };
                return;
            }
            const threadData = await threadRes.json();
            activeThreadId = threadData.id;
        }

        // Step 2: Add user message
        const msgRes = await fetch(
            `${endpoint}/threads/${activeThreadId}/messages?api-version=${apiVersion}`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ role: 'user', content: message })
            }
        );
        if (!msgRes.ok) {
            const err = await msgRes.text();
            context.log.error('Message add failed:', err);
            context.res = { status: 502, body: { error: 'Failed to add message to thread' } };
            return;
        }

        // Step 3: Create run
        const runRes = await fetch(
            `${endpoint}/threads/${activeThreadId}/runs?api-version=${apiVersion}`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ assistant_id: foundryAgentId })
            }
        );
        if (!runRes.ok) {
            const err = await runRes.text();
            context.log.error('Run create failed:', err);
            context.res = { status: 502, body: { error: 'Failed to start agent run' } };
            return;
        }
        const runData = await runRes.json();
        const runId = runData.id;

        // Step 4: Poll run status (max ~40s, well within the 45s SWA function timeout)
        const maxAttempts = 20;
        const pollIntervalMs = 2000;
        let runStatus = runData.status;

        for (let attempt = 0; attempt < maxAttempts && !isTerminal(runStatus); attempt++) {
            await sleep(pollIntervalMs);
            const statusRes = await fetch(
                `${endpoint}/threads/${activeThreadId}/runs/${runId}?api-version=${apiVersion}`,
                { method: 'GET', headers }
            );
            if (!statusRes.ok) break;
            const statusData = await statusRes.json();
            runStatus = statusData.status;
        }

        if (!isCompleted(runStatus)) {
            context.res = {
                status: 504,
                body: { error: `Agent run did not complete in time (status: ${runStatus})` }
            };
            return;
        }

        // Step 5: Retrieve messages - get the latest assistant message
        const msgsRes = await fetch(
            `${endpoint}/threads/${activeThreadId}/messages?api-version=${apiVersion}&order=desc&limit=10`,
            { method: 'GET', headers }
        );
        if (!msgsRes.ok) {
            context.res = { status: 502, body: { error: 'Failed to retrieve messages' } };
            return;
        }
        const msgsData = await msgsRes.json();
        const assistantMessages = (msgsData.data || []).filter(m => m.role === 'assistant');
        const latestMsg = assistantMessages[0];

        if (!latestMsg) {
            context.res = { status: 502, body: { error: 'No assistant reply found' } };
            return;
        }

        // Extract text from the message content array
        const reply = extractText(latestMsg.content);

        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: { reply, threadId: activeThreadId }
        };

    } catch (err) {
        context.log.error('Roger chat error:', err);
        context.res = { status: 500, body: { error: 'Internal error calling Foundry agent' } };
    }
};

/** Terminal run states per Foundry API spec */
function isTerminal(status) {
    return ['completed', 'failed', 'cancelled', 'expired', 'incomplete'].includes(status);
}

function isCompleted(status) {
    return status === 'completed';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/** Extract plain text from Foundry message content array */
function extractText(content) {
    if (!Array.isArray(content)) return String(content || '');
    return content
        .filter(c => c.type === 'text')
        .map(c => c.text?.value || '')
        .join('\n')
        .trim();
}
