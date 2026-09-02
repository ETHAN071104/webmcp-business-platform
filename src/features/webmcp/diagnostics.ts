export type WebMCPDiagnosticsEventInput =
  | { type: "model_context"; status: "missing" | "detected" | "unavailable" }
  | { type: "registration_started"; businessSlug: string; expectedToolCount: number }
  | { type: "tool_registered"; name: string }
  | { type: "tool_registration_failed"; name: string; error: string }
  | { type: "cleanup"; businessSlug: string; toolCount: number };

export type WebMCPDiagnosticsEvent = WebMCPDiagnosticsEventInput & {
  timestamp: number;
};

type WebMCPDiagnosticsListener = (event: WebMCPDiagnosticsEvent) => void;

const listeners = new Set<WebMCPDiagnosticsListener>();

export function emitWebMCPDiagnostics(
  event: WebMCPDiagnosticsEventInput,
): void {
  const timestampedEvent = { ...event, timestamp: Date.now() } as WebMCPDiagnosticsEvent;
  listeners.forEach((listener) => {
    try {
      listener(timestampedEvent);
    } catch {
      // Diagnostics must never interfere with WebMCP registration.
    }
  });
}

export function subscribeWebMCPDiagnostics(listener: WebMCPDiagnosticsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
