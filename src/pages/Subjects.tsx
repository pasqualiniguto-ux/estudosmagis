import { useState } from 'react';
import AppNavigation from '@/components/AppNavigation';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, ChevronDown, ChevronRight, ClipboardList, Pencil } from 'lucide-react';

const SUBJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#8b5cf6'
];

function PercentageBadge({ percentage }: { percentage: number }) {
  if (percentage < 0) return <span className="text-[10px] text-muted-foreground">—</span>;
  const pct = Math.round(percentage);
  let colorClass = 'text-performance-success';
  if (pct < 60) colorClass = 'text-performance-danger';
  else if (pct < 80) colorClass = 'text-performance-warning';
  return <span className={`text-xs font-bold ${colorClass}`}>{pct}%</span>;
}

export default function Subjects() {
  const { subjects, addSubject, updateSubject, removeSubject, addTopic, removeTopic, getTopicStats, getSubjectStats, addStudyLog } = useStudy();

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);

  const [editSubjectState, setEditSubjectState] = useState<{ id: string, name: string, color: string } | null>(null);

  const [addTopicSubjectId, setAddTopicSubjectId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Manual log per topic
  const [logTopic, setLogTopic] = useState<{ subjectId: string; topicId: string; topicName: string } | null>(null);
  const [logCorrect, setLogCorrect] = useState(0);
  const [logWrong, setLogWrong] = useState(0);

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    addSubject(newSubjectName.trim(), newSubjectColor);
    setNewSubjectName('');
    setNewSubjectColor(SUBJECT_COLORS[0]);
    setShowAddSubject(false);
  };

  const handleEditSubject = () => {
    if (!editSubjectState || !editSubjectState.name.trim()) return;
    updateSubject(editSubjectState.id, { name: editSubjectState.name.trim(), color: editSubjectState.color });
    setEditSubjectState(null);
  };

  const handleAddTopic = () => {
    if (!addTopicSubjectId || !newTopicName.trim()) return;
    
    // Divide o texto por quebras de linha e adiciona cada linha não vazia como um novo assunto
    const lines = newTopicName.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    lines.forEach(line => addTopic(addTopicSubjectId, line));

    setNewTopicName('');
    setAddTopicSubjectId(null);
  };

  const handleManualTopicLog = () => {
    if (!logTopic) return;
    addStudyLog({
      subjectId: logTopic.subjectId,
      topicId: logTopic.topicId,
      topicName: logTopic.topicName,
      date: new Date().toISOString().split('T')[0],
      timeStudiedSeconds: 0,
      questionsCorrect: logCorrect,
      questionsWrong: logWrong,
      scheduleEntryId: '',
    });
    setLogTopic(null);
    setLogCorrect(0);
    setLogWrong(0);
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-background">
      <AppNavigation />
      <main className="container py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Matérias</h1>
          <Button size="sm" onClick={() => setShowAddSubject(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova matéria
          </Button>
        </div>

        {subjects.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-2">Nenhuma matéria cadastrada</p>
            <p className="text-sm">Clique em "Nova matéria" para começar.</p>
          </div>
        )}

        <div className="space-y-3">
          {subjects.map(subject => {
            const isExpanded = expanded[subject.id];
            return (
              <div key={subject.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(subject.id)}
                  style={{ borderLeft: subject.color ? `4px solid ${subject.color}` : '4px solid transparent' }}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-semibold text-foreground flex-1">{subject.name}</span>
                  {(() => {
                    const stats = getSubjectStats(subject.id);
                    if (stats.total > 0) {
                      return (
                        <div className="hidden sm:flex items-center gap-3 mr-2 text-xs text-muted-foreground bg-background/50 px-3 py-1 rounded-md border border-border/50">
                          <span>{stats.total} questões</span>
                          <span className="text-primary font-medium">{stats.correct} ✓</span>
                          <span className="text-destructive font-medium">{stats.wrong} ✗</span>
                          <PercentageBadge percentage={stats.percentage} />
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={e => { e.stopPropagation(); setEditSubjectState({ id: subject.id, name: subject.name, color: subject.color || SUBJECT_COLORS[0] }); }}
                    title="Editar matéria"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={e => { e.stopPropagation(); setAddTopicSubjectId(subject.id); setNewTopicName(''); }}
                    title="Adicionar assunto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); removeSubject(subject.id); }}
                    title="Remover matéria"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {isExpanded && (
                  <div className="border-t border-border">
                    {subject.topics.length === 0 && (
                      <p className="text-xs text-muted-foreground p-3">Nenhum assunto cadastrado.</p>
                    )}
                    {subject.topics.map(topic => {
                      const stats = getTopicStats(topic.id);
                      return (
                        <div key={topic.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                          <span className="text-sm text-foreground flex-1">{topic.name}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {stats.total > 0 && (
                              <>
                                <span>{stats.total} questões</span>
                                <span className="text-primary">{stats.correct} ✓</span>
                                <span className="text-destructive">{stats.wrong} ✗</span>
                              </>
                            )}
                            <PercentageBadge percentage={stats.percentage} />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => { setLogTopic({ subjectId: subject.id, topicId: topic.id, topicName: topic.name }); setLogCorrect(0); setLogWrong(0); }}
                            title="Registrar questões"
                          >
                            <ClipboardList className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => removeTopic(subject.id, topic.id)}
                            title="Remover assunto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Add Subject Dialog */}
      <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nova matéria</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input placeholder="Nome da matéria" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()} autoFocus />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Cor</label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewSubjectColor(c)}
                    className={`h-6 w-6 rounded-full border-2 focus:outline-none transition-all ${newSubjectColor === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleAddSubject} disabled={!newSubjectName.trim()}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={!!editSubjectState} onOpenChange={o => { if (!o) setEditSubjectState(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar matéria</DialogTitle></DialogHeader>
          {editSubjectState && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <Input placeholder="Nome da matéria" value={editSubjectState.name} onChange={e => setEditSubjectState({ ...editSubjectState, name: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleEditSubject()} autoFocus />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditSubjectState({ ...editSubjectState, color: c })}
                      className={`h-6 w-6 rounded-full border-2 focus:outline-none transition-all ${editSubjectState.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleEditSubject} disabled={!editSubjectState.name.trim()}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={!!addTopicSubjectId} onOpenChange={o => { if (!o) setAddTopicSubjectId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo assunto</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground mb-1">
              Cole ou digite um assunto por linha. Cada linha será transformada num assunto isolado.
            </p>
            <Textarea 
              placeholder="Digite o nome do assunto..." 
              value={newTopicName} 
              onChange={e => setNewTopicName(e.target.value)} 
              className="min-h-[160px]"
              autoFocus
            />
            <Button className="w-full" onClick={handleAddTopic} disabled={!newTopicName.trim()}>Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Topic Log Dialog */}
      <Dialog open={!!logTopic} onOpenChange={o => { if (!o) setLogTopic(null); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Registrar questões</DialogTitle></DialogHeader>
          {logTopic && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Assunto: <span className="text-foreground font-medium">{logTopic.topicName}</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Certas</label>
                  <Input type="number" min={0} value={logCorrect} onChange={e => setLogCorrect(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Erradas</label>
                  <Input type="number" min={0} value={logWrong} onChange={e => setLogWrong(Number(e.target.value))} />
                </div>
              </div>
              <Button className="w-full" onClick={handleManualTopicLog}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
