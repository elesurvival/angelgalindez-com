# Live Notebook Typography Source

The hidden Live Notebook page consumes typography exported from Scriptorium.

Generated files:

- `assets/css/notebook-typography.css`
- `assets/data/notebook-typography.json`
- `assets/projects/notebook/fonts/`

Do not edit these files by hand. Update typography in Scriptorium Admin, then run this from `C:\Users\Angel\Documents\scriptorium`:

```bash
npm run typography:export
```

The generated CSS defines `@font-face` rules and notebook typography variables used by `notebook.html` and `styles.css`. The generated JSON records the source settings and active font roles for inspection.
