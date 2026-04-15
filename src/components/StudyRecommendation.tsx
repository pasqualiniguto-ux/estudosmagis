import { useMemo, useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, AlertTriangle, TrendingDown, BookOpen, Clock, CalendarCheck, BarChart3, Target, Timer, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface TopicRecommendation {
  subjectName: string;
  subjectColor?: string;
  topicName: string;
  reason: string;
  priority: 'alta' | 'média' | 'baixa';
  percentage: number;
  totalQuestions: number;
  lastStudied: string | null;
  daysSinceStudy: number | null;
  timeStudiedMinutes: number;
}

interface SubjectSummary {
  name: string;
  color?: string;
  percentage: number;
  totalQuestions: number;
  topicsNeverStudied: number;
  topicsTotal: number;
  weakTopics: string[];
  strongTopics: string[];
  totalTimeMinutes: number;
  coveragePercent: number;
  avgDaysSinceStudy: number | null;
}

interface OverallStats {
  totalSubjects: number;
  totalTopics: number;
  topicsStudied: number;
  topicsNeverStudied: number;
  totalQuestions: number;
  overallPercentage: number;
  totalTimeMinutes: number;
  studyDaysCount: number;
  daysUntilExam: number | null;
}

export default function StudyRecommendation() {
  const { subjects, studyLogs, exams, getTopicStats, getSubjectStats } = useStudy();
  const [open, setOpen] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string>('all');

  const upcomingExams = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return exams
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exams]);

  const filteredSubjects = useMemo(() => {
    if (selectedExamId === 'all') return subjects;
    const exam = exams.find(e => e.id === selectedExamId);
    if (!exam) return subjects;
    return subjects.filter(s => exam.subjectIds.includes(s.id));
  }, [subjects, exams, selectedExamId]);

  const selectedExam = exams.find(e => e.id === selectedExamId);

  const analysis = useMemo(() => {
    const subjectSummaries: SubjectSummary[] = [];
    const topicRecs: TopicRecommendation[] = [];
    let globalCorrect = 0;
    let globalWrong = 0;
    let globalTimeSeconds = 0;
    let globalTopicsStudied = 0;
    let globalTopicsTotal = 0;
    const studyDates = new Set<string>();

    filteredSubjects.forEach(subject => {
      const subjectStats = getSubjectStats(subject.id);
      const weakTopics: string[] = [];
      const strongTopics: string[] = [];
      let topicsNeverStudied = 0;
      let subjectTimeSeconds = 0;
      let topicsStudiedInSubject = 0;
      const daysSinceList: number[] = [];

      subject.topics.forEach(topic => {
        globalTopicsTotal++;
        const stats = getTopicStats(topic.id);
        const logsForTopic = studyLogs.filter(l => l.topicId === topic.id);
        const sortedLogs = [...logsForTopic].sort((a, b) => b.date.localeCompare(a.date));
        const lastLog = sortedLogs[0];
        const lastStudied = lastLog?.date || null;

        const topicTime = logsForTopic.reduce((s, l) => s + l.timeStudiedSeconds, 0);
        subjectTimeSeconds += topicTime;

        logsForTopic.forEach(l => {
          studyDates.add(l.date);
          globalCorrect += l.questionsCorrect;
          globalWrong += l.questionsWrong;
          globalTimeSeconds += l.timeStudiedSeconds;
        });

        let daysSince: number | null = null;
        if (lastStudied) {
          daysSince = Math.floor((Date.now() - new Date(lastStudied).getTime()) / 86400000);
          daysSinceList.push(daysSince);
        }

        if (stats.total === 0) {
          topicsNeverStudied++;
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: 'Nunca estudado — nenhuma questão resolvida. Comece por este assunto para ampliar sua cobertura.',
            priority: 'alta',
            percentage: 0,
            totalQuestions: 0,
            lastStudied,
            daysSinceStudy: daysSince,
            timeStudiedMinutes: Math.round(topicTime / 60),
          });
          return;
        }

        topicsStudiedInSubject++;
        globalTopicsStudied++;

        if (stats.percentage < 40) {
          weakTopics.push(topic.name);
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: `Aproveitamento crítico de ${Math.round(stats.percentage)}% em ${stats.total} questões. Revise a teoria e refaça exercícios básicos.`,
            priority: 'alta',
            percentage: stats.percentage,
            totalQuestions: stats.total,
            lastStudied,
            daysSinceStudy: daysSince,
            timeStudiedMinutes: Math.round(topicTime / 60),
          });
          return;
        }

        if (stats.percentage < 60) {
          weakTopics.push(topic.name);
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: `Aproveitamento de ${Math.round(stats.percentage)}% em ${stats.total} questões. Foque em entender os erros e pratique mais.`,
            priority: 'média',
            percentage: stats.percentage,
            totalQuestions: stats.total,
            lastStudied,
            daysSinceStudy: daysSince,
            timeStudiedMinutes: Math.round(topicTime / 60),
          });
          return;
        }

        if (stats.percentage >= 80) {
          strongTopics.push(topic.name);
        }

        if (stats.total < 10 && stats.percentage < 80) {
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: `Apenas ${stats.total} questões resolvidas (${Math.round(stats.percentage)}%). Amostra insuficiente — resolva mais questões para consolidar.`,
            priority: 'baixa',
            percentage: stats.percentage,
            totalQuestions: stats.total,
            lastStudied,
            daysSinceStudy: daysSince,
            timeStudiedMinutes: Math.round(topicTime / 60),
          });
          return;
        }

        if (daysSince !== null && daysSince > 14) {
          const urgency = daysSince > 30 ? 'alta' : 'média';
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: `Última revisão há ${daysSince} dias${daysSince > 30 ? ' — risco de esquecimento alto' : ''}. Revisão periódica é essencial para retenção.`,
            priority: urgency,
            percentage: stats.percentage,
            totalQuestions: stats.total,
            lastStudied,
            daysSinceStudy: daysSince,
            timeStudiedMinutes: Math.round(topicTime / 60),
          });
        }
      });

      if (subject.topics.length > 0) {
        const coveragePercent = subject.topics.length > 0
          ? Math.round((topicsStudiedInSubject / subject.topics.length) * 100)
          : 0;
        const avgDays = daysSinceList.length > 0
          ? Math.round(daysSinceList.reduce((a, b) => a + b, 0) / daysSinceList.length)
          : null;

        subjectSummaries.push({
          name: subject.name,
          color: subject.color,
          percentage: subjectStats.percentage,
          totalQuestions: subjectStats.total,
          topicsNeverStudied,
          topicsTotal: subject.topics.length,
          weakTopics,
          strongTopics,
          totalTimeMinutes: Math.round(subjectTimeSeconds / 60),
          coveragePercent,
          avgDaysSinceStudy: avgDays,
        });
      }
    });

    const priorityOrder = { alta: 0, média: 1, baixa: 2 };
    topicRecs.sort((a, b) => {
      const p = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (p !== 0) return p;
      return a.percentage - b.percentage;
    });

    subjectSummaries.sort((a, b) => a.percentage - b.percentage);

    let daysUntilExam: number | null = null;
    if (selectedExam) {
      daysUntilExam = Math.ceil((new Date(selectedExam.date + 'T23:59:59').getTime() - Date.now()) / 86400000);
    }

    const totalQ = globalCorrect + globalWrong;
    const overallStats: OverallStats = {
      totalSubjects: filteredSubjects.length,
      totalTopics: globalTopicsTotal,
      topicsStudied: globalTopicsStudied,
      topicsNeverStudied: globalTopicsTotal - globalTopicsStudied,
      totalQuestions: totalQ,
      overallPercentage: totalQ > 0 ? (globalCorrect / totalQ) * 100 : 0,
      totalTimeMinutes: Math.round(globalTimeSeconds / 60),
      studyDaysCount: studyDates.size,
      daysUntilExam,
    };

    return { subjectSummaries, topicRecs, overallStats };
  }, [filteredSubjects, studyLogs, getTopicStats, getSubjectStats, selectedExam]);

  const { overallStats } = analysis;

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  };

  const priorityIcon = (p: 'alta' | 'média' | 'baixa') => {
    if (p === 'alta') return <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />;
    if (p === 'média') return <TrendingDown className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />;
    return <BookOpen className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />;
  };

  const priorityColor = (p: 'alta' | 'média' | 'baixa') => {
    if (p === 'alta') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (p === 'média') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  const hasData = filteredSubjects.some(s => s.topics.length > 0);

  const narrativeSummary = useMemo(() => {
    if (!hasData || overallStats.totalTopics === 0) return null;
    const parts: string[] = [];

    const coveragePct = Math.round((overallStats.topicsStudied / overallStats.totalTopics) * 100);
    if (coveragePct < 50) {
      parts.push(`Você estudou apenas ${coveragePct}% dos assuntos cadastrados. Há ${overallStats.topicsNeverStudied} assuntos que nunca foram abordados — priorize iniciar esses temas.`);
    } else if (coveragePct < 80) {
      parts.push(`Cobertura de ${coveragePct}% dos assuntos. Ainda restam ${overallStats.topicsNeverStudied} assuntos não estudados que merecem atenção.`);
    } else {
      parts.push(`Boa cobertura: ${coveragePct}% dos assuntos já foram estudados.`);
    }

    if (overallStats.totalQuestions > 0) {
      const pct = Math.round(overallStats.overallPercentage);
      if (pct < 50) {
        parts.push(`Seu aproveitamento geral é de ${pct}% — abaixo do ideal. Revise a teoria dos assuntos mais fracos antes de fazer mais questões.`);
      } else if (pct < 70) {
        parts.push(`Aproveitamento geral de ${pct}%. Há espaço para melhoria — analise os erros recorrentes.`);
      } else {
        parts.push(`Aproveitamento geral de ${pct}% — bom desempenho! Mantenha a consistência.`);
      }
    }

    if (overallStats.daysUntilExam !== null) {
      if (overallStats.daysUntilExam <= 7) {
        parts.push(`⚠️ Faltam apenas ${overallStats.daysUntilExam} dia${overallStats.daysUntilExam !== 1 ? 's' : ''} para a prova! Foque em revisar os assuntos mais fracos e consolidar o que já sabe.`);
      } else if (overallStats.daysUntilExam <= 30) {
        parts.push(`Faltam ${overallStats.daysUntilExam} dias para a prova. Distribua bem o tempo entre os assuntos prioritários.`);
      }
    }

    return parts.join(' ');
  }, [hasData, overallStats]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2" variant="outline">
        <Sparkles className="h-4 w-4" />
        Sugestão de estudo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestão de Estudo
            </DialogTitle>
            <DialogDescription>
              Análise completa do seu desempenho, cobertura, tempo investido e recomendações prioritárias.
            </DialogDescription>
          </DialogHeader>

          {/* Exam selector */}
          {upcomingExams.length > 0 && (
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma prova" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as matérias</SelectItem>
                  {upcomingExams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} — {new Date(exam.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedExam && overallStats.daysUntilExam !== null && (
            <div className={`rounded-lg border p-3 ${overallStats.daysUntilExam <= 7 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-accent/50'}`}>
              <p className="text-xs text-muted-foreground">
                Sugestões para <strong className="text-foreground">{selectedExam.name}</strong> ({filteredSubjects.length} matéria{filteredSubjects.length !== 1 ? 's' : ''})
                {' · '}{new Date(selectedExam.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                {' · '}<strong className={overallStats.daysUntilExam <= 7 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}>{overallStats.daysUntilExam} dia{overallStats.daysUntilExam !== 1 ? 's' : ''} restante{overallStats.daysUntilExam !== 1 ? 's' : ''}</strong>
              </p>
            </div>
          )}

          {!hasData ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {selectedExamId !== 'all'
                ? 'Nenhum assunto cadastrado nas matérias desta prova.'
                : 'Adicione matérias e assuntos para receber recomendações personalizadas.'}
            </p>
          ) : (
            <div className="space-y-5">
              {/* Overall stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="rounded-lg border bg-card p-2.5 text-center">
                  <BarChart3 className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{overallStats.totalQuestions}</p>
                  <p className="text-[10px] text-muted-foreground">Questões feitas</p>
                </div>
                <div className="rounded-lg border bg-card p-2.5 text-center">
                  <Target className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{overallStats.totalQuestions > 0 ? `${Math.round(overallStats.overallPercentage)}%` : '—'}</p>
                  <p className="text-[10px] text-muted-foreground">Aproveitamento</p>
                </div>
                <div className="rounded-lg border bg-card p-2.5 text-center">
                  <Timer className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{formatTime(overallStats.totalTimeMinutes)}</p>
                  <p className="text-[10px] text-muted-foreground">Tempo total</p>
                </div>
                <div className="rounded-lg border bg-card p-2.5 text-center">
                  <Brain className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold text-foreground">{overallStats.topicsStudied}/{overallStats.totalTopics}</p>
                  <p className="text-[10px] text-muted-foreground">Cobertura</p>
                </div>
              </div>

              {/* Narrative summary */}
              {narrativeSummary && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs text-foreground leading-relaxed">
                    <strong>📊 Diagnóstico:</strong> {narrativeSummary}
                  </p>
                </div>
              )}

              {analysis.topicRecs.length === 0 ? (
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">🎉 Excelente!</p>
                  <p className="text-sm text-muted-foreground">
                    Todos os seus assuntos estão com bom desempenho e foram revisados recentemente. Continue assim!
                  </p>
                </div>
              ) : (
                <>
                  <Separator />

                  {/* Subject overview */}
                  {analysis.subjectSummaries.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Visão geral por matéria
                      </h3>
                      <div className="space-y-2">
                        {analysis.subjectSummaries.map((s, i) => (
                          <div key={i} className="p-2.5 rounded-lg border bg-card space-y-1.5">
                            <div className="flex items-center gap-2">
                              {s.color && <span className="block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />}
                              <span className="text-sm font-medium text-foreground flex-1">{s.name}</span>
                              <span className="text-xs font-medium text-foreground">
                                {s.totalQuestions > 0 ? `${Math.round(s.percentage)}%` : '—'}
                              </span>
                            </div>
                            {s.totalQuestions > 0 && (
                              <Progress value={s.percentage} className="h-1.5" />
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                              <span>{s.totalQuestions} questões</span>
                              <span>{formatTime(s.totalTimeMinutes)} estudados</span>
                              <span>Cobertura: {s.coveragePercent}%</span>
                              {s.topicsNeverStudied > 0 && (
                                <span className="text-red-500 dark:text-red-400">{s.topicsNeverStudied} assunto{s.topicsNeverStudied > 1 ? 's' : ''} não estudado{s.topicsNeverStudied > 1 ? 's' : ''}</span>
                              )}
                              {s.avgDaysSinceStudy !== null && (
                                <span>Média de {s.avgDaysSinceStudy}d desde último estudo</span>
                              )}
                            </div>
                            {s.weakTopics.length > 0 && (
                              <p className="text-[10px] text-red-600 dark:text-red-400">
                                Pontos fracos: {s.weakTopics.slice(0, 4).join(', ')}
                              </p>
                            )}
                            {s.strongTopics.length > 0 && (
                              <p className="text-[10px] text-green-600 dark:text-green-400">
                                Pontos fortes: {s.strongTopics.slice(0, 4).join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Prioritized topics */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Assuntos prioritários ({analysis.topicRecs.length})
                    </h3>
                    <div className="space-y-2">
                      {analysis.topicRecs.slice(0, 20).map((rec, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-card">
                          {priorityIcon(rec.priority)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{rec.topicName}</span>
                              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityColor(rec.priority)}`}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{rec.subjectName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{rec.reason}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                              {rec.totalQuestions > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Target className="h-2.5 w-2.5" />
                                  {Math.round(rec.percentage)}% em {rec.totalQuestions} questões
                                </span>
                              )}
                              {rec.timeStudiedMinutes > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Timer className="h-2.5 w-2.5" />
                                  {formatTime(rec.timeStudiedMinutes)}
                                </span>
                              )}
                              {rec.lastStudied && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {rec.daysSinceStudy !== null ? `há ${rec.daysSinceStudy}d` : new Date(rec.lastStudied).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Tip */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs text-foreground leading-relaxed">
                  💡 <strong>Dica:</strong> Use estas sugestões ao planejar seu cronograma semanal.
                  Priorize assuntos com aproveitamento baixo ou que nunca foram estudados.
                  Revise periodicamente os assuntos que não estuda há mais de 2 semanas.
                  {overallStats.topicsNeverStudied > 0 && ` Você ainda tem ${overallStats.topicsNeverStudied} assunto${overallStats.topicsNeverStudied > 1 ? 's' : ''} não iniciado${overallStats.topicsNeverStudied > 1 ? 's' : ''} — incluí-los no plano é fundamental.`}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
