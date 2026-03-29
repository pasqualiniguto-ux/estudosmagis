import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import AppNavigation from '@/components/AppNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Plus, Search, Trash2, NotebookPen, Clock, ChevronRight, Save, Loader2, ChevronDown, Circle, GripVertical, List } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { NoteBlock } from '@/types/study';

export default function Notes() {
  const { notes, subjects, addNote, updateNote, removeNote } = useStudy();
  const { toast } = useToast();
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string | 'all'>('all');
  
  const [localTitle, setLocalTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [localSubjectId, setLocalSubjectId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const selectedNote = useMemo(() => 
    notes.find(n => n.id === selectedNoteId), 
  [notes, selectedNoteId]);

  // Sync state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setLocalTitle(selectedNote.title);
      setLocalSubjectId(selectedNote.subjectId);
      
      try {
        // Try to parse JSON blocks
        const parsed = JSON.parse(selectedNote.content);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
        } else {
          throw new Error('Not an array');
        }
      } catch (e) {
        // Fallback or Migration: Convert plain text to blocks
        const lines = selectedNote.content.split('\n');
        const initialBlocks: NoteBlock[] = lines.map((line, i) => ({
          id: `initial-${i}-${Date.now()}`,
          text: line,
          level: 0,
          collapsed: false
        }));
        setBlocks(initialBlocks.length > 0 ? initialBlocks : [{ id: 'first', text: '', level: 0 }]);
      }
    } else {
      setLocalTitle('');
      setBlocks([]);
      setLocalSubjectId(undefined);
    }
  }, [selectedNoteId]);

  // Auto-save logic
  useEffect(() => {
    if (!selectedNoteId) return;

    const contentJson = JSON.stringify(blocks);
    
    // Check if anything changed
    if (selectedNote && 
        localTitle === selectedNote.title && 
        contentJson === selectedNote.content && 
        localSubjectId === selectedNote.subjectId) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updateNote(selectedNoteId, {
          title: localTitle,
          content: contentJson,
          subjectId: localSubjectId
        });
      } catch (error) {
        toast({ title: 'Erro ao salvar', variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [localTitle, blocks, localSubjectId, selectedNoteId, updateNote]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSubject = filterSubjectId === 'all' || n.subjectId === filterSubjectId;
      return matchesSearch && matchesSubject;
    });
  }, [notes, searchQuery, filterSubjectId]);

  const handleCreateNote = async () => {
    try {
      const newId = await addNote(filterSubjectId === 'all' ? undefined : filterSubjectId);
      if (newId) setSelectedNoteId(newId);
    } catch (e: any) {
      toast({ title: 'Erro ao criar nota', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (confirm('Deseja excluir esta nota?')) {
      await removeNote(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
    }
  };

  // --- OUTLINER LOGIC ---
  const updateBlock = (index: number, updates: Partial<NoteBlock>) => {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Smart Enter: If current line is empty and indented, outdent instead of new line
      if (blocks[index].text.trim() === '' && blocks[index].level > 0) {
        updateBlock(index, { level: blocks[index].level - 1 });
        return;
      }

      const newBlock: NoteBlock = {
        id: `block-${Date.now()}`,
        text: '',
        level: blocks[index].level,
        collapsed: false
      };
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
      setFocusedIndex(index + 1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Outdent
        if (blocks[index].level > 0) {
          updateBlock(index, { level: blocks[index].level - 1 });
        }
      } else {
        // Indent
        const prevBlock = blocks[index - 1];
        if (prevBlock && blocks[index].level <= prevBlock.level) {
          updateBlock(index, { level: blocks[index].level + 1 });
        }
      }
    } else if (e.key === 'Backspace' && blocks[index].text === '' && blocks.length > 1) {
      e.preventDefault();
      const newBlocks = blocks.filter((_, i) => i !== index);
      setBlocks(newBlocks);
      setFocusedIndex(index > 0 ? index - 1 : 0);
    } else if (e.key === 'ArrowUp') {
      if (index > 0) {
        e.preventDefault();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === 'ArrowDown') {
      if (index < blocks.length - 1) {
        e.preventDefault();
        setFocusedIndex(index + 1);
      }
    }
  };

  const isVisible = (index: number) => {
    // Check if any ancestor is collapsed
    let currentLevel = blocks[index].level;
    for (let i = index - 1; i >= 0; i--) {
      if (blocks[i].level < currentLevel) {
        if (blocks[i].collapsed) return false;
        currentLevel = blocks[i].level;
      }
    }
    return true;
  };

  const hasChildren = (index: number) => {
    const nextBlock = blocks[index + 1];
    return nextBlock && nextBlock.level > blocks[index].level;
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 font-sans selection:bg-primary/20">
      <AppNavigation />
      
      <main className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* SIDEBAR */}
          <ResizablePanel defaultSize={25} minSize={20} className="hidden md:block">
            <div className="flex flex-col h-full bg-card/30 border-r border-border">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <NotebookPen className="h-5 w-5 text-primary" />
                    Caderno
                  </h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={handleCreateNote}>
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <Input 
                  placeholder="Buscar..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-9 bg-background/50"
                />
                <div className="flex flex-wrap gap-1.5">
                  <Button variant={filterSubjectId === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" onClick={() => setFilterSubjectId('all')}>Tudo</Button>
                  {subjects.map(s => (
                    <Button key={s.id} variant={filterSubjectId === s.id ? 'default' : 'outline'} size="sm" className="h-7 text-[10px]" style={filterSubjectId === s.id ? { backgroundColor: s.color } : {}} onClick={() => setFilterSubjectId(s.id)}>{s.name}</Button>
                  ))}
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {filteredNotes.map(note => (
                    <button key={note.id} onClick={() => setSelectedNoteId(note.id)} className={`w-full text-left p-3 rounded-lg transition-all ${selectedNoteId === note.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50 border border-transparent'}`}>
                      <h3 className={`font-semibold text-sm truncate ${selectedNoteId === note.id ? 'text-primary' : ''}`}>{note.title || 'Sem título'}</h3>
                      <div className="flex items-center gap-2 mt-1 opacity-60 text-[10px]">
                        <Clock className="h-3 w-3" />
                        {format(new Date(note.updatedAt), 'dd/MM/yy', { locale: ptBR })}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle className="hidden md:flex" />

          {/* EDITOR */}
          <ResizablePanel defaultSize={75}>
            {selectedNoteId ? (
              <div className="flex flex-col h-full bg-background relative">
                <div className="px-6 py-4 border-b border-border bg-card/10 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedNoteId(null)}>
                      <ChevronRight className="h-5 w-5 rotate-180" />
                    </Button>
                    <select value={localSubjectId || ''} onChange={e => setLocalSubjectId(e.target.value || undefined)} className="text-xs bg-muted/50 border border-border rounded px-2 py-1 outline-none">
                      <option value="">Geral</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNote(selectedNoteId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="max-w-3xl mx-auto w-full p-8 md:p-12 space-y-8">
                    <input
                      type="text"
                      placeholder="Título da nota..."
                      className="text-4xl font-extrabold bg-transparent border-none outline-none placeholder:opacity-20 w-full tracking-tight"
                      value={localTitle}
                      onChange={e => setLocalTitle(e.target.value)}
                    />
                    
                    <div className="space-y-0.5">
                      {blocks.map((block, index) => {
                        if (!isVisible(index)) return null;
                        
                        return (
                          <div 
                            key={block.id} 
                            style={{ paddingLeft: `${block.level * 24}px` }}
                            className="group flex items-start gap-1 relative"
                          >
                            <div className="flex items-center h-7 w-6 shrink-0 justify-center">
                              {hasChildren(index) ? (
                                <button 
                                  onClick={() => updateBlock(index, { collapsed: !block.collapsed })}
                                  className="hover:bg-muted p-0.5 rounded transition-transform"
                                  style={{ transform: block.collapsed ? 'rotate(-90deg)' : 'none' }}
                                >
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              ) : (
                                <Circle className="h-1.5 w-1.5 fill-muted-foreground/30 text-muted-foreground/30" />
                              )}
                            </div>
                            
                            <textarea
                              ref={el => { if (focusedIndex === index) el?.focus(); }}
                              rows={1}
                              value={block.text}
                              onChange={e => {
                                updateBlock(index, { text: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onKeyDown={e => handleKeyDown(e, index)}
                              onFocus={() => setFocusedIndex(index)}
                              placeholder="..."
                              className="flex-1 bg-transparent border-none outline-none resize-none py-1 text-[16px] leading-relaxed placeholder:opacity-0 focus:placeholder:opacity-20 transition-all font-medium"
                              style={{ height: 'auto' }}
                            />
                            
                            {block.collapsed && hasChildren(index) && (
                              <div className="absolute right-0 top-1.5 px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground font-bold">
                                +
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
                
                {/* Mobile Helper Bar */}
                <div className="md:hidden flex items-center justify-around p-2 border-t border-border bg-card/80 backdrop-blur-sm sticky bottom-0">
                  <Button variant="ghost" size="sm" onClick={() => focusedIndex !== null && handleKeyDown({ key: 'Tab', shiftKey: true, preventDefault: () => {} } as any, focusedIndex)}>
                    <ChevronRight className="h-4 w-4 rotate-180 mr-1" /> Desindentar
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button variant="ghost" size="sm" onClick={() => focusedIndex !== null && handleKeyDown({ key: 'Tab', shiftKey: false, preventDefault: () => {} } as any, focusedIndex)}>
                    Indentar <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-30">
                <List className="h-16 w-16 mb-4" />
                <h3 className="text-xl font-bold">Escolha ou crie uma nota</h3>
                <p className="max-w-xs mt-2 text-sm">Use o Tab para criar hierarquia e organizar seu conhecimento.</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
