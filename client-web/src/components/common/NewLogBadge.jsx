const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  borderRadius: 999,
  padding: "1px 8px",
  fontSize: 10,
  fontWeight: 700,
  color: "#8a3f00",
  background: "#fff3e0",
  border: "1px solid #ffd8a8",
  letterSpacing: 0.4,
};

export default function NewLogBadge({ count }) {
  return (
    <span
      aria-label={
        count
          ? `${count} new or updated logs not yet viewed`
          : "New or updated log not yet viewed"
      }
      style={badgeStyle}
    >
      {count ? `${count} NEW` : "NEW"}
    </span>
  );
}

// Same look as NewLogBadge: who the aircraft's in-progress flight log is waiting on.
export function IncomingLogBadge({ role, name }) {
  return (
    <span style={{ ...badgeStyle, flexShrink: 1, whiteSpace: "normal" }}>
      Incoming log for {role}: {name}
    </span>
  );
}
