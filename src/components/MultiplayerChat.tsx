import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronDown, ChevronUp, Smile, Users, Radio } from 'lucide-react';
import { ChatMessage, EmoteType, RemotePlayerData } from '../types';

interface MultiplayerChatProps {
  messages: ChatMessage[];
  onlinePlayers: RemotePlayerData[];
  connected: boolean;
  ping: number;
  onSendMessage: (text: string) => void;
  onTriggerEmote: (emote: EmoteType) => void;
  onOpenPlayerList: () => void;
}

export const MultiplayerChat: React.FC<MultiplayerChatProps> = ({
  messages,
  onlinePlayers,
  connected,
  ping,
  onSendMessage,
  onTriggerEmote,
  onOpenPlayerList,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [inputText, setInputText] = useState('');
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const emotes: { type: EmoteType; label: string; icon: string }[] = [
    { type: 'wave', label: 'Winken', icon: '👋' },
    { type: 'cheer', label: 'Jubeln', icon: '🙌' },
    { type: 'dance', label: 'Tanzen', icon: '💃' },
    { type: 'highfive', label: 'High-Five', icon: '✋' },
  ];

  return (
    <div className="flex flex-col gap-1 pointer-events-auto max-w-sm w-80 text-sm select-none">
      {/* Network Status & Friends Bar */}
      <div className="flex items-center justify-between bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-bold text-slate-200">
            {connected ? `Multiplayer (${ping}ms)` : 'Offline (Verbinde...)'}
          </span>
        </div>

        <button
          onClick={onOpenPlayerList}
          id="chat-player-list-btn"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-xs font-bold text-blue-300 hover:text-white transition-colors cursor-pointer"
          title="Spielerliste ansehen"
        >
          <Users className="w-3.5 h-3.5" />
          <span>{onlinePlayers.length + 1} Spieler</span>
        </button>
      </div>

      {/* Main Chat Box */}
      <div className="bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-700/80 shadow-xl overflow-hidden flex flex-col transition-all">
        {/* Chat header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Server-Chat</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowEmotePicker(!showEmotePicker)}
              className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-700/60 cursor-pointer transition-colors"
              title="Emotes & Gesten"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer transition-colors"
              title={isExpanded ? 'Chat einklappen' : 'Chat ausklappen'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Quick Emotes Drawer */}
        {showEmotePicker && (
          <div className="grid grid-cols-4 gap-1 p-2 bg-slate-800/90 border-b border-slate-700/60 animate-in fade-in">
            {emotes.map(em => (
              <button
                key={em.type}
                onClick={() => {
                  onTriggerEmote(em.type);
                  setShowEmotePicker(false);
                }}
                className="flex flex-col items-center p-1.5 rounded-lg bg-slate-700 hover:bg-amber-600/30 hover:border-amber-400 border border-slate-600 text-slate-200 transition-transform active:scale-95 cursor-pointer"
              >
                <span className="text-xl">{em.icon}</span>
                <span className="text-[10px] font-bold mt-0.5">{em.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Message Log */}
        {isExpanded && (
          <>
            <div className="h-36 overflow-y-auto p-2.5 flex flex-col gap-1.5 text-xs font-medium scrollbar-thin scrollbar-thumb-slate-700">
              {messages.length === 0 ? (
                <div className="text-slate-500 italic text-center py-6">
                  Willkommen! Schreibe mit anderen Spielern auf dem Server.
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className="leading-relaxed break-words">
                    {msg.isSystem ? (
                      <span className="text-amber-300 font-semibold italic bg-amber-950/40 px-1.5 py-0.5 rounded">
                        📢 {msg.text}
                      </span>
                    ) : (
                      <>
                        <span className="font-bold text-blue-400 mr-1.5">[{msg.senderName}]:</span>
                        <span className="text-slate-200">{msg.text}</span>
                      </>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="flex items-center gap-1.5 p-1.5 bg-slate-950/70 border-t border-slate-800">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Nachricht tippen..."
                maxLength={120}
                className="flex-1 bg-slate-800 text-white placeholder-slate-400 px-2.5 py-1 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 border border-slate-700"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg text-white transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
