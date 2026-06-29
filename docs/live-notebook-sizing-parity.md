# Live Notebook Sizing Parity Report

Date: 2026-06-29

This report compares the Scriptorium Admin Notebook authoring preview against the hidden
angelgalindez.com Live Notebook at `/notebook.html`.

## Summary

The Live Notebook does **not** currently have size parity with the Scriptorium Admin Notebook
authoring shell.

Both surfaces intentionally share many visual tokens: spread padding, gutter width, page safe
padding, title size, date/meta size, body size, and body line-height. The mismatch is in the
outer shell and page geometry. The Scriptorium Admin Notebook renders `NotebookSpread` inside a
constrained admin preview panel, while `/notebook.html` renders a fixed `1174px x 690px` public
shell.

Because notes are authored in the Scriptorium Admin Notebook, a note can wrap differently in the
public Live Notebook unless a single canonical notebook geometry is defined and used by both
surfaces.

## Measurement Method

Source inspection was performed first in:

- `C:\Users\Angel\Documents\scriptorium\apps\web\src\components\Admin.tsx`
- `C:\Users\Angel\Documents\scriptorium\apps\web\src\components\EntryPreview.tsx`
- `C:\Users\Angel\Documents\scriptorium\apps\web\src\components\NotebookSpread.tsx`
- `C:\Users\Angel\Documents\scriptorium\apps\web\src\styles.css`
- `C:\Users\Angel\Documents\scriptorium\apps\web\src\lib\typography.tsx`
- `C:\Users\Angel\Documents\angelgalindez-com 2\notebook.html`
- `C:\Users\Angel\Documents\angelgalindez-com 2\assets\js\notebook.js`
- `C:\Users\Angel\Documents\angelgalindez-com 2\styles.css`

Runtime measurements were taken with `getBoundingClientRect()` at a `1440 x 900` viewport.

Measured routes:

- Scriptorium Admin Notebook: `http://127.0.0.1:5180/admin`
- Scriptorium public notebook reader, for context: `http://127.0.0.1:5180/notebook`
- AngelGalindez.com Live Notebook: `http://127.0.0.1:4173/notebook.html`

## Comparison Table

### Admin authoring preview vs Live Notebook

| Dimension / Setting | Scriptorium Admin Notebook | Live Notebook | Match? | Notes |
|---|---:|---:|---|---|
| Outer preview container | `607.19px x 473.25px` | N/A | No | `.admin-preview-book` exists only in admin. |
| Notebook shell width | `581.53px` | `1174px` | No | `.admin-preview-book .notebook-spread` vs `.live-notebook-spread`. |
| Notebook shell height | `449.34px` | `690px` | No | Admin shell is constrained by preview panel height. |
| Shell aspect behavior | `height: 100%`, no aspect ratio | `aspect-ratio: 1174 / 690` | No | Live preserves a fixed public spread ratio. |
| Shell padding | `0.62rem` = `9.92px` all sides | `16.8px 17.28px 18.88px` | No | Admin override changes base spread padding. |
| Spread grid columns | `270.859px 18px 270.859px` | `559.734px 18px 559.734px` | No | Same gutter, different page widths. |
| Left page width | `270.86px` | `559.73px` | No | Public Live Notebook is roughly 2.07x wider per page. |
| Right page width | `270.86px` | `559.73px` | No | Same as left page. |
| Page height | `427.53px` | `652.33px` | No | Live page is taller. |
| Content area width | `181.16px` | `434px` | No | Page content box after padding. |
| Content area height | `335.28px` | `550px` | No | Page content box after padding. |
| Page safe padding top | `43.92px` | `48px` | Near | Admin uses clamp result at preview width; Live uses fixed max token. |
| Page safe padding bottom | `46.8px` | `52px` | Near | Admin uses clamp result at preview width; Live uses fixed max token. |
| Page safe outer padding | `43.92px` | `48px` | Near | Live mirrors max source token. |
| Page safe inner padding | `43.92px` in admin preview | `76px` | No | Admin page safe inner is not applied as extra page padding in measured preview width; Live explicitly applies `4.75rem`. |
| Title font size | `48px` | `48px` | Yes | Same token. |
| Title line-height | `51.84px` (`1.08`) | `51.84px` (`1.08`) | Yes | Same token. |
| Title spacing below | `1.12rem` source | `1.12rem` | Yes | Same source-derived value. |
| Metadata/date font size | `15px` measured in Admin preview | `18.56px` | No | Admin measured value is affected by selector/context; root token is `18.56px`. |
| Metadata/date line-height | `15px` measured | `18.56px` | No | Same caveat as above. |
| Metadata spacing | `1rem` source header margin | `1rem` | Yes | Source-derived spacing is mirrored. |
| Body font size | `16px` | `16px` | Yes | Same token. |
| Body line-height | `1.68` source | `26.88px` (`1.68`) | Yes | Same token. |
| Body text max width | Content/page constrained; no fixed max | Content/page constrained; no fixed max | Partial | Both rely on page content width, but page content widths differ. |
| Transform / scale | No CSS transform scaling | No CSS transform scaling | Yes | Neither shell uses transform scaling. |
| Horizontal overflow | None measured | None measured | Yes | Both fit the viewport at 1440px. |

