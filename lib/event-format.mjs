const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
});
const timeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
});
const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function eventPresentation(event) {
  const remaining = Math.max(0, event.capacity - event.sold);
  return {
    date: dateFormat.format(new Date(event.startsAt)),
    time: timeFormat.format(new Date(event.startsAt)),
    location: event.location,
    price: event.priceCents === 0 ? 'Free' : moneyFormat.format(event.priceCents / 100),
    remaining,
    seats: remaining === 0 ? 'Sold out' : `${remaining} ${remaining === 1 ? 'seat' : 'seats'} remaining`,
    action: remaining === 0 ? 'Join waitlist' : 'Buy',
  };
}

