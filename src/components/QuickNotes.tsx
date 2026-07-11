import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StickyNote, X } from 'lucide-react';

const STORAGE_KEY = 'quick_notes_v1';

export default function QuickNotes() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      setValue(localStorage.getItem(STORAGE_KEY) ?? '');
    } catch {}
  }, []);

  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, value); } catch {}
    }, 300);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [value]);

  return (
    <>
      <Button
        type="button"
        size="icon"
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 h-11 w-11 rounded-full shadow-lg opacity-80 hover:opacity-100"
        title="Bloco de notas rápido"
        aria-label="Bloco de notas rápido"
      >
        <StickyNote className="h-5 w-5" />
      </Button>

      {open && (
        <div className="fixed bottom-32 right-4 md:bottom-20 md:right-6 z-40 w-[min(92vw,340px)] rounded-lg border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Notas rápidas
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Anote qualquer coisa aqui..."
            className="w-full h-56 resize-none p-3 text-sm bg-transparent outline-none rounded-b-lg placeholder:text-muted-foreground/60"
            autoFocus
          />
        </div>
      )}
    </>
  );
}
