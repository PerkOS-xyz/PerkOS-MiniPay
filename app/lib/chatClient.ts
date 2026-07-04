/**
 * Browser-side client for PerkOS-Chat (wss://chat.perkos.xyz/chat).
 *
 * Plain TypeScript — no React. Wrapped by `ChatClientProvider` (see
 * `useChatClientContext.tsx`) so a single connection serves every chat
 * route within a session.
 *
 * Frame schema mirrors the spec in `PerkOS-Chat/docs/protocol.md`.
 */

export type ChatIdentity = `user:${string}` | `agent:${string}`;

/**
 * One tool invocation made by an agent while producing a reply. Renders
 * as an inline pill below the message text and expands to reveal the
 * input/output on click. The shape is intentionally permissive (`input`
 * and `output` are `unknown`) so the agent runtime can pass through
 * structured payloads without the chat layer schema-locking them.
 */
export interface ChatToolCall {
  /** Opaque id supplied by the agent, used for deduplication / streaming updates. */
  id: string;
  /** Tool name (e.g. "Bash", "Read", "websearch"). */
  name: string;
  /** Lifecycle state. */
  status: "pending" | "running" | "ok" | "error";
  /** Optional one-line summary the agent renders inline ("ls -la"). */
  summary?: string;
  /** Tool input — JSON-serializable, displayed in the expanded view. */
  input?: unknown;
  /** Tool output — JSON-serializable or a string. */
  output?: unknown;
  /** Failure message when status === "error". */
  error?: string;
  /** Approximate cost in ms (for the badge in the expanded view). */
  durationMs?: number;
}

export interface ChatMessage {
  id: string;
  convId: string;
  from: ChatIdentity;
  text: string;
  /** ISO 8601 */
  timestamp: string;
  replyTo?: string | null;
  /** Inline tool invocations the agent made while producing this reply. */
  toolCalls?: ChatToolCall[];
}

export type ChatClientStatus =
  | "idle"
  | "connecting"
  | "authing"
  | "connected"
  | "auth-error"
  | "disconnected";

export type StatusListener = (status: ChatClientStatus, detail?: string) => void;
export type MessageListener = (msg: ChatMessage) => void;
export type AckListener = (ack: { id: string; convId: string; delivered: number; timestamp: string }) => void;

const DEFAULT_URL = "wss://chat.perkos.xyz/chat";
const MIN_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;
const HEARTBEAT_MS = 25_000;
const HISTORY_TIMEOUT_MS = 15_000;

