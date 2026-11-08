import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BookOpen, BarChart3, Sun, Moon, LogOut, NotebookPen, Scale } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', icon: CalendarDays, label: 'Semana' },
  { to: '/materias', icon: BookOpen, label: 'Matérias' },
  { to: '/lei-seca', icon: Scale, label: 'Lei seca' },
  { to: '/caderno', icon: NotebookPen, label: 'Caderno' },
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
];

export default function AppNavigation() {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const { signOut } = useAuth();

  return (
    <>
      {/* ===== Desktop / Tablet: Top Header Bar ===== */}
      <header className="hidden md:block border-b border-border bg-background sticky top-0 z-50">
        <div className="container flex items-center h-14 gap-1">
          <span className="font-medium text-sm lg:text-base text-foreground mr-3 lg:mr-8 max-w-36 lg:max-w-none leading-snug shrink-0">Organizador de Estudos</span>
          {navItems.map(item => (
            <NavItemDesktop
              key={item.to}
              to={item.to}
              active={pathname === item.to}
              icon={<item.icon className="h-4 w-4" />}
              label={item.label}
            />
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} title="Alternar tema" aria-label="Alternar tema" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Mobile: Slim Top Bar (title + actions only) ===== */}
      <header className="md:hidden border-b border-border bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between h-12 px-4">
          <span className="font-medium text-sm text-foreground">Organizador de Estudos</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} title="Alternar tema" aria-label="Alternar tema" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Mobile: Bottom Navigation Bar ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(item => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-1 flex-col items-center gap-1 px-1 py-1.5 min-w-0 transition-colors ${
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className={`text-[10px] font-medium leading-tight ${active ? 'text-primary' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function NavItemDesktop({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-1.5 px-2 lg:px-3 h-14 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
        active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
