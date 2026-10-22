import { randomBytes } from 'node:crypto';

// One store belongs to one running server process. No shared/durable storage.
export function createCheckinStore({ tokens } = {}) {
  if (tokens !== undefined && (!Array.isArray(tokens) || tokens.length !== 4 ||
      new Set(tokens).size !== 4 || tokens.some(token => typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)))) {
    throw new TypeError('Demo seed must contain four distinct 128-bit hexadecimal tokens.');
  }
  const tickets = new Map();
  for (const [index, attendeeName] of ['Sample Alex', 'Sample Blair', 'Sample Casey', 'Sample Drew'].entries()) {
    const token = tokens ? tokens[index] : randomBytes(16).toString('hex');
    tickets.set(token, {
      token,
      attendeeName,
      status: index === 3 ? 'used' : 'valid',
      checkedInAt: index === 3 ? new Date(Date.now() - 30 * 60000).toISOString() : null,
    });
  }

  return {
    storeId: randomBytes(8).toString('hex'), // Non-secret diagnostic identity only.
    samples() {
      return Array.from(tickets.values(), ticket => ({ ...ticket }));
    },
    checkIn(input, now = new Date()) {
      if (!input || Array.isArray(input) || typeof input !== 'object' ||
          typeof input.officerName !== 'string' || !input.officerName.trim() || input.officerName.length > 80 ||
          typeof input.token !== 'string' || !input.token.trim() || input.token.length > 128) {
        return { status: 400, body: { message: 'Enter an officer name (up to 80 characters) and a QR token (up to 128 characters).' } };
      }
      const ticket = tickets.get(input.token.trim());
      if (!ticket) return { status: 404, body: { message: 'Invalid ticket' } };
      if (ticket.checkedInAt) {
        return { status: 409, body: { message: 'Already used', checkedInAt: ticket.checkedInAt } };
      }
      // No asynchronous boundary between this check and mutation. Concurrent
      // requests in this process can mark a ticket only once. Other processes
      // have independent stores, so this is NOT a distributed guarantee.
      ticket.checkedInAt = now.toISOString();
      ticket.status = 'used';
      return { status: 200, body: {
        message: 'Checked in', attendeeName: ticket.attendeeName, checkedInAt: ticket.checkedInAt,
      } };
    },
  };
}
