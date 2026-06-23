# Workshop Build Activity

The Workshop Build Activity section is a static snapshot of recent local commits across Angel's active software projects. It stores and renders the latest 50 commits, while the Workshop panel keeps a compact height and lets visitors scroll the activity list internally for deeper history. It gives the Workshop page a quiet record of what is currently being built without exposing repository URLs, author emails, local file paths, or commit bodies.

## Repos Scanned

The update script scans these local project names when they are available:

- Continuo
- Echo
- Glimpse
- Tempo
- AngelGalindez.com
- ELE Survival Shopify

Missing local repos are skipped gracefully and reported in the console.

## Refresh Locally

Run:

```bash
npm run refresh-build-log
```

This refreshes `assets/data/build-log.json` and runs lightweight JavaScript syntax checks for the generator and Workshop renderer.

For data generation only, run:

```bash
npm run update-build-log
```

## Automatic Refresh Before Push

Install the local hooks:

```bash
npm run install-build-log-hook
```

The installer writes `.git/hooks/post-commit` and `.git/hooks/pre-push` on this workstation. Git hooks are local files, so the installed hooks are not committed to the repository and will not affect other machines unless installed there too.

The post-commit hook is the primary automation. After a normal site commit, it:

1. Runs `npm run refresh-build-log`.
2. Checks whether `assets/data/build-log.json` changed.
3. If it changed, stages only `assets/data/build-log.json`.
4. Creates a local commit named `Update Workshop build activity`.

That means the refreshed build log commit already exists by the time you push.

The pre-push hook is a final safety check. It runs the same refresh before pushing. In normal use there should be no change because the post-commit hook already handled it.

The hooks do not stage or commit unrelated files.

To disable the automation, remove the local hooks:

```bash
rm .git/hooks/pre-push .git/hooks/post-commit
```

On Windows PowerShell, use:

```powershell
Remove-Item .git/hooks/pre-push, .git/hooks/post-commit
```

## Publish Workflow

If the hook is installed:

1. Commit your site changes normally.
2. If recent build activity changed, the post-commit hook creates `Update Workshop build activity`.
3. Push `main`.
4. The pre-push hook performs a final refresh check before the push continues.

For manual publishing without the hook:

1. Run `npm run refresh-build-log`.
2. Review `assets/data/build-log.json` to confirm the public entries look right.
3. Run `git diff --check`.
4. Commit the refreshed JSON when ready.
5. Push `main` to publish through the existing deployment flow.
