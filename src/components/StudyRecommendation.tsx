import { useMemo, useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sparkles, AlertTriangle, TrendingDown, BookOpen, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TopicRecommendation {
  subjectName: string;
  subjectColor?: string;
  topicName: string;
  reason: string;
  priority: 'alta' | 'média' | 'baixa';
  percentage: number;
  totalQuestions: number;
  lastStudied: string | null;
}

interface SubjectSummary {
  name: string;
  color?: string;
  percentage: number;
  totalQuestions: number;
  topicsNeverStudied: number;
  topicsTotal: number;
  weakTopics: string[];
}

export default function StudyRecommendation() {
  const { subjects, studyLogs, getTopicStats, getSubjectStats } = useStudy();
  const [open, setOpen] = useState(false);

  const analysis = useMemo(() => {
    const subjectSummaries: SubjectSummary[] = [];
    const topicRecs: TopicRecommendation[] = [];

    subjects.forEach(subject => {
      const subjectStats = getSubjectStats(subject.id);
      const weakTopics: string[] = [];
      let topicsNeverStudied = 0;

      subject.topics.forEach(topic => {
        const stats = getTopicStats(topic.id);
        const logsForTopic = studyLogs.filter(l => l.topicId === topic.id);
        const lastLog = logsForTopic.sort((a, b) => b.date.localeCompare(a.date))[0];
        const lastStudied = lastLog?.date || null;

        // Never studied
        if (stats.total === 0) {
          topicsNeverStudied++;
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: 'Nunca estudado — nenhuma questão resolvida.',
            priority: 'alta',
            percentage: 0,
            totalQuestions: 0,
            lastStudied,
          });
          return;
        }

        // Low performance (< 60%)
        if (stats.percentage < 60) {
          weakTopics.push(topic.name);
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: `Aproveitamento baixo (${Math.round(stats.percentage)}%) com ${stats.total} questões.`,
            priority: stats.percentage < 40 ? 'alta' : 'média',
            percentage: stats.percentage,
            totalQuestions: stats.total,
            lastStudied,
          });
          return;
        }

        // Few questions (< 10) even if good performance
        if (stats.total < 10 && stats.percentage < 80) {
          topicRecs.push({
            subjectName: subject.name,
            subjectColor: subject.color,
            topicName: topic.name,
            reason: `Poucas questões resolvidas (${stats.total}). Aprofunde para consolidar.`,
            priority: 'baixa',
            percentage: stats.percentage,
            totalQuestions: stats.total,
            lastStudied,
          });
          return;
        }

        // Not studied recently (> 14 days)
        if (lastStudied) {
          const daysSince = Math.floor((Date.now() - new Date(lastStudied).getTime()) / 86400000);
          if (daysSince > 14) {
            topicRecs.push({
              subjectName: subject.name,
              subjectColor: subject.color,
              topicName: topic.name,
              reason: `Última revisão há ${daysSince} dias. Revise para manter o conhecimento.`,
              priority: 'média',
              percentage: stats.percentage,
              totalQuestions: stats.total,
              lastStudied,
            });
          }
        }
      });

      if (subject.topics.length > 0) {
        subjectSummaries.push({
          name: subject.name,
          color: subject.color,
          percentage: subjectStats.percentage,
          totalQuestions: subjectStats.total,
          topicsNeverStudied,
          topicsTotal: subject.topics.length,
          weakTopics,
        });
      }
    });

    // Sort: alta first, then média, then baixa; within same priority, lower percentage first
    const priorityOrder = { alta: 0, média: 1, baixa: 2 };
    topicRecs.sort((a, b) => {
      const p = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (p !== 0) return p;
      return a.percentage - b.percentage;
    });

    // Sort subjects by worst performance
    subjectSummaries.sort((a, b) => a.percentage - b.percentage);

    return { subjectSummaries, topicRecs };
  }, [subjects, studyLogs, getTopicStats, getSubjectStats]);

  const priorityIcon = (p: 'alta' | 'média' | 'baixa') => {
    if (p === 'alta') return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    if (p === 'média') return <TrendingDown className="h-3.5 w-3.5 text-yellow-500" />;
    return <BookOpen className="h-3.5 w-3.5 text-blue-500" />;
  };

  const priorityColor = (p: 'alta' | 'média' | 'baixa') => {
    if (p === 'alta') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    if (p === 'média') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  };

  const hasData = subjects.some(s => s.topics.length > 0);

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
              Recomendações baseadas no seu desempenho, frequência e cobertura de assuntos.
            </DialogDescription>
          </DialogHeader>

          {!hasData ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Adicione matérias e assuntos para receber recomendações personalizadas.
            </p>
          ) : analysis.topicRecs.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm font-medium text-foreground">🎉 Excelente!</p>
              <p className="text-sm text-muted-foreground">
                Todos os seus assuntos estão com bom desempenho e foram revisados recentemente.
                Continue assim!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Subject overview */}
              {analysis.subjectSummaries.filter(s => s.totalQuestions > 0 || s.topicsNeverStudied > 0).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Visão geral por matéria</h3>
                  <div className="space-y-2">
                    {analysis.subjectSummaries
                      .filter(s => s.totalQuestions > 0 || s.topicsNeverStudied > 0)
                      .slice(0, 5)
                      .map((s, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border bg-card">
                          {s.color && <span className="block w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: s.color }} />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{s.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.totalQuestions > 0 ? `${Math.round(s.percentage)}% de aproveitamento em ${s.totalQuestions} questões` : 'Nenhuma questão resolvida'}
                              {s.topicsNeverStudied > 0 && ` · ${s.topicsNeverStudied} de ${s.topicsTotal} assuntos não estudados`}
                              {s.weakTopics.length > 0 && ` · Pontos fracos: ${s.weakTopics.slice(0, 3).join(', ')}`}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Prioritized topics */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Assuntos prioritários ({analysis.topicRecs.length})
                </h3>
                <div className="space-y-2">
                  {analysis.topicRecs.slice(0, 15).map((rec, i) => (
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
                        {rec.lastStudied && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Último estudo: {new Date(rec.lastStudied).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <p className="text-xs text-foreground">
                  💡 <strong>Dica:</strong> Use estas sugestões ao planejar seu cronograma semanal.
                  Priorize assuntos com aproveitamento baixo ou que nunca foram estudados.
                  Revise periodicamente os assuntos que não estuda há mais de 2 semanas.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
