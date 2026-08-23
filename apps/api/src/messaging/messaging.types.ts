export interface SendResult {
  /** Provider-side message id, when the provider returns one. */
  providerId?: string;
}

/**
 * A WhatsApp delivery backend. Implementations must be side-effect-only on
 * `send`; validation, persistence and logging live in the service layer so
 * every driver behaves identically from the caller's point of view.
 */
export interface MessageDriver {
  /** Stable identifier stored on the message log (e.g. "mock", "meta"). */
  readonly name: string;
  /** Deliver `body` to an E.164 number. Throw to signal a failed send. */
  send(toE164: string, body: string): Promise<SendResult>;
}
