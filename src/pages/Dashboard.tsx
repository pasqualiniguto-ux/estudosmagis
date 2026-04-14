import { useMemo, useState } from 'react';
import AppNavigation from '@/components/AppNavigation';
import { useStudy } from '@/contexts/StudyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { Clock, Target, TrendingUp, BookOpen } from 'lucide-react';
import StudyRecommendation from '@/components/StudyRecommendation';

function fmtHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export default function Dashboard() {
  const { subjects, studyLogs, scheduleEntries, dailyProgress, getSubjectStats } = useStudy();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  const totalStudiedSeconds = useMemo(() => {
    return dailyProgress.reduce((sum, p) => sum + p.studiedSeconds, 0);
  }, [dailyProgress]);

  const subjectHours = useMemo(() => {
    return subjects.map(s => {
      const seconds = dailyProgress
        .filter(p => p.subjectId === s.id)
        .reduce((sum, p) => sum + p.studiedSeconds, 0);
      return { id: s.id, name: s.name, seconds };
    }).sort((a, b) => b.seconds - a.seconds);
  }, [subjects, dailyProgress]);

  // Subject performance data
  const subjectPerformance = useMemo(() => {
    return subjects.map(s => {
      const stats = getSubjectStats(s.id);
      return { id: s.id, name: s.name, color: s.color, ...stats };
    }).filter(s => s.total > 0);
  }, [subjects, getSubjectStats]);

  // Monthly evolution for selected subject
  const monthlyEvolution = useMemo(() => {
    const targetLogs = selectedSubjectId === 'all'
      ? studyLogs
      : studyLogs.filter(l => l.subjectId === selectedSubjectId);

    const monthMap = new Map<string, { correct: number; wrong: number; total: number }>();

    targetLogs.forEach(log => {
      const month = log.date.substring(0, 7); // YYYY-MM
      const existing = monthMap.get(month) || { correct: 0, wrong: 0, total: 0 };
      existing.correct += log.questionsCorrect;
      existing.wrong += log.questionsWrong;
      existing.total += log.questionsCorrect + log.questionsWrong;
      monthMap.set(month, existing);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: formatMonth(month),
        rawMonth: month,
        percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        correct: data.correct,
        wrong: data.wrong,
        total: data.total,
      }));
  }, [studyLogs, selectedSubjectId]);

  // Chart config for hours bar chart
  const hoursChartConfig = {
    hours: { label: 'Horas', color: 'hsl(var(--primary))' },
  };

  const evolutionChartConfig = {
    percentage: { label: 'Aproveitamento %', color: 'hsl(var(--primary))' },
  };

  const hoursBarData = subjectHours.map(s => ({
    name: s.name.length > 12 ? s.name.substring(0, 12) + '…' : s.name,
    fullName: s.name,
    hours: Math.round((s.seconds / 3600) * 100) / 100,
  }));

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppNavigation />
      <main className="container py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total estudado</p>
                <p className="text-lg font-bold text-foreground">{fmtHours(totalStudiedSeconds)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Matérias</p>
                <p className="text-lg font-bold text-foreground">{subjects.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Questões resolvidas</p>
                <p className="text-lg font-bold text-foreground">
                  {studyLogs.reduce((s, l) => s + l.questionsCorrect + l.questionsWrong, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aproveitamento geral</p>
                <p className="text-lg font-bold text-foreground">
                  {(() => {
                    const c = studyLogs.reduce((s, l) => s + l.questionsCorrect, 0);
                    const t = studyLogs.reduce((s, l) => s + l.questionsCorrect + l.questionsWrong, 0);
                    return t > 0 ? `${Math.round((c / t) * 100)}%` : '—';
                  })()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Hours per subject chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Horas por matéria</CardTitle>
            </CardHeader>
            <CardContent>
              {hoursBarData.length > 0 ? (
                <ChartContainer config={hoursChartConfig} className="h-[300px] w-full">
                  <BarChart data={hoursBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <ChartTooltip
                      content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} />}
                    />
                    <Bar dataKey="hours" fill="var(--color-hours)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado de estudo registrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Subject Performance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Desempenho por matéria</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectPerformance.length > 0 ? (
                <div className="space-y-4">
                  {subjectPerformance.map(s => (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          {s.color && <span className="block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />}
                          {s.name}
                        </span>
                        <span className={`text-sm font-bold ${
                          s.percentage >= 70 ? 'text-green-600 dark:text-green-400' :
                          s.percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {Math.round(s.percentage)}%
                        </span>
                      </div>
                      <Progress value={s.percentage} className="h-2" />
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {s.correct} certas / {s.wrong} erradas — {s.total} questões
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma questão registrada ainda.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Evolution */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Evolução mensal</CardTitle>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as matérias</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {monthlyEvolution.length > 0 ? (
              <ChartContainer config={evolutionChartConfig} className="h-[300px] w-full">
                <LineChart data={monthlyEvolution} margin={{ left: 10, right: 20, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => label}
                        formatter={(value, name) => [`${value}%`, 'Aproveitamento']}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="var(--color-percentage)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado de questões registrado para gerar evolução.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}
