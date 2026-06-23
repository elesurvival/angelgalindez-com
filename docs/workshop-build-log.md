# Workshop Build Activity

The Workshop Build Activity section is a static snapshot of recent local commits across Angel's active software projects. It gives the Workshop page a quiet record of what is currently being built without exposing repository URLs, author emails, local file paths, or commit bodies.

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

## Publish Workflow

1. Run `npm run refresh-build-log`.
2. Review `assets/data/build-log.json` to confirm the public entries look right.
3. Run `git diff --check`.
4. Commit the refreshed JSON when ready.
5. Push `main` to publish through the existing deployment flow.
