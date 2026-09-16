import React, { useState, useRef, useEffect } from 'react';
import { askAssistant } from '../api';
import { AssistantMessage } from '../types';
import {
  HelpCircle,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Heart,
  Loader2
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrderId?: string;
  onTrackOrder?: (orderId: string) => void;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  currentOrderId,
  onTrackOrder
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content:
        'Hello! I am CozyCup\'s AI Support Assistant. Please note that the visual order form is our primary method for placing orders — you can click "Place Order" on any product card in the catalogue to begin. I am here as a supporting assistant to answer questions about handmade crochet items, beaded charm bracelets, current stock & prices from our database, FNB bank transfer steps, lead times, or POPIA privacy.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestions: [
        'What products do you offer?',
        'How do I pay via FNB transfer?',
        'What are the lead times for handmade items?',
        'Can I cancel an order?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await askAssistant(query, currentOrderId);
      const botMsg: AssistantMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestions: res.suggestions
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: AssistantMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content:
          'Sorry, I encountered a temporary connection issue. Please check the catalogue or tracker directly, or try asking again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-[#EDE7F8] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[#EDE7F8] bg-[#F8F6FC] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#EDE7F8] text-[#6B4FA1] flex items-center justify-center font-bold">
            <Heart className="w-4 h-4 fill-[#B9A7E8] text-[#6B4FA1]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-[#302A38]">CozyCup AI Assistant</h3>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#EDE7F8] text-[#6B4FA1] border border-[#B9A7E8]/40">AI</span>
            </div>
            <p className="text-[10px] text-[#6B4FA1]">Supporting boutique guide • Live DB-connected</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-[#302A38]/50 hover:text-[#302A38] hover:bg-[#EDE7F8] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#6B4FA1] text-white rounded-br-none shadow-xs'
                  : 'bg-[#F8F6FC] text-[#302A38] border border-[#EDE7F8] rounded-bl-none shadow-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <span
                className={`text-[9px] block mt-1 ${
                  m.role === 'user' ? 'text-white/70' : 'text-[#302A38]/40'
                }`}
              >
                {m.timestamp}
              </span>
            </div>

            {/* Suggestions Chips */}
            {m.suggestions && m.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                {m.suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s)}
                    className="text-[11px] font-semibold text-[#6B4FA1] bg-[#EDE7F8] hover:bg-[#B9A7E8]/40 border border-[#B9A7E8]/30 px-2.5 py-1 rounded-full transition text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-[#F8F6FC] rounded-2xl border border-[#EDE7F8] max-w-[75%] text-xs text-[#6B4FA1]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Consulting CozyCup policies...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-[#EDE7F8] bg-[#F8F6FC] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about products or orders..."
          className="flex-1 bg-white border border-[#EDE7F8] focus:border-[#6B4FA1] rounded-xl px-3 py-2 text-xs text-[#302A38] focus:outline-none"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 bg-[#6B4FA1] hover:bg-[#6B4FA1]/90 text-white rounded-xl disabled:opacity-40 transition"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
