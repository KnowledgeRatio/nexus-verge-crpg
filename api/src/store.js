import { BlobServiceClient } from '@azure/storage-blob';

const CONTAINER_NAME = 'nexus-verge-saves';

let containerPromise = null;

function getContainer() {
    if (!containerPromise) {
        const connectionString = process.env.SAVE_STORAGE_CONNECTION;
        if (!connectionString) {
            throw new Error('SAVE_STORAGE_CONNECTION is not configured');
        }
        const service = BlobServiceClient.fromConnectionString(connectionString);
        const container = service.getContainerClient(CONTAINER_NAME);
        containerPromise = container.createIfNotExists().then(() => container);
    }
    return containerPromise;
}

function slotBlobName(playerKey, slotId) {
    return `${playerKey}/slot-${slotId}.json`;
}

function indexBlobName(playerKey) {
    return `${playerKey}/index.json`;
}

async function readJson(blobName) {
    const container = await getContainer();
    const blob = container.getBlockBlobClient(blobName);

    try {
        const buffer = await blob.downloadToBuffer();
        return JSON.parse(buffer.toString('utf8'));
    } catch (error) {
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
}

async function writeJson(blobName, value) {
    const container = await getContainer();
    const body = JSON.stringify(value);
    await container.getBlockBlobClient(blobName).upload(body, Buffer.byteLength(body), {
        blobHTTPHeaders: { blobContentType: 'application/json' }
    });
}

export async function readIndex(playerKey) {
    return (await readJson(indexBlobName(playerKey))) ?? { slots: {} };
}

export async function writeIndex(playerKey, index) {
    await writeJson(indexBlobName(playerKey), index);
}

export async function readSlot(playerKey, slotId) {
    return readJson(slotBlobName(playerKey, slotId));
}

export async function writeSlot(playerKey, slotId, saveData) {
    await writeJson(slotBlobName(playerKey, slotId), saveData);
}

export async function deleteSlot(playerKey, slotId) {
    const container = await getContainer();
    await container.getBlockBlobClient(slotBlobName(playerKey, slotId)).deleteIfExists();
}

export async function movePlayer(fromKey, toKey) {
    const container = await getContainer();
    const moved = [];

    for await (const blob of container.listBlobsFlat({ prefix: `${fromKey}/` })) {
        const suffix = blob.name.slice(fromKey.length + 1);
        const source = container.getBlockBlobClient(blob.name);
        const buffer = await source.downloadToBuffer();

        await container.getBlockBlobClient(`${toKey}/${suffix}`).upload(buffer, buffer.length, {
            blobHTTPHeaders: { blobContentType: 'application/json' }
        });
        moved.push(blob.name);
    }

    for (const name of moved) {
        await container.getBlockBlobClient(name).deleteIfExists();
    }

    return moved.length;
}
