import React, { useState, useEffect, useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import AppNavigation from '@/components/AppNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Plus, Search, Trash2, NotebookPen, Clock, ChevronRight, Loader2, List, FileText, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Notes() {
  const { notes, subjects, addNote, updateNote, removeNote } = useStudy();
  const { toast } = useToast();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string | 'all'>('all');

  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [localSubjectId, setLocalSubjectId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const selectedNote = useMemo(() =>
    notes.find(n => n.id === selectedNoteId),
    [notes, selectedNoteId]);

  useEffect(() => {
    if (selectedNote) {
      setLocalTitle(selectedNote.title);
      setLocalSubjectId(selectedNote.subjectId);
      // Try to extract plain text from old block format
      try {
        const parsed = JSON.parse(selectedNote.content);
        if (Array.isArray(parsed)) {
          setLocalContent(parsed.map((b: any) => b.text || '').join('\n'));
        } else {
          setLocalContent(selectedNote.content || '');
        }
      } catch {
        setLocalContent(selectedNote.content || '');
      }
    } else {
      setLocalTitle('');
      setLocalContent('');
      setLocalSubjectId(undefined);
    }
  }, [selectedNoteId]);

  // Auto-save
  useEffect(() => {
    if (!selectedNoteId) return;
    if (selectedNote && localTitle === selectedNote.title && localContent === selectedNote.content && localSubjectId === selectedNote.subjectId) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateNote(selectedNoteId, {
          title: localTitle,
          content: localContent,
          subjectId: localSubjectId,
        });
      } catch {
        toast({ title: 'Erro ao salvar', variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [localTitle, localContent, localSubjectId, selectedNoteId]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    }).filter(n => filterSubjectId === 'all' || n.subjectId === filterSubjectId);
  }, [notes, searchQuery, filterSubjectId]);

  const handleCreateNote = async () => {
    try {
      const newId = await addNote(filterSubjectId === 'all' ? undefined : filterSubjectId);
      if (newId) setSelectedNoteId(newId);
    } catch (e: any) {
      toast({ title: 'Erro ao criar nota', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (id: string | null) => {
    if (!id) return;
    if (confirm('Deseja excluir esta nota?')) {
      await removeNote(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <AppNavigation />
      <main className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={20} minSize={15} className="hidden md:block">
            <div className="flex flex-col h-full bg-card/30 border-r border-border">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2"><NotebookPen className="h-5 w-5 text-primary" /> Caderno</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={handleCreateNote}><Plus className="h-5 w-5" /></Button>
                </div>
                <Input placeholder="Buscar notas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 bg-background/50" />
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <Button variant={filterSubjectId === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" onClick={() => setFilterSubjectId('all')}>Tudo</Button>
                  {subjects.map(s => <Button key={s.id} variant={filterSubjectId === s.id ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" style={filterSubjectId === s.id ? { backgroundColor: s.color } : {}} onClick={() => setFilterSubjectId(s.id)}>{s.name}</Button>)}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredNotes.map(note => (
                    <div key={note.id} className="group relative">
                      <button onClick={() => setSelectedNoteId(note.id)} className={`w-full text-left p-3 rounded-lg transition-all pr-10 ${selectedNoteId === note.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'}`}>
                        <h3 className={`font-semibold text-sm truncate ${selectedNoteId === note.id ? 'text-primary' : ''}`}>{note.title || 'Sem título'}</h3>
                        <div className="flex items-center gap-2 mt-1 opacity-60 text-[10px]"><Clock className="h-3 w-3" /> {format(new Date(note.updatedAt), 'dd/MM/yy', { locale: ptBR })}</div>
                      </button>
                      <button onClick={() => handleDeleteNote(note.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle className="hidden md:flex" />

          <ResizablePanel defaultSize={80}>
            {selectedNoteId ? (
              <div className="flex flex-col h-full bg-background">
                <div className="px-6 py-3 border-b border-border bg-card/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedNoteId(null)}><ChevronRight className="h-5 w-5 rotate-180" /></Button>
                    <select value={localSubjectId || ''} onChange={e => setLocalSubjectId(e.target.value || undefined)} className="text-xs bg-muted/50 border border-border rounded px-2 py-1 outline-none max-w-[120px] truncate">
                      <option value="">Geral</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNote(selectedNoteId)}><Trash2 className="h-4 w-4" /></Button>
                </div>

                <div className="flex-1 flex flex-col p-6 md:p-10 max-w-4xl mx-auto w-full overflow-hidden">
                  <input
                    type="text"
                    placeholder="Título da nota..."
                    className="text-2xl md:text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 w-full mb-4"
                    value={localTitle}
                    onChange={e => setLocalTitle(e.target.value)}
                  />
                  <Textarea
                    placeholder="Comece a escrever..."
                    className="flex-1 resize-none border-none shadow-none focus-visible:ring-0 text-base leading-relaxed bg-transparent p-0"
                    value={localContent}
                    onChange={e => setLocalContent(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20">
                <List className="h-24 w-24 mb-6 stroke-[1px]" />
                <h3 className="text-2xl font-black uppercase tracking-widest">Nenhuma Nota</h3>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
