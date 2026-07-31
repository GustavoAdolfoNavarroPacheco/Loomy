import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Hash, MessageSquareText, CalendarCheck, DollarSign,
  Plus, Pencil, Trash2, Check, NotebookText, Lock, CalendarPlus, Save, Info,
  Paperclip, Upload, Eye, Download, FileText, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useData } from '@/contexts/DataContext';
import {
  getEtapaSeguimiento, getEtapaIndex, SEGUIMIENTO_STAGES,
  ContactoSeguimiento, SeguimientoEmpresa, NotaEtapaEntry, DocumentoAdjunto,
} from '@/types/seguimiento';
import { SeguimientoStepper } from '@/features/seguimiento/components/SeguimientoStepper';
import { toast } from 'sonner';

const toDateInputValue = (value?: Date) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const formatDateEs = (value?: Date) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO');
};

// Reduce el padding derecho para que el ícono nativo del selector de fecha quede pegado al borde.
const DATE_INPUT_CLASS = 'pr-1';

const NEW_CONTACT_ID = '__new__';

export default function InfoEmpresaPage() {
  const { empresaId } = useParams<{ empresaId: string }>();
  const navigate = useNavigate();
  const { seguimientoEmpresas, sectores, ciudades, environment, updateSeguimientoEmpresa, uploadFile, deleteFile } = useData();

  const empresa = seguimientoEmpresas.find(e => e.id === empresaId);
  const currency = environment === 'international' ? 'USD' : 'COP';

  // Indicador de guardado, compartido por todos los campos que pasan por handleField.
  const [savedPulse, setSavedPulse] = useState(false);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Estado local solo para los campos de texto libre (auto-guardan on-blur / al confirmar)
  const [notaEtapaDraft, setNotaEtapaDraft] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [observacionesUnlocked, setObservacionesUnlocked] = useState(false);

  // Cursor de vista sobre el stepper: en modo edición sigue al progreso real;
  // en modo "guardado" navega libremente entre etapas sin modificar el progreso.
  const [viewIndex, setViewIndex] = useState(-1);

  // Estado del formulario de Contactos
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ nombre: '', cargo: '', comentario: '' });
  const [deleteContactTarget, setDeleteContactTarget] = useState<ContactoSeguimiento | null>(null);

  // Estado del apartado de Documentos
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState<DocumentoAdjunto | null>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (empresa) {
      setObservaciones(empresa.observaciones || '');
      setObservacionesUnlocked(false);
    }
  }, [empresa?.id]);

  useEffect(() => {
    if (empresa && !empresa.avanceGuardado) {
      setViewIndex(getEtapaIndex(empresa));
    }
  }, [empresa, empresa?.avanceGuardado]);

  useEffect(() => {
    setNotaEtapaDraft('');
  }, [empresa?.id, viewIndex]);

  if (!empresa) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-lg font-semibold text-muted-foreground">Empresa no encontrada</p>
        <Button variant="outline" onClick={() => navigate('/seguimiento')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Seguimiento
        </Button>
      </div>
    );
  }

  const sectorNombre = sectores.find(s => s.id === empresa.sector)?.nombre || '-';
  const ciudadNombre = ciudades.find(c => c.id === empresa.ciudad)?.nombre || '-';
  const etapa = getEtapaSeguimiento(empresa);
  const currentIndex = getEtapaIndex(empresa);
  const contactos = empresa.contactos || [];
  const documentos = empresa.documentos || [];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);

  // Único punto de guardado: todo cambio pasa por aquí, así que un solo aviso "Guardado" cubre toda la página.
  const handleField = (data: Partial<SeguimientoEmpresa>) => {
    updateSeguimientoEmpresa(empresa.id, data);
    setSavedPulse(true);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setSavedPulse(false), 1500);
  };

  const handleStageSelect = (clickedIndex: number) => {
    const targetIndex = clickedIndex === currentIndex ? clickedIndex - 1 : clickedIndex;
    const updates: Partial<SeguimientoEmpresa> = {};
    SEGUIMIENTO_STAGES.forEach((stage, i) => {
      const val = i <= targetIndex;
      stage.fields.forEach(f => { (updates as any)[f] = val; });
    });
    handleField(updates);
  };

  const handleStageClick = (clickedIndex: number) => {
    if (empresa.avanceGuardado) {
      // Modo guardado: solo navega para ver/agregar notas de cada etapa, sin tocar el progreso real.
      if (clickedIndex <= currentIndex) setViewIndex(clickedIndex);
    } else {
      handleStageSelect(clickedIndex);
    }
  };

  const toggleAvanceGuardado = () => {
    const next = !empresa.avanceGuardado;
    handleField({ avanceGuardado: next });
    if (!next) setViewIndex(currentIndex);
  };

  const notaEntries: NotaEtapaEntry[] = viewIndex >= 0 ? (empresa.notasEtapas?.[String(viewIndex)] || []) : [];

  const handleAddNotaEtapa = () => {
    if (viewIndex < 0 || !notaEtapaDraft.trim()) return;
    const entry: NotaEtapaEntry = { id: crypto.randomUUID(), texto: notaEtapaDraft.trim(), fecha: new Date() };
    handleField({ notasEtapas: { ...(empresa.notasEtapas || {}), [String(viewIndex)]: [...notaEntries, entry] } });
    setNotaEtapaDraft('');
  };

  const saveObservaciones = () => {
    handleField({ observaciones });
    setObservacionesUnlocked(false);
  };

  // ── Gestión de Contactos ──
  const startAddContact = () => {
    setContactForm({ nombre: '', cargo: '', comentario: '' });
    setEditingContactId(NEW_CONTACT_ID);
  };

  const startEditContact = (c: ContactoSeguimiento) => {
    setContactForm({ nombre: c.nombre, cargo: c.cargo || '', comentario: c.comentario || '' });
    setEditingContactId(c.id);
  };

  const cancelContactForm = () => setEditingContactId(null);

  const saveContact = () => {
    if (!contactForm.nombre.trim()) return;
    const nombre = contactForm.nombre.trim();
    const cargo = contactForm.cargo.trim() || undefined;
    const comentario = contactForm.comentario.trim() || undefined;

    if (editingContactId === NEW_CONTACT_ID) {
      const nuevo: ContactoSeguimiento = { id: crypto.randomUUID(), nombre, cargo, comentario, fechaAgregado: new Date() };
      // La fecha de primer contacto se autocompleta (alimenta los filtros de fecha del dashboard Comercial).
      handleField({ contactos: [...contactos, nuevo], fecha: empresa.fecha || nuevo.fechaAgregado });
    } else {
      handleField({
        contactos: contactos.map(c => c.id === editingContactId ? { ...c, nombre, cargo, comentario } : c),
      });
    }
    setEditingContactId(null);
  };

  const confirmDeleteContact = () => {
    if (!deleteContactTarget) return;
    handleField({ contactos: contactos.filter(c => c.id !== deleteContactTarget.id) });
  };

  // ── Gestión de Documentos ──
  const getExtension = (nombre: string) => {
    const parts = nombre.split('.');
    return parts.length > 1 ? (parts.pop() || '').toUpperCase() : '';
  };

  const handleUploadDocuments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingDocs(true);
    try {
      const nuevos: DocumentoAdjunto[] = await Promise.all(
        Array.from(files).map(async (file) => {
          const path = `seguimiento/${empresa.id}/documentos/${Date.now()}_${file.name}`;
          const url = await uploadFile(file, path);
          return {
            id: crypto.randomUUID(),
            nombre: file.name,
            url,
            tipo: getExtension(file.name),
            fechaSubida: new Date(),
          };
        })
      );
      handleField({ documentos: [...documentos, ...nuevos] });
      toast.success(`${nuevos.length} documento${nuevos.length !== 1 ? 's' : ''} subido${nuevos.length !== 1 ? 's' : ''} exitosamente.`);
    } catch (error) {
      console.error('Error al subir documentos:', error);
      toast.error('Error al subir uno o más documentos', { description: 'Por favor intente de nuevo.' });
    } finally {
      setUploadingDocs(false);
      if (docsInputRef.current) docsInputRef.current.value = '';
    }
  };

  const handleDownloadDocument = async (doc: DocumentoAdjunto) => {
    try {
      const res = await fetch(doc.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = doc.nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error al descargar el archivo:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const confirmDeleteDocument = async () => {
    if (!deleteDocTarget) return;
    const target = deleteDocTarget;
    setDeleteDocTarget(null);
    handleField({ documentos: documentos.filter(d => d.id !== target.id) });
    try {
      await deleteFile(target.url);
    } catch (error) {
      console.error('No se pudo eliminar el archivo del almacenamiento:', error);
    }
  };

  const renderContactForm = () => (
    <div className="rounded-lg border-2 border-primary/30 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          placeholder="Nombre *"
          value={contactForm.nombre}
          onChange={(e) => setContactForm(prev => ({ ...prev, nombre: e.target.value }))}
          autoFocus
        />
        <Input
          placeholder="Cargo"
          value={contactForm.cargo}
          onChange={(e) => setContactForm(prev => ({ ...prev, cargo: e.target.value }))}
        />
      </div>
      <Textarea
        placeholder="Observaciones / comentarios sobre este contacto"
        value={contactForm.comentario}
        onChange={(e) => setContactForm(prev => ({ ...prev, comentario: e.target.value }))}
        rows={2}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={cancelContactForm}>Cancelar</Button>
        <Button type="button" size="sm" onClick={saveContact} disabled={!contactForm.nombre.trim()}>Guardar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-1 md:p-2 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/seguimiento')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{empresa.nombreComercial}</h1>
            <Badge variant="outline" className="text-[10px] font-bold uppercase">
              {environment === 'international' ? 'Internacional' : 'Nacional'}
            </Badge>
            <Badge className="text-[10px] font-bold uppercase transition-colors duration-300">{etapa}</Badge>
            {!!empresa.montoCotizado && empresa.montoCotizado > 0 && (
              <Badge variant="outline" className="text-[10px] font-bold gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-400">
                <DollarSign className="h-3 w-3" />
                Valor potencial: {formatCurrency(empresa.montoCotizado)}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-1">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{empresa.razonSocial}</span>
            {empresa.nit && <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />{empresa.nit}</span>}
            <span>{sectorNombre} · {ciudadNombre}</span>
          </p>
        </div>
      </div>

      <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Datos de Contacto</CardTitle>
            <CardDescription>Personas de contacto registradas en la empresa</CardDescription>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Fecha de Registro</p>
            <p className="text-sm font-semibold">{formatDateEs(empresa.createdAt)}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Contactos</Label>
              {editingContactId !== NEW_CONTACT_ID && (
                <Button type="button" size="sm" variant="outline" onClick={startAddContact} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Añadir
                </Button>
              )}
            </div>

            {contactos.length === 0 && editingContactId !== NEW_CONTACT_ID && (
              <p className="text-sm text-muted-foreground italic">Sin contactos registrados.</p>
            )}

            <div className="space-y-2">
              {contactos.map(c => (
                <div key={c.id}>
                  {editingContactId === c.id ? renderContactForm() : (
                    <div className="flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30 animate-in fade-in slide-in-from-top-1 duration-300">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {c.nombre}
                          {c.cargo && <span className="text-muted-foreground font-normal"> — {c.cargo}</span>}
                        </p>
                        {c.comentario && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{c.comentario}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/80 mt-1 flex items-center gap-1">
                          <CalendarPlus className="h-3 w-3" />
                          Agregado el {c.fechaAgregado ? formatDateEs(c.fechaAgregado) : '—'}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditContact(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteContactTarget(c)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {editingContactId === NEW_CONTACT_ID && renderContactForm()}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 fill-mode-both">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Seguimiento Comercial
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Cómo funciona el bloqueo de esta sección">
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 text-sm space-y-2" align="start">
                  <p className="font-semibold">Cómo funciona el bloqueo aquí</p>
                  <p className="text-muted-foreground">
                    Mientras el avance esté <strong>guardado</strong>, el stepper y sus notas quedan de solo lectura — presione
                    "Editar Avance" para volver a modificarlos.
                  </p>
                  <p className="text-muted-foreground">
                    "Observaciones" (más abajo) tiene su propio candado, independiente del avance: se edita y se bloquea con su propio botón.
                  </p>
                </PopoverContent>
              </Popover>
            </CardTitle>
            <CardDescription>
              {empresa.avanceGuardado
                ? 'Avance guardado: puede navegar entre etapas para ver y agregar notas, sin modificar el progreso. Presione "Editar Avance" para modificar el progreso.'
                : 'Haga clic en una etapa para avanzar o retroceder. Al terminar, guarde el avance.'}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant={empresa.avanceGuardado ? 'outline' : 'default'}
            className="gap-1.5 shrink-0"
            onClick={toggleAvanceGuardado}
          >
            {empresa.avanceGuardado ? <Pencil className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {empresa.avanceGuardado ? 'Editar Avance' : 'Guardar Avance'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <SeguimientoStepper currentIndex={currentIndex} highlightIndex={viewIndex} onSelect={handleStageClick} />

          <label className="flex items-center gap-3 cursor-pointer w-fit transition-colors">
            <Checkbox
              checked={!!empresa.pendientesAceptadas}
              onCheckedChange={(checked) => handleField({ pendientesAceptadas: checked === true })}
            />
            <span className="text-sm font-medium">Pendientes Aceptadas</span>
          </label>

          {viewIndex >= 0 && (
            <div className="grid gap-3 pt-3 border-t animate-in fade-in slide-in-from-top-1 duration-300">
              <Label className="flex items-center gap-2">
                <NotebookText className="h-3.5 w-3.5" />
                Notas — {SEGUIMIENTO_STAGES[viewIndex].etapa}
              </Label>

              {notaEntries.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {notaEntries.slice().reverse().map((entrada) => (
                    <div key={entrada.id} className="rounded-md bg-muted/40 px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
                      <p className="text-sm whitespace-pre-wrap">{entrada.texto}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{formatDateEs(entrada.fecha)}</p>
                    </div>
                  ))}
                </div>
              )}

              {empresa.avanceGuardado ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Bloqueada — presione "Editar Avance" para agregar una nota
                </p>
              ) : (
                <div className="flex gap-2 items-start">
                  <Textarea
                    key={viewIndex}
                    value={notaEtapaDraft}
                    onChange={(e) => setNotaEtapaDraft(e.target.value)}
                    placeholder={`Agregar una nota sobre "${SEGUIMIENTO_STAGES[viewIndex].etapa}"`}
                    rows={2}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" className="shrink-0 gap-1.5 mt-0.5" onClick={handleAddNotaEtapa} disabled={!notaEtapaDraft.trim()}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </Button>
                </div>
              )}
            </div>
          )}

          {currentIndex >= 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t animate-in fade-in slide-in-from-top-1 duration-300">
              <div className="grid gap-2 min-w-0">
                <Label className="flex items-center gap-2">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Fecha de Reunión
                </Label>
                <Input
                  type="date"
                  value={toDateInputValue(empresa.fechaReunion)}
                  onChange={(e) => handleField({ fechaReunion: e.target.value ? new Date(e.target.value) : undefined })}
                  className={`w-full ${DATE_INPUT_CLASS}`}
                  disabled={!!empresa.avanceGuardado}
                />
                {empresa.avanceGuardado && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Bloqueada
                  </p>
                )}
              </div>

              {currentIndex >= 4 && (
                <div className="grid gap-2 min-w-0">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="h-3.5 w-3.5" />
                    Monto Cotizado ({currency})
                  </Label>
                  <CurrencyInput
                    value={empresa.montoCotizado || 0}
                    onChange={(val) => handleField({ montoCotizado: val })}
                    currency={currency}
                    className="w-full"
                    disabled={!!empresa.avanceGuardado}
                  />
                  {empresa.avanceGuardado && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Bloqueada
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150 fill-mode-both">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />
              Documentos
            </CardTitle>
            <CardDescription>
              Documentos adjuntos de la empresa (PDF, Word, Excel, etc.). Sin límite de archivos.
            </CardDescription>
          </div>
          <div className="shrink-0">
            <input
              ref={docsInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleUploadDocuments}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => docsInputRef.current?.click()}
              disabled={uploadingDocs}
            >
              {uploadingDocs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploadingDocs ? 'Subiendo...' : 'Subir Documentos'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {documentos.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sin documentos adjuntos.</p>
          ) : (
            <div className="space-y-2">
              {documentos.slice().reverse().map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30 animate-in fade-in slide-in-from-top-1 duration-300"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={doc.nombre}>{doc.nombre}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        {doc.tipo && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-bold">{doc.tipo}</Badge>
                        )}
                        Subido el {formatDateEs(doc.fechaSubida)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver" onClick={() => window.open(doc.url, '_blank')}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar" onClick={() => handleDownloadDocument(doc)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      title="Eliminar"
                      onClick={() => setDeleteDocTarget(doc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200 fill-mode-both">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Observaciones</CardTitle>
          {observacionesUnlocked ? (
            <Button type="button" variant="default" size="sm" className="h-7 px-2 text-xs gap-1" onClick={saveObservaciones}>
              <Save className="h-3 w-3" />
              Guardar
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setObservacionesUnlocked(true)}>
              <Pencil className="h-3 w-3" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            onBlur={saveObservaciones}
            placeholder="Observaciones adicionales"
            rows={4}
            disabled={!observacionesUnlocked}
            className="transition-shadow focus-visible:shadow-md"
          />
          {!observacionesUnlocked && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Lock className="h-3 w-3" />
              Bloqueada
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteContactTarget}
        onOpenChange={(open) => { if (!open) setDeleteContactTarget(null); }}
        title="Eliminar contacto"
        description={`¿Está seguro de eliminar a "${deleteContactTarget?.nombre}" de los contactos de esta empresa? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDeleteContact}
      />

      <ConfirmDialog
        open={!!deleteDocTarget}
        onOpenChange={(open) => { if (!open) setDeleteDocTarget(null); }}
        title="Eliminar documento"
        description={`¿Está seguro de eliminar el documento "${deleteDocTarget?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDeleteDocument}
      />

      {savedPulse && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none">
          <div className="flex items-center gap-2 rounded-full bg-emerald-600 text-white text-sm font-medium px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Check className="h-4 w-4" />
            Guardado
          </div>
        </div>
      )}
    </div>
  );
}
