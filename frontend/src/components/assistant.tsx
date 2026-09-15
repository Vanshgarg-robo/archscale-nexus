"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type Message = { role: "user" | "assistant"; content: string };

export function Assistant({ projectId }: { projectId: number }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I’m your ArchScale Nexus AI Copilot. Ask about coordination bottlenecks, risk cascade ripples, platform architecture, or trade schedules.",
    },
  ]);
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void api.assistant
      .config()
      .then((cfg) => {
        setEnabled(cfg.is_enabled);
        if (cfg.suggested_prompts) {
          setSuggestedPrompts(cfg.suggested_prompts);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const send = async (textToSend?: string) => {
    const message = (textToSend || prompt).trim();
    if (!message || streaming) return;

    setPrompt("");
    setStreaming(true);

    // Append user message immediately
    setMessages((prev) => [...prev, { role: "user", content: message }]);

    // Prepare assistant message container
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    let streamedTokens = "";

    await api.assistant.streamChat(
      {
        message,
        session_id: sessionId,
        project_id: projectId,
        current_page: typeof window !== "undefined" ? window.location.pathname : "/",
      },
      {
        onInit: (sess) => {
          setSessionId(sess.session_uuid);
        },
        onToken: (chunk) => {
          streamedTokens += chunk;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant") {
              last.content = streamedTokens;
            }
            return copy;
          });
        },
        onDone: () => {
          setStreaming(false);
        },
        onError: async (err) => {
          // If streaming failed and no tokens were received, fallback to non-streaming endpoint
          if (!streamedTokens) {
            try {
              const fallback = await api.assistant.chat({
                message,
                session_id: sessionId,
                project_id: projectId,
                current_page: typeof window !== "undefined" ? window.location.pathname : "/",
              });
              const reply =
                fallback.message?.content ||
                fallback.response ||
                "I was able to process your question via standard routing.";

              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  last.content = reply;
                }
                return copy;
              });
            } catch (fallbackErr) {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  last.content = `Copilot unavailable: ${err.message}`;
                }
                return copy;
              });
            }
          }
          setStreaming(false);
        },
      },
      abortCtrl.signal
    );
  };

  const clearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSessionId(undefined);
    setMessages([
      {
        role: "assistant",
        content:
          "Conversation reset. Ask about coordination bottlenecks, risk cascade ripples, platform architecture, or trade schedules.",
      },
    ]);
  };

  if (!enabled) return null;

  return (
    <>
      {open && (
        <section className="assistant-panel" aria-label="ArchScale AI Copilot">
          <header>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ color: "var(--brand)" }}>✦</span>
              <strong>ArchScale Copilot</strong>
              {streaming && <span className="badge brand">Streaming…</span>}
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className="button small ghost"
                onClick={clearChat}
                title="Reset session"
              >
                Reset
              </button>
              <button
                type="button"
                className="button small ghost"
                onClick={() => setOpen(false)}
                aria-label="Close assistant panel"
              >
                ✕
              </button>
            </div>
          </header>

          <div className="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-meta">
                  <span>{message.role === "user" ? "You" : "ArchScale AI"}</span>
                </div>
                {message.content || (streaming && index === messages.length - 1 ? "Thinking…" : "")}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {suggestedPrompts.length > 0 && messages.length <= 2 && (
            <div className="chips" style={{ padding: "0 14px", margin: "4px 0" }}>
              {suggestedPrompts.slice(0, 3).map((hint, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="chip"
                  onClick={() => void send(hint)}
                  disabled={streaming}
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              className="input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask the architectural copilot…"
              disabled={streaming}
            />
            <button className="button primary" disabled={streaming || !prompt.trim()}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        className="assistant-fab"
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle AI copilot"
        title="ArchScale AI Copilot"
      >
        ✦
      </button>
    </>
  );
}
