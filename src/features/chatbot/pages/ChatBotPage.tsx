import React from 'react';
import { useChatBot } from '../hooks/useChatBot';
import { ChatSidebar } from '../components/ChatSidebar';
import { ChatWindow } from '../components/ChatWindow';
import { ChatPlaceholder } from '../components/ChatPlaceholder';
import { useData } from '@/contexts/DataContext';
import { Navigate } from 'react-router-dom';

export default function ChatBotPage() {
  const { environment } = useData();
  const chatbot = useChatBot();

  if (environment !== 'local') {
    return <Navigate to="/empresas" replace />;
  }

  return (
    <div className="h-[calc(100vh-130px)] md:h-[calc(100vh-100px)] flex border border-border bg-card rounded-xl overflow-hidden shadow-sm">
      {/* 1. SIDEBAR: Chat list, search, and configuration */}
      <ChatSidebar chatbot={chatbot} />

      {/* 2. CHAT WINDOW: Message History or Placeholder screen */}
      {chatbot.selectedChat ? (
        <ChatWindow chatbot={chatbot} />
      ) : (
        <ChatPlaceholder chatbot={chatbot} />
      )}
    </div>
  );
}
