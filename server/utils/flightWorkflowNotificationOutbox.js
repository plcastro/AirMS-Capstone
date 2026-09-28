const crypto = require('node:crypto');
const FlightLog = require('../models/flightLogModel');
const Notification = require('../models/notificationModel');
const { sendPushNotificationToUsers } = require('./mobilePushService');

const crewIds = log => [...new Set([log.assignedPilot?.userId, log.assignedMechanic?.userId].filter(Boolean).map(String))];
const sectionFor = action => action.startsWith('pre_') || action === 'inspections_created' ? 'pre'
  : action.startsWith('post_') ? 'post' : action.startsWith('defect') ? 'defects'
    : action === 'amend' ? 'history' : 'flight';

// This event is appended in the very same compare-and-swap as the record update.
// It contains no signatures, PINs, or copies of the flight record.
const pendingFlightNotification = (record, originalVersion) => {
  const event = record.workflowHistory?.at(-1);
  if (!event) return null;
  const actorUserId = String(event.actorId || '');
  const recipientUsers = crewIds(record).filter(id => id !== actorUserId);
  if (!recipientUsers.length) return null;
  const action = String(event.action || 'updated');
  return {
    _id: crypto.createHash('sha256').update(`flight:${record._id}:${originalVersion + 1}`).digest('hex').slice(0, 24),
    actorUserId, recipientUsers,
    title: `Flight record ${record.rpc}: ${action.replace(/_/g, ' ')}`,
    description: `Your assigned flight record ${record.controlNo || ''} has an update. Open it to review the current step.`,
    metadata: { rpc: record.rpc, status: record.status, aircraftType: record.aircraftType,
      notificationType: action, targetFlightLogId: String(record._id), targetSection: sectionFor(action), version: originalVersion + 1 },
  };
};

const flushFlightNotifications = async id => {
  const record = await FlightLog.findById(id).select('+pendingNotifications').lean();
  if (!record) return;
  const currentCrew = new Set(crewIds(record));
  for (const event of record.pendingNotifications || []) {
    // Reassignment must not deliver a delayed message to a former assignee.
    const recipientUsers = event.recipientUsers.filter(userId => currentCrew.has(userId));
    if (recipientUsers.length) {
      let created = false;
      try {
        await Notification.create({ _id: event._id, title: event.title, description: event.description,
          module: 'flight-logs', entityType: 'flight-log', entityId: record._id,
          recipientRoles: [], recipientUsers, excludedUsers: event.actorUserId ? [event.actorUserId] : [], metadata: event.metadata });
        created = true;
      } catch (error) { if (error.code !== 11000) throw error; }
      // The persistent in-app notification is idempotent. Push is a best-effort alert.
      if (created) await sendPushNotificationToUsers({ title: event.title, body: event.description,
        recipientRoles: [], recipientUsers, excludedUsers: event.actorUserId ? [event.actorUserId] : [],
        data: { notificationId: event._id, _id: event._id, module: 'flight-logs', entityType: 'flight-log',
          targetScreen: 'Flight Logbook', ...event.metadata } });
    }
    // Delivery bookkeeping must not change the workflow version or activity order.
    await FlightLog.updateOne({ _id: id }, { $pull: { pendingNotifications: { _id: event._id } } }, { timestamps: false });
  }
};

let running = false;
const drainFlightNotifications = async () => {
  if (running) return;
  running = true;
  try {
    const logs = await FlightLog.find({ 'pendingNotifications.0': { $exists: true } }).select('_id').limit(100).lean();
    for (const log of logs) {
      try { await flushFlightNotifications(log._id); }
      catch { /* The durable event remains queued for the next request/job. */ }
    }
  } finally { running = false; }
};
const startFlightNotificationJob = () => {
  const timer = setInterval(() => { drainFlightNotifications().catch(() => {}); }, 30000);
  timer.unref?.();
  drainFlightNotifications().catch(() => {});
  return timer;
};
module.exports = { pendingFlightNotification, flushFlightNotifications, drainFlightNotifications, startFlightNotificationJob, sectionFor };
