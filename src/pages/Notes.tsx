import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import AppNavigation from '@/components/AppNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Plus, Search, Trash2, NotebookPen, Clock, Folder, ChevronRight, Save, Loader2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Notes() {
  const { notes, subjects, addNote, updateNote, removeNote } = useStudy();
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string | 'all'>('all');
  
  // Local state for the current note being edited (to avoid constant context updates)
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [localSubjectId, setLocalSubjectId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const selectedNote = useMemo(() => 
    notes.find(n => n.id === selectedNoteId), 
  [notes, selectedNoteId]);

  // Sync local state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setLocalTitle(selectedNote.title);
      setLocalContent(selectedNote.content);
      setLocalSubjectId(selectedNote.subjectId);
    } else {
      setLocalTitle('');
      setLocalContent('');
      setLocalSubjectId(undefined);
    }
  }, [selectedNoteId]); // Note: only depend on ID to avoid loop if selectedNote object changes

  // Auto-save logic (Debounce)
  useEffect(() => {
    if (!selectedNoteId) return;
    
    // Don't save if content hasn't changed from the original
    if (selectedNote && 
        localTitle === selectedNote.title && 
        localContent === selectedNote.content && 
        localSubjectId === selectedNote.subjectId) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSaving(true);
      await updateNote(selectedNoteId, {
        title: localTitle,
        content: localContent,
        subjectId: localSubjectId
      });
      setIsSaving(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [localTitle, localContent, localSubjectId, selectedNoteId, updateNote]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = filterSubjectId === 'all' || n.subjectId === filterSubjectId;
      return matchesSearch && matchesSubject;
    });
  }, [notes, searchQuery, filterSubjectId]);

  const handleCreateNote = async () => {
    const newId = await addNote(filterSubjectId === 'all' ? undefined : filterSubjectId);
    if (newId) setSelectedNoteId(newId);
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta nota?')) {
      await removeNote(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 font-sans">
      <AppNavigation />
      
      <main className="h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        {/* Mobile: Filter & Add Bar (Hidden on Desktop because it's in the sidebar) */}
        <div className="md:hidden p-4 border-b border-border bg-card/50 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar notas..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleCreateNote}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* SIDEBAR: Note List */}
          <ResizablePanel defaultSize={30} minSize={20} className="hidden md:block">
            <div className="flex flex-col h-full bg-card/30 border-r border-border">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <NotebookPen className="h-5 w-5 text-primary" />
                    Notas
                  </h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={handleCreateNote}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Filtrar notas..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-background/50"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Button 
                    variant={filterSubjectId === 'all' ? 'default' : 'outline'} 
                    size="sm" 
                    className="h-7 text-[11px] px-2.5"
                    onClick={() => setFilterSubjectId('all')}
                  >
                    Tudo
                  </Button>
                  {subjects.map(s => (
                    <Button 
                      key={s.id}
                      variant={filterSubjectId === s.id ? 'default' : 'outline'} 
                      size="sm" 
                      className="h-7 text-[11px] px-2.5"
                      style={filterSubjectId === s.id ? { backgroundColor: s.color } : {}}
                      onClick={() => setFilterSubjectId(s.id)}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredNotes.length === 0 ? (
                    <div className="text-center py-10 opacity-40">
                      <p className="text-sm">Nenhuma nota encontrada</p>
                    </div>
                  ) : (
                    filteredNotes.map(note => {
                      const subject = subjects.find(s => s.id === note.subjectId);
                      return (
                        <button
                          key={note.id}
                          onClick={() => setSelectedNoteId(note.id)}
                          className={`w-full text-left p-3 rounded-lg transition-all group relative ${
                            selectedNoteId === note.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-muted/50 border border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h3 className={`font-semibold text-sm truncate pr-4 ${selectedNoteId === note.id ? 'text-primary' : 'text-foreground'}`}>
                              {note.title || 'Sem título'}
                            </h3>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteNote(note.id); }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {note.content || 'Sem conteúdo...'}
                          </p>
                          
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(note.updatedAt), 'dd MMM', { locale: ptBR })}
                            </div>
                            {subject && (
                              <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-background border border-border">
                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                                <span className="truncate max-w-[80px]">{subject.name}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle className="hidden md:flex" />

          {/* MAIN EDITOR AREA */}
          <ResizablePanel defaultSize={70}>
            {selectedNoteId ? (
              <div className="flex flex-col h-full bg-background">
                {/* Editor Header */}
                <div className="px-6 py-4 border-b border-border bg-card/20 flex items-center justify-between">
                  {/* Mobile Back Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden h-8 w-8 mr-2" 
                    onClick={() => setSelectedNoteId(null)}
                  >
                    <ChevronRight className="h-5 w-5 rotate-180" />
                  </Button>

                  <div className="flex-1 flex items-center gap-3 overflow-hidden">
                    <select 
                      value={localSubjectId || ''} 
                      onChange={e => setLocalSubjectId(e.target.value || undefined)}
                      className="text-xs bg-muted/50 border border-border rounded px-2 py-1 outline-none hover:bg-muted transition-colors max-w-[150px] truncate"
                    >
                      <option value="">Sem Matéria</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>

                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3" />
                          <span>Salvo</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => selectedNoteId && handleDeleteNote(selectedNoteId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Editor Fields */}
                <div className="flex-1 overflow-hidden flex flex-col p-6 md:p-10 space-y-6 max-w-4xl mx-auto w-full">
                  <input
                    type="text"
                    placeholder="Título da nota..."
                    className="text-3xl md:text-4xl font-bold bg-transparent border-none outline-none placeholder:opacity-30 w-full"
                    value={localTitle}
                    onChange={e => setLocalTitle(e.target.value)}
                  />
                  
                  <textarea
                    placeholder="Comece a escrever seu resumo aqui..."
                    className="flex-1 bg-transparent border-none outline-none resize-none placeholder:opacity-30 text-lg leading-relaxed w-full min-h-[400px]"
                    value={localContent}
                    onChange={e => setLocalContent(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <div className="p-6 rounded-full bg-muted mb-4">
                  <NotebookPen className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-bold mb-2">Selecione uma nota</h3>
                <p className="max-w-[280px]">Escolha um resumo na lateral ou crie um novo caderno para começar seus estudos.</p>
                <Button className="mt-6" onClick={handleCreateNote}>
                  <Plus className="h-4 w-4 mr-2" /> Criar nova nota
                </Button>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Mobile: Full Screen Editor Overlay if note is selected */}
        {selectedNoteId && (
          <div className="md:hidden fixed inset-0 z-[60] bg-background flex flex-col pt-safe-top">
            {/* Same Header as Desktop but full width */}
            <div className="px-4 py-3 border-b border-border bg-card/20 flex items-center justify-between">
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setSelectedNoteId(null)}>
                <ChevronRight className="h-6 w-6 rotate-180" />
              </Button>
              
              <div className="flex items-center gap-2">
                {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                <select 
                  value={localSubjectId || ''} 
                  onChange={e => setLocalSubjectId(e.target.value || undefined)}
                  className="text-xs bg-muted/50 border border-border rounded px-2 py-1 outline-none"
                >
                  <option value="">Sem Matéria</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => selectedNoteId && handleDeleteNote(selectedNoteId)}>
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  placeholder="Título..."
                  className="text-2xl font-bold bg-transparent border-none outline-none w-full"
                  value={localTitle}
                  onChange={e => setLocalTitle(e.target.value)}
                />
                <textarea
                  placeholder="Escreva aqui..."
                  className="w-full bg-transparent border-none outline-none resize-none min-h-[500px] text-base leading-relaxed"
                  value={localContent}
                  onChange={e => setLocalContent(e.target.value)}
                />
              </div>
            </ScrollArea>
          </div>
        )}
      </main>
    </div>
  );
}
