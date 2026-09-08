import { app } from '@azure/functions';
import {
    generateRecoveryCode,
    normalizeRecoveryCode,
    normalizeUsername,
    playerKeyFor
} from '../identity.js';
import { readIndex, writeIndex, readSlot, writeSlot, deleteSlot, movePlayer } from '../store.js';

const MAX_SLOTS = 5;
const MAX_SAVE_BYTES = 12 * 1024 * 1024;

function json(status, body) {
    return { status, jsonBody: body };
}

function secret() {
    const value = process.env.SAVE_TOKEN_SECRET;
    if (!value) {
        throw new Error('SAVE_TOKEN_SECRET is not configured');
    }
    return value;
}

function identify(username, code) {
    const canonicalUsername = normalizeUsername(username);
    const canonicalCode = normalizeRecoveryCode(code);

    if (!canonicalUsername || !canonicalCode) {
        return null;
    }
    return {
        username: canonicalUsername,
        playerKey: playerKeyFor(canonicalUsername, canonicalCode, secret())
    };
}

function authenticate(request) {
    const code = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    return identify(request.headers.get('x-player-name'), code);
}

function parseSlot(request) {
    const slotId = Number(request.params.slot);
    return Number.isInteger(slotId) && slotId >= 1 && slotId <= MAX_SLOTS ? slotId : null;
}

app.http('createPlayer', {
    route: 'player',
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const body = await request.json().catch(() => null);
        const canonicalUsername = normalizeUsername(body?.username);

        if (!canonicalUsername) {
            return json(400, { error: 'Username must be 3-32 characters' });
        }

        const code = generateRecoveryCode();
        const playerKey = playerKeyFor(canonicalUsername, normalizeRecoveryCode(code), secret());
        await writeIndex(playerKey, { username: body.username.trim(), slots: {} });

        return json(201, { code });
    }
});

app.http('rotatePlayerCode', {
    route: 'player/rotate',
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const auth = authenticate(request);
        if (!auth) {
            return json(401, { error: 'Invalid username or recovery code' });
        }

        const body = await request.json().catch(() => null);
        const nextUsername = body?.username ? normalizeUsername(body.username) : auth.username;
        if (!nextUsername) {
            return json(400, { error: 'Username must be 3-32 characters' });
        }

        const code = generateRecoveryCode();
        const nextKey = playerKeyFor(nextUsername, normalizeRecoveryCode(code), secret());
        await movePlayer(auth.playerKey, nextKey);

        return json(200, { code });
    }
});

app.http('listSaves', {
    route: 'saves',
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const auth = authenticate(request);
        if (!auth) {
            return json(401, { error: 'Invalid username or recovery code' });
        }
        return json(200, await readIndex(auth.playerKey));
    }
});

app.http('saveSlot', {
    route: 'saves/{slot}',
    methods: ['GET', 'PUT', 'DELETE'],
    authLevel: 'anonymous',
    handler: async (request) => {
        const auth = authenticate(request);
        if (!auth) {
            return json(401, { error: 'Invalid username or recovery code' });
        }

        const slotId = parseSlot(request);
        if (!slotId) {
            return json(400, { error: `Slot must be between 1 and ${MAX_SLOTS}` });
        }

        if (request.method === 'GET') {
            const saveData = await readSlot(auth.playerKey, slotId);
            return saveData ? json(200, saveData) : json(404, { error: 'Save slot is empty' });
        }

        if (request.method === 'DELETE') {
            await deleteSlot(auth.playerKey, slotId);
            const index = await readIndex(auth.playerKey);
            delete index.slots[slotId];
            await writeIndex(auth.playerKey, index);
            return json(200, { deleted: slotId });
        }

        const raw = await request.text();
        if (Buffer.byteLength(raw, 'utf8') > MAX_SAVE_BYTES) {
            return json(413, { error: 'Save payload too large' });
        }

        let payload;
        try {
            payload = JSON.parse(raw);
        } catch {
            return json(400, { error: 'Body must be valid JSON' });
        }

        if (!payload?.save || !payload?.metadata) {
            return json(400, { error: 'Body must include save and metadata' });
        }

        await writeSlot(auth.playerKey, slotId, payload.save);

        const index = await readIndex(auth.playerKey);
        index.slots[slotId] = payload.metadata;
        await writeIndex(auth.playerKey, index);

        return json(200, { saved: slotId });
    }
});
