import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Plus, Clock, Trash2, Send, MessageSquare } from 'lucide-react';
import { ModelChip } from '@/components/model/ModelChip';
import { useChat, type ChatMessage } from '@/hooks/useChat';
import type { ModelVariantsConfig } from '@/types/models';

interface ChatSessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  provider: string;
  model: string;
  messageCount: number;
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <div className={`flex flex-col gap-1 max-w-[85%] group ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
      <div
        className={`px-5 py-3 rounded-xl text-sm leading-relaxed break-words select-text ${
          isUser
            ? 'bg-[rgba(216,131,10,0.15)] border border-[rgba(216,131,10,0.2)] rounded-br-sm'
            : 'bg-[rgba(235,231,199,0.05)] border border-[rgba(235,231,199,0.08)] rounded-bl-sm'
        }`}
        style={{ overflowWrap: 'anywhere', color: 'var(--jf-cream)' }}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : message.content ? (
          <div className="chat-markdown prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <span className="animate-pulse" style={{ color: 'var(--text-secondary)' }}>Thinking...</span>
        )}
      </div>
      <div className="flex justify-end w-full px-2">
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-md"
          style={{ color: copied ? '#4ade80' : 'var(--text-secondary)' }}
          title="Copy to clipboard"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

export function ChatCard() {
  const [selectedProvider, setSelectedProvider] = useState('claude');
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-6');
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, append, isLoading, clearMessages, loadMessages, retrievalMethod } = useChat([], {
    model: selectedModel,
    provider: selectedProvider,
    sessionId,
  });

  // Fetch providers on mount to seed localStorage
  useEffect(() => {
    fetch('/api/intake/providers')
      .then(r => r.json())
      .then((list: Array<{ id: string; name: string; defaultModel: string; variants: Array<{ id: string; name: string; description?: string }> }>) => {
        if (list.length === 0) return;
        const config: ModelVariantsConfig = {
          providers: Object.fromEntries(
            list.map(p => [p.id, { display_name: p.name, default_variant: p.defaultModel, variants: p.variants }])
          ),
        };
        localStorage.setItem('model_variants_config', JSON.stringify(config));
        window.dispatchEvent(new StorageEvent('storage', { key: 'model_variants_config' }));
        if (!list.find(p => p.id === 'claude')) {
          setSelectedProvider(list[0].id);
          setSelectedModel(list[0].defaultModel);
        }
      })
      .catch(() => {});
  }, []);

  // Load sessions
  const loadSessions = useCallback(() => {
    fetch('/api/chat/sessions')
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {});
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  // Auto-scroll within messages container only (never scroll the page)
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [inputValue]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    // Create session if none exists
    let sid = sessionId;
    if (!sid) {
      try {
        const res = await fetch('/api/chat/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: selectedProvider, model: selectedModel }),
        });
        const data = await res.json();
        sid = data.id;
        setSessionId(sid);
      } catch { /* proceed without session persistence */ }
    }

    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await append(text);
    loadSessions();
  };

  const handleNewChat = () => {
    clearMessages();
    setSessionId(null);
    setInputValue('');
    setShowHistory(false);
  };

  const handleLoadSession = async (id: string) => {
    try {
      const res = await fetch(`/api/chat/session/${id}`);
      const session = await res.json();
      setSessionId(session.id);
      setSelectedProvider(session.provider);
      setSelectedModel(session.model);
      loadMessages(session.messages);
      setShowHistory(false);
    } catch { /* ignore */ }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/session/${id}`, { method: 'DELETE' });
    if (sessionId === id) handleNewChat();
    loadSessions();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="wiki-card" style={{ padding: '24px', marginBottom: '16px' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--jf-cream)' }}>
          Chat
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadSessions(); }}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
              background: showHistory ? 'rgba(201,207,233,0.1)' : 'transparent',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            <Clock size={13} />
            History
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 transition-colors"
            style={{
              padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            <Plus size={13} />
            New
          </button>
          <ModelChip
            provider={selectedProvider}
            model={selectedModel}
            variant={selectedModel}
            enableProviderSwitch
            onProviderChange={(provider) => {
              setSelectedProvider(provider);
              const configStr = localStorage.getItem('model_variants_config');
              if (configStr) {
                const config: ModelVariantsConfig = JSON.parse(configStr);
                const pc = config.providers[provider];
                if (pc) setSelectedModel(pc.default_variant);
              }
            }}
            onVariantChange={(variantId) => setSelectedModel(variantId)}
          />
        </div>
      </div>

      {/* Session History Panel */}
      {showHistory && (
        <div style={{
          marginBottom: '16px', padding: '12px', borderRadius: 'var(--radius-input)',
          background: 'var(--bg-surface-inset)', border: '1px solid var(--border-default)',
          maxHeight: '250px', overflowY: 'auto',
        }}>
          <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--jf-lavender)', fontWeight: 600, marginBottom: '10px' }}>
            Past Conversations
          </div>
          {sessions.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No conversations yet.</p>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => handleLoadSession(s.id)}
                className="flex items-center justify-between group/session"
                style={{
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  marginBottom: '4px', transition: 'background 0.15s',
                  background: sessionId === s.id ? 'rgba(216,131,10,0.1)' : 'transparent',
                }}
                onMouseEnter={e => { if (sessionId !== s.id) (e.currentTarget as HTMLElement).style.background = 'rgba(235,231,199,0.05)'; }}
                onMouseLeave={e => { if (sessionId !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                  <MessageSquare size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'var(--jf-cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {s.messageCount} msgs
                  </span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 group-hover/session:opacity-100 transition-opacity"
                  style={{ padding: '4px', color: 'var(--text-secondary)' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Empty state — centered prompt */}
      {messages.length === 0 && !showHistory && (
        <div className="flex flex-col items-center justify-center" style={{ padding: '40px 0 24px' }}>
          <MessageSquare size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3, marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
            Start a conversation about the knowledge base
          </p>
        </div>
      )}

      {/* Messages Area */}
      {messages.length > 0 && (
        <div
          ref={messagesContainerRef}
          style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '16px', padding: '12px 0' }}
          className="custom-scrollbar"
        >
          <div className="flex flex-col gap-4">
            {messages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      )}

      {/* Retrieval status indicator */}
      {retrievalMethod && retrievalMethod !== 'rag' && messages.length > 0 && (
        <div
          className="text-xs px-3 py-1.5 rounded-md mb-2"
          style={{
            color: retrievalMethod === 'local' ? 'var(--jf-gold)' : 'var(--text-secondary)',
            background: retrievalMethod === 'local' ? 'rgba(216,131,10,0.08)' : 'rgba(235,231,199,0.05)',
            border: `1px solid ${retrievalMethod === 'local' ? 'rgba(216,131,10,0.15)' : 'rgba(235,231,199,0.08)'}`,
          }}
        >
          {retrievalMethod === 'local' ? 'Using local KB search' : 'KB unavailable — response may be limited'}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about DTGO, its people, projects, or any knowledge base topic..."
          disabled={isLoading}
          rows={1}
          style={{
            flex: 1, padding: '12px 16px',
            background: 'var(--bg-input)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-input)', color: 'var(--text-primary)',
            fontSize: '14px', fontFamily: 'var(--font-sans)', lineHeight: 1.6,
            resize: 'none', outline: 'none', transition: 'border-color 0.2s',
            overflow: 'hidden',
          }}
          onFocus={e => (e.target.style.borderColor = 'rgba(201,207,233,0.3)')}
          onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          style={{
            padding: '12px 16px', borderRadius: 'var(--radius-input)',
            background: inputValue.trim() && !isLoading
              ? 'rgba(216, 131, 10, 0.15)'
              : 'var(--bg-surface-inset)',
            border: inputValue.trim() && !isLoading
              ? '1px solid rgba(216, 131, 10, 0.3)'
              : '1px solid var(--border-default)',
            color: inputValue.trim() && !isLoading ? 'var(--jf-cream)' : 'var(--text-secondary)',
            cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}
