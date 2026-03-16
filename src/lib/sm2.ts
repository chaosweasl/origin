export interface SM2Result {
  easeFactor: number;
  interval: number;
  dueDate: string;
}

export function calculateSM2(
  rating: number,
  currentEaseFactor: number,
  currentInterval: number
): SM2Result {
  let easeFactor = currentEaseFactor;
  let interval = currentInterval;

  let quality = 0;
  if (rating === 1) quality = 1;
  else if (rating === 2) quality = 3;
  else if (rating === 3) quality = 4;
  else if (rating === 4) quality = 5;

  if (quality < 3) {
    interval = 1;
  } else {
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const now = new Date();
  now.setDate(now.getDate() + interval);

  return {
    easeFactor,
    interval,
    dueDate: now.toISOString(),
  };
}
