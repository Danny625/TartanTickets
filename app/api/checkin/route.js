import { createCheckinStore } from '../../../lib/checkin.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Both HTTP methods use this process-local store. Restart/deploy reseeds it.
const store = createCheckinStore();
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
  return Response.json({ demo: true, tickets: store.samples() }, { headers });
}

export async function POST(request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json({ message: 'Invalid request. Send a JSON object.' }, { status: 400, headers });
  }
  const result = store.checkIn(input);
  return Response.json(result.body, { status: result.status, headers });
}
