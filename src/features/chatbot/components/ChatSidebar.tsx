import React from 'react';
import { 
  MessageSquare, 
  Search, 
  Sparkles, 
  User, 
  RefreshCw, 
  Settings, 
  AlertCircle,
  MessageCircle
} from 'lucide-react';
import { Chat } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatTime, getInitials } from '../utils/chatHelpers';
import { ApiStatus } from '../hooks/useChatBot';

interface ChatSidebarProps {
  chatbot: {
    chats: Chat[];
    selectedChat: Chat | null;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    isLoadingChats: boolean;
    apiUrl: string;
    showSettings: boolean;
    setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
    tempApiUrl: string;
    setTempApiUrl: React.Dispatch<React.SetStateAction<string>>;
    apiStatus: ApiStatus;
    filteredChats: Chat[];
    totalChats: number;
    aiEnabledCount: number;
    humanControlCount: number;
    fetchChats: (showLoading?: boolean) => Promise<void>;
    handleSelectChat: (chat: Chat) => void;
    handleSaveApiUrl: () => void;
  };
}

export function ChatSidebar({ chatbot }: ChatSidebarProps) {
  const {
    selectedChat,
    searchQuery,
    setSearchQuery,
    isLoadingChats,
    apiUrl,
    showSettings,
    setShowSettings,
    tempApiUrl,
    setTempApiUrl,
    apiStatus,
    filteredChats,
    totalChats,
    aiEnabledCount,
    humanControlCount,
    fetchChats,
    handleSelectChat,
    handleSaveApiUrl
  } = chatbot;

  return (
    <div className="w-full md:w-[360px] flex flex-col border-r border-border h-full bg-card shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-bold">ChatBot WhatsApp</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => fetchChats(true)}
            title="Actualizar chats"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 hover:text-foreground ${showSettings ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => {
              setTempApiUrl(apiUrl);
              setShowSettings(!showSettings);
            }}
            title="Configuración API"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* API Settings Section */}
      {showSettings && (
        <div className="p-3 border-b border-border bg-emerald-50/50 dark:bg-emerald-950/20 text-xs flex flex-col gap-2">
          <div className="font-semibold text-emerald-800 dark:text-emerald-400">Dirección del Servidor de Chat:</div>
          <div className="flex gap-2">
            <Input 
              value={tempApiUrl}
              onChange={(e) => setTempApiUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="h-8 text-xs bg-background"
            />
            <Button size="sm" className="h-8 px-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveApiUrl}>
              Guardar
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Define la URL base donde corre tu bot. Por defecto es <code className="bg-muted px-1 py-0.5 rounded">http://localhost:8000</code>.
          </p>
        </div>
      )}

      {/* Server Status Warning */}
      {apiStatus === 'offline' && (
        <div className="p-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <div className="flex-1">
            <strong>Servidor Desconectado</strong>
            <p className="text-[10px] opacity-90">No se pudo contactar a {apiUrl}. Enciende el backend BotWhatsApp.</p>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-6 px-1.5 text-[10px] border-destructive/30 hover:bg-destructive/15 text-destructive"
            onClick={() => fetchChats(true)}
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-1 p-2 border-b border-border bg-muted/10 text-center text-xs shrink-0">
        <div className="bg-card p-1 rounded border border-border">
          <div className="text-muted-foreground text-[10px]">Total</div>
          <div className="font-bold text-foreground text-sm">{totalChats}</div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-1 rounded border border-emerald-100 dark:border-emerald-900/40">
          <div className="text-emerald-700 dark:text-emerald-400 text-[10px] flex items-center justify-center gap-0.5">
            <Sparkles className="h-2.5 w-2.5" /> IA
          </div>
          <div className="font-bold text-emerald-800 dark:text-emerald-400 text-sm">{aiEnabledCount}</div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 p-1 rounded border border-amber-100 dark:border-amber-900/40">
          <div className="text-amber-700 dark:text-amber-400 text-[10px] flex items-center justify-center gap-0.5">
            <User className="h-2.5 w-2.5" /> Manual
          </div>
          <div className="font-bold text-amber-800 dark:text-amber-400 text-sm">{humanControlCount}</div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono o mensaje..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/40 border-border h-9 text-sm"
          />
        </div>
      </div>

      {/* Chat List Scrollable */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {isLoadingChats ? (
          <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
            <span>Cargando conversaciones...</span>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground/45" />
            <span>No se encontraron chats</span>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedChat?.sessionId === chat.sessionId;
            return (
              <div
                key={chat.sessionId}
                onClick={() => handleSelectChat(chat)}
                className={`p-3 flex items-start gap-3 cursor-pointer transition-colors duration-150 relative ${
                  isSelected 
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-l-4 border-emerald-600' 
                    : 'hover:bg-muted/30'
                }`}
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 font-bold text-xs uppercase shadow-sm">
                  {getInitials(chat.clientName, chat.sessionId.slice(-2))}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {chat.clientName || `+${chat.sessionId}`}
                    </span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatTime(chat.updatedAt)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground truncate mb-1">
                    {chat.lastSender === 'bot' && <span className="font-semibold text-emerald-600 dark:text-emerald-400">Bot: </span>}
                    {chat.lastSender === 'human' && <span className="font-semibold text-blue-600 dark:text-blue-400">Humano: </span>}
                    {chat.lastSender === 'client' && <span className="font-semibold text-foreground">Cliente: </span>}
                    {chat.lastMessage || 'Sin mensajes'}
                  </p>

                  {/* AI vs Human Control Badge */}
                  <div className="flex items-center gap-1">
                    {chat.ai_enabled ? (
                      <Badge variant="outline" className="h-4 text-[9px] px-1 bg-emerald-100/40 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30 flex items-center gap-0.5 font-normal">
                        <Sparkles className="h-2 w-2" /> IA Activa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="h-4 text-[9px] px-1 bg-amber-100/40 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/30 flex items-center gap-0.5 font-normal">
                        <User className="h-2 w-2" /> Control Humano
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
