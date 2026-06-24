"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { firebaseDb } from "./firebase";
import type { ChatMessage } from "./perkosApi";

/** Realtime subscription to a project's chat thread (user + agent messages). */
export function useProjectMessages(address?: string, projectId?: string): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!address || !projectId) return;
    const ref = query(
      collection(firebaseDb(), "wallets", address, "projects", projectId, "messages"),
      orderBy("createdAt", "asc"),
    );
    return onSnapshot(
      ref,
      (snap) => {
        setMessages(
          snap.docs.map((d) => {
            const data = d.data() as {
              from?: string;
              text?: string;
              agentName?: string;
              createdAt?: Timestamp | string;
            };
            const ts = data.createdAt;
            const createdAt =
              ts && typeof ts === "object" && "toDate" in ts
                ? ts.toDate().toISOString()
                : typeof ts === "string"
                  ? ts
                  : undefined;
            return {
              id: d.id,
              from: data.from === "agent" ? "agent" : "user",
              text: data.text ?? "",
              agentName: data.agentName,
              createdAt,
            };
          }),
        );
      },
      () => setMessages([]),
    );
  }, [address, projectId]);

  return messages;
}
