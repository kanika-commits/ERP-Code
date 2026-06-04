import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const manifestFile = process.argv[2] || 'imports/drive-file-manifest.json';
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'work-order-files';

async function loadDotEnv(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // Environment files are optional; CI/Vercel can provide variables directly.
  }
}

function safeStoragePath(value) {
  return value
    .replace(/\\/g, '/')
    .replace(/[^\w./() -]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  await loadDotEnv('.env.local');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this upload.');
  }

  const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: workOrders, error: workOrderError } = await supabase
    .from('work_orders')
    .select('id,wo_number,work_order_number');

  if (workOrderError) throw workOrderError;

  const workOrderByNumber = new Map(
    (workOrders || []).flatMap((workOrder) => {
      const keys = [workOrder.wo_number, workOrder.work_order_number].filter(Boolean).map(normalizeKey);
      return keys.map((key) => [key, workOrder]);
    }),
  );

  let uploaded = 0;
  let linked = 0;
  let skipped = 0;

  for (const file of manifest.files) {
    const workOrder = workOrderByNumber.get(normalizeKey(file.workOrderNumber));
    if (!workOrder) {
      skipped += 1;
      continue;
    }

    const storagePath = safeStoragePath(`work-orders/${file.workOrderNumber}/${file.relativePath}`);
    const bytes = await readFile(file.localPath);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, bytes, {
      cacheControl: '3600',
      contentType: file.mimeType,
      upsert: true,
    });

    if (uploadError) throw new Error(`Upload failed for ${file.relativePath}: ${uploadError.message}`);
    uploaded += 1;

    const { error: deleteError } = await supabase
      .from('files')
      .delete()
      .eq('entity_type', 'work_order')
      .eq('entity_id', workOrder.id)
      .eq('url', storagePath);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from('files').insert({
      entity_id: workOrder.id,
      entity_type: 'work_order',
      file_name: path.basename(file.fileName),
      mime_type: file.mimeType,
      storage_provider: 'supabase_storage',
      url: storagePath,
    });

    if (insertError) throw insertError;
    linked += 1;
  }

  console.log(`Uploaded ${uploaded} files, linked ${linked} files, skipped ${skipped} files without matching work orders.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
