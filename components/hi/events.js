// While one of these windows is open, /hi/ greets whoever tapped with
// "Nice to meet you at <name>". Only the event's name is shown, never the
// schedule. Windows run a little past the event so a tap opened that evening
// still remembers where it happened. Times carry their own UTC offset: the
// clocks change on Nov 1, so October and November differ by an hour.
export const EVENTS = [
  {
    name: "the Philo Labs talk",
    start: "2026-10-30T15:30:00-07:00",
    end: "2026-10-30T21:00:00-07:00",
  },
  {
    name: "ICME Career Forum",
    start: "2026-11-05T07:00:00-08:00",
    end: "2026-11-06T12:00:00-08:00",
  },
];

export function eventAt(now) {
  return (
    EVENTS.find((e) => now >= new Date(e.start) && now < new Date(e.end)) ??
    null
  );
}
