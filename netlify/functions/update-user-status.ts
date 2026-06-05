import type { Handler } from '@netlify/functions';
import { requireAdmin, json } from '../../src/lib/adminFunction';

type UpdateUserStatusRequest = {
  status?: 'active' | 'inactive';
  userId?: string;
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const adminResult = await requireAdmin(event);

  if ('error' in adminResult) return adminResult.error;

  const { supabaseAdmin } = adminResult;
  const payload = JSON.parse(event.body || '{}') as UpdateUserStatusRequest;
  const userId = payload.userId?.trim();
  const status = payload.status;

  if (!userId || !status) {
    return json(400, { error: 'User and status are required.' });
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    return json(500, { error: updateError.message });
  }

  return json(200, { message: `User marked ${status}.` });
};
