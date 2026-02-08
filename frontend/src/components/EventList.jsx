import { formatTime } from "./StatusBar.jsx";

export default function EventList({ events }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="event-list">
      <h3>Events this session</h3>
      <ul>
        {events.map((t, i) => (
          <li key={i}>{formatTime(t)}</li>
        ))}
      </ul>
    </div>
  );
}
