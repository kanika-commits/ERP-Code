import { mkdir, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const folderMime = 'application/vnd.google-apps.folder';

function sanitize(value) {
  return String(value || 'untitled')
    .replace(/[/:\\?%*"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);
}

function extensionForMime(mime) {
  if (mime === 'application/pdf') return '.pdf';
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return '.xlsx';
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (mime === 'application/vnd.google-apps.spreadsheet') return '.xlsx';
  if (mime === 'application/vnd.google-apps.document') return '.pdf';
  if (mime === 'application/vnd.google-apps.presentation') return '.pdf';
  if (mime?.includes('spreadsheet')) return '.xlsx';
  if (mime?.includes('word')) return '.docx';
  if (mime?.includes('image/jpeg')) return '.jpg';
  if (mime?.includes('image/png')) return '.png';
  return '';
}

function downloadUrl(id, mime) {
  if (mime === 'application/vnd.google-apps.spreadsheet') {
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
  }
  if (mime === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${id}/export?format=pdf`;
  }
  if (mime === 'application/vnd.google-apps.presentation') {
    return `https://docs.google.com/presentation/d/${id}/export/pdf`;
  }
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

function parseFolderEntries(html) {
  const entries = [];
  const seen = new Set();
  const re = /\[\[null,\"([A-Za-z0-9_-]{20,})\"\],null,null,null,\"([^\"]+)\"[\s\S]{0,2500}?\[\[\[\"([^\"]+)\"/g;
  let match;

  while ((match = re.exec(html))) {
    const [, id, mime, rawName] = match;
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({
      id,
      mime,
      name: rawName.replace(/\\"/g, '"'),
    });
  }

  return entries;
}

async function downloadFile(entry, targetDir, manifest) {
  let filename = sanitize(entry.name);
  const ext = extensionForMime(entry.mime);
  if (ext && !filename.toLowerCase().endsWith(ext)) filename += ext;

  const targetPath = join(targetDir, filename);
  await mkdir(dirname(targetPath), { recursive: true });

  const response = await fetch(downloadUrl(entry.id, entry.mime));
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ${entry.name}: ${response.status} ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(targetPath));
  manifest.files.push({
    id: entry.id,
    mime: entry.mime,
    name: entry.name,
    path: targetPath,
  });
  console.log(`file ${targetPath}`);
}

async function downloadFolder(folderId, targetDir, manifest, depth = 0) {
  if (manifest.folderIds.includes(folderId)) return;
  manifest.folderIds.push(folderId);
  await mkdir(targetDir, { recursive: true });

  const html = await fetchText(`https://drive.google.com/drive/folders/${folderId}`);
  const entries = parseFolderEntries(html);
  console.log(`folder ${targetDir} (${entries.length} entries)`);

  for (const entry of entries) {
    if (entry.mime === folderMime) {
      await downloadFolder(entry.id, join(targetDir, sanitize(entry.name)), manifest, depth + 1);
    } else {
      await downloadFile(entry, targetDir, manifest);
    }
  }
}

const [folderId, outputDir = 'imports/main-drive-folder/files'] = process.argv.slice(2);

if (!folderId) {
  console.error('Usage: node scripts/download-public-drive-folder.mjs <folder-id> [output-dir]');
  process.exit(1);
}

const manifest = {
  downloadedAt: new Date().toISOString(),
  files: [],
  folderIds: [],
  rootFolderId: folderId,
};

await downloadFolder(folderId, outputDir, manifest);
await writeFile(join(outputDir, 'download-manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`downloaded ${manifest.files.length} files from ${manifest.folderIds.length} folders`);
