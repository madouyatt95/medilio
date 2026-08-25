import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const forbiddenPatterns = [
  /famille\.dupont@email\.fr/i,
  /admin123/i,
  /parcours de validation/i,
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }))).flat();
}

const files = await listFiles('dist');
const demoChunks = files.filter(file => /demoData-[^/]+\.js$/i.test(file));
const textFiles = files.filter(file => ['.html', '.js', '.json', '.css'].includes(extname(file)));
const leaks = [];

for (const file of textFiles) {
  const content = await readFile(file, 'utf8');
  if (forbiddenPatterns.some(pattern => pattern.test(content))) leaks.push(file);
}

if (demoChunks.length || leaks.length) {
  const details = [...new Set([...demoChunks, ...leaks])].join(', ');
  throw new Error(`Le build production contient des données de validation : ${details}`);
}

console.log('Build production vérifié : aucune identité ni donnée de validation embarquée.');
