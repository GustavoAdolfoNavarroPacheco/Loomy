/**
 * Formatea un string de fecha en formato de hora de chat.
 * Si es hoy, muestra la hora. Si es otro día, muestra mes, día y hora.
 */
export const formatTime = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();
                    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (isToday) {
      return timeStr;
    } else {
      const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${monthDay} ${timeStr}`;
    }
  } catch (e) {
    return '';
  }
};

/**
 * Obtiene las iniciales de un nombre (ej. "Juan Perez" -> "JP").
 * Si no hay nombre, utiliza un fallback.
 */
export const getInitials = (name?: string, fallback = ''): string => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
