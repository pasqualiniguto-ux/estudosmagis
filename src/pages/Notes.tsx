import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import AppNavigation from '@/components/AppNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Plus, Search, Trash2, NotebookPen, Clock, ChevronRight, Save, Loader2, ChevronDown, Circle, GripVertical, List, Type } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { NoteBlock } from '@/types/study';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function Notes() {
  const { notes, subjects, addNote, updateNote, removeNote, noteFont, noteSize, setNoteFont, setNoteSize } = useStudy();
  const { toast } = useToast();
  
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState<string | 'all'>('all');
  
  const [localTitle, setLocalTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [localSubjectId, setLocalSubjectId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // --- SELECTION & DRAG STATE ---
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggableIndex, setDraggableIndex] = useState<number | null>(null); // Which block is currently draggable
  const isDraggingFromGrip = useRef(false);

  const selectedNote = useMemo(() => 
    notes.find(n => n.id === selectedNoteId), 
  [notes, selectedNoteId]);

  const selectedIndices = useMemo(() => {
    if (selectionStart === null || selectionEnd === null) return [];
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    const indices = [];
    for (let i = start; i <= end; i++) indices.push(i);
    return indices;
  }, [selectionStart, selectionEnd]);

  // Sync state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      setLocalTitle(selectedNote.title);
      setLocalSubjectId(selectedNote.subjectId);
      
      try {
        const parsed = JSON.parse(selectedNote.content);
        if (Array.isArray(parsed)) {
          setBlocks(parsed);
        } else {
          throw new Error();
        }
      } catch (e) {
        const lines = selectedNote.content.split('\n');
        const initialBlocks: NoteBlock[] = lines.map((line, i) => ({
          id: `block-${i}-${Date.now()}`,
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
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [selectedNoteId]);

  // Auto-save logic
  useEffect(() => {
    if (!selectedNoteId) return;

    const contentJson = JSON.stringify(blocks);
    
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
  }, [localTitle, blocks, localSubjectId, selectedNoteId]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const titleMatches = n.title.toLowerCase().includes(searchQuery.toLowerCase());
      const contentMatches = n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = titleMatches || contentMatches;
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

  const handleDeleteNote = async (id: string | null) => {
    if (!id) return;
    if (confirm('Deseja excluir esta nota?')) {
      await removeNote(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
    }
  };

  // --- HIERARCHY LOGIC ---
  const getSubtreeRange = (startIndex: number) => {
    const parentLevel = blocks[startIndex].level;
    let endIndex = startIndex;
    for (let i = startIndex + 1; i < blocks.length; i++) {
      if (blocks[i].level > parentLevel) {
        endIndex = i;
      } else {
        break;
      }
    }
    return { start: startIndex, end: endIndex };
  };

  // --- OUTLINER EVENT HANDLERS ---
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (selectedIndices.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const diff = e.shiftKey ? -1 : 1;
        setBlocks(prev => prev.map((b, i) => {
          if (selectedIndices.includes(i)) {
            const newLevel = Math.max(0, b.level + diff);
            return { ...b, level: newLevel };
          }
          return b;
        }));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (confirm(`Deseja excluir os ${selectedIndices.length} blocos selecionados?`)) {
          setBlocks(prev => prev.filter((_, i) => !selectedIndices.includes(i)));
          setSelectionStart(null);
          setSelectionEnd(null);
        }
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (blocks[index].text.trim() === '' && blocks[index].level > 0) {
        setBlocks(prev => prev.map((b, i) => i === index ? { ...b, level: b.level - 1 } : b));
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
      const diff = e.shiftKey ? -1 : 1;
      const prevBlock = blocks[index - 1];
      const newLevel = Math.max(0, blocks[index].level + diff);
      if (diff > 0 && prevBlock && newLevel > prevBlock.level + 1) return;
      setBlocks(prev => prev.map((b, i) => i === index ? { ...b, level: newLevel } : b));
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

  // --- MOUSE EVENTS ---
  const handleMouseDownForSelection = (e: React.MouseEvent, index: number) => {
    if ((e.target as HTMLElement).closest('.grip-handle')) {
      // Grip: enable drag on this specific block
      isDraggingFromGrip.current = true;
      setDraggableIndex(index);
      return;
    }
    // Bullet/margin: start multi-select
    isDraggingFromGrip.current = false;
    setDraggableIndex(null);
    setSelectionStart(index);
    setSelectionEnd(index);
    setIsSelecting(true);
    window.getSelection()?.removeAllRanges();
  };

  const handlePointerMove = (e: React.PointerEvent, index: number) => {
    // PointerMove is not blocked by native drag — use it for selection tracking
    if (isSelecting && e.buttons === 1) {
      setSelectionEnd(index);
    }
  };

  const handleMouseEnter = (index: number) => {
    if (draggedIndex !== null) setDragOverIndex(index);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setDraggableIndex(null);
    isDraggingFromGrip.current = false;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!isDraggingFromGrip.current) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const subtree = getSubtreeRange(draggedIndex);
    const movingCount = subtree.end - subtree.start + 1;
    const blocksToMove = blocks.slice(subtree.start, subtree.end + 1);
    const newBlocks = [...blocks];
    newBlocks.splice(subtree.start, movingCount);
    let adjustedTargetIndex = targetIndex;
    if (subtree.start < targetIndex) adjustedTargetIndex = targetIndex - movingCount + 1;
    newBlocks.splice(adjustedTargetIndex, 0, ...blocksToMove);
    setBlocks(newBlocks);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const isVisible = (index: number) => {
    let currentLevel = blocks[index].level;
    for (let i = index - 1; i >= 0; i--) {
      if (blocks[i].level < currentLevel) {
        if (blocks[i].collapsed) return false;
        currentLevel = blocks[i].level;
      }
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0 font-sans selection:bg-primary/20" onMouseUp={handleMouseUp}>
      <AppNavigation />
      <main className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={25} minSize={20} className="hidden md:block">
            <div className="flex flex-col h-full bg-card/30 border-r border-border">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg flex items-center gap-2"><NotebookPen className="h-5 w-5 text-primary" /> Caderno</h2>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={handleCreateNote}><Plus className="h-5 w-5" /></Button>
                </div>
                <Input placeholder="Buscar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 bg-background/50" />
                <div className="flex flex-wrap gap-1.5">
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

          <ResizablePanel defaultSize={75}>
            {selectedNoteId ? (
              <div className="flex flex-col h-full bg-background relative overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-card/10 flex items-center justify-between z-20 backdrop-blur-md sticky top-0">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedNoteId(null)}><ChevronRight className="h-5 w-5 rotate-180" /></Button>
                    <select value={localSubjectId || ''} onChange={e => setLocalSubjectId(e.target.value || undefined)} className="text-xs bg-muted/50 border border-border rounded px-2 py-1 outline-none max-w-[120px] truncate">
                      <option value="">Geral</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <Separator orientation="vertical" className="h-4 mx-1 hidden sm:block" />
                    <div className="hidden sm:flex items-center gap-1.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1 bg-muted/50"><Type className="h-3.5 w-3.5" /> <span className="capitalize">{noteFont}</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent><DropdownMenuItem onClick={() => setNoteFont('sans')}>San Serif</DropdownMenuItem><DropdownMenuItem onClick={() => setNoteFont('serif')}>Serif</DropdownMenuItem><DropdownMenuItem onClick={() => setNoteFont('mono')}>Monospace</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] bg-muted/50 uppercase">{noteSize}</Button></DropdownMenuTrigger>
                        <DropdownMenuContent><DropdownMenuItem onClick={() => setNoteSize('sm')}>Pequeno</DropdownMenuItem><DropdownMenuItem onClick={() => setNoteSize('md')}>Médio</DropdownMenuItem><DropdownMenuItem onClick={() => setNoteSize('lg')}>Grande</DropdownMenuItem><DropdownMenuItem onClick={() => setNoteSize('xl')}>Extra</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-2" />}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteNote(selectedNoteId)}><Trash2 className="h-4 w-4" /></Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="max-w-4xl mx-auto w-full p-8 md:p-14 space-y-10">
                    <input type="text" placeholder="Título da nota..." className="text-4xl md:text-5xl font-black bg-transparent border-none outline-none placeholder:opacity-10 w-full tracking-tighter" value={localTitle} onChange={e => setLocalTitle(e.target.value)} onFocus={() => setFocusedIndex(null)} />
                    
                    <div className={`space-y-0.5 select-none ${noteFont === 'serif' ? 'font-serif' : noteFont === 'mono' ? 'font-mono' : 'font-sans'} ${noteSize === 'sm' ? 'text-sm' : noteSize === 'lg' ? 'text-lg' : noteSize === 'xl' ? 'text-xl' : 'text-base'}`}>
                      {blocks.map((block, index) => {
                        if (!isVisible(index)) return null;
                        const isSelected = selectedIndices.includes(index);
                        const isBeingDragged = draggedIndex === index;
                        const isOver = dragOverIndex === index;
                        
                        return (
                          <div 
                            key={block.id} 
                            style={{ paddingLeft: `${block.level * 28}px` }}
                            className={`group flex items-start gap-0.5 relative py-0.5 px-1 rounded-sm transition-all duration-150 ${isSelected ? 'bg-primary/20 ring-1 ring-primary/30' : 'hover:bg-muted/30'} ${isOver && draggedIndex !== index ? 'border-t-2 border-primary' : ''} ${isBeingDragged ? 'opacity-30' : ''}`}
                            onMouseEnter={() => handleMouseEnter(index)}
                            onPointerMove={(e) => handlePointerMove(e, index)}
                            onMouseUp={handleMouseUp}
                            draggable={draggableIndex === index}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index); }}
                            onDrop={(e) => handleDrop(e, index)}
                          >
                            {/* NEW GRIP HANDLE for D&D ONLY */}
                            <div 
                              className="grip-handle flex items-center h-8 w-5 shrink-0 justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-40 transition-opacity"
                              onMouseDown={(e) => handleMouseDownForSelection(e, index)}
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>

                            {/* BULLET AREA for MULTI-SELECT ONLY */}
                            <div 
                              className="bullet-handle flex items-center h-8 w-6 shrink-0 justify-center cursor-cell"
                              onMouseDown={(e) => handleMouseDownForSelection(e, index)}
                            >
                              <div className="flex flex-col items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity">
                                {blocks[index+1]?.level > block.level ? (
                                  <button onClick={(e) => { e.stopPropagation(); setBlocks(prev => prev.map((b, i) => i === index ? { ...b, collapsed: !b.collapsed } : b)) }} className="transition-transform" style={{ transform: block.collapsed ? 'rotate(-90deg)' : 'none' }}><ChevronDown className="h-4 w-4" /></button>
                                ) : (
                                  <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
                                )}
                              </div>
                            </div>
                            
                            <textarea
                              ref={el => { if (focusedIndex === index) el?.focus(); }}
                              rows={1}
                              value={block.text}
                              onChange={e => {
                                setBlocks(prev => prev.map((b, i) => i === index ? { ...b, text: e.target.value } : b));
                                e.target.style.height = 'auto'; e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onKeyDown={e => handleKeyDown(e, index)}
                              onFocus={() => { setFocusedIndex(index); setSelectionStart(null); setSelectionEnd(null); }}
                              placeholder="..."
                              className="flex-1 bg-transparent border-none outline-none resize-none py-1 leading-relaxed selection:bg-primary/30 placeholder:opacity-0 focus:placeholder:opacity-10 transition-all font-medium select-text"
                              style={{ height: 'auto', fontSize: 'inherit' }}
                            />
                            {block.collapsed && blocks[index+1]?.level > block.level && (
                              <div className="absolute right-2 top-2 px-1 py-0.5 rounded bg-primary/10 text-[9px] font-black text-primary">RECOLHIDO</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="md:hidden flex items-center justify-around p-3 border-t border-border bg-card/90 backdrop-blur-md sticky bottom-0 z-30">
                  <Button variant="ghost" size="sm" onClick={() => focusedIndex !== null && handleKeyDown({ key: 'Tab', shiftKey: true, preventDefault: () => {} } as any, focusedIndex)} className="text-xs gap-1"><ChevronRight className="h-4 w-4 rotate-180" /> Recuar</Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button variant="ghost" size="sm" onClick={() => focusedIndex !== null && handleKeyDown({ key: 'Tab', shiftKey: false, preventDefault: () => {} } as any, focusedIndex)} className="text-xs gap-1">Indentar <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-20"><List className="h-24 w-24 mb-6 stroke-[1px]" /><h3 className="text-2xl font-black uppercase tracking-widest">Selecione uma Nota</h3></div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}
