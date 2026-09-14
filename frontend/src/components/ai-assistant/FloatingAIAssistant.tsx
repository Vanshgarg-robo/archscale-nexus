"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import MarkdownRenderer from "./MarkdownRenderer";

interface Message {
  id: string | number;
  role: "user" | "assistant" | "system";
  content: string;
  time?: string;
  tokens?: number;
}

interface SessionItem {
  id: number;
  session_uuid: string;
  title: string;
  current_page?: string;
  message_count: number;
  updated_at: string;
}

export default function FloatingAIAssistant() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  // Widget visibility & window state
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Assistant State
  const [isEnabled, setIsEnabled] = useState(true);
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentSessionUuid, setCurrentSessionUuid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming, statusText]);

  // Load public config & initial sessions
  const loadConfig = useCallback(async () => {
    try {
      const cfg = await api.aiAssistant.getConfig();
      setIsEnabled(cfg.is_enabled);
      setModelName(cfg.model_name);
    } catch {
      // Offline fallback
      setIsEnabled(true);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.aiAssistant.getSessions();
      setSessions(res);
      if (res.length > 0 && !currentSessionUuid) {
        // load latest session
        loadSessionMessages(res[0].session_uuid);
      }
    } catch {}
  }, [currentSessionUuid]);

  const loadSessionMessages = async (sessionUuid: string) => {
    try {
      const detail = await api.aiAssistant.getSession(sessionUuid);
      setCurrentSessionUuid(detail.session_uuid);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          tokens: m.tokens_used,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }))
      );
      setShowHistory(false);
    } catch {
      createNewChat();
    }
  };

  useEffect(() => {
    loadConfig();
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen, loadConfig, loadSessions]);

  // Dynamic route-aware suggestion chips
  const getContextualPrompts = () => {
    const route = pathname || "/";
    const basePrompts = [
      "🗺️ How do I use this platform?",
      "⚡ What can I do on this page?",
    ];

    if (route.includes("/impact")) {
      return [
        ...basePrompts,
        "How do I run a delay cascade simulation?",
        "Explain dependency ripple propagation",
        "Where are active trade blockers?",
      ];
    }
    if (route.includes("/dependencies")) {
      return [
        ...basePrompts,
        "How to trace critical path milestones?",
        "Explain Directed Acyclic Graph (DAG) checks",
        "How to prevent circular blocking loops?",
      ];
    }
    if (route.includes("/knowledge-graph")) {
      return [
        ...basePrompts,
        "Explain knowledge graph nodes & relations",
        "How do I search for specific physical zones?",
        "Recommend database indexing for graph queries",
      ];
    }
    if (route.includes("/blockers")) {
      return [
        ...basePrompts,
        "What is currently blocking site installation?",
        "How do I resolve trade bottlenecks?",
        "How to simulate unblocking in Impact Engine?",
      ];
    }
    if (route.includes("/approvals")) {
      return [
        ...basePrompts,
        "How do I approve or reject drawings?",
        "Which drawings are currently overdue?",
        "What happens when an approval is cleared?",
      ];
    }
    if (route.includes("/risks")) {
      return [
        ...basePrompts,
        "What are the highest severity risks?",
        "How is the risk probability score calculated?",
        "Recommend disaster recovery & mitigation",
      ];
    }
    if (route.includes("/user")) {
      return [
        ...basePrompts,
        "How do I update my phone number or email?",
        "How do I change my password?",
        "Explain my role permissions matrix",
      ];
    }
    if (route.includes("/login")) {
      return [
        ...basePrompts,
        "How does 1-click persona switching work?",
        "Can I log in with username, email, or mobile?",
        "How do I create a new user account?",
      ];
    }
    if (route.includes("/admin")) {
      return [
        ...basePrompts,
        "How do I create and manage users?",
        "How to configure AI model & prompts?",
        "Audit Zero-Trust security & RBAC permissions",
      ];
    }

    return [
      ...basePrompts,
      "🚦 What is currently blocking this project?",
      "🔑 How do I switch roles & test permissions?",
      "🏗️ Explain ArchScale Nexus system architecture",
      "⚡ How does the AI Impact Engine work?",
    ];
  };

  const createNewChat = () => {
    setCurrentSessionUuid(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `👋 **Hello ${user?.full_name || "Architect"}!** Welcome to **ArchScale Nexus**.\n\nI am your **AI Assistant & Platform Guide**. I can help you navigate this web application, explain system architecture, detect blockers, simulate schedule changes, and guide you through every workflow.\n\n📍 You are currently on: **\`${pathname || "/"}\`**.\n\nNeed help? Click any suggested question below or ask me anything!`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setShowHistory(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isStreaming) return;

    if (!isEnabled) {
      alert("AI Assistant is currently disabled by system administrator.");
      return;
    }

    // Add user message
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: query,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStatusText("Analyzing architectural context...");

    // Create placeholder for assistant response
    const assistantId = Date.now() + 1;
    let accumulatedContent = "";

    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await api.aiAssistant.chatStream(
        {
          message: query,
          session_id: currentSessionUuid || undefined,
          current_page: pathname || "/",
          project_id: 1,
        },
        {
          onInit: (initData) => {
            setCurrentSessionUuid(initData.session_uuid);
          },
          onToken: (token) => {
            setStatusText(null);
            accumulatedContent += token;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: accumulatedContent } : m))
            );
          },
          onStatus: (status) => {
            setStatusText(status);
          },
          onError: (errMsg) => {
            setStatusText(null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: `⚠️ **Notice**: ${errMsg}` }
                  : m
              )
            );
          },
          onDone: () => {
            setStatusText(null);
            setIsStreaming(false);
            loadSessions();
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    m.content ||
                    `⚠️ **Error communicating with AI Assistant**: ${err.message || "Failed to reach inference server."}`,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setStatusText(null);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsStreaming(false);
      setStatusText(null);
    }
  };

  const handleDeleteSession = async (sessionUuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.aiAssistant.deleteSession(sessionUuid);
      setSessions((prev) => prev.filter((s) => s.session_uuid !== sessionUuid));
      if (currentSessionUuid === sessionUuid) {
        createNewChat();
      }
    } catch {}
  };

  // Format active page label
  const getPageBadge = () => {
    const route = pathname || "/";
    if (route === "/") return "Executive Command";
    if (route.includes("/impact")) return "AI Impact Engine";
    if (route.includes("/dependencies")) return "Dependencies Graph";
    if (route.includes("/knowledge-graph")) return "Knowledge Graph";
    if (route.includes("/risks")) return "Risk Intelligence";
    if (route.includes("/blockers")) return "Blocker Detection";
    if (route.includes("/admin")) return "System Administration";
    if (route.includes("/user")) return "User Profile";
    return route.replace("/", "").toUpperCase();
  };

  return (
    <>
      {/* ─── FLOATING TRIGGER BUTTON ────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              if (messages.length === 0) createNewChat();
            }}
            className="group relative flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 text-white font-bold text-xs shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-orange-400/40 cursor-pointer"
            aria-label="Open ArchScale AI Assistant"
          >
            {/* Glowing ripple pulse */}
            <span className="absolute -inset-1 rounded-full bg-orange-500/30 blur-sm group-hover:bg-orange-500/50 transition-all animate-pulse" />

            <div className="relative flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-sm shadow-inner">
                ⚡
              </div>
              <span className="tracking-tight text-white font-black">AI Architecture Assistant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </button>
        )}
      </div>

      {/* ─── CHATBOT FLOATING WINDOW / MODAL ───────────────────────── */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-[#070B14]/95 backdrop-blur-2xl border border-slate-800/90 shadow-2xl rounded-2xl overflow-hidden ${
            isExpanded
              ? "inset-4 sm:inset-8 md:inset-12 w-auto h-auto"
              : "bottom-5 right-5 w-[94vw] sm:w-[460px] md:w-[500px] h-[640px] max-h-[90vh]"
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#0B1120] border-b border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-orange-500/20 shrink-0">
                ⚡
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-white tracking-tight truncate">
                    ArchScale AI Assistant
                  </h3>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 font-semibold">
                    {modelName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">Context: {getPageBadge()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* History Button */}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                title="Conversation History"
                className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  showHistory
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                📜
              </button>

              {/* New Chat */}
              <button
                type="button"
                onClick={createNewChat}
                title="Start New Chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              >
                ➕
              </button>

              {/* Expand / Minimize */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse Window" : "Maximize Window"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              >
                {isExpanded ? "🗗" : "🗖"}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close AI Assistant"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body Container (Messages + Optional History Drawer) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* History Drawer */}
            {showHistory && (
              <div className="absolute inset-y-0 left-0 w-64 bg-[#090E1A] border-r border-slate-800/90 z-20 flex flex-col p-3 shadow-xl animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Conversations
                  </span>
                  <button
                    type="button"
                    onClick={createNewChat}
                    className="text-[10px] text-orange-400 hover:text-orange-300 font-mono font-semibold"
                  >
                    + New
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {sessions.length === 0 ? (
                    <p className="text-[11px] text-slate-500 py-4 text-center">No past chats yet</p>
                  ) : (
                    sessions.map((s) => (
                      <div
                        key={s.session_uuid}
                        onClick={() => loadSessionMessages(s.session_uuid)}
                        className={`p-2 rounded-xl text-left text-xs cursor-pointer group flex items-center justify-between transition-all ${
                          currentSessionUuid === s.session_uuid
                            ? "bg-orange-500/15 border border-orange-500/40 text-orange-300 font-semibold"
                            : "hover:bg-slate-800/70 border border-transparent text-slate-300"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="truncate text-xs">{s.title || "Architecture Discussion"}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {s.current_page || "/"} • {s.message_count} msgs
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.session_uuid, e)}
                          title="Delete Session"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 text-xs transition-opacity"
                        >
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Chat Feed */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-[#070B14] to-[#0A0F1D]">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-xs font-black shrink-0 mt-1 shadow-md shadow-orange-500/20">
                        ⚡
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 text-xs shadow-md ${
                        m.role === "user"
                          ? "bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-tr-none"
                          : "bg-[#0B1120]/90 border border-slate-800/90 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      ) : (
                        <MarkdownRenderer content={m.content} />
                      )}

                      {m.time && (
                        <div
                          className={`mt-2 flex items-center justify-end gap-2 text-[9px] font-mono ${
                            m.role === "user" ? "text-orange-200/80" : "text-slate-500"
                          }`}
                        >
                          {m.tokens && <span>{m.tokens} tokens</span>}
                          <span>{m.time}</span>
                        </div>
                      )}
                    </div>
                    {m.role === "user" && (
                      <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                        {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                  </div>
                ))}

                {/* Live typing status indicator */}
                {isStreaming && (
                  <div className="flex gap-3 items-center text-slate-400 text-xs">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-md">
                      ⚡
                    </div>
                    <div className="bg-[#0B1120] border border-slate-800 rounded-2xl px-3.5 py-2 flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                      <span className="text-slate-300 font-mono text-[11px]">
                        {statusText || "Streaming architectural response..."}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Contextual Suggestion Prompt Chips */}
              <div className="px-3 py-2 bg-[#090E1A]/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <span>💡</span>
                  <span>Suggestions:</span>
                </span>
                {getContextualPrompts().map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isStreaming}
                    className="text-[11px] text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 hover:border-orange-500/40 transition-all shrink-0 cursor-pointer text-left whitespace-nowrap disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-[#0B1120] border-t border-slate-800/80 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="space-y-2"
                >
                  <div className="relative flex items-end gap-2 bg-slate-900/90 border border-slate-700/80 focus-within:border-orange-500 rounded-xl px-3 py-2 transition-all">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask about architecture, microservices, databases, scaling, or security... (Enter to send)"
                      rows={2}
                      disabled={isStreaming}
                      className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed custom-scrollbar font-normal"
                    />

                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={handleStop}
                        className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <span>⏹</span>
                        <span>Stop</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all disabled:opacity-40 cursor-pointer shrink-0 flex items-center gap-1"
                      >
                        <span>Send</span>
                        <span>↑</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                    <span>
                      Active: <strong>{getPageBadge()}</strong> • Shift+Enter for newline
                    </span>
                    <span>Nexus Architectural Intelligence</span>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
