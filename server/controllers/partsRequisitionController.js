const { PART_SUGGESTION_SEED } = require('../../shared/partSuggestionSeed.js');
const seedUnitByName = new Map(PART_SUGGESTION_SEED.map(part => [part.name.toLowerCase(), part.unit]));
const Model = require('../models/partsRequisitionModel');
const {
  randomUUID
} = require('node:crypto');
const {
  auditLog
} = require('./logsController');
const {
  createPartsRequisitionNotifications,
  sendRequisitionFollowUp
} = require('../utils/partsRequisitionNotificationService');
const {
  publishTypedForRecipients
} = require('../utils/realtimeEvents');
const workflow = () => require('../../shared/partsRequisitionWorkflow.js');
let cache = {
    expires: 0,
    values: []
  },
  loading;
const actorName = user => [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User';
const event = (req, label, details = '') => ({
  at: new Date(),
  label,
  details,
  actorId: req.user.id,
  actorName: actorName(req.user)
});
const allowedReaders = ['superadmin', 'warehouse personnel', 'maintenance manager', 'officer-in-charge', 'mechanic'];
async function readAllowed(req, res) {
  const {
    roleOf
  } = await workflow();
  if (!allowedReaders.includes(roleOf(req.user))) {
    res.status(403).json({
      message: 'Parts requisition access denied.'
    });
    return false;
  }
  return true;
}
async function publish(record, req, previous, followUp = false) {
  // A saved action must not be reported as failed if a notification provider is unavailable.
  const results = await Promise.allSettled([auditLog(`Parts requisition ${record.wrsNo}: ${followUp ? 'Follow Up' : record.status}`, req.user.id), followUp ? sendRequisitionFollowUp({
    requisition: record,
    actorUserId: req.user.id
  }) : createPartsRequisitionNotifications({
    previousRequisition: previous,
    requisition: record,
    actorUserId: req.user.id
  }), publishTypedForRecipients({
    recipientRoles: ['superadmin', 'officer-in-charge', 'warehouse personnel'],
    recipientUsers: record.staff?.requisitionerId ? [record.staff.requisitionerId] : []
  }, 'requisition:updated', {
    requisitionId: String(record._id),
    updatedAt: record.updatedAt,
    status: record.status
  })]);
  results.filter(result => result.status === 'rejected').forEach(result => console.error('Requisition side effect failed:', result.reason));
}
exports.getAllRequisitions = async (req, res) => {
  try {
    if (!(await readAllowed(req, res))) return;
    res.json(await Model.find().sort({
      updatedAt: -1,
      _id: -1
    }));
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
exports.getRequisitionSummary = async (req, res) => {
  try {
    if (!(await readAllowed(req, res))) return;
    const [count, latest] = await Promise.all([Model.countDocuments({}), Model.findOne().sort({
      updatedAt: -1
    }).select('updatedAt').lean()]);
    res.json({
      count,
      latestUpdatedAt: latest?.updatedAt || null
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
exports.getRequisitionById = async (req, res) => {
  try {
    if (!(await readAllowed(req, res))) return;
    const record = await Model.findById(req.params.id);
    if (!record) return res.status(404).json({
      message: 'Requisition not found'
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};
exports.getPartSuggestions = async (req, res) => {
  try {
    if (!(await readAllowed(req, res))) return;
    if (Date.now() >= cache.expires) {
      if (!loading) loading = Promise.all([Model.distinct('items.particular'), Model.distinct('items.codeParticular.particular')]).then(lists => {
        cache = {
          expires: Date.now() + 300000,
          values: [...PART_SUGGESTION_SEED.map(part => part.name), ...lists.flat()]
        };
      }).finally(() => {
        loading = null;
      });
      await loading;
    }
    const {
      rankPartSuggestions
    } = await workflow();
    res.json(rankPartSuggestions(cache.values, String(req.query.q || '').slice(0, 200)).map(name => ({
      value: name,
      unit: seedUnitByName.get(name.toLowerCase()) || null,
    })));
  } catch (error) {
    res.status(500).json({
      message: 'Could not load suggestions'
    });
  }
};
exports.createRequisition = async (req, res) => {
  try {
    const {
      canCreate
    } = await workflow();
    if (!canCreate(req.user)) return res.status(403).json({
      message: 'Only mechanics, maintenance managers and superadmins can create requisitions.'
    });
    const {
      aircraft,
      items
    } = req.body;
    if (!Array.isArray(items) || !items.length || items.some(item => !String(item.particular || '').trim() || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || !String(item.unitOfMeasure || '').trim())) return res.status(400).json({
      message: 'Add valid parts, positive quantities and units.'
    });
    const now = new Date();
    const record = await Model.create({
      wrsNo: `WRS-${now.getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      aircraft,
      staff: {
        requisitioner: actorName(req.user),
        requisitionerId: req.user.id,
        requisitionerTitle: req.user.jobTitle
      },
      items: items.map((item, index) => ({
        itemNo: index + 1,
        particular: item.particular.trim(),
        quantity: Number(item.quantity),
        unitOfMeasure: item.unitOfMeasure,
        purpose: item.purpose || '',
        stockStatus: 'Pending Check'
      })),
      dateRequested: now,
      status: 'Requested',
      workflowVersion: 2,
      history: [event(req, 'Requested')]
    });
    cache.expires = 0;
    await publish(record, req, null);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};
exports.updateRequisitionStatus = async (req, res) => {
  try {
    const record = await Model.findById(req.params.id).lean();
    if (!record) return res.status(404).json({
      message: 'Requisition not found'
    });
    const {
      canAct,
      displayStatus,
      computedStatus,
      readyToDeliver,
      normalizeItemStatus,
      followUpTarget,
      isOpen
    } = await workflow();
    const {
      action
    } = req.body;
    if (!canAct(req.user, record, action)) return res.status(403).json({
      message: 'You are not allowed to perform this action.'
    });
    const status = displayStatus(record),
      changes = {};
    let entry;
      if (action === 'stock' || (action === 'deliver' && req.body.stockUpdates !== undefined)) {
      if (!isOpen(record)) return res.status(409).json({
        message: 'Stock cannot change after delivery or cancellation.'
      });
        const updates = req.body.stockUpdates ?? [{ itemId: req.body.itemId, stockStatus: req.body.stockStatus }];
        if (!Array.isArray(updates) || !updates.length || updates.some(update => !update || !['In Stock', 'Out of Stock'].includes(update.stockStatus) || !record.items.some(item => String(item._id) === String(update.itemId))) || new Set(updates.map(update => String(update.itemId))).size !== updates.length) return res.status(400).json({
          message: 'Provide unique requisition items with In Stock or Out of Stock status.'
        });
        const statuses = new Map(updates.map(update => [String(update.itemId), update.stockStatus]));
        changes.items = record.items.map(item => ({
          ...item,
          stockStatus: statuses.get(String(item._id)) || normalizeItemStatus(item.stockStatus)
      }));
      changes.status = computedStatus({
        items: changes.items
      });
      changes.dateWarehouseReviewed = new Date();
        const details = record.items.filter(item => statuses.has(String(item._id)) && normalizeItemStatus(item.stockStatus) !== statuses.get(String(item._id))).map(item => `${item.particular || item.codeParticular?.[0]?.particular || 'Part'}: ${normalizeItemStatus(item.stockStatus)} → ${statuses.get(String(item._id))}`).join('; ');
        entry = event(req, 'Stock checked', details);
      }
      if (action === 'deliver') {
        if (!isOpen(record) || !readyToDeliver({ ...record, ...changes })) return res.status(409).json({
        message: 'All items must be In Stock before delivery.'
      });
      changes.deliveredAt = new Date();
      changes.deliveredBy = req.user.id;
      changes.status = 'Delivered';
        entry = event(req, 'Delivered', entry?.details ? `Stock checked: ${entry.details}` : undefined);
    } else if (action === 'confirm') {
      if (status !== 'Delivered') return res.status(409).json({
        message: 'Only delivered requisitions can be confirmed.'
      });
      changes.confirmedAt = new Date();
      changes.confirmedBy = req.user.id;
      changes.status = 'Closed';
      entry = event(req, 'Receipt confirmed');
    } else if (action === 'cancel') {
      if (!isOpen(record)) return res.status(409).json({
        message: 'Cannot cancel after delivery or closure.'
      });
      changes.cancelledAt = new Date();
      changes.status = 'Cancelled';
      entry = event(req, 'Cancelled');
    } else if (action === 'follow-up') {
      if (!followUpTarget(record)) return res.status(409).json({
        message: 'There is no pending follow-up for this requisition.'
      });
      entry = event(req, 'Follow Up', `Reminder sent to ${followUpTarget(record)}`);
    }
    const updated = await Model.findOneAndUpdate({
      _id: record._id,
      updatedAt: record.updatedAt
    }, {
      $set: changes,
      $push: {
        history: entry
      }
    }, {
      returnDocument: 'after',
      runValidators: true
    });
    if (!updated) return res.status(409).json({
      message: 'This requisition changed. Refresh and try again.'
    });
    await publish(updated, req, record, action === 'follow-up');
    res.json(updated);
  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};
