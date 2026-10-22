import { eventPresentation } from './event-format.mjs';
export { eventPresentation } from './event-format.mjs';

export function createDemoEvents(now = new Date()) {
  // Dates stay useful for local demos; seed once per server process, never per request.
  const dateInDays = (days, hour) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + days);
    date.setUTCHours(hour, 0, 0, 0);
    return date.toISOString();
  };
  return [
    { id: 'tartan-live', club: 'Activities Board', title: 'Tartan After Hours', category: 'Music', description: 'An evening of student bands, good company, and a little campus magic.', startsAt: dateInDays(2, 23), location: 'Cohon Center · Rangos Ballroom', priceCents: 1200, capacity: 120, sold: 96, status: 'published', theme: 'music' },
    { id: 'film-night', club: 'Film Club', title: 'One More Frame', category: 'Arts', description: 'Short films, big ideas. Discover stories made by your fellow Tartans.', startsAt: dateInDays(4, 23), location: 'McConomy Auditorium', priceCents: 0, capacity: 80, sold: 45, status: 'published', theme: 'film' },
    { id: 'fall-table', club: 'International Student Union', title: 'The Fall Table', category: 'Community', description: 'Share a meal and meet someone new at our community dinner.', startsAt: dateInDays(6, 22), location: 'Cohon Center · Studio Theater', priceCents: 800, capacity: 60, sold: 60, status: 'published', theme: 'community' },
    { id: 'past-mixer', club: 'Activities Board', title: 'Welcome Mixer', category: 'Community', description: 'A previous campus gathering.', startsAt: dateInDays(-2, 22), location: 'The Cut', priceCents: 0, capacity: 50, sold: 30, status: 'published', theme: 'community' },
  ];
}

export function upcomingEvents(events, now = new Date()) {
  return events
    .filter(event => event.status === 'published' && Date.parse(event.startsAt) > now.getTime())
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .map(event => ({ ...event }));
}

// Public demo records only. No database, identities, orders, or persistent state.
const serverEvents = createDemoEvents();
export function listPublicEvents(now = new Date()) {
  return upcomingEvents(serverEvents, now).map(event => ({
    ...event, remaining: eventPresentation(event).remaining,
  }));
}
