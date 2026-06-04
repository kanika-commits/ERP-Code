import { handler } from '../../../../netlify/functions/import-test-sheet-masters';
import { routeFromNetlifyHandler } from '@/lib/netlifyRouteAdapter';

export const POST = routeFromNetlifyHandler(handler);
