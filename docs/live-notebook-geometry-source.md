# Live Notebook Geometry Source

## Source Of Truth

Scriptorium owns the canonical notebook publish geometry.

The source module lives in the Scriptorium repo:

```text
apps/web/src/shared/notebookGeometry.ts
```

angelgalindez.com consumes exported artifacts from that source:

```text
assets/css/notebook-geometry.css
assets/data/notebook-geometry.json
```

Do not edit those generated files by hand.

## How The Live Notebook Consumes Geometry

The hidden Live Notebook page loads:

```html
<link rel="stylesheet" href="/assets/css/notebook-geometry.css?v=20260630">
```

Then `styles.css` maps the shared neutral variables into the existing Live Notebook local variables:

```css
--live-notebook-shell-width: var(--notebook-publish-shell-width);
--live-notebook-shell-height: var(--notebook-publish-shell-height);
--live-notebook-gutter-width: var(--notebook-publish-gutter-width);
```

This preserves the existing Live Notebook CSS structure while preventing geometry drift from the Scriptorium Admin Notebook.

## Updating Geometry

When notebook geometry changes:

1. Update the Scriptorium canonical source.
2. In Scriptorium, run `npm run geometry:export`.
3. In Scriptorium, run `npm run check:notebook-geometry`.
4. Review and commit Scriptorium changes.
5. Review and commit generated angelgalindez.com artifacts separately.

## Current Geometry Contract

```text
Shell: 1174px x 690px
Aspect ratio: 1174 / 690
Gutter: 18px
Content box: 435.73px x 584.33px
Page safe areas: 32px top, 32px bottom, 48px outer, 76px inner
Body type: 16px / 26.88px
```

## Hidden Page Rule

The Live Notebook remains hidden and directly accessible only.

Do not link `notebook.html` from:

- homepage
- top navigation
- footer
- project cards
- Workshop
