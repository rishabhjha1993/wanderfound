/**
 * WF-206 — gate for founder-only diagnostic tooling.
 *
 * The debug view exposes the whole candidate pool with rejection reasons. That
 * is provider place data rather than anything secret, but it is not part of the
 * product and must not be reachable by a player.
 *
 * Local development always has it. A deployed environment needs an explicit
 * opt-in, because the real reason this exists is to diagnose a bad trail while
 * standing in the street in Goa, where the alternative is reading server logs
 * on a phone. Callers must still require an authenticated session: this decides
 * whether the tool exists, not who may use it.
 */
export function isDebugToolingEnabled() {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  return process.env.WANDERFOUND_DEBUG_TOOLS === "true";
}
