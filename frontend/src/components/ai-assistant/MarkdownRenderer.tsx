"use client";
import { useState } from "react";
import Link from "next/link";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Split content by code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: Array<{ type: "text" | "code"; lang?: string; text: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        text: content.substring(lastIndex, match.index),
      });
    }
    parts.push({
      type: "code",
      lang: match[1] || "text",
      text: match[2].trimEnd(),
    });
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      text: content.substring(lastIndex),
    });
  }

  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let tableLines: string[] = [];

    const flushTable = () => {
      if (tableLines.length > 0) {
        const rows = tableLines.map((l) =>
          l
            .split("|")
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map((c) => c.trim())
        );
        const headerRow = rows[0];
        const bodyRows = rows.slice(2); // skip separator row

        elements.push(
          <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-full divide-y divide-slate-800 text-xs text-left">
              <thead className="bg-slate-900/90 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  {headerRow?.map((h, i) => (
                    <th key={i} className="px-3 py-2 border-r border-slate-800/80 last:border-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                {bodyRows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-slate-800/30 transition-colors">
                    {r.map((c, ci) => (
                      <td key={ci} className="px-3 py-1.5 border-r border-slate-800/60 last:border-0">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableLines = [];
      }
    };

    lines.forEach((line, idx) => {
      // Table detection
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        tableLines.push(line);
        return;
      } else {
        flushTable();
      }

      // Headers
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={idx} className="text-sm font-bold text-white mt-4 mb-2 flex items-center gap-1.5 border-b border-slate-800/80 pb-1">
            <span className="text-orange-400">#</span>
            <span>{line.replace("## ", "")}</span>
          </h2>
        );
        return;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={idx} className="text-xs font-bold text-orange-300 mt-3 mb-1.5 flex items-center gap-1">
            <span>{line.replace("### ", "")}</span>
          </h3>
        );
        return;
      }
      if (line.startsWith("#### ")) {
        elements.push(
          <h4 key={idx} className="text-xs font-semibold text-slate-200 mt-2 mb-1">
            {line.replace("#### ", "")}
          </h4>
        );
        return;
      }

      // Blockquotes
      if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={idx} className="my-2 border-l-2 border-orange-500/60 bg-orange-500/5 px-3 py-1.5 rounded-r-lg text-[11px] text-orange-200/90 italic">
            {line.replace("> ", "")}
          </blockquote>
        );
        return;
      }

      // Bullet lists
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemContent = line.trim().replace(/^[-*]\s+/, "");
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 my-1 pl-1">
            <span className="text-orange-400 text-[10px] mt-1 shrink-0">●</span>
            <span className="flex-1 leading-relaxed">{parseInlineStyles(itemContent)}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 my-1 pl-1">
            <span className="text-orange-400 font-mono text-[10px] font-bold mt-0.5 shrink-0">{numMatch[1]}.</span>
            <span className="flex-1 leading-relaxed">{parseInlineStyles(numMatch[2])}</span>
          </div>
        );
        return;
      }

      // Empty line / paragraph break
      if (!line.trim()) {
        elements.push(<div key={idx} className="h-1.5" />);
        return;
      }

      // Regular line
      elements.push(
        <p key={idx} className="text-xs text-slate-300 leading-relaxed my-0.5">
          {parseInlineStyles(line)}
        </p>
      );
    });

    flushTable();
    return elements;
  };

  const parseInlineStyles = (text: string): React.ReactNode => {
    // Process markdown links [text](url), inline code `code`, bold **text**, italics *text*
    const parts: React.ReactNode[] = [];
    const inlineRegex = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m;

    while ((m = inlineRegex.exec(text)) !== null) {
      if (m.index > last) {
        parts.push(text.substring(last, m.index));
      }
      const matchText = m[0];
      if (matchText.startsWith("[") && matchText.includes("](")) {
        const linkMatch = matchText.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const label = linkMatch[1];
          const url = linkMatch[2];
          parts.push(
            <Link
              key={m.index}
              href={url}
              className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 decoration-orange-500/50 hover:decoration-orange-400 transition-colors inline-flex items-center gap-0.5"
            >
              <span>{label}</span>
              <span className="text-[10px]">↗</span>
            </Link>
          );
        }
      } else if (matchText.startsWith("`") && matchText.endsWith("`")) {
        parts.push(
          <code key={m.index} className="px-1.5 py-0.5 rounded bg-slate-800 text-orange-300 font-mono text-[11px] border border-slate-700/60">
            {matchText.slice(1, -1)}
          </code>
        );
      } else if (matchText.startsWith("**") && matchText.endsWith("**")) {
        parts.push(
          <strong key={m.index} className="text-white font-semibold">
            {matchText.slice(2, -2)}
          </strong>
        );
      } else if (matchText.startsWith("*") && matchText.endsWith("*")) {
        parts.push(
          <em key={m.index} className="text-slate-300 italic">
            {matchText.slice(1, -1)}
          </em>
        );
      }
      last = inlineRegex.lastIndex;
    }

    if (last < text.length) {
      parts.push(text.substring(last));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="markdown-content text-xs leading-relaxed space-y-1">
      {parts.map((part, pIdx) => {
        if (part.type === "code") {
          const isDiagram = part.lang === "text" || part.lang === "ascii" || part.text.includes("+---") || part.text.includes("|");
          return (
            <div key={pIdx} className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-[#050811] shadow-lg">
              {/* Code block header bar */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/60" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                    {isDiagram ? "ARCHITECTURE DIAGRAM" : part.lang || "CODE"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(part.text, pIdx)}
                  className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedIndex === pIdx ? (
                    <span className="text-emerald-400 font-bold">✓ Copied</span>
                  ) : (
                    <span>⎘ Copy</span>
                  )}
                </button>
              </div>
              {/* Code content */}
              <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed text-slate-200 custom-scrollbar">
                <code>{part.text}</code>
              </pre>
            </div>
          );
        }

        return <div key={pIdx}>{renderFormattedText(part.text)}</div>;
      })}
    </div>
  );
}
