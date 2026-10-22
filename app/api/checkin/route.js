import { getDemoCheckinStore } from '../../../lib/checkin-demo.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function headers(store) {
  return {
    'Cache-Control': 'no-store',
    'X-Demo-Store-Id': store.storeId,
    'X-Demo-Fixture-Version': 'hw3-v2',
  };
}

export async function GET() {
  const store = getDemoCheckinStore();
  return Response.json({ demo: true, tickets: store.samples() }, { headers: headers(store) });
}

export async function POST(request) {
  const store = getDemoCheckinStore();
  let input;
  try {
    input = await request.json();
  } catch {
    return Response.json({ message: 'Invalid request. Send a JSON object.' }, { status: 400, headers: headers(store) });
  }
  const result = store.checkIn(input);
  return Response.json(result.body, { status: result.status, headers: headers(store) });
}
