import { useState, useEffect, useCallback } from 'react';
import { DatoComercial, EtapaComercial, EXCEL_COLUMN_MAP } from '@/types/comercial';
import { subscribeToCollection, addItem, deleteItem, clearCollection } from '@/services/dataService';
import * as XLSX from 'xlsx';

interface UseComercialDataOptions {
  environment: 'local' | 'international';
}

export function useComercialData({ environment }: UseComercialDataOptions) {
  const [datos, setDatos] = useState<DatoComercial[]>([]);
  const [loading, setLoading] = useState(true);

  const collectionName = environment === 'international' ? 'int_datos_comerciales' : 'datos_comerciales';

  // Subscribe to real-time updates
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToCollection<DatoComercial>(collectionName, (data) => {
      setDatos(data);
      setLoading(false);
    }, 'createdAt');

    return unsub;
  }, [collectionName]);

  // Add a single commercial record
  const addDato = useCallback(async (dato: Omit<DatoComercial, 'id' | 'createdAt'>) => {
    await addItem(collectionName, dato);
  }, [collectionName]);

  // Delete a single record
  const deleteDato = useCallback(async (id: string) => {
    await deleteItem(collectionName, id);
  }, [collectionName]);

  // Clear all records from the collection
  const clearAll = useCallback(async () => {
    await clearCollection(collectionName);
  }, [collectionName]);

  // Import records from an Excel file buffer
  const importFromExcel = useCallback(async (file: File): Promise<{ imported: number; errors: string[] }> => {
    const errors: string[] = [];
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

    // Use the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { imported: 0, errors: ['El archivo Excel no contiene hojas.'] };
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      return { imported: 0, errors: ['La hoja de cálculo está vacía.'] };
    }

    // Validate required columns
    const headers = Object.keys(rawRows[0]);
    const requiredColumns = ['Empresa', 'Sector', 'Fecha Contacto', 'Etapa', 'Valor Negocio'];
    const missingColumns = requiredColumns.filter(col => !headers.some(h => h.trim() === col));
    if (missingColumns.length > 0) {
      return { imported: 0, errors: [`Columnas faltantes en el Excel: ${missingColumns.join(', ')}`] };
    }

    const validEtapas: EtapaComercial[] = ['Contactado', 'Reunión Agendada', 'Oportunidad Abierta', 'Negociación', 'Venta Cerrada', 'Perdido'];

    let imported = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNum = i + 2; // Excel is 1-indexed + header row

      try {
        // Map Excel columns to our fields
        const mapped: Record<string, unknown> = {};
        for (const [excelCol, field] of Object.entries(EXCEL_COLUMN_MAP)) {
          const matchingHeader = Object.keys(row).find(h => h.trim() === excelCol);
          if (matchingHeader) {
            mapped[field] = row[matchingHeader];
          }
        }

        // Validate required fields
        if (!mapped.empresa || String(mapped.empresa).trim() === '') {
          errors.push(`Fila ${rowNum}: "Empresa" vacía, se omitió.`);
          continue;
        }

        if (!mapped.etapa || !validEtapas.includes(mapped.etapa as EtapaComercial)) {
          errors.push(`Fila ${rowNum}: Etapa "${mapped.etapa}" no es válida, se omitió.`);
          continue;
        }

        // Parse dates
        let fechaContacto: Date;
        if (mapped.fechaContacto instanceof Date) {
          fechaContacto = mapped.fechaContacto;
        } else {
          fechaContacto = new Date(mapped.fechaContacto as string);
          if (isNaN(fechaContacto.getTime())) {
            errors.push(`Fila ${rowNum}: Fecha de contacto inválida, se omitió.`);
            continue;
          }
        }

        let fechaReunion: Date | undefined;
        if (mapped.fechaReunion) {
          if (mapped.fechaReunion instanceof Date) {
            fechaReunion = mapped.fechaReunion;
          } else {
            const parsed = new Date(mapped.fechaReunion as string);
            if (!isNaN(parsed.getTime())) {
              fechaReunion = parsed;
            }
          }
        }

        const rawValor = mapped.valorNegocio;
        const valorNegocio = typeof rawValor === 'number'
          ? rawValor
          : parseFloat(String(rawValor).replace(/[^0-9.-]/g, '')) || 0;

        const dato: Omit<DatoComercial, 'id' | 'createdAt'> = {
          empresa: String(mapped.empresa).trim(),
          sector: String(mapped.sector || '').trim(),
          fechaContacto,
          etapa: mapped.etapa as EtapaComercial,
          valorNegocio,
          fechaReunion,
          comercial: String(mapped.comercial || '').trim(),
          observaciones: String(mapped.observaciones || '').trim() || undefined,
        };

        await addItem(collectionName, dato);
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`Fila ${rowNum}: Error inesperado — ${message}`);
      }
    }

    return { imported, errors };
  }, [collectionName]);

  // Export current data to Excel and trigger download
  const exportToExcel = useCallback(() => {
    const exportData = datos.map(d => ({
      'Empresa': d.empresa,
      'Sector': d.sector,
      'Fecha Contacto': d.fechaContacto instanceof Date
        ? d.fechaContacto.toLocaleDateString('es-CO')
        : new Date(d.fechaContacto).toLocaleDateString('es-CO'),
      'Etapa': d.etapa,
      'Valor Negocio': d.valorNegocio,
      'Fecha Reunión': d.fechaReunion
        ? (d.fechaReunion instanceof Date
          ? d.fechaReunion.toLocaleDateString('es-CO')
          : new Date(d.fechaReunion).toLocaleDateString('es-CO'))
        : '',
      'Comercial': d.comercial,
      'Observaciones': d.observaciones || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...exportData.map(row => String((row as Record<string, unknown>)[key] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Comerciales');
    const env = environment === 'international' ? 'Internacional' : 'Nacional';
    XLSX.writeFile(wb, `Dashboard_Comercial_${env}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [datos, environment]);

  return {
    datos,
    loading,
    addDato,
    deleteDato,
    clearAll,
    importFromExcel,
    exportToExcel,
  };
}
