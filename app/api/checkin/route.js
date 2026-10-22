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


const MAX_CHECKIN_BODY_BYTES = 2048;

async function readBoundedJson(request) {
  if (!request.body) throw new SyntaxError('Missing JSON body');
  const reader = request.body.getReader();
  const bytes = new Uint8Array(MAX_CHECKIN_BODY_BYTES);
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (length + value.byteLength > MAX_CHECKIN_BODY_BYTES) {
        // Cancel immediately; never buffer this chunk or request another one.
        // Cancellation failure must not turn an oversized body into a 400.
        try { await reader.cancel(); } catch { /* Reader still stops here. */ }
        return { tooLarge: true };
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
    // Decode once so UTF-8 characters may span incoming stream chunks.
    return { tooLarge: false, input: JSON.parse(new TextDecoder().decode(bytes.subarray(0, length))) };
  } finally {
    reader.releaseLock();
  }
}

export async function GET() {
  const store = getDemoCheckinStore();
  return Response.json({ demo: true, tickets: store.samples() }, { headers: headers(store) });
}

export async function POST(request) {
  const store = getDemoCheckinStore();
  let input;
  try {
    const body = await readBoundedJson(request);
    if (body.tooLarge) {
      return Response.json({ message: 'Request body exceeds 2,048 bytes.' }, { status: 413, headers: headers(store) });
    }
    input = body.input;
  } catch {
    return Response.json({ message: 'Invalid request. Send a JSON object.' }, { status: 400, headers: headers(store) });
  }
  const result = store.checkIn(input);
  return Response.json(result.body, { status: result.status, headers: headers(store) });
}
