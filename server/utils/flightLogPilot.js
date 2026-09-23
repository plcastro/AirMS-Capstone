const User = require('../models/userModel');
const pilotAssignment = user => ({ userId: String(user._id), name: `${user.firstName || ''} ${user.lastName || ''}`.trim() });

const resolveAssignedPilot = async (selected, existing = null, users = User) => {
  if (selected === null || selected === '') return { value: null };
  const userId = typeof selected === 'string' ? selected : selected?.userId;
  if (typeof userId !== 'string' || !/^[a-f\d]{24}$/i.test(userId)) return { error: 'Select a valid assigned pilot.' };
  if (existing?.userId && String(existing.userId) === userId) return { value: existing };
  const user = await users.findOne({ _id: userId, jobTitle: 'Pilot', status: 'active' }).select('firstName lastName').lean();
  return user ? { value: pilotAssignment(user) } : { error: 'The assigned pilot must be an active pilot account.' };
};

const getAssignedPilotOptions = async (_req, res) => {
  try {
    const users = await User.find({ jobTitle: 'Pilot', status: 'active' }).select('firstName lastName').sort({ firstName: 1, lastName: 1 }).lean();
    res.json({ success: true, data: users.map(pilotAssignment) });
  } catch {
    res.status(500).json({ success: false, message: 'Unable to load pilot accounts.' });
  }
};
module.exports = { resolveAssignedPilot, getAssignedPilotOptions };
