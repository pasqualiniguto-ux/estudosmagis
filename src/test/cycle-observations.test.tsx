import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StudyProvider, useStudy } from '@/contexts/StudyContext';

const db = vi.hoisted(() => ({
  entry: { id: 'block-1', subject_id: 'subject-1', planned_minutes: 30, sort_order: 0, notes: '' },
  deletedTables: [] as string[],
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      let operation = 'select';
      const query = {
        select: () => query,
        eq: () => query,
        order: () => query,
        limit: () => query,
        in: () => query,
        maybeSingle: () => query,
        update: (values: { notes?: string }) => {
          operation = 'update';
          if (table === 'cycle_entries' && values.notes !== undefined) db.entry.notes = values.notes;
          return query;
        },
        upsert: () => { operation = 'upsert'; return query; },
        delete: () => { operation = 'delete'; db.deletedTables.push(table); return query; },
        then: (resolve: (result: unknown) => unknown) => Promise.resolve(resolve({
          error: null,
          data: operation !== 'select' ? null
            : table === 'subjects' ? [{ id: 'subject-1', name: 'Direito' }]
            : table === 'cycle_entries' ? [{ ...db.entry }]
            : table === 'user_settings' ? { active_cycle_index: 0, completed_cycles_count: 0 }
            : [],
        })),
      };
      return query;
    },
  },
}));

describe('cycle observations', () => {
  beforeEach(() => { db.entry.notes = ''; db.deletedTables = []; });

  it('preserves multiline observations after completing and restarting the cycle and reloading', async () => {
    const notes = 'Revisar artigos 1 a 5.\nResolver questões e anotar dúvidas.';
    const first = renderHook(() => useStudy(), { wrapper: StudyProvider });
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    await act(async () => { await first.result.current.updateCycleObservations('block-1', notes); });
    await act(async () => { await first.result.current.advanceCycle(); });
    expect(first.result.current.completedCyclesCount).toBe(1);
    expect(first.result.current.activeCycleIndex).toBe(0);
    expect(first.result.current.cycleEntries[0].notes).toBe(notes);
    expect(db.entry.notes).toBe(notes);
    expect(db.deletedTables).toEqual(['daily_progress']);
    first.unmount();
    const reloaded = renderHook(() => useStudy(), { wrapper: StudyProvider });
    await waitFor(() => expect(reloaded.result.current.loading).toBe(false));
    expect(reloaded.result.current.cycleEntries[0].notes).toBe(notes);
  });
});