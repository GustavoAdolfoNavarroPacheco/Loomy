import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/CurrencyInput';

import { ArrowUpDown, ArrowUp, ArrowDown, Filter, Pencil, Trash2, CheckCircle2 } from 'lucide-react';
import { ColumnConfig } from '@/types';
import { cn } from '@/lib/utils';

interface ExcelTableProps<T extends { id: string }> {
  data: T[];
  columns: ColumnConfig<T>[];
  onRowClick?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onCellEdit?: (rowId: string, key: string, value: any) => void;
  getRowIndicatorColor?: (row: T) => string;
  headerClassName?: string;
  stickyColumnCount?: number;
  compact?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface FilterConfig {
  [key: string]: string[];
}

export function ExcelTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  onEdit,
  onDelete,
  onCellEdit,
  getRowIndicatorColor,
  headerClassName,
  stickyColumnCount = 1,
  compact = false,
}: ExcelTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });

  const getPixelWidth = (width: string | number | undefined) => {
    if (!width) return 0;
    if (typeof width === 'number') return width;
    if (width.endsWith('px')) return parseInt(width, 10);
    return 0;
  };

  const stickyOffsets = useMemo(() => {
    let currentOffset = 0;
    return columns.map(col => {
      const offset = currentOffset;
      if (col.width) {
        currentOffset += getPixelWidth(col.width);
      }
      return offset;
    });
  }, [columns]);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: '', direction: null };
      return { key, direction: 'asc' };
    });
  };

  const getCellValue = (row: T, key: string): any => {
    const keys = key.split('.');
    let value: any = row;
    for (const k of keys) {
      value = value?.[k];
    }
    return value;
  };

  const formatCellValue = (value: any, column: ColumnConfig<T>): string => {
    if (value === null || value === undefined) return '';
    if (column.format) return column.format(value);
    if (value instanceof Date) return value.toLocaleDateString('es-CO');
    if (typeof value === 'number') return value.toLocaleString('es-CO');
    return String(value);
  };

  const extractTextFromReactElement = (element: any): string => {
    if (typeof element === 'string') return element;
    if (typeof element === 'number') return String(element);
    if (typeof element === 'boolean') return '';
    if (element === null || element === undefined) return '';

    if (Array.isArray(element)) {
      return element.map(extractTextFromReactElement).join('');
    }

    if (element?.props?.children) {
      const children = element.props.children;
      if (Array.isArray(children)) {
        return children.map(extractTextFromReactElement).join('');
      }
      return extractTextFromReactElement(children);
    }

    if (typeof element === 'object') return '';

    return String(element);
  };

  const getDisplayValue = (row: T, column: ColumnConfig<T>): string => {
    const rawVal = getCellValue(row, String(column.key));

    if (column.render) {
      const rendered = column.render(rawVal, row);
      return extractTextFromReactElement(rendered);
    }

    return formatCellValue(rawVal, column);
  };

  const columnUniqueValues = useMemo(() => {
    const values: Record<string, Set<string>> = {};
    columns.forEach(col => {
      const colKey = String(col.key);
      values[colKey] = new Set();
      data.forEach(row => {
        const displayVal = getDisplayValue(row, col);
        if (displayVal !== '') {
          values[colKey].add(displayVal);
        }
      });
    });
    return values;
  }, [data, columns]);

  const toggleFilter = (key: string, value: string) => {
    setFilters(prev => {
      const currentFilters = prev[key] || [];
      const isSelected = currentFilters.includes(value);
      let newFilters;
      if (isSelected) {
        newFilters = currentFilters.filter(v => v !== value);
      } else {
        newFilters = [...currentFilters, value];
      }

      if (newFilters.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: newFilters };
    });
  };

  const clearFilter = (key: string) => {
    setFilters(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const selectAllFilter = (key: string) => {
    const allValues = Array.from(columnUniqueValues[key] || []);
    setFilters(prev => ({
      ...prev,
      [key]: allValues
    }));
  }

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    Object.entries(filters).forEach(([key, selectedValues]) => {
      if (selectedValues && selectedValues.length > 0) {
        result = result.filter(row => {
          const column = columns.find(c => String(c.key) === key);
          if (!column) return true;
          const cellDisplayValue = getDisplayValue(row, column);
          return selectedValues.includes(cellDisplayValue);
        });
      }
    });

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const aValue = getCellValue(a, sortConfig.key);
        const bValue = getCellValue(b, sortConfig.key);

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else {
          comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }

        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig, columns]);

  const startEditing = (rowId: string, key: string, value: any) => {
    setEditingCell({ rowId, key });
    setEditValue(value instanceof Date ? value.toISOString().split('T')[0] : String(value ?? ''));
  };

  const saveEdit = () => {
    if (editingCell && onCellEdit) {
      const column = columns.find(c => c.key === editingCell.key);
      let finalValue: any = editValue;

      if (column?.type === 'number' || column?.type === 'percentage') {
        finalValue = parseFloat(editValue) || 0;
      } else if (column?.type === 'date') {
        finalValue = new Date(editValue);
      }

      onCellEdit(editingCell.rowId, editingCell.key, finalValue);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const isFiltered = (key: string) => {
    return filters[key] && filters[key].length > 0;
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  return (
    <div className="rounded-md border border-border bg-card shadow-sm overflow-auto h-full relative">
      <table className={cn("w-full caption-bottom", compact ? "text-[11px]" : "text-sm")}>
        <TableHeader className={cn(headerClassName || "bg-module", "sticky top-0 z-[5]")}>
          <TableRow className={cn("border-b-0", !headerClassName && "hover:bg-module/90")}>
            {columns.map((column, index) => {
              const isSticky = index < stickyColumnCount;
              const stickyStyle = isSticky ? { left: `${stickyOffsets[index]}px`, zIndex: 10 } : {};
              const colKey = String(column.key);
              const uniqueValues = Array.from(columnUniqueValues[colKey] || []).sort();
              const selectedValues = filters[colKey] || [];

              return (
                <TableHead
                  key={colKey}
                  style={{
                    width: column.width,
                    ...stickyStyle
                  }}
                  className={cn(
                    column.className,
                    "border-r border-white/20 last:border-r-0 font-bold sticky top-0",
                    compact ? "h-8 px-1" : "h-14 p-4",
                    headerClassName || "bg-module hover:bg-module/90 text-module-foreground",
                    isSticky && "shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] outline outline-1 outline-white/10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="flex flex-1 items-center gap-1 font-semibold hover:text-white transition-colors text-left"
                      onClick={() => handleSort(colKey)}
                    >
                      {column.header}
                      {renderSortIcon(colKey)}
                    </button>

                    <FilterPopover
                      column={column}
                      uniqueValues={uniqueValues}
                      selectedValues={selectedValues}
                      onSelectAll={() => selectAllFilter(colKey)}
                      onClear={() => clearFilter(colKey)}
                      onToggle={(val) => toggleFilter(colKey, val)}
                    />
                  </div>
                  {isFiltered(colKey) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="secondary" className="px-1 py-0 text-[10px] h-4 bg-white/20 text-white border-none">
                        {filters[colKey].length} seleccionados
                      </Badge>
                    </div>
                  )}

                </TableHead>
              );
            })}

            {(onEdit || onDelete) && (
              <TableHead className="w-24 text-center text-module-foreground font-semibold">Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedData.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                className="text-center text-muted-foreground py-8"
              >
                No hay datos disponibles
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedData.map(row => (
              <TableRow
                key={row.id}
                className={cn(
                  "hover:bg-module/5 transition-colors border-b border-border/50 group relative",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, colIndex) => {
                  const cellValue = getCellValue(row, String(column.key));
                  const isEditing = editingCell?.rowId === row.id && editingCell?.key === column.key;

                  const isSticky = colIndex < stickyColumnCount;
                  const stickyStyle = isSticky ? { left: `${stickyOffsets[colIndex]}px`, zIndex: 1 } : {};

                  return (
                    <TableCell
                      key={`${row.id}-${String(column.key)}`}
                      style={stickyStyle}
                      className={cn(
                        "border-r border-border last:border-r-0",
                        colIndex === 0 && getRowIndicatorColor && "pl-4 relative",
                        isSticky && "sticky bg-card shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                        column.className,
                        compact ? "py-1 px-1" : "p-4"
                      )}
                      onClick={(e) => {
                        if (column.editable && onCellEdit) {
                          e.stopPropagation();
                          startEditing(row.id, String(column.key), cellValue);
                        }
                      }}
                    >
                      {colIndex === 0 && getRowIndicatorColor && (
                        <div
                          className={cn(
                            "absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5",
                            getRowIndicatorColor(row) || "bg-transparent"
                          )}
                        />
                      )}
                      {isEditing ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {column.type === 'number' ? (
                            <CurrencyInput
                              value={parseFloat(editValue) || 0}
                              onChange={(val) => setEditValue(String(val))}
                              className="h-7 text-sm"
                              autoFocus
                            />
                          ) : column.type === 'percentage' ? (
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="h-7 text-sm"
                              autoFocus
                              min={0}
                              max={100}
                              placeholder="%"
                            />
                          ) : (
                            <Input
                              type={column.type === 'date' ? 'date' : 'text'}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="h-7 text-sm"
                              autoFocus
                            />
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}>
                            ✓
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                            ✕
                          </Button>
                        </div>
                      ) : column.render ? (
                        column.render(cellValue, row)
                      ) : (
                        <span className={cn(column.editable && "cursor-text hover:bg-muted/50 px-1 -mx-1 rounded")}>
                          {formatCellValue(cellValue, column)}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                {(onEdit || onDelete) && (
                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          onClick={() => onEdit(row)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                          onClick={() => onDelete(row)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </div>
  );
}


interface FilterPopoverProps<T> {
  column: ColumnConfig<T>;
  uniqueValues: string[];
  selectedValues: string[];
  onSelectAll: () => void;
  onClear: () => void;
  onToggle: (value: string) => void;
}

function FilterPopover<T>({
  column,
  uniqueValues,
  selectedValues,
  onSelectAll,
  onClear,
  onToggle,
}: FilterPopoverProps<T>) {
  const isFiltered = selectedValues.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 data-[state=open]:bg-white/20 text-white/70 hover:text-white hover:bg-white/10",
            isFiltered && "text-white bg-white/20 hover:bg-white/30"
          )}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`Buscar ${typeof column.header === "string" ? column.header : column.headerLabel || "..."}...`}
          />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={onSelectAll}
                className="justify-center text-center font-medium text-primary cursor-pointer"
              >
                Seleccionar Todo
              </CommandItem>
              <CommandItem
                onSelect={onClear}
                className="justify-center text-center text-muted-foreground cursor-pointer"
              >
                Limpiar Filtros
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup className="max-h-[200px] overflow-auto">
              {uniqueValues.map((value) => {
                const isSelected = selectedValues.includes(value);
                return (
                  <CommandItem key={value} value={value} onSelect={() => onToggle(value)}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckCircle2 className={cn("h-4 w-4")} />
                    </div>
                    <span className="truncate">{value}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
