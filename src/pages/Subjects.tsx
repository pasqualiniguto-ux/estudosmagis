import React, { useState } from 'react';
import { todayStr } from '@/lib/dateUtils';
import AppNavigation from '@/components/AppNavigation';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, ChevronDown, ChevronRight, ClipboardList, Pencil, Link2, FileText, ExternalLink, Paperclip, Loader2, Upload, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const { subjects, addSubject, updateSubject, removeSubject, addTopic, updateTopic, removeTopic, getTopicStats, getSubjectStats, addStudyLog, studyLogs, updateStudyLog, removeStudyLog } = useStudy();

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState(SUBJECT_COLORS[0]);
  const [newSubjectCategory, setNewSubjectCategory] = useState<'specific' | 'general'>('specific');

  const [editSubjectState, setEditSubjectState] = useState<{ id: string, name: string, color: string, category: 'specific' | 'general' } | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<'all' | 'specific' | 'general'>('all');

  const [addTopicSubjectId, setAddTopicSubjectId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Attachment state
  const [attachmentTarget, setAttachmentTarget] = useState<{ subjectId: string; topicId?: string; name: string; pdfUrl?: string; webUrl?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newWebUrl, setNewWebUrl] = useState('');

  // Manual log per topic
  const [logTopic, setLogTopic] = useState<{ subjectId: string; topicId: string; topicName: string } | null>(null);

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'subject' | 'topic'; subjectId: string; topicId?: string; name: string } | null>(null);
  const [logCorrect, setLogCorrect] = useState(0);
  const [logWrong, setLogWrong] = useState(0);

  // Edit topic name
  const [editTopicState, setEditTopicState] = useState<{ subjectId: string; topicId: string; name: string } | null>(null);

  // View/edit logs for a topic
  const [viewLogsTopic, setViewLogsTopic] = useState<{ subjectId: string; topicId: string; topicName: string } | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogCorrect, setEditLogCorrect] = useState(0);
  const [editLogWrong, setEditLogWrong] = useState(0);

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    addSubject(newSubjectName.trim(), newSubjectColor, newSubjectCategory);
    setNewSubjectName('');
    setNewSubjectColor(SUBJECT_COLORS[0]);
    setNewSubjectCategory('specific');
    setShowAddSubject(false);
  };

  const handleEditSubject = () => {
    if (!editSubjectState || !editSubjectState.name.trim()) return;
    updateSubject(editSubjectState.id, { name: editSubjectState.name.trim(), color: editSubjectState.color, category: editSubjectState.category });
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
      date: todayStr(),
      timeStudiedSeconds: 0,
      questionsCorrect: logCorrect,
      questionsWrong: logWrong,
      scheduleEntryId: '',
    });
    setLogTopic(null);
    setLogCorrect(0);
    setLogWrong(0);
  };

  const handleEditTopic = () => {
    if (!editTopicState || !editTopicState.name.trim()) return;
    updateTopic(editTopicState.subjectId, editTopicState.topicId, { name: editTopicState.name.trim() });
    setEditTopicState(null);
  };

  const handleEditLog = (logId: string) => {
    updateStudyLog(logId, { questionsCorrect: editLogCorrect, questionsWrong: editLogWrong });
    setEditingLogId(null);
  };

  const getLogsForTopic = (topicId: string) => studyLogs.filter(l => l.topicId === topicId);

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleUploadPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !attachmentTarget) return;

    if (file.type !== 'application/pdf') {
      toast({ title: 'Apenas PDF', description: 'Por favor, selecione um arquivo PDF.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('study_materials')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('study_materials')
        .getPublicUrl(filePath);

      if (attachmentTarget.topicId) {
        updateTopic(attachmentTarget.subjectId, attachmentTarget.topicId, { pdfUrl: publicUrl });
      } else {
        updateSubject(attachmentTarget.subjectId, { pdfUrl: publicUrl });
      }

      setAttachmentTarget(prev => prev ? { ...prev, pdfUrl: publicUrl } : null);
      toast({ title: 'PDF enviado!', description: 'O material foi atrelado com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveWebUrl = () => {
    if (!attachmentTarget) return;

    if (attachmentTarget.topicId) {
      updateTopic(attachmentTarget.subjectId, attachmentTarget.topicId, { webUrl: newWebUrl });
    } else {
      updateSubject(attachmentTarget.subjectId, { webUrl: newWebUrl });
    }

    setAttachmentTarget(prev => prev ? { ...prev, webUrl: newWebUrl } : null);
    toast({ title: 'Link salvo!', description: 'A URL foi atualizada com sucesso.' });
  };

  const handleDeletePDF = async () => {
    if (!user || !attachmentTarget?.pdfUrl) return;

    setIsUploading(true);
    try {
      // Extrair o caminho do arquivo a partir da URL pública
      const url = new URL(attachmentTarget.pdfUrl);
      const pathParts = url.pathname.split('/');
      // O caminho real no bucket começa depois do nome do bucket ('study_materials')
      const bucketIdx = pathParts.indexOf('study_materials');
      const filePath = pathParts.slice(bucketIdx + 2).join('/'); // Pulamos 'study_materials' e 'public'/'object'

      const { error: deleteError } = await supabase.storage
        .from('study_materials')
        .remove([filePath]);

      if (deleteError) throw deleteError;

      if (attachmentTarget.topicId) {
        updateTopic(attachmentTarget.subjectId, attachmentTarget.topicId, { pdfUrl: undefined });
      } else {
        updateSubject(attachmentTarget.subjectId, { pdfUrl: undefined });
      }

      setAttachmentTarget(prev => prev ? { ...prev, pdfUrl: undefined } : null);
      toast({ title: 'PDF removido', description: 'O arquivo foi apagado com sucesso.' });
    } catch (error: any) {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppNavigation />
      <main className="container py-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Matérias</h1>
          <Button size="sm" onClick={() => setShowAddSubject(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova matéria
          </Button>
        </div>

        {subjects.length > 0 && (
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4 w-fit">
            {([
              { id: 'all', label: `Todas (${subjects.length})` },
              { id: 'specific', label: `Específicos (${subjects.filter(s => (s.category || 'specific') === 'specific').length})` },
              { id: 'general', label: `Gerais (${subjects.filter(s => s.category === 'general').length})` },
            ] as const).map(opt => (
              <button
                key={opt.id}
                onClick={() => setCategoryFilter(opt.id)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${categoryFilter === opt.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {subjects.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-2">Nenhuma matéria cadastrada</p>
            <p className="text-sm">Clique em "Nova matéria" para começar.</p>
          </div>
        )}

        <div className="space-y-3">
          {subjects.filter(s => categoryFilter === 'all' ? true : (s.category || 'specific') === categoryFilter).map(subject => {
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
                  <div className="flex items-center gap-1">
                    {subject.pdfUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={e => { e.stopPropagation(); window.open(subject.pdfUrl, '_blank'); }}
                        title="Abrir PDF"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    {subject.webUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={e => { e.stopPropagation(); window.open(subject.webUrl, '_blank'); }}
                        title="Abrir Link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={e => { 
                        e.stopPropagation(); 
                        setAttachmentTarget({ subjectId: subject.id, name: subject.name, pdfUrl: subject.pdfUrl, webUrl: subject.webUrl });
                        setNewWebUrl(subject.webUrl || '');
                      }}
                      title="Materiais de estudo"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={e => { e.stopPropagation(); setEditSubjectState({ id: subject.id, name: subject.name, color: subject.color || SUBJECT_COLORS[0], category: subject.category || 'specific' }); }}
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
                    onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'subject', subjectId: subject.id, name: subject.name }); }}
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
                      const topicLogs = studyLogs.filter(l => l.topicId === topic.id && (l.questionsCorrect > 0 || l.questionsWrong > 0));
                      const lastLog = topicLogs.length > 0 ? topicLogs.sort((a, b) => b.date.localeCompare(a.date))[0] : null;
                      const lastDateLabel = lastLog
                        ? (() => {
                            const today = todayStr();
                            if (lastLog.date === today) return 'Hoje';
                            const diff = Math.floor((new Date(today).getTime() - new Date(lastLog.date).getTime()) / 86400000);
                            if (diff === 1) return 'Ontem';
                            return `${diff}d atrás`;
                          })()
                        : null;
                      return (
                        <div key={topic.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                          <span className="text-sm text-foreground flex-1">{topic.name}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {lastDateLabel ? (
                              <span className="flex items-center gap-1 text-muted-foreground/70">
                                <Clock className="h-3 w-3" />{lastDateLabel}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50 italic text-[10px]">Nunca estudado</span>
                            )}
                            {stats.total > 0 && (
                              <>
                                <span>{stats.total} questões</span>
                                <span className="text-primary">{stats.correct} ✓</span>
                                <span className="text-destructive">{stats.wrong} ✗</span>
                              </>
                            )}
                            <PercentageBadge percentage={stats.percentage} />
                          </div>
                          <div className="flex items-center gap-1">
                            {topic.pdfUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => window.open(topic.pdfUrl, '_blank')}
                                title="Abrir PDF"
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {topic.webUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => window.open(topic.webUrl, '_blank')}
                                title="Abrir Link"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => {
                                setAttachmentTarget({ subjectId: subject.id, topicId: topic.id, name: topic.name, pdfUrl: topic.pdfUrl, webUrl: topic.webUrl });
                                setNewWebUrl(topic.webUrl || '');
                              }}
                              title="Materiais de estudo"
                            >
                              <Paperclip className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => setEditTopicState({ subjectId: subject.id, topicId: topic.id, name: topic.name })}
                            title="Editar assunto"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => { setLogTopic({ subjectId: subject.id, topicId: topic.id, topicName: topic.name }); setLogCorrect(0); setLogWrong(0); }}
                            title="Registrar questões"
                          >
                            <ClipboardList className="h-3 w-3" />
                          </Button>
                          {getLogsForTopic(topic.id).length > 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => { setViewLogsTopic({ subjectId: subject.id, topicId: topic.id, topicName: topic.name }); setEditingLogId(null); }}
                              title="Ver/editar registros"
                            >
                              <span className="text-[10px] font-bold">📋</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmDelete({ type: 'topic', subjectId: subject.id, topicId: topic.id, name: topic.name })}
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
      {/* Material / Attachment Dialog */}
      <Dialog open={!!attachmentTarget} onOpenChange={o => { if (!o) setAttachmentTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Materiais: {attachmentTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* PDF Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arquivo PDF</label>
              {attachmentTarget?.pdfUrl ? (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-medium truncate max-w-[150px]">Material Anexado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-primary" onClick={() => window.open(attachmentTarget.pdfUrl, '_blank')}>
                      Abrir
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleDeletePDF} disabled={isUploading}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <label className="cursor-pointer ml-1">
                      <Input type="file" accept=".pdf" className="hidden" onChange={handleUploadPDF} disabled={isUploading} />
                      <span className="text-xs text-muted-foreground hover:text-foreground">Trocar</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors pointer-events-none">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">Nenhum PDF anexado</p>
                  <label className="absolute inset-0 cursor-pointer pointer-events-auto">
                    <Input type="file" accept=".pdf" className="hidden" onChange={handleUploadPDF} disabled={isUploading} />
                  </label>
                  {isUploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Web URL */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL do Material / Questões</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="https://app.tecconcursos.com.br/..." 
                    value={newWebUrl} 
                    onChange={e => setNewWebUrl(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button size="sm" onClick={handleSaveWebUrl}>Salvar</Button>
              </div>
              {attachmentTarget?.webUrl && (
                <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => window.open(attachmentTarget.webUrl, '_blank')}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Testar link atual
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Topic Dialog */}
      <Dialog open={!!editTopicState} onOpenChange={o => { if (!o) setEditTopicState(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar assunto</DialogTitle></DialogHeader>
          {editTopicState && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <Input
                  placeholder="Nome do assunto"
                  value={editTopicState.name}
                  onChange={e => setEditTopicState({ ...editTopicState, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleEditTopic()}
                  autoFocus
                />
              </div>
              <Button className="w-full" onClick={handleEditTopic} disabled={!editTopicState.name.trim()}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View/Edit Logs Dialog */}
      <Dialog open={!!viewLogsTopic} onOpenChange={o => { if (!o) { setViewLogsTopic(null); setEditingLogId(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registros: {viewLogsTopic?.topicName}</DialogTitle></DialogHeader>
          {viewLogsTopic && (
            <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
              {getLogsForTopic(viewLogsTopic.topicId).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado.</p>
              ) : (
                getLogsForTopic(viewLogsTopic.topicId)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(log => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                      {editingLogId === log.id ? (
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-muted-foreground">Certas</label>
                              <Input type="number" min={0} value={editLogCorrect} onChange={e => setEditLogCorrect(Number(e.target.value))} className="h-8 text-sm" />
                            </div>
                            <div>
                              <label className="text-[10px] text-muted-foreground">Erradas</label>
                              <Input type="number" min={0} value={editLogWrong} onChange={e => setEditLogWrong(Number(e.target.value))} className="h-8 text-sm" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => handleEditLog(log.id)}>Salvar</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingLogId(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">{log.date.split('-').reverse().join('/')}</p>
                            <div className="flex gap-3 text-sm mt-0.5">
                              <span className="text-primary font-medium">{log.questionsCorrect} ✓</span>
                              <span className="text-destructive font-medium">{log.questionsWrong} ✗</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => { setEditingLogId(log.id); setEditLogCorrect(log.questionsCorrect); setEditLogWrong(log.questionsWrong); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeStudyLog(log.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === 'subject'
                ? `A matéria "${confirmDelete?.name}" e todos os seus assuntos serão excluídos permanentemente.`
                : `O assunto "${confirmDelete?.name}" e seus registros serão excluídos permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete?.type === 'subject') {
                  removeSubject(confirmDelete.subjectId);
                } else if (confirmDelete?.type === 'topic' && confirmDelete.topicId) {
                  removeTopic(confirmDelete.subjectId, confirmDelete.topicId);
                }
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
