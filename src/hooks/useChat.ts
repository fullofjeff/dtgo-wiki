import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatConfig {
  model?: string;
  provider?: string;
  sessionId?: string | null;
}

export type RetrievalMethod = 'rag' | 'local' | 'none' | null;

export function useChat(initialMessages: ChatMessage[] = [], config: ChatConfig = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [retrievalMethod, setRetrievalMethod] = useState<RetrievalMethod>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const configRef = useRef(config);
  const messagesRef = useRef<ChatMessage[]>(initialMessages);
  configRef.current = config;

  // Keep ref in sync with state
  const updateMessages = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages(prev => {
      const next = updater(prev);
      messagesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  const append = useCallback(async (content: string) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content };
    const assistantId = crypto.randomUUID();

    // Build the messages to send (current + new user message, no empty assistant placeholder)
    const messagesToSend = [...messagesRef.current, userMessage];

    // Update UI: add user message + empty assistant placeholder
    updateMessages(prev => [...prev, userMessage, { id: assistantId, role: 'assistant', content: '' }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          model: configRef.current.model,
          provider: configRef.current.provider || 'claude',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              if (data.meta) {
                setRetrievalMethod(data.meta.retrieval || 'none');
                continue;
              }
              if (data.error) {
                assistantContent = `Error: ${data.error}`;
                updateMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  updated[lastIdx] = { id: assistantId, role: 'assistant', content: assistantContent };
                  return updated;
                });
                break;
              }
              if (data.content) {
                assistantContent += data.content;
                updateMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  updated[lastIdx] = { id: assistantId, role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch {
              // JSON parse error — skip malformed chunk
            }
          }
        }
      }

      // Auto-save session if we have a sessionId
      if (configRef.current.sessionId) {
        const finalMessages = [...messagesToSend, { id: assistantId, role: 'assistant' as const, content: assistantContent }];
        fetch(`/api/chat/session/${configRef.current.sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: finalMessages,
            title: messagesToSend.find(m => m.role === 'user')?.content.slice(0, 60) || 'Chat',
          }),
        }).catch(() => {});
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Chat error:', error);
      // Remove the placeholder assistant message on error
      updateMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [updateMessages]);

  const clearMessages = useCallback(() => {
    abortControllerRef.current?.abort();
    messagesRef.current = [];
    setMessages([]);
    setIsLoading(false);
  }, []);

  const loadMessages = useCallback((msgs: ChatMessage[]) => {
    abortControllerRef.current?.abort();
    messagesRef.current = msgs;
    setMessages(msgs);
    setIsLoading(false);
  }, []);

  return { messages, append, isLoading, clearMessages, loadMessages, retrievalMethod };
}