### Scriptorium public reader context

The Scriptorium public reader is not the admin authoring shell, but it confirms that the same
`NotebookSpread` component can produce another geometry when placed in a different container:

| Dimension / Setting | Scriptorium Public Reader | Notes |
|---|---:|---|
| Reader shell width | `1425px` viewport width, `1560px` max source | `.notebook-reader-shell` |
| Desk grid columns | `290px 1005px` | `.notebook-desk` at 1440px viewport |
| Notebook shell width | `1005px` | `.notebook-spread` in reader stage |
| Notebook shell height | `1213.97px` measured | Height expands to content; CSS only sets `min-height`. |
| Left/right page width | `475.23px` each | Same component, different container. |
| Content area width | `385.16px` | After page padding. |
| Content area height | `1083.28px` | After page padding. |

## Admin Selectors / Tokens

Primary component chain:

```txt
Admin.tsx
  .live-preview
    .admin-preview-book
      EntryPreview
        [data-testid="entry-preview"]
          NotebookSpread
            .notebook-spread
              .notebook-page-sheet.notebook-page-left
              .notebook-gutter
              .notebook-page-sheet.notebook-page-right
```

Key source selectors:

```css
.live-preview {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  overflow: hidden;
}

.admin-preview-book {
  overflow: hidden;
  padding: 0.65rem 0.74rem 0.72rem;
}

.admin-preview-book [data-testid="entry-preview"] {
  height: 100%;
  min-height: 0;
}

.admin-preview-book .notebook-spread {
  height: 100%;
  min-height: 0;
  padding: 0.62rem;
}
```

Shared `NotebookSpread` source tokens:

```css
.notebook-spread {
  --notebook-gutter-width: clamp(12px, 1.25vw, 18px);
  --notebook-block-safe-top: clamp(2.2rem, 3.05vw, 3rem);
  --notebook-block-safe-bottom: clamp(2.35rem, 3.25vw, 3.25rem);
  --notebook-block-safe-outer: clamp(2.2rem, 3.05vw, 3rem);
  --notebook-block-safe-inner: clamp(3.45rem, 4.65vw, 4.75rem);
  --notebook-block-safe-inner-extra: clamp(2rem, 2.2vw, 2.15rem);
  grid-template-columns: minmax(0, 1fr) var(--notebook-gutter-width) minmax(0, 1fr);
  min-height: min(690px, calc(100vh - 17rem));
  padding: 1.05rem 1.08rem 1.18rem;
}
```

Shared typography defaults:

```css
--notebook-title-size: 48px;
--notebook-title-line-height: 1.08;
--notebook-date-size: 18.56px;
--notebook-semantic-body-size: 16px;
--notebook-semantic-body-line-height: 1.68;
```

## Live Selectors / Tokens

Primary page chain:

```txt
notebook.html
  .live-notebook-scene
    .live-notebook-stage
      .live-notebook-spread
        .live-notebook-page.live-notebook-page-left
        .live-notebook-gutter
        .live-notebook-page.live-notebook-page-right
```

Key source tokens:

