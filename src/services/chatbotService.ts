import { Chat, ChatMessage } from '@/types';

// Resolves the API URL dynamically, checking localStorage first, then env, then default
const getBaseUrl = (): string => {
  return localStorage.getItem('chatbot_api_url') || import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000';
};

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export const chatbotService = {
  /**
   * Obtiene la lista de todas las conversaciones.
   */
  async getChats(): Promise<Chat[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/chats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.chats)) {
        return data.chats;
      }
      throw new Error(data.message || 'Respuesta no válida del servidor.');
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  },

  /**
   * Obtiene el historial de mensajes de un chat específico.
   * @param sessionId Número de teléfono o identificador de sesión del cliente
   */
  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${getBaseUrl()}/chats/${sessionId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === 'success' && Array.isArray(data.messages)) {
        return data.messages;
      }
      throw new Error(data.message || 'Respuesta no válida del servidor.');
    } catch (error) {
      console.error(`Error fetching messages for session ${sessionId}:`, error);
      throw error;
    }
  },

  /**
   * Activa o desactiva la respuesta automática de la IA (Toggle AI)
   * @param sessionId Número de teléfono del cliente
   * @param aiEnabled Nuevo estado de la IA
   */
  async toggleAi(sessionId: string, aiEnabled: boolean): Promise<{ ai_enabled: boolean; message: string }> {
    try {
      const response = await fetch(`${getBaseUrl()}/chats/${sessionId}/toggle-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ai_enabled: aiEnabled }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        return {
          ai_enabled: data.ai_enabled,
          message: data.message || `IA ${aiEnabled ? 'activada' : 'desactivada'} correctamente.`,
        };
      }
      throw new Error(data.message || 'Respuesta no válida del servidor.');
    } catch (error) {
      console.error(`Error toggling AI for session ${sessionId}:`, error);
      throw error;
    }
  },

  /**
   * Envía un mensaje manual (Respuesta Humana) al cliente
   * @param sessionId Número de teléfono del cliente
   * @param message Contenido del mensaje a enviar
   */
  async sendManualMessage(sessionId: string, message: string): Promise<{ message: string; sent_text: string }> {
    try {
      const response = await fetch(`${getBaseUrl()}/chats/${sessionId}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        return {
          message: data.message,
          sent_text: data.sent_text || message,
        };
      }
      throw new Error(data.message || 'Respuesta no válida del servidor.');
    } catch (error) {
      console.error(`Error sending message to session ${sessionId}:`, error);
      throw error;
    }
  },
};

