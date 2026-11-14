# Reviewing changes

Every implementation commit should include a matching documentation update and a
message describing the behavior, the reason, and verification results. Never put
credentials or resident information in commit messages.

## Useful Git commands

```powershell
Set-Location C:\Users\ASUS\Barangay-Information-System
git log -5 --format=fuller
git show --stat HEAD
git show HEAD
git diff HEAD~1 HEAD -- backend
git diff HEAD~1 HEAD -- frontend
```

On GitHub, open the repository's **Commits** page for `feature/adrian-setup`,
select a commit title, then review its description and changed files.

## Commit format

Use a concise title such as `feat(accounts): add staff login audit events`.
The body should explain:

- Changes: what the user or operator can now do and the relevant files.
- Reason: the problem or requirement this solves.
- Validation: exact checks executed and their result.
- Limits: checks not run, remaining dependencies, or incomplete functionality.

Documentation should reflect the final behavior of that commit. A successful
frontend test does not establish that backend integration works.

## Current review map

| Area | Files | Review focus |
|---|---|---|
| Staff access | `backend/accounts/` | CSRF, inactive users, session lifecycle, login attempts |
| Configuration | `backend/config/settings.py` | Environment variables, database, cookie security |
| Staff interface | `frontend/src/App.tsx`, `frontend/src/api.ts` | Login, logout, connection states, private session handling |
| Local startup | `scripts/dev.py`, `docs/LOCAL_DEVELOPMENT.md` | Local configuration and reproducible commands |
| Phase evidence | `docs/FOUNDATION_PROGRESS.md` | Executed checks and remaining work |
