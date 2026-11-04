/** Turn raw API/Gemini errors into something a person can act on. */
export function friendlyError(raw = "") {
  const m = String(raw);
  const l = m.toLowerCase();
  if (l.includes("cannot reach")) {
    return {
      kind: "backend offline",
      title: "Can't reach the CodeSense server",
      hint: "The backend does not seem to be running. Start it on port 8000, then retry.",
    };
  }
  if (/quota|429|rate|resource_exhausted|too many/.test(l)) {
    return {
      kind: "rate limited",
      title: "The AI service is busy or over quota",
      hint: "Gemini is rate-limiting requests. Wait a few seconds and retry. Nothing was analysed, no result is shown.",
    };
  }
  if (/502|503|bad gateway|unavailable|overloaded/.test(l)) {
    return {
      kind: "ai unavailable",
      title: "The AI service is unavailable right now",
      hint: "Gemini did not answer (502). This is temporary. Wait a moment and retry. No result was invented.",
    };
  }
  if (/timeout|timed out|deadline/.test(l)) {
    return {
      kind: "timeout",
      title: "The AI took too long to answer",
      hint: "The request timed out before Gemini replied. Retry, or try a shorter snippet.",
    };
  }
  if (/api key|permission|unauthor|401|403/.test(l)) {
    return {
      kind: "ai not configured",
      title: "The AI service rejected the request",
      hint: "The Gemini API key looks missing or invalid on the server.",
    };
  }
  return {
    kind: "request failed",
    title: "The review could not be completed",
    hint: "Something went wrong while talking to the AI service. No result was invented. Please retry.",
  };
}
