/** A failure that a retry cannot fix (nothing to deliver to); the outbox dead-letters it instead of retrying. */
export class PermanentDeliveryError extends Error {
  readonly permanent = true;
}
