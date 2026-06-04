import { handler } from '../../../../netlify/functions/create-site';
import { routeFromNetlifyHandler } from '@/lib/netlifyRouteAdapter';

export const POST = routeFromNetlifyHandler(handler);
