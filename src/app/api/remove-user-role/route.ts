import { handler } from '../../../../netlify/functions/remove-user-role';
import { routeFromNetlifyHandler } from '@/lib/netlifyRouteAdapter';

export const POST = routeFromNetlifyHandler(handler);
