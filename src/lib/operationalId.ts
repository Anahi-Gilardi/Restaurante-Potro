let lastTimestamp = 0;
let sequence = 0;

/**
 * Creates readable identifiers for local operational records without the
 * collisions caused by short random numbers.
 */
export const createOperationalId = (
  prefix: 'MOV' | 'OC',
  timestamp = Date.now()
): string => {
  if (timestamp === lastTimestamp) {
    sequence += 1;
  } else {
    lastTimestamp = timestamp;
    sequence = 0;
  }

  return `${prefix}-${timestamp.toString(36).toUpperCase()}-${sequence
    .toString(36)
    .toUpperCase()
    .padStart(2, '0')}`;
};
