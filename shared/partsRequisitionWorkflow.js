export const requisitionStatuses = [
  "Requested",
  "Awaiting Stock",
  "Ready for Delivery",
  "Delivered",
  "Closed",
  "Cancelled",
];
export const itemStatuses = ["Pending Check", "In Stock", "Out of Stock"];
export const statusColors = {
  "Pending Check": "#8c8c8c",
  Requested: "#8c8c8c",
  "In Stock": "#389e0d",
  "Out of Stock": "#d46b08",
  "Awaiting Stock": "#d46b08",
  "Ready for Delivery": "#1677ff",
  Delivered: "#ad8b00",
  Closed: "#389e0d",
  Cancelled: "#a85d5d",
};
export const statusLabel = (status) =>
  status === "Out of Stock" ? "Restocking" : status;
export const normalizeItemStatus = (status) =>
  itemStatuses.includes(status)
    ? status
    : ["Ordered", "Approved", "Delivered"].includes(status)
      ? "In Stock"
      : status === "To Be Ordered"
        ? "Out of Stock"
        : "Pending Check";
export function computedStatus(record) {
  if (record.cancelledAt || record.status === "Cancelled") return "Cancelled";
  if (record.confirmedAt) return "Closed";
  if (record.deliveredAt) return "Delivered";
  const items = record.items || [];
  if (
    !items.length ||
    items.some((item) => item.stockStatus === "Pending Check")
  )
    return "Requested";
  return items.some((item) => item.stockStatus === "Out of Stock")
    ? "Awaiting Stock"
    : "Ready for Delivery";
}
// Legacy mapping is presentation-only: never invent delivery/receipt events.
export function displayStatus(record = {}) {
  if (requisitionStatuses.includes(record.status)) return record.status;
  if (record.status === "Completed") return "Closed";
  if (record.status === "Rejected") return "Cancelled";
  if (["Approved", "Ordered"].includes(record.status))
    return "Ready for Delivery";
  if (["To Be Ordered", "In Progress"].includes(record.status))
    return "Awaiting Stock";
  if (record.status === "Availability Checked")
    return computedStatus({
      items: (record.items || []).map((item) => ({
        stockStatus: normalizeItemStatus(item.stockStatus),
      })),
    });
  return "Requested";
}
export const roleOf = (user) =>
  String(
    String(user?.access || "").trim().toLowerCase() === "admin staff"
      ? "admin staff"
      : user?.jobTitle || user?.access || "",
  )
    .trim()
    .toLowerCase();
export const isOversight = (user) =>
  ["officer-in-charge", "admin staff"].includes(roleOf(user));
export const canCreate = (user) =>
  ["mechanic", "maintenance manager"].includes(roleOf(user));
export const isOpen = (record) =>
  !["Delivered", "Closed", "Cancelled"].includes(displayStatus(record));
export const followUpTarget = (record) =>
  ["Requested", "Awaiting Stock"].includes(displayStatus(record))
    ? "warehouse"
    : displayStatus(record) === "Delivered"
      ? "requester"
      : null;
export const isRequisitionOwner = (user, record) =>
  Boolean(
    record?.staff?.requisitionerId &&
    String(record.staff.requisitionerId) ===
      String(user?.id || user?._id || user?.userId),
  );
export function canAct(user, record, action) {
  const role = roleOf(user),
    admin = role === "admin staff";
  const own = isRequisitionOwner(user, record);
  if (action === "stock" || action === "deliver")
    return role === "warehouse personnel";
  if (action === "confirm") return admin || own;
  if (action === "cancel")
    return own && ["mechanic", "maintenance manager"].includes(role);
  if (action === "follow-up") return isOversight(user);
  return false;
}
export function buildTimeline(record = {}) {
  const legacy = [
    [
      "Requested",
      record.dateRequested || record.createdAt,
      record.staff?.requisitioner,
    ],
    ["Stock checked", record.dateWarehouseReviewed, record.staff?.warehouseBy],
    ["Ordered (legacy)", record.dateOrdered, record.staff?.warehouseBy],
    ["Approved (legacy)", record.dateApproved, record.staff?.approvedBy],
    [
      "Delivered",
      record.deliveredAt || record.dateDelivered,
      record.staff?.deliveredBy,
    ],
    [
      "Receipt confirmed",
      record.confirmedAt || record.dateReceived,
      record.staff?.receiver,
    ],
    ["Cancelled", record.cancelledAt || record.dateCancelled, ""],
  ]
    .filter(([, at]) => at)
    .map(([label, at, actorName]) => ({
      label,
      at,
      actorName,
    }));
  const history = record.history || [];
  return [
    ...legacy.filter(
      (entry) => !history.some((event) => event.label === entry.label),
    ),
    ...history,
  ].sort((a, b) => new Date(a.at) - new Date(b.at));
}
export const updatedFirst = (a, b) =>
  new Date(b.updatedAt || b.createdAt || b.dateRequested || 0) -
    new Date(a.updatedAt || a.createdAt || a.dateRequested || 0) ||
  String(b._id).localeCompare(String(a._id));
export function timeSinceUpdate(record, now = Date.now()) {
  const elapsed = Math.max(
    0,
    now -
      new Date(
        record.updatedAt || record.createdAt || record.dateRequested,
      ).getTime(),
  );
  if (!Number.isFinite(elapsed)) return "Unknown";
  const minutes = Math.floor(elapsed / 60000);
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}
export function rankPartSuggestions(values, query = "", limit = 12) {
  const q = String(query).trim().toLowerCase();
  const rank = (value) =>
    value.toLowerCase() === q ? 0 : value.toLowerCase().startsWith(q) ? 1 : 2;
  return [
    ...new Map(
      values
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => [value.trim().toLowerCase(), value.trim()]),
    ).values(),
  ]
    .filter((value) => value.toLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .slice(0, limit);
}

export const readyToDeliver = (record) =>
  displayStatus(record) === "Ready for Delivery" &&
  Boolean(record.items?.length) &&
  record.items.every(
    (item) => normalizeItemStatus(item.stockStatus) === "In Stock",
  );
