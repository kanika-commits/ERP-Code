import { handler } from '../../../../netlify/functions/import-test-sheet-billing';
import { routeFromNetlifyHandler } from '@/lib/netlifyRouteAdapter';

export const POST = routeFromNetlifyHandler(handler);
