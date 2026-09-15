"use client";

import { useEffect, useState, type ReactNode } from "react";

export function useRequest<T>(load: () => Promise<T>, dependencies: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await load();
      setData(result);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not load data";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, refresh, setData };
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="page-head-text">
        <div className="row" style={{ gap: 8 }}>
          <h2>{title}</h2>
          {badge}
        </div>
        <p>{description}</p>
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  style,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: string;
}) {
  return (
    <Card className="metric-card">
      <div className="row between">
        <span className="metric-label">{label}</span>
        {icon && <span className="metric-icon">{icon}</span>}
      </div>
      <div className="metric-value">{value}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </Card>
  );
}

export function Badge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "brand" | "blue" | "warn" | "danger" | "purple";
}) {
  return <span className={`badge ${variant}`}>{label}</span>;
}

export function Status({ value }: { value?: string | null }) {
  if (!value) return <span className="status unknown">—</span>;
  const raw = String(value);
  const text = raw.replaceAll("_", " ");
  const key = text.replaceAll(" ", "_").toLowerCase();

  return <span className={`status ${key}`}>{text}</span>;
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="notice error">
      <div className="row between">
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>{message}</span>
        </div>
        {onRetry && (
          <button className="button small ghost" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function Loading({ text = "Loading live project data…" }: { text?: string }) {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  );
}

export function Empty({
  title = "Nothing to show yet",
  children = "No records or activity match the selected criteria.",
  action,
}: {
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">◌</div>
      <h4>{title}</h4>
      <p>{children}</p>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 520,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function severityClass(value?: string) {
  return value?.toLowerCase().replaceAll(" ", "_") || "";
}
