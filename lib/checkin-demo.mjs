import { createCheckinStore } from './checkin.mjs';

// PUBLIC HOMEWORK FIXTURES, generated randomly once and checked into source.
// These are not credentials or purchased tickets. Stable identities ensure a
// sample shown by GET is recognized even when POST runs in a different instance.
const publicDemoTokens = Object.freeze([
  "e57ef44c81e931178377500ba0b7024b",
  "6ae47a5f85af0c3ef14eedeed1027e54",
  "088c7ad7c98a36a0074fc135dedd7217",
  "947ce8472887d67b6657ae62008b40b4"
]);

// A process-wide symbol also shares mutable state between duplicate module
// evaluations in the SAME JavaScript runtime. It cannot share state between
// independent processes, containers, or Vercel instances.
const storeKey = Symbol.for('tartan-tickets.hw3.checkin.v2');

export function getDemoCheckinStore() {
  globalThis[storeKey] ??= createCheckinStore({ tokens: publicDemoTokens });
  return globalThis[storeKey];
}
