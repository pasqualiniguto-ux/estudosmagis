import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, BookOpen, BarChart3, Sun, Moon, LogOut } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function AppNavigation() {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();
  const { signOut } = useAuth();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center h-14 gap-1">
        <span className="font-bold text-lg text-primary mr-6 tracking-tight">EstudoApp</span>
        <NavItem to="/" active={pathname === '/'} icon={<CalendarDays className="h-4 w-4" />} label="Semana" />
        <NavItem to="/materias" active={pathname === '/materias'} icon={<BookOpen className="h-4 w-4" />} label="Matérias" />
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
  );
}

function NavItem({ to, active, icon, label }: { to: string; active: boolean; icon: React.ReactNode; label: string }) {
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
