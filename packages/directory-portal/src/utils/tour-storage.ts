const STORAGE_PREFIX = "pact.tour.v1";

/**
 * The completion flag is scoped per user id so that two people sharing a
 * browser each get their own introduction.
 */
const storageKey = (userId: number): string => `${STORAGE_PREFIX}.${userId}`;

export const productTourStorageKey = storageKey;

export const hasSeenProductTour = (userId: number): boolean => {
  try {
    return localStorage.getItem(storageKey(userId)) === "true";
  } catch {
    // Storage can be unavailable (private mode, blocked cookies) — treat as seen
    // so we never trap the user in a prompt we cannot dismiss permanently.
    return true;
  }
};

export const markProductTourSeen = (userId: number): void => {
  try {
    localStorage.setItem(storageKey(userId), "true");
  } catch {
    // Non-fatal: the prompt will simply reappear on the next load.
  }
};
