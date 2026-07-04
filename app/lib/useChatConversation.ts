"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { firebaseAuth } from "./firebase";
import { ChatClient, type ChatMessage, type ChatClientStatus } from "./chatClient";

// One shared PerkOS-Chat WS connection per browser session — the same pattern
// the main PerkOS App uses (chatClient is plain TS; we wrap it in this hook).
// Auth is the user's Firebase ID token; message bodies live on the agent +
// stream over the socket (PerkOS-Chat NEVER persists content to Firestore, so
// the old Firestore-messages approach could never see agent replies).
let sharedClient: ChatClient | null = null;

function getClient(): ChatClient {
  if (sharedClient) return sharedClient;
  const url = process.env.NEXT_PUBLIC_CHAT_URL || "wss://chat.perkos.xyz/chat";
  sharedClient = new ChatClient({
    url,
    getToken: async () => {
      const user = firebaseAuth().currentUser;
      return user ? user.getIdToken() : null;
    },
  });
  sharedClient.start();
  return sharedClient;
}

/**
 * Subscribe to a conversation: loads the last history page, then streams live
 * `chat_message` frames (user + agent). `send` posts a message over the socket;
 * the agent's reply arrives as another live message.
 */
export function useChatConversation(convId: string | null | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatClientStatus>("idle");
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!convId) {
      setMessages([]);
      seen.current = new Set();
      return;
    }
    const client = getClient();
    seen.current = new Set();
    setMessages([]);

    const offStatus = client.onStatus(setStatus);

    const push = (m: ChatMessage) => {
      if (seen.current.has(m.id)) return;
      seen.current.add(m.id);
      setMessages((cur) => [...cur, m].sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
    };

    const offMsg = client.onMessage(convId, push);

    // Load the most recent history page once connected. history() waits out a
    // brief window if the socket is still authing.
    let cancelled = false;
    client
      .history({ convId, limit: 50 })
      .then((page) => {
        if (cancelled) return;
        for (const m of page.messages) push(m);
      })
      .catch(() => {
        /* no history yet (fresh conv) — fine */
      });

    return () => {
      cancelled = true;
      offMsg();
      offStatus();
    };
  }, [convId]);

  const send = useCallback(
    (text: string) => {
      if (!convId || !text.trim()) return;
      getClient().send({ convId, text: text.trim() });
    },
    [convId],
  );

  return { messages, status, send };
}
