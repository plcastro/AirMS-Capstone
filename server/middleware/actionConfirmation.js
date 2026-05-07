const ACTION_CONFIRM_KEYS = [
  "x-action-confirmed",
  "x-confirm-action",
  "x-confirmed",
];

const isTruthy = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["1", "true", "yes", "confirm", "confirmed"].includes(normalized);
  }
  if (typeof value === "number") return value === 1;
  return false;
};

const requireActionConfirmation = (req, res, next) => {
  const headerConfirmed = ACTION_CONFIRM_KEYS.some((key) => isTruthy(req.headers[key]));
  const bodyConfirmed = isTruthy(req.body?.confirmAction);

  if (!headerConfirmed && !bodyConfirmed) {
    return res.status(400).json({
      message:
        "Action confirmation required. Set confirmAction=true in body or x-action-confirmed=true header.",
    });
  }

  next();
};

module.exports = { requireActionConfirmation };
