# Architecture rules

- Store cycle-block observations on cycle entries independently of daily progress so restarting study time never removes observations.
- The root Semana page hosts cycle study and exam reminders; redirect the legacy /ciclo URL to it to preserve existing bookmarks without a separate cycle tab.