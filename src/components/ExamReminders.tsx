import { useState } from 'react';
import { nowBrasilia } from '@/lib/dateUtils';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CalendarIcon, Plus, Trash2, BookOpen, Clock, ExternalLink, Pencil } from 'lucide-react';

export default function ExamReminders() {
  const { subjects, exams, addExam, removeExam, updateExam } = useStudy();
  const [open, setOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSave = () => {
    if (!name || !date) return;
    const data = {
      name,
      date: format(date, 'yyyy-MM-dd'),
      subjectIds: selectedSubjects,
      notes,
      url: url.trim() || undefined,
    };
    if (editingExamId) {
      updateExam(editingExamId, data);
    } else {
      addExam(data);
    }
    resetForm();
    setOpen(false);
  };

  const openEdit = (exam: typeof exams[0]) => {
    setEditingExamId(exam.id);
    setName(exam.name);
    setDate(parseISO(exam.date));
    setSelectedSubjects([...exam.subjectIds]);
    setNotes(exam.notes);
    setUrl(exam.url || '');
    setOpen(true);
  };

  const resetForm = () => {
    setEditingExamId(null);
    setName('');
    setDate(undefined);
    setSelectedSubjects([]);
    setNotes('');
    setUrl('');
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getDaysLeft = (dateStr: string) => {
    const diff = differenceInDays(parseISO(dateStr), nowBrasilia());
    if (diff < 0) return 'Já passou';
    if (diff === 0) return 'Hoje!';
    if (diff === 1) return '1 dia';
    return `${diff} dias`;
  };

  const getDaysLeftColor = (dateStr: string) => {
    const diff = differenceInDays(parseISO(dateStr), nowBrasilia());
    if (diff < 0) return 'text-muted-foreground';
    if (diff <= 7) return 'text-destructive';
    if (diff <= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-primary';
  };

  const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Próximas Provas</h2>
        <Button size="sm" onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova Prova
        </Button>
      </div>

      {sortedExams.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma prova cadastrada. Adicione suas próximas provas para acompanhar os prazos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedExams.map(exam => {
            const examSubjects = subjects.filter(s => exam.subjectIds.includes(s.id));
            const isExpanded = expandedId === exam.id;
            const daysLeft = getDaysLeft(exam.date);
            const daysColor = getDaysLeftColor(exam.date);

            return (
              <div
                key={exam.id}
                className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : exam.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm truncate flex-1">{exam.name}</h3>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-primary"
                      onClick={e => { e.stopPropagation(); openEdit(exam); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={e => { e.stopPropagation(); removeExam(exam.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>{format(parseISO(exam.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>

                <div className={cn('flex items-center gap-1.5 text-sm font-semibold mb-3', daysColor)}>
                  <Clock className="h-4 w-4" />
                  <span>{daysLeft}</span>
                </div>

                {examSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(isExpanded ? examSubjects : examSubjects.slice(0, 4)).map(s => (
                      <span key={s.id} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {s.name}
                      </span>
                    ))}
                    {!isExpanded && examSubjects.length > 4 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        +{examSubjects.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {isExpanded && exam.notes && (
                  <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">{exam.notes}</p>
                )}

                {isExpanded && exam.url && (
                  <a
                    href={exam.url.startsWith('http') ? exam.url : `https://${exam.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Acessar edital / banca
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Exam Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExamId ? 'Editar Prova' : 'Nova Prova'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome da prova</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Concurso TRT" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data da prova</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {date ? format(date, "dd/MM/yyyy") : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {subjects.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Matérias exigidas</label>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
                  {subjects.map(s => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedSubjects.includes(s.id)}
                        onCheckedChange={() => toggleSubject(s.id)}
                      />
                      <span className="text-sm text-foreground">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Observações (opcional)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações sobre a prova..." rows={3} />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Link do edital ou banca (opcional)</label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.exemplo.com/edital" />
            </div>

            <Button className="w-full" onClick={handleAdd} disabled={!name || !date}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
