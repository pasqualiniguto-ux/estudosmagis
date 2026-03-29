import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BookOpen, BarChart3, Sun, Moon, LogOut, RotateCw, NotebookPen } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', icon: CalendarDays, label: 'Semana' },
  { to: '/ciclo', icon: RotateCw, label: 'Ciclo' },
  { to: '/materias', icon: BookOpen, label: 'Matérias' },
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
      <header className="hidden md:block border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center h-14 gap-1">
          <span className="font-bold text-lg text-primary mr-6 tracking-tight">Organizador de Estudos</span>
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
            <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Mobile: Slim Top Bar (title + actions only) ===== */}
      <header className="md:hidden border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between h-12 px-4">
          <span className="font-bold text-base text-primary tracking-tight">Organizador de Estudos</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ===== Mobile: Bottom Navigation Bar ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(item => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[60px] transition-colors ${
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`} />
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
