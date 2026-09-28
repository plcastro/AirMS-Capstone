const roleOf = (user = {}) => String(user?.jobTitle || user?.role || user?.access || '')
  .trim().toLowerCase().replace(/[\s-]+/g, ' ');

export const isFlightLogManager = user => roleOf(user) === 'maintenance manager';
export const canCreateFlightLog = user => ['mechanic', 'maintenance manager'].includes(roleOf(user));