interface PendingHistory {
  resolve: (page: { messages: ChatMessage[]; hasMore: boolean }) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface ReceiptSummary {
  convId: string;
  hostAgent: string;
  transcriptHash: string;
  hashAlgo: "sha256";
  messageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  generatedAt: string;
}

interface PendingReceipt {
  resolve: (summary: ReceiptSummary) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class ChatClient {
  private ws: WebSocket | null = null;
  private url: string;
  private getToken: () => Promise<string | null>;
  private status: ChatClientStatus = "idle";
  private statusListeners = new Set<StatusListener>();
  /** convId -> Set of listeners. */
  private messageListeners = new Map<string, Set<MessageListener>>();
  /** sender-side ack listener for a specific outbound message id. */
  private ackListeners = new Map<string, AckListener>();
  private pendingHistory = new Map<string, PendingHistory>();
  private pendingReceipts = new Map<string, PendingReceipt>();
  private reconnectMs = MIN_RECONNECT_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private currentSession: { walletAddress: string } | null = null;

  constructor(opts: { url?: string; getToken: () => Promise<string | null> }) {
    this.url = opts.url || DEFAULT_URL;
    this.getToken = opts.getToken;
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  getStatus(): ChatClientStatus {
    return this.status;
  }

  getSessionWallet(): string | null {
    return this.currentSession?.walletAddress ?? null;
  }

  /** Open the connection (idempotent). */
  start(): void {
    if (this.ws || this.stopped === false && this.status === "connected") return;
    this.stopped = false;
    this.connect();
  }

  /** Close the connection and stop reconnecting. */
  stop(): void {
    this.stopped = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close(1000, "client shutdown");
      } catch {
        /* ignore */
      }
      this.ws = null;
    }
    this.setStatus("idle");
    this.currentSession = null;
    // Reject pending requests (history + receipts).
    for (const p of this.pendingHistory.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("client stopped"));
    }
    this.pendingHistory.clear();
    for (const p of this.pendingReceipts.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("client stopped"));
    }
    this.pendingReceipts.clear();
    this.ackListeners.clear();
  }

  /** Subscribe to status changes; returns an unsubscriber. */
  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  /** Subscribe to messages for a single conv. */
  onMessage(convId: string, fn: MessageListener): () => void {
    let set = this.messageListeners.get(convId);
    if (!set) {
      set = new Set();
      this.messageListeners.set(convId, set);
    }
    set.add(fn);
    return () => {
      set?.delete(fn);
      if (set && set.size === 0) this.messageListeners.delete(convId);
    };
  }

  /**
   * Send a message. Returns the generated id immediately. The caller
   * should render the message optimistically; the server will broadcast
   * back as a `chat_message` event with the same id.
   *
   * Optional `onAck` is invoked once when the server confirms routing.
   */
  send(input: { convId: string; text: string; onAck?: AckListener }): string {
    const id = makeId();
    if (input.onAck) this.ackListeners.set(id, input.onAck);
    this.sendFrame({
      type: "send",
      id,
      convId: input.convId,
      text: input.text,
    });
    return id;
  }

  /**
   * Request a history page. Resolves with the chunk; rejects on timeout
   * or HOST_OFFLINE / other server errors.
   */
  history(input: { convId: string; before?: string | null; limit?: number }): Promise<{
    messages: ChatMessage[];
    hasMore: boolean;
  }> {
    return new Promise((resolve, reject) => {
      const id = makeId();
      const timer = setTimeout(() => {
        this.pendingHistory.delete(id);
        reject(new Error("history request timed out"));
      }, HISTORY_TIMEOUT_MS);
      this.pendingHistory.set(id, { resolve, reject, timer });
      this.sendFrame({
        type: "history",
        id,
        convId: input.convId,
        before: input.before ?? null,
        limit: input.limit ?? 50,
      });
    });
  }

  /**
   * Ask the conversation's historyHost agent to compute a tamper-evident
   * hash of the local jsonl + metadata. The result is the input to the
   * wallet-signing step in receiptsApi.
   *
   * Rejects on timeout or HOST_OFFLINE / NOT_FOUND / NO_HOST server errors.
   */
  requestReceipt(input: { convId: string }): Promise<ReceiptSummary> {
    return new Promise((resolve, reject) => {
      const id = makeId();
      const timer = setTimeout(() => {
        this.pendingReceipts.delete(id);
        reject(new Error("receipt request timed out"));
      }, HISTORY_TIMEOUT_MS);
      this.pendingReceipts.set(id, { resolve, reject, timer });
      this.sendFrame({ type: "receipt_request", id, convId: input.convId });
    });
  }

  // ---------------------------------------------------------------------
  // Internal: connection lifecycle
  // ---------------------------------------------------------------------

  private async connect(): Promise<void> {
    if (this.stopped) return;
    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.setStatus("disconnected", errMsg(err));
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = async () => {
      this.setStatus("authing");
      const token = await this.getToken().catch(() => null);
      if (!token) {
        this.setStatus("auth-error", "no Firebase ID token");
        try { this.ws?.close(4401, "no token"); } catch { /* ignore */ }
        return;
      }
      this.sendFrame({ type: "auth", role: "user", idToken: token });
    };

    this.ws.onmessage = (ev) => {
      let frame: Record<string, unknown>;
      try {
        frame = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      } catch {
        return;
      }
      this.handleFrame(frame);
    };

    this.ws.onclose = (ev) => {
      this.clearTimers();
      this.ws = null;
      if (this.stopped) return;
      // 4401 = auth failure; don't churn-reconnect.
      if (ev.code === 4401) {
        this.setStatus("auth-error", String(ev.reason || "auth failed"));
        return;
      }
      this.setStatus("disconnected", String(ev.reason || `code ${ev.code}`));
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // The close handler will fire shortly after — no need to duplicate.
    };
  }

  private handleFrame(frame: Record<string, unknown>): void {
    const type = String(frame.type ?? "");

    if (type === "auth_ok") {
      const session = (frame.session ?? {}) as { walletAddress?: string };
      this.currentSession = session.walletAddress
        ? { walletAddress: session.walletAddress.toLowerCase() }
        : null;
      this.reconnectMs = MIN_RECONNECT_MS;
      this.setStatus("connected");
      this.startHeartbeat();
      return;
    }

    if (type === "auth_error") {
      this.setStatus("auth-error", String(frame.message ?? frame.code ?? "auth failed"));
      try { this.ws?.close(4401, String(frame.code ?? "")); } catch { /* ignore */ }
      return;
    }

    if (type === "chat_message" || type === "chat_deliver") {
      const msg: ChatMessage = {
        id: String(frame.id),
        convId: String(frame.convId),
        from: String(frame.from) as ChatIdentity,
        text: String(frame.text),
        timestamp: String(frame.timestamp),
        replyTo: (frame.replyTo as string | null | undefined) ?? null,
        toolCalls: normalizeToolCalls(frame.toolCalls),
      };
      const set = this.messageListeners.get(msg.convId);
      if (set) for (const fn of set) fn(msg);
      return;
    }

    if (type === "ack") {
      const id = String(frame.id);
      const fn = this.ackListeners.get(id);
      if (fn) {
        this.ackListeners.delete(id);
        fn({
          id,
          convId: String(frame.convId),
          delivered: Number(frame.delivered ?? 0),
          timestamp: String(frame.timestamp),
        });
      }
      return;
    }

    if (type === "history_chunk") {
      const id = String(frame.id);
      const pending = this.pendingHistory.get(id);
      if (!pending) return;
      this.pendingHistory.delete(id);
      clearTimeout(pending.timer);
      const messages = Array.isArray(frame.messages)
        ? (frame.messages as unknown[]).map((m) => normalizeMessage(m as Record<string, unknown>, String(frame.convId)))
        : [];
      pending.resolve({ messages, hasMore: !!frame.hasMore });
      return;
    }

    if (type === "history_pending" || type === "receipt_pending") {
      // server acknowledged the request; we wait for the chunk/response
      return;
    }

    if (type === "receipt_response") {
      const id = String(frame.id);
      const pending = this.pendingReceipts.get(id);
      if (!pending) return;
      this.pendingReceipts.delete(id);
      clearTimeout(pending.timer);
      pending.resolve({
        convId: String(frame.convId),
        hostAgent: String(frame.hostAgent ?? "agent:unknown"),
        transcriptHash: String(frame.transcriptHash ?? ""),
        hashAlgo: "sha256",
        messageCount: Number(frame.messageCount ?? 0),
        firstMessageAt: (frame.firstMessageAt as string | null) ?? null,
        lastMessageAt: (frame.lastMessageAt as string | null) ?? null,
        generatedAt: String(frame.generatedAt ?? new Date().toISOString()),
      });
      return;
    }

    if (type === "error") {
      const code = String(frame.code ?? "");
      const message = String(frame.message ?? "");
      const id = String(frame.id ?? "");
      // Reject correlated pending requests
      if (id && this.pendingHistory.has(id)) {
        const pending = this.pendingHistory.get(id)!;
        this.pendingHistory.delete(id);
        clearTimeout(pending.timer);
        pending.reject(new Error(`${code}: ${message}`));
      }
      if (id && this.pendingReceipts.has(id)) {
        const pending = this.pendingReceipts.get(id)!;
        this.pendingReceipts.delete(id);
        clearTimeout(pending.timer);
        pending.reject(new Error(`${code}: ${message}`));
      }
      if (code === "HOST_OFFLINE" || code === "NOT_FOUND") {
        this.setStatus(this.status, `${code}: ${message}`);
      }
      return;
    }

    if (type === "pong") return;
  }

  private sendFrame(frame: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(frame));
    }
    // Frames sent before OPEN are silently dropped — callers should retry
    // after `status === "connected"`.
  }

  private setStatus(s: ChatClientStatus, detail?: string): void {
    this.status = s;
    for (const fn of this.statusListeners) fn(s, detail);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      this.sendFrame({ type: "ping" });
    }, HEARTBEAT_MS);
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    const delay = this.reconnectMs;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
    this.reconnectMs = Math.min(delay * 2, MAX_RECONNECT_MS);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }
}

