"use client";

import { useEffect, useState } from "react";

import {
  subscribeWebMCPDiagnostics,
  type WebMCPDiagnosticsEvent,
} from "@/features/webmcp/diagnostics";

import styles from "./webmcp-diagnostics-panel.module.css";

type DiagnosticsState = {
  contextStatus: "checking" | "missing" | "detected" | "unavailable";
  registrationStarted: boolean;
  expectedToolCount: number;
  registeredTools: string[];
  failedTools: Array<{ name: string; error: string }>;
  cleanupCount: number;
  events: WebMCPDiagnosticsEvent[];
};

function initialState(expectedToolCount: number): DiagnosticsState {
  return {
    contextStatus: "checking",
    registrationStarted: false,
    expectedToolCount,
    registeredTools: [],
    failedTools: [],
    cleanupCount: 0,
    events: [],
  };
}

function eventText(event: WebMCPDiagnosticsEvent): string {
  switch (event.type) {
    case "model_context":
      return event.status === "detected"
        ? "document.modelContext became available"
        : event.status === "missing"
          ? "document.modelContext not detected; retrying"
          : "document.modelContext unavailable after retries";
    case "registration_started":
      return `registration started (${event.expectedToolCount} expected)`;
    case "tool_registered":
      return `registered ${event.name}`;
    case "tool_registration_failed":
      return `failed ${event.name}: ${event.error}`;
    case "cleanup":
      return `cleanup/unregistration (${event.toolCount} tools)`;
  }
}

function reduceDiagnostics(state: DiagnosticsState, event: WebMCPDiagnosticsEvent): DiagnosticsState {
  const nextEvents = [...state.events, event].slice(-40);
  switch (event.type) {
    case "model_context":
      return { ...state, contextStatus: event.status === "detected" ? "detected" : event.status, events: nextEvents };
    case "registration_started":
      return { ...state, registrationStarted: true, expectedToolCount: event.expectedToolCount, events: nextEvents };
    case "tool_registered":
      return state.registeredTools.includes(event.name)
        ? { ...state, events: nextEvents }
        : { ...state, registeredTools: [...state.registeredTools, event.name], events: nextEvents };
    case "tool_registration_failed":
      return state.failedTools.some((tool) => tool.name === event.name)
        ? { ...state, events: nextEvents }
        : { ...state, failedTools: [...state.failedTools, { name: event.name, error: event.error }], events: nextEvents };
    case "cleanup":
      return {
        ...state,
        registrationStarted: false,
        registeredTools: [],
        failedTools: [],
        cleanupCount: state.cleanupCount + 1,
        events: nextEvents,
      };
  }
}

function contextLabel(status: DiagnosticsState["contextStatus"]): string {
  if (status === "detected") return "available";
  if (status === "unavailable") return "unavailable";
  if (status === "missing") return "not detected (retrying)";
  return "checking";
}

export function WebMCPDiagnosticsPanel({
  businessSlug,
  expectedToolCount,
}: {
  businessSlug: string;
  expectedToolCount: number;
}) {
  const [state, setState] = useState(() => initialState(expectedToolCount));

  useEffect(() => subscribeWebMCPDiagnostics((event) => {
    if ("businessSlug" in event && event.businessSlug !== businessSlug) return;
    setState((current) => reduceDiagnostics(current, event));
  }), [businessSlug]);

  const registrationLabel = !state.registrationStarted
    ? state.contextStatus === "unavailable" ? "not started (no modelContext)" : "not started"
    : state.failedTools.length > 0
      ? "failed"
      : state.registeredTools.length === state.expectedToolCount
        ? "ready"
        : "running";

  return (
    <aside className={styles.panel} aria-label="Temporary WebMCP runtime diagnostics" data-testid="webmcp-diagnostics">
      <div className={styles.heading}>
        <strong>Temporary WebMCP diagnostics</strong>
        <span>{businessSlug}</span>
      </div>
      <dl className={styles.summary}>
        <dt className={styles.label}>document.modelContext</dt>
        <dd className={state.contextStatus === "detected" ? styles.success : state.contextStatus === "unavailable" ? styles.failure : styles.warning}>{contextLabel(state.contextStatus)}</dd>
        <dt className={styles.label}>registration</dt>
        <dd className={registrationLabel === "ready" ? styles.success : registrationLabel === "failed" ? styles.failure : styles.warning}>{registrationLabel}</dd>
        <dt className={styles.label}>expected tools</dt>
        <dd>{state.expectedToolCount}</dd>
        <dt className={styles.label}>registered tools</dt>
        <dd>{state.registeredTools.length}/{state.expectedToolCount}</dd>
        <dt className={styles.label}>cleanups</dt>
        <dd>{state.cleanupCount}</dd>
      </dl>

      {state.registeredTools.length > 0 ? <section className={styles.section}>
        <h2>Registered</h2>
        <ul className={styles.toolList}>{state.registeredTools.map((name) => <li key={name} className={styles.success}>{name}</li>)}</ul>
      </section> : null}

      {state.failedTools.length > 0 ? <section className={styles.section}>
        <h2>Failures</h2>
        <ul className={styles.toolList}>{state.failedTools.map((tool) => <li key={tool.name} className={styles.failure}>{tool.name}: {tool.error}</li>)}</ul>
      </section> : null}

      <details className={`${styles.section} ${styles.eventLog}`} open>
        <summary>Event log ({state.events.length})</summary>
        {state.events.length > 0 ? <ol className={styles.eventList}>{state.events.map((event, index) => <li key={`${event.timestamp}-${index}`}><span className={styles.eventTime}>{new Date(event.timestamp).toLocaleTimeString()}</span>{eventText(event)}</li>)}</ol> : <p>No runtime events yet.</p>}
      </details>
    </aside>
  );
}