```css
.live-notebook-scene {
  --live-notebook-shell-width: 1174px;
  --live-notebook-shell-height: 690px;
  --live-notebook-gutter-width: 18px;
  --live-notebook-shell-padding-top: 1.05rem;
  --live-notebook-shell-padding-inline: 1.08rem;
  --live-notebook-shell-padding-bottom: 1.18rem;
  --live-notebook-page-safe-top: 3rem;
  --live-notebook-page-safe-bottom: 3.25rem;
  --live-notebook-page-safe-outer: 3rem;
  --live-notebook-page-safe-inner: 4.75rem;
  --live-notebook-title-size: 48px;
  --live-notebook-title-line-height: 1.08;
  --live-notebook-title-spacing: 1.12rem;
  --live-notebook-meta-size: 18.56px;
  --live-notebook-meta-spacing: 1rem;
  --live-notebook-body-size: 16px;
  --live-notebook-body-line-height: 1.68;
  --live-notebook-reader-max: 1560px;
}

.live-notebook-spread {
  aspect-ratio: 1174 / 690;
  grid-template-columns: minmax(0, 1fr) var(--live-notebook-gutter-width) minmax(0, 1fr);
  padding:
    var(--live-notebook-shell-padding-top)
    var(--live-notebook-shell-padding-inline)
    var(--live-notebook-shell-padding-bottom);
}
```

Responsive behavior:

```css
@media (max-width: 900px) {
  .live-notebook-scene {
    --live-notebook-gutter-width: 12px;
    --live-notebook-page-safe-top: 2rem;
    --live-notebook-page-safe-bottom: 2.2rem;
    --live-notebook-page-safe-outer: 1.35rem;
    --live-notebook-page-safe-inner: 1.35rem;
  }

  .live-notebook-spread {
    aspect-ratio: auto;
    display: block;
    padding: 0.55rem;
  }

  .live-notebook-page {
    min-height: 34rem;
    overflow: visible;
  }

  .live-notebook-gutter {
    display: none;
  }
}
```

## Mismatches

1. **No shared canonical geometry exists.**  
   Scriptorium `NotebookSpread` is container-driven. In Admin it is forced to `height: 100%`
   inside `.admin-preview-book`; in the public reader it grows with content; in the Live Notebook it
   is fixed by `--live-notebook-shell-width` and `aspect-ratio`.

2. **Admin authoring preview and Live Notebook page widths differ significantly.**  
   Admin preview left page content width measured `181.16px`, while Live Notebook left page content
   width measured `434px`. This will change line wrapping.

3. **Admin preview and Live Notebook heights differ significantly.**  
   Admin preview shell height measured `449.34px`, while Live Notebook shell height measured
   `690px`. This changes available vertical content space.

4. **Live Notebook mirrors many max tokens, not Admin computed geometry.**  
   The Live Notebook uses the source max values for padding and typography. The Admin preview uses
   a much smaller container, so clamp values and available content width differ.

5. **The public Scriptorium reader is also not a fixed parity target.**  
   At 1440px, it measured `1005px` wide and expanded vertically to `1213.97px` for the selected
   content. This is neither the Admin preview geometry nor the current Live Notebook geometry.

## Recommended Fixes

No CSS changes were made in this pass.

Recommended next step:

1. **Define a canonical notebook publish geometry in Scriptorium.**  
   Add explicit shared tokens for a publish/authoring page contract, for example:

   ```css
   --notebook-publish-shell-width: 1174px;
   --notebook-publish-shell-height: 690px;
   --notebook-publish-aspect-ratio: 1174 / 690;
   --notebook-publish-gutter-width: 18px;
   --notebook-publish-page-safe-top: 3rem;
   --notebook-publish-page-safe-bottom: 3.25rem;
   --notebook-publish-page-safe-outer: 3rem;
   --notebook-publish-page-safe-inner: 4.75rem;
   ```

2. **Render the Admin Notebook preview through the same fixed-ratio publish shell.**  
   Keep it visually smaller if needed by wrapping it in a scale container, but preserve the internal
   layout geometry. This avoids authoring inside a narrow `181px` content column and publishing into
   a `434px` column.

3. **Keep `/notebook.html` pointed at the same canonical token values.**  
   The current Live Notebook already uses a fixed public shell. It should be considered a candidate
   target only after Scriptorium confirms the same fixed shell is used for authoring.

4. **Avoid using transformed visual scaling to change internal layout.**  
   If Admin needs a smaller on-screen preview, use an outer scale wrapper around a fixed internal
   shell so line wrapping remains identical to publication.

5. **Add a parity test later.**  
   A small browser test could compare `getBoundingClientRect()` for the Scriptorium Admin publish
   shell and `/notebook.html` at `1440 x 900`, then fail if shell/page/content geometry drifts.

## Validation Notes

During this report pass:

- `/notebook.html` returned `200`.
- `/assets/data/live-notebook.json` returned `200`.
- `/assets/js/notebook.js` returned `200`.
- Live Notebook rendered successfully.
- Previous/Next controls were already validated in the prior implementation pass and were not
  changed here.
- No CSS or JavaScript changes were made to the Live Notebook page.
