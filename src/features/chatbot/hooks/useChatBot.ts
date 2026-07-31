import { useState, useEffect, useRef } from 'react';
import { chatbotService } from '@/services/chatbotService';
import { Chat, ChatMessage } from '@/types';
import { toast } from 'sonner';

export type ApiStatus = 'checking' | 'online' | 'offline';

export function useChatBot() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  
  // Loading and action states
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isTogglingAi, setIsTogglingAi] = useState(false);
  
  // API Config state
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('chatbot_api_url') || import.meta.env.VITE_CHATBOT_API_URL || 'http://localhost:8000';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    wasNearBottomRef.current = distanceToBottom < 150;
  };


  // Fetch chats list
  const fetchChats = async (showLoading = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setApiStatus('offline');
      if (showLoading) setIsLoadingChats(false);
      return;
    }
    if (showLoading) setIsLoadingChats(true);
    try {
      const data = await chatbotService.getChats();
      setChats(data);
      setApiStatus('online');
      
      // Update selected chat if it exists to keep its state fresh
      if (selectedChat) {
        const updatedSelected = data.find(c => c.sessionId === selectedChat.sessionId);
        if (updatedSelected) {
          setSelectedChat(updatedSelected);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
      setApiStatus('offline');
    } finally {
      if (showLoading) setIsLoadingChats(false);
    }
  };

  // Fetch messages for active chat
  const fetchMessages = async (sessionId: string, showLoading = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (showLoading) setIsLoadingMessages(false);
      return;
    }
    if (showLoading) setIsLoadingMessages(true);
    try {
      const data = await chatbotService.getChatMessages(sessionId);
      setMessages(data);
    } catch (error) {
      console.error(`Error loading messages for ${sessionId}:`, error);
      toast.error('No se pudo cargar el historial de mensajes.');
    } finally {
      if (showLoading) setIsLoadingMessages(false);
    }
  };

  // Test API connection on mount/URL change
  useEffect(() => {
    const testConnection = async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setApiStatus('offline');
        return;
      }
      setApiStatus('checking');
      try {
        await chatbotService.getChats();
        setApiStatus('online');
      } catch (e) {
        setApiStatus('offline');
      }
    };
    testConnection();
  }, [apiUrl]);

  // Listen to browser network changes to immediately retry/refetch
  useEffect(() => {
    const handleOnline = () => {
      fetchChats(true);
      if (selectedChat) {
        fetchMessages(selectedChat.sessionId, true);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [selectedChat?.sessionId, apiUrl]);

  // Initial load
  useEffect(() => {
    fetchChats(true);
  }, [apiUrl]);

  // Periodic polling for chats (every 8 seconds)
  useEffect(() => {
    const chatsInterval = setInterval(() => {
      fetchChats(false);
    }, 8000);
    return () => clearInterval(chatsInterval);
  }, [selectedChat, apiUrl]);

  // Periodic polling for messages in active chat (every 4 seconds)
  useEffect(() => {
    if (!selectedChat) return;
    
    // Initial fetch on select
    fetchMessages(selectedChat.sessionId, false);

    const messagesInterval = setInterval(() => {
      fetchMessages(selectedChat.sessionId, false);
    }, 4000);

    return () => clearInterval(messagesInterval);
  }, [selectedChat?.sessionId, apiUrl]);

  // Scroll to bottom when messages load or change if user was near the bottom
  useEffect(() => {
    if (wasNearBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages]);

  // Handle selected chat change
  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    wasNearBottomRef.current = true;
    fetchMessages(chat.sessionId, true);
  };

  // Save custom API URL
  const handleSaveApiUrl = () => {
    let cleanUrl = tempApiUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    localStorage.setItem('chatbot_api_url', cleanUrl);
    setApiUrl(cleanUrl);
    setShowSettings(false);
    toast.success(`URL de API actualizada: ${cleanUrl}`);
  };

  // Toggle IA responding state
  const handleToggleAi = async (chat: Chat) => {
    setIsTogglingAi(true);
    const targetState = !chat.ai_enabled;
    try {
      const response = await chatbotService.toggleAi(chat.sessionId, targetState);
      
      // Update local state
      const updatedChat = { ...chat, ai_enabled: response.ai_enabled };
      setSelectedChat(updatedChat);
      setChats(prev => prev.map(c => c.sessionId === chat.sessionId ? updatedChat : c));
      
      toast.success(response.message);
    } catch (e) {
      toast.error('No se pudo cambiar el estado de la IA.');
    } finally {
      setIsTogglingAi(false);
    }
  };

  // Send human manual message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !messageInput.trim() || isSendingMessage) return;

    const currentMsg = messageInput.trim();
    setMessageInput('');
    setIsSendingMessage(true);

    // Optimistically add message to UI
    const tempMessage: ChatMessage = {
      sender: 'human',
      text: currentMsg,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);
    
    // Force scroll to bottom for user's own sent message
    wasNearBottomRef.current = true;
    scrollToBottom('smooth');

    try {
      await chatbotService.sendManualMessage(selectedChat.sessionId, currentMsg);
      // Re-fetch messages to sync with server/firestore timestamps
      fetchMessages(selectedChat.sessionId, false);
    } catch (e) {
      toast.error('No se pudo enviar el mensaje.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m !== tempMessage));
      setMessageInput(currentMsg); // Restore text
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Handle keyboard shortcut (Enter to send, Shift+Enter to newline)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  // Filter conversations
  const filteredChats = chats.filter(chat => {
    const query = searchQuery.toLowerCase();
    return (
      chat.sessionId.toLowerCase().includes(query) ||
      (chat.clientName && chat.clientName.toLowerCase().includes(query)) ||
      chat.lastMessage.toLowerCase().includes(query)
    );
  });

  // Stats calculation
  const totalChats = chats.length;
  const aiEnabledCount = chats.filter(c => c.ai_enabled).length;
  const humanControlCount = totalChats - aiEnabledCount;

  return {
    chats,
    selectedChat,
    messages,
    searchQuery,
    setSearchQuery,
    messageInput,
    setMessageInput,
    isLoadingChats,
    isLoadingMessages,
    isSendingMessage,
    isTogglingAi,
    apiUrl,
    showSettings,
    setShowSettings,
    tempApiUrl,
    setTempApiUrl,
    apiStatus,
    messagesEndRef,
    scrollContainerRef,
    filteredChats,
    totalChats,
    aiEnabledCount,
    humanControlCount,
    fetchChats,
    fetchMessages,
    handleSelectChat,
    handleSaveApiUrl,
    handleToggleAi,
    handleSendMessage,
    handleKeyPress,
    scrollToBottom,
    handleScroll
  };
}
