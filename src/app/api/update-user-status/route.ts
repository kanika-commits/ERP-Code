import { handler } from '../../../../netlify/functions/update-user-status';
import { routeFromNetlifyHandler } from '@/lib/netlifyRouteAdapter';

export const POST = routeFromNetlifyHandler(handler);
