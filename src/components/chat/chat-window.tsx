'use client';

import { useState } from 'react';
import type { AgentResponse, PendingToolAction } from '@/types/agent';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function postChat(body: {
  message?: string;
  confirmedAction?: PendingToolAction;
}): Promise<{ status: number; data: AgentResponse | { error: unknown } }> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

export function ChatWindow() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingToolAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState(false);

  async function send(body: { message?: string; confirmedAction?: PendingToolAction }) {
    setBusy(true);
    setAuthError(false);
    try {
      const { status, data } = await postChat(body);

      if (status === 401) {
        setAuthError(true);
        return;
      }

      if (status >= 400 || !('message' in data)) {
        const errorText = 'error' in data ? JSON.stringify(data.error) : 'Request failed';
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${errorText}` }]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      setPendingAction(data.requiresConfirmation && data.pendingAction ? data.pendingAction : null);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    void send({ message });
  }

  function handleConfirm() {
    if (!pendingAction) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: `[confirmed: ${pendingAction.tool}]` },
    ]);
    void send({ confirmedAction: pendingAction });
  }

  function handleCancel() {
    setPendingAction(null);
    setMessages((prev) => [...prev, { role: 'user', content: '[cancelled pending action]' }]);
  }

  return (
    <div className="mx-auto flex h-[80vh] w-full max-w-2xl flex-col gap-4">
      {authError && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Not authenticated with Instamart.{' '}
          <a href="/api/instamart/auth/login" className="underline">
            Log in
          </a>{' '}
          then try again.
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded border p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={
                'inline-block max-w-[80%] whitespace-pre-wrap rounded px-3 py-2 text-sm ' +
                (m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900')
              }
            >
              {m.content}
            </span>
          </div>
        ))}
        {busy && <div className="text-sm text-gray-400">Thinking…</div>}
      </div>

      {pendingAction && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <div className="mb-2 font-medium">
            Confirm action: <code>{pendingAction.tool}</code>
          </div>
          <pre className="mb-2 overflow-x-auto text-xs">
            {JSON.stringify(pendingAction.arguments, null, 2)}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="rounded bg-green-600 px-3 py-1 text-white"
            >
              Confirm
            </button>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="rounded bg-gray-300 px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Plan a movie night for 4 people under ₹1200…"
          className="flex-1 rounded border px-3 py-2 text-sm"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
