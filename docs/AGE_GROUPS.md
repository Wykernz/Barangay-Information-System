# Age groups and birthdate controls

The user approved these mutually exclusive groups on 2026-11-19:

| Age in completed years | Group |
|---|---|
| 0–5 | Early Childhood |
| 6–12 | Children |
| 13–17 | Teenagers / Adolescents |
| 18–24 | Young Adults |
| 25–34 | Adults |
| 35–44 | Middle Adults |
| 45–59 | Older Adults |
| 60–74 | Senior Citizens |

Ages 75+ have no supplied group yet. They continue to count in the separate 60+
senior summary. Age and senior status derive from birthdate at the reporting date;
neither is maintained as a separate stored value. Missing/future dates do not
produce an age group. Category filters retain classified-resident scope.

`ageGroups.ts`, `categoryFilter.ts` and `components/BirthdateInput.tsx` provide the
shared frontend controls and utilities. Birthdate entry offers month/day selectors
and a directly typed four-digit year, without a duplicate native date picker or
number spinners. Required, calendar-valid and non-future dates are enforced.

The first commit introduces tested utilities; subsequent household/overview commits
wire them into the screens. No schema or backend changes are included. Tests cover
every group boundary, birthday changes, separate senior status, classified-resident
filters, required dates, leap days and future dates. Visual/browser acceptance and
production-data use remain outside this synthetic frontend increment.

Validation of the isolated staged frontend: `npm.cmd run typecheck` passed;
`npx.cmd vitest run --configLoader runner` passed 11 files / 37 tests;
`npx.cmd vite build --configLoader runner` passed.
