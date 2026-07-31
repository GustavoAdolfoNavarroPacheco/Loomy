import React from 'react';
import { 
  ToggleRight, 
  ToggleLeft, 
  Sparkles, 
  Bot, 
  User, 
  CheckCheck, 
  AlertCircle, 
  RefreshCw, 
  Send
} from 'lucide-react';
import { Chat, ChatMessage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatTime, getInitials } from '../utils/chatHelpers';

interface ChatWindowProps {
  chatbot: {
    selectedChat: Chat | null;
    messages: ChatMessage[];
    messageInput: string;
    setMessageInput: React.Dispatch<React.SetStateAction<string>>;
    isLoadingMessages: boolean;
    isSendingMessage: boolean;
    isTogglingAi: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement>;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    handleToggleAi: (chat: Chat) => Promise<void>;
    handleSendMessage: (e: React.FormEvent) => Promise<void>;
    handleKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
}

export function ChatWindow({ chatbot }: ChatWindowProps) {
  const {
    selectedChat,
    messages,
    messageInput,
    setMessageInput,
    isLoadingMessages,
    isSendingMessage,
    isTogglingAi,
    messagesEndRef,
    scrollContainerRef,
    handleToggleAi,
    handleSendMessage,
    handleKeyPress,
    handleScroll
  } = chatbot;

  if (!selectedChat) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/5 relative">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card flex flex-row items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-xs shadow-sm">
            {getInitials(selectedChat.clientName, selectedChat.sessionId.slice(-2))}
          </div>
          <div>
            <h2 className="font-bold text-sm text-foreground">
              {selectedChat.clientName || `+${selectedChat.sessionId}`}
            </h2>
            {selectedChat.clientName && (
              <p className="text-xs text-[11px] text-muted-foreground">+{selectedChat.sessionId}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block h-2 w-2 rounded-full ${selectedChat.ai_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] text-muted-foreground">
                {selectedChat.ai_enabled ? 'Respuesta Automática (IA)' : 'Control Manual (IA Desactivada)'}
              </span>
            </div>
          </div>
        </div>

        {/* Toggle AI Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            {selectedChat.ai_enabled ? 'Pausar IA' : 'Activar IA'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted/80 text-foreground"
            disabled={isTogglingAi}
            onClick={() => handleToggleAi(selectedChat)}
            title={selectedChat.ai_enabled ? "Desactivar respuesta automática de la IA" : "Activar respuesta automática de la IA"}
          >
            {selectedChat.ai_enabled ? (
              <ToggleRight className="h-7 w-7 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Message Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 bg-[#efeae2] dark:bg-[#0b141a] relative"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        <div className="flex flex-col gap-3 min-h-full justify-end">
          {/* Security/Notice Message */}
          <div className="self-center bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 text-[10px] text-center max-w-sm px-3 py-1.5 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-900/30 flex flex-col gap-1 mb-2">
            <span className="font-semibold flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3" /> CONTEXTO DE CONVERSACIÓN
            </span>
            Los mensajes enviados de forma manual se inyectan en la memoria del bot. Si reactivas la IA, tendrá en cuenta lo que respondiste.
          </div>

          {isLoadingMessages && messages.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-xs flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
              Cargando historial...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground text-xs">
              Sin mensajes en esta sesión. Comienza enviando un mensaje manual abajo.
            </div>
          ) : (
            messages.map((msg, index) => {
              const isClient = msg.sender === 'client';
              const isBot = msg.sender === 'bot';
              const isHuman = msg.sender === 'human' || msg.sender === 'agent';

              return (
                <div
                  key={index}
                  className={`flex flex-col max-w-[80%] ${
                    isClient 
                      ? 'self-start' 
                      : 'self-end'
                  }`}
                >
                  {/* Bubble */}
                  <div
                    className={`px-3 py-2 rounded-xl text-sm shadow-sm relative ${
                      isClient
                        ? 'bg-white dark:bg-zinc-800 text-foreground rounded-tl-none border border-zinc-200/50 dark:border-zinc-700/50'
                        : isBot
                        ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-none border border-[#e1fbc4]/30 dark:border-[#027558]/30'
                        : 'bg-blue-100 dark:bg-blue-950/80 text-foreground rounded-tr-none border border-blue-200 dark:border-blue-900/20'
                    }`}
                  >
                    {/* Sender Label */}
                    <div className="text-[9px] font-bold opacity-65 mb-0.5 uppercase tracking-wide flex items-center gap-1 justify-between">
                      {isClient && (
                        <span className="text-slate-600 dark:text-slate-400">Cliente</span>
                      )}
                      {isBot && (
                        <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-0.5">
                          <Bot className="h-2 w-2" /> Bot (IA)
                        </span>
                      )}
                      {isHuman && (
                        <span className="text-blue-700 dark:text-blue-300 flex items-center gap-0.5">
                          <User className="h-2 w-2" /> Soporte Humano
                        </span>
                      )}
                    </div>

                    {/* Message Text */}
                    <p className="whitespace-pre-wrap leading-relaxed text-sm break-words pr-2">
                      {msg.text}
                    </p>

                    {/* Message Time and status check */}
                    <div className="text-[9px] text-muted-foreground text-right mt-1 opacity-75 flex items-center justify-end gap-1">
                      <span>{formatTime(msg.timestamp)}</span>
                      {!isClient && (
                        <CheckCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Warning advisory when AI is active */}
      {selectedChat.ai_enabled && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 text-xs flex items-center gap-2 border-t border-amber-100 dark:border-amber-900/20">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="flex-1">
            <strong>La IA está respondiendo automáticamente:</strong> Se recomienda pausar la IA (botón en cabecera) antes de enviar un mensaje para evitar respuestas simultáneas o confusas del bot.
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-6 px-2 text-[10px] border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 shrink-0"
            onClick={() => handleToggleAi(selectedChat)}
            disabled={isTogglingAi}
          >
            Pausar IA Ahora
          </Button>
        </div>
      )}

      {/* Input area */}
      <form 
        onSubmit={handleSendMessage}
        className="p-3 border-t border-border bg-card flex gap-2 items-center shrink-0"
      >
        <Input
          placeholder={selectedChat.ai_enabled ? "Desactiva la IA para enviar un mensaje manual..." : "Escribe un mensaje manual..."}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={isSendingMessage || selectedChat.ai_enabled}
          className="flex-1 bg-muted/40 border-border focus-visible:ring-emerald-600"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!messageInput.trim() || isSendingMessage || selectedChat.ai_enabled}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-9 w-9 rounded-full"
          title="Enviar mensaje manual"
        >
          {isSendingMessage ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 pl-0.5" />
          )}
        </Button>
      </form>
    </div>
  );
}
