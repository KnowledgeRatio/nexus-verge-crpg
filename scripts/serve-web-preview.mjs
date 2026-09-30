import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';
import console from 'node:console';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.WEB_PREVIEW_PORT || 4173);
const mime = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json',
    '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.wav': 'audio/wav',
    '.md': 'text/markdown; charset=utf-8', '.xml': 'application/xml'
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid WEB_PREVIEW_PORT');
}

http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405).end();
        return;
    }
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
        response.writeHead(400).end();
        return;
    }
    if (pathname.includes('\0') || pathname.split('/').includes('..')) {
        response.writeHead(400).end();
        return;
    }
    const isMedia = pathname.startsWith('/media/');
    const mount = isMedia ? path.join(root, 'media') : path.join(root, 'app');
    const relative = isMedia ? pathname.slice('/media/'.length) : pathname.slice(1) || 'index.html';
    const filename = path.resolve(mount, relative);
    if (!filename.startsWith(`${mount}${path.sep}`)) {
        response.writeHead(400).end();
        return;
    }
    const details = await stat(filename).catch(() => null);
    if (!details?.isFile()) {
        response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
        return;
    }
    response.writeHead(200, {
        'Content-Type': mime[path.extname(filename)] || 'application/octet-stream',
        'Content-Length': details.size,
        'Cache-Control': isMedia ? 'public, max-age=31536000, immutable' : 'no-store'
    });
    if (request.method === 'HEAD') {
        response.end();
    } else {
        createReadStream(filename).pipe(response);
    }
}).listen(port, '127.0.0.1', () => {
    console.log(`Web preview: http://127.0.0.1:${port}/`);
});