function makeId(): string {
  // crypto.randomUUID is broadly available; fall back for old runtimes.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeMessage(raw: Record<string, unknown>, fallbackConvId: string): ChatMessage {
  return {
    id: String(raw.id ?? makeId()),
    convId: String(raw.convId ?? fallbackConvId),
    from: String(raw.from ?? "agent:unknown") as ChatIdentity,
    text: String(raw.text ?? ""),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    replyTo: (raw.replyTo as string | null | undefined) ?? null,
    toolCalls: normalizeToolCalls(raw.toolCalls),
  };
}

/**
 * Defensive coercion of an arbitrary wire shape into a typed
 * ChatToolCall[]. Returns undefined when the input isn't a non-empty
 * array — keeps `toolCalls` absent on messages that don't carry any,
 * so callers can use the natural truthiness check.
 */
function normalizeToolCalls(raw: unknown): ChatToolCall[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: ChatToolCall[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const c = entry as Record<string, unknown>;
    if (typeof c.id !== "string" || typeof c.name !== "string") continue;
    const status =
      c.status === "pending" ||
      c.status === "running" ||
      c.status === "ok" ||
      c.status === "error"
        ? c.status
        : "ok";
    out.push({
      id: c.id,
      name: c.name,
      status,
      summary: typeof c.summary === "string" ? c.summary : undefined,
      input: c.input,
      output: c.output,
      error: typeof c.error === "string" ? c.error : undefined,
      durationMs:
        typeof c.durationMs === "number" && Number.isFinite(c.durationMs)
          ? c.durationMs
          : undefined,
    });
  }
  return out.length ? out : undefined;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
