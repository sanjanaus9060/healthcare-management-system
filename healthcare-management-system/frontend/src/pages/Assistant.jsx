import { Fragment, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Info, SendHorizontal, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PageLoader, Spinner } from "@/components/common";
import { API_BASE, TOKEN_KEY, api, formatDetail, formatError } from "@/lib/api";

const SUGGESTIONS = [
  "How should I prepare for a cardiology appointment?",
  "What does 'hypertension' mean in simple words?",
  "What questions should I ask my doctor about a new prescription?",
  "Explain what an HbA1c test measures.",
];

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>
  );
}

function RichText({ text }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return null;
        if (/^[-*•]\s/.test(t)) return <p key={i} className="flex gap-2"><span className="text-teal-600">•</span><span>{renderInline(t.slice(2))}</span></p>;
        if (/^#+\s/.test(t)) return <p key={i} className="font-semibold">{renderInline(t.replace(/^#+\s/, ""))}</p>;
        return <p key={i}>{renderInline(t)}</p>;
      })}
    </div>
  );
}

async function streamChat(message, onEvent) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(formatDetail(body.detail));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop();
    parts.filter((p) => p.startsWith("data: ")).forEach((p) => onEvent(JSON.parse(p.slice(6))));
  }
}

export default function Assistant() {
  const [messages, setMessages] = useState(null);
  const [status, setStatus] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    Promise.all([api.get("/ai/history"), api.get("/ai/status")])
      .then(([h, s]) => { setMessages(h.data); setStatus(s.data); })
      .catch((e) => { toast.error(formatError(e)); setMessages([]); });
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const updateLast = (fn) => setMessages((m) => [...m.slice(0, -1), fn(m[m.length - 1])]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", content: msg }, { id: `a-${Date.now()}`, role: "assistant", content: "", pending: true }]);
    try {
      await streamChat(msg, (ev) => {
        if (ev.type === "meta") updateLast((a) => ({ ...a, mode: ev.mode, emergency: ev.emergency }));
        if (ev.type === "delta") updateLast((a) => ({ ...a, content: a.content + ev.content }));
        if (ev.type === "error") updateLast((a) => ({ ...a, error: ev.message }));
        if (ev.type === "done") updateLast((a) => ({ ...a, pending: false }));
      });
    } catch (err) {
      updateLast((a) => ({ ...a, error: err.message || "Unable to reach the assistant." }));
    } finally {
      updateLast((a) => ({ ...a, pending: false }));
      setBusy(false);
    }
  };

  const clear = async () => {
    try {
      await api.delete("/ai/history");
      setMessages([]);
      toast.success("Conversation cleared");
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  if (!messages) return <PageLoader />;
  const demo = status?.mode !== "live";

  return (
    <>
      <PageHeader eyebrow="AI healthcare assistant" title="Ask about your health, in plain language"
        action={
          <div className="flex items-center gap-2">
            <span data-testid="ai-mode-indicator" className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${demo ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-teal-50 text-teal-700 ring-teal-200"}`}>
              <Sparkles className="h-3.5 w-3.5" /> {demo ? "Demo mode - no AI key configured" : `Live AI · ${status.model}`}
            </span>
            <Button data-testid="ai-clear-history-button" variant="outline" size="sm" onClick={clear} disabled={busy || messages.length === 0} className="rounded-full"><Trash2 className="mr-1.5 h-4 w-4" />Clear</Button>
          </div>
        } />

      <div data-testid="ai-disclaimer-banner" className="flex items-start gap-3 rounded-r-xl border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>This assistant provides general health education only. It does not diagnose conditions or prescribe medicines and is not a substitute for professional medical advice. For urgent symptoms, call your local emergency number immediately.</p>
      </div>

      <div className="card-surface flex h-[calc(100vh-22rem)] min-h-[420px] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5" data-testid="ai-chat-messages">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-teal-100 text-blue-800"><Bot className="h-7 w-7" /></div>
              <p className="mt-4 font-heading font-semibold text-slate-900">How can I help you today?</p>
              <div className="mt-5 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <button key={s} data-testid={`ai-suggestion-${i}`} onClick={() => send(s)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-teal-400 hover:text-teal-800">{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) => m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-blue-700 px-4 py-3 text-sm text-white shadow-sm" data-testid="ai-message-user">{m.content}</div>
          ) : (
            <div key={m.id} className="flex max-w-[88%] gap-3" data-testid="ai-message-assistant">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Bot className="h-4 w-4" /></div>
              <div className={`rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-relaxed text-slate-800 ${m.emergency ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                {m.content ? <RichText text={m.content} /> : m.pending && !m.error && <Spinner className="h-4 w-4 text-teal-700" />}
                {m.error && <p data-testid="ai-error-message" className="mt-2 flex items-center gap-1.5 text-red-700"><AlertTriangle className="h-4 w-4" />{m.error}</p>}
                {m.mode === "demo" && !m.pending && <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">Demo response</p>}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-3 border-t border-slate-200 p-4">
          <Textarea data-testid="ai-chat-input-field" rows={1} maxLength={2000} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask a health question..." className="max-h-32 min-h-[44px] resize-none" />
          <Button type="submit" data-testid="ai-chat-send-button" disabled={busy || !input.trim()} className="h-11 rounded-full bg-blue-800 px-5 hover:bg-blue-700">
            {busy ? <Spinner className="h-4 w-4" /> : <SendHorizontal className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </>
  );
}
