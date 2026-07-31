import React from 'react';
import { 
  MessageSquare, 
  Sparkles, 
  UserCheck, 
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiStatus } from '../hooks/useChatBot';

interface ChatPlaceholderProps {
  chatbot: {
    apiStatus: ApiStatus;
    tempApiUrl: string;
    setTempApiUrl: React.Dispatch<React.SetStateAction<string>>;
    handleSaveApiUrl: () => void;
    fetchChats: (showLoading?: boolean) => Promise<void>;
  };
}

export function ChatPlaceholder({ chatbot }: ChatPlaceholderProps) {
  const {
    apiStatus,
    tempApiUrl,
    setTempApiUrl,
    handleSaveApiUrl,
    fetchChats
  } = chatbot;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-muted/5">
      <div className="max-w-md flex flex-col items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2">
          <MessageSquare className="h-8 w-8" />
        </div>
        
        <h2 className="text-xl font-bold text-foreground">Bandeja de Entrada del Bot</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona una conversación del listado de la izquierda para ver el historial completo de la interacción de la IA con el cliente.
        </p>
        
        <div className="grid grid-cols-2 gap-4 w-full mt-4 text-left">
          <div className="p-3 border border-border bg-card rounded-lg flex gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-xs text-foreground">Toggle IA</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">Activa o desactiva la respuesta automática de la IA por cliente para atención directa humana.</p>
            </div>
          </div>
          <div className="p-3 border border-border bg-card rounded-lg flex gap-3">
            <UserCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-xs text-foreground">Inyección de Memoria</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-normal">Tus respuestas manuales se inyectan en LangGraph para que la IA conserve el contexto al reactivarse.</p>
            </div>
          </div>
        </div>

        {/* Mini settings form directly visible for convenience if API is offline */}
        {apiStatus === 'offline' && (
          <div className="mt-8 p-4 border border-destructive/20 bg-destructive/5 rounded-lg w-full text-left">
            <h4 className="font-bold text-xs text-destructive flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-4 w-4" /> Configuración de conexión requerida
            </h4>
            <p className="text-xs text-muted-foreground mb-3 font-normal">
              La API del chatbot no está respondiendo en la URL actual. Si el bot está corriendo en un puerto diferente, cámbialo a continuación:
            </p>
            <div className="flex gap-2">
              <Input 
                value={tempApiUrl}
                onChange={(e) => setTempApiUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="h-8 text-xs bg-background"
              />
              <Button size="sm" className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={handleSaveApiUrl}>
                Guardar
              </Button>
            </div>
            <Button 
              size="sm" 
              variant="link" 
              className="p-0 h-auto mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
              onClick={() => fetchChats(true)}
            >
              Probar conexión nuevamente
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
