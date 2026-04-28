const UserModel = require("../models/userModel");

const INVITATION_SWEEP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const markExpiredInvitations = async () => {
  const now = new Date();
  const result = await UserModel.updateMany(
    {
      status: "inactive",
      invitationStatus: "pending",
      tempPasswordExpires: { $lte: now },
    },
    {
      $set: {
        invitationStatus: "expired",
      },
    },
  );

  return result.modifiedCount || 0;
};

const startInvitationLifecycleJob = () => {
  const runSweep = async () => {
    try {
      const updated = await markExpiredInvitations();
      if (updated > 0) {
        console.log(`[InviteLifecycle] Marked ${updated} invitation(s) as expired.`);
      }
    } catch (error) {
      console.error("[InviteLifecycle] Failed to sweep invitations:", error);
    }
  };

  runSweep();
  setInterval(runSweep, INVITATION_SWEEP_INTERVAL_MS);
};

module.exports = {
  markExpiredInvitations,
  startInvitationLifecycleJob,
};
