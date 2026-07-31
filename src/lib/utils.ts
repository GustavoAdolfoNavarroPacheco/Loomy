import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Detecta ids de elementos duplicados según una clave normalizada (p. ej. NIT o nombre).
// Claves vacías se ignoran (no se consideran duplicadas entre sí).
export function findDuplicateIds<T extends { id: string }>(items: T[], keyFn: (item: T) => string): Set<string> {
  const groups = new Map<string, string[]>();
  items.forEach(item => {
    // keyFn puede devolver undefined/null si el registro es antiguo y le falta el campo; nunca asumir que es un string.
    const key = (keyFn(item) ?? '').toString().trim().toLowerCase();
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), item.id]);
  });
  const duplicateIds = new Set<string>();
  groups.forEach(ids => {
    if (ids.length > 1) ids.forEach(id => duplicateIds.add(id));
  });
  return duplicateIds;
}

// Comprueba si `value` ya existe (normalizado) en otro elemento de la lista, excluyendo el propio registro al editar.
export function isDuplicateValue<T extends { id: string }>(
  items: T[],
  keyFn: (item: T) => string,
  value: string,
  excludeId?: string
): boolean {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  return items.some(item => {
    if (item.id === excludeId) return false;
    // Igual que arriba: nunca asumir que keyFn(item) es un string no vacío.
    return (keyFn(item) ?? '').toString().trim().toLowerCase() === normalized;
  });
}
