import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logPath = join(__dirname, '_run.log');

const child = spawn(process.execPath, [
  join(__dirname, 'generate.js'), '--type', 'items', '--id', 'dagger', '--dry-run'
], { cwd: join(__dirname, '../..') });

let out = '';
child.stdout.on('data', d => out += d);
child.stderr.on('data', d => out += d);
child.on('close', code => {
  writeFileSync(logPath, `EXIT:${code}\n${out}`);
});
