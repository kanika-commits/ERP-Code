import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const inputDir = process.argv[2] || 'imports/main-drive-folder/files';
const outputFile = process.argv[3] || 'imports/drive-file-manifest.json';

const mimeTypes = new Map([
  ['.csv', 'text/csv'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.xls', 'application/vnd.ms-excel'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
]);

function normalizeWorkOrderNumber(folderName) {
  const match = folderName.match(/CRPF[-_\s]+(?:GLC|MRC)[-_\s]+\d+/i);
  if (!match) return '';
  return match[0].toUpperCase().replace(/[_\s]+/g, '-');
}

function categoryFromRelativePath(relativePath) {
  const parts = relativePath.split(path.sep).map((part) => part.toLowerCase());
  if (parts.includes('ra bills')) return 'ra_bill';
  if (parts.includes('invoices')) return 'invoice';
  if (parts.includes('payments')) return 'payment';
  if (parts.includes('debit notes')) return 'debit_note';
  if (parts.includes('contractor docs')) return 'contractor_doc';
  return 'work_order';
}

async function walk(dir, rootDir, rootFolderName, entries) {
  const children = await readdir(dir, { withFileTypes: true });

  for (const child of children) {
    const fullPath = path.join(dir, child.name);

    if (child.isDirectory()) {
      await walk(fullPath, rootDir, rootFolderName, entries);
      continue;
    }

    if (!child.isFile()) continue;

    const fileStat = await stat(fullPath);
    const relativePath = path.relative(rootDir, fullPath);
    const extension = path.extname(child.name).toLowerCase();

    entries.push({
      category: categoryFromRelativePath(relativePath),
      fileName: child.name,
      localPath: fullPath,
      mimeType: mimeTypes.get(extension) || 'application/octet-stream',
      relativePath,
      sizeBytes: fileStat.size,
      workOrderFolder: rootFolderName,
      workOrderNumber: normalizeWorkOrderNumber(rootFolderName),
    });
  }
}

async function main() {
  const rootEntries = await readdir(inputDir, { withFileTypes: true });
  const files = [];

  for (const entry of rootEntries) {
    if (!entry.isDirectory()) continue;
    await walk(path.join(inputDir, entry.name), inputDir, entry.name, files);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    inputDir,
    fileCount: files.length,
    workOrderCount: new Set(files.map((file) => file.workOrderNumber).filter(Boolean)).size,
    files,
  };

  await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${files.length} files for ${manifest.workOrderCount} work orders to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
