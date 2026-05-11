import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Pin, Check } from 'lucide-react';
import { todayStr as getTodayStr } from '@/lib/dateUtils';

interface FixedItem {
  key: string;
  name: string;
  color: string;
}

const FIXED_ITEMS: FixedItem[] = [
  { key: 'flashcards', name: 'Flashcards', color: 'hsl(var(--primary))' },
  { key: 'lei_seca', name: 'Lei Seca', color: 'hsl(var(--accent))' },
];

const STORAGE_KEY = 'fixed_cycle_checks_v1';

type ChecksMap = Record<string, Record<string, boolean>>; // date -> key -> done

function loadChecks(): ChecksMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveChecks(c: ChecksMap) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

export default function FixedCycleItems() {
  const today = getTodayStr();
  const [checks, setChecks] = useState<ChecksMap>(() => loadChecks());

  const todayChecks = checks[today] || {};

  const toggle = (key: string) => {
    setChecks(prev => {
      const next = { ...prev };
      const day = { ...(next[today] || {}) };
      day[key] = !day[key];
      next[today] = day;
      saveChecks(next);
      return next;
    });
  };

  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        <Pin className="h-3 w-3" /> Fixos diariamente
      </div>
      {FIXED_ITEMS.map(item => {
        const done = !!todayChecks[item.key];
        return (
          <label
            key={item.key}
            htmlFor={`fixed-${item.key}`}
            className={`flex items-center gap-3 p-3 rounded-xl border bg-card border-dashed cursor-pointer transition-colors ${done ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
            style={{ borderLeft: `6px solid ${item.color}` }}
          >
            <Checkbox id={`fixed-${item.key}`} checked={done} onCheckedChange={() => toggle(item.key)} />
            <div className="flex-1 flex items-center gap-2">
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={`font-medium ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {item.name}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Fixo
              </span>
            </div>
            {done && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <Check className="h-3.5 w-3.5" /> Cumprido hoje
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
