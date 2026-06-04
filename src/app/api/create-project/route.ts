import { handler } from '../../../../netlify/functions/create-project';
import { routeFromNetlifyHandler } from '@/lib/netlifyRouteAdapter';

export const POST = routeFromNetlifyHandler(handler);
