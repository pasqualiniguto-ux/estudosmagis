# Architecture rules

- Store cycle-block observations on cycle entries independently of daily progress so restarting study time never removes observations.
- The root Semana page hosts cycle study and exam reminders; redirect the legacy /ciclo URL to it to preserve existing bookmarks without a separate cycle tab.
- Keep shared visual roles in global HSL tokens and shared UI primitives so all study pages stay consistent in both themes.