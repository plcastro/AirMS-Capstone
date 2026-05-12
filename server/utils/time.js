export const minutesBetween = (startIso, endIso) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return Math.max(0, (end - start) / 60000);
};

export const minutesToDecimalHours = (minutes) =>
  Math.round((minutes / 60) * 100) / 100;

export const calculateBlockTime = (offBlock, onBlock) => {
  if (!offBlock || !onBlock) return 0;
  const mins = minutesBetween(offBlock, onBlock);
  return minutesToDecimalHours(mins);
};

export const calculateFlightTime = (wheelsOff, wheelsOn) => {
  if (!wheelsOff || !wheelsOn) return 0;
  const mins = minutesBetween(wheelsOff, wheelsOn);
  return minutesToDecimalHours(mins);
};

export const calculateCycles = () => 1;

export const calculateNightLandings = (nightTime) => (nightTime > 0 ? 1 : 0);

export const calculateFuelBurn = ({
  fuelOut = 0,
  fuelIn = 0,
  fuelPurchased = 0,
}) => {
  return Math.max(0, fuelOut + fuelPurchased - fuelIn);
};

export const rollForwardTime = (previous, added) =>
  Math.round((previous + added) * 100) / 100;

export const rollForwardCycles = (previous, cycles) => previous + cycles;
