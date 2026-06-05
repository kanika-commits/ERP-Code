import { handler } from '../../../../netlify/functions/update-company-module';
import { routeFromNetlifyHandler } from '@/lib/netlifyRouteAdapter';

export const POST = routeFromNetlifyHandler(handler);
