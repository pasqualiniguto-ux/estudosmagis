import AppNavigation from '@/components/AppNavigation';
import LawReading from '@/components/LawReading';

export default function LawReadingPage() {
  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <AppNavigation />
      <main className="container py-6 max-w-3xl">
        <h1 className="text-lg font-semibold text-foreground mb-2">Lei seca</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Defina metas de leitura, cronometre o tempo e acompanhe o progresso.
        </p>
        <LawReading />
      </main>
    </div>
  );
}
