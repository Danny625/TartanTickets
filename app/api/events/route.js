import { listPublicEvents } from '../../../lib/events.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ events: listPublicEvents() }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
