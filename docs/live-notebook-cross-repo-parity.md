# Live Notebook Cross-Repo Parity Report

## Summary

The fixed Scriptorium Admin Notebook internal geometry now matches the angelgalindez.com Live Notebook geometry.

At the required `1440 x 900` viewport, the Scriptorium Admin preview visually scales down inside the Admin panel, but its internal unscaled shell remains `1174px x 690px`. The Live Notebook renders the same `1174px x 690px` shell directly at full scale.

Geometry parity is confirmed for:

- shell width and height
- aspect ratio
- shell padding
- gutter width
- left and right page size
- page safe areas
- content box size

No broad layout or visual changes were made.

## Measurement Method

Measurements were taken locally with Chromium and `deviceScaleFactor: 1`.

Scriptorium Admin route:

```text
http://127.0.0.1:5180/admin
```

angelgalindez.com Live Notebook route:

```text
http://127.0.0.1:4173/notebook.html
```

Runtime measurement used:

```js
getBoundingClientRect()
getComputedStyle()
```

For Scriptorium Admin, the important comparison is the computed internal geometry before transform scaling. The visible Admin preview can be smaller because `.admin-preview-scale-inner` is scaled to fit the Admin panel.

## Scriptorium Admin Internal Geometry

Measured at `1440 x 900`:

```text
Internal shell: 1174px x 690px
Visible shell: 581.48px x 341.76px
Scale factor: 0.4953
Gutter: 18px
Left page: 559.73px x 652.33px
Right page: 559.73px x 652.33px
Content box: 435.73px x 552.33px
Page safe areas: 48px top, 52px bottom, 48px outer, 76px inner
```

The Admin preview had no horizontal overflow and no console errors during measurement.

## angelgalindez.com Live Notebook Geometry

Measured at `1440 x 900`:

```text
Shell: 1174px x 690px
Scale factor: 1
Gutter: 18px
Left page: 559.73px x 652.33px
Right page: 559.73px x 652.33px
Content box: 435.73px x 552.33px
Page safe areas: 48px top, 52px bottom, 48px outer, 76px inner
```

The Live Notebook had no horizontal overflow and no console errors during measurement.

## Comparison Table

| Dimension / Setting | Scriptorium Admin Internal | Live Notebook | Match? | Notes |
|---|---:|---:|---|---|
| Shell width | `1174px` | `1174px` | Yes | Admin visible width is scaled to `581.48px` at `1440 x 900`, but internal width is fixed. |
| Shell height | `690px` | `690px` | Yes | Admin visible height is scaled to `341.76px` at `1440 x 900`. |
| Aspect ratio | `1174 / 690` | `1174 / 690` | Yes | Both computed as the same aspect ratio. |
| Shell padding top | `16.8px` | `16.8px` | Yes | Both derive from `1.05rem`. |
| Shell padding inline | `17.28px` | `17.28px` | Yes | Both derive from `1.08rem`. |
| Shell padding bottom | `18.88px` | `18.88px` | Yes | Both derive from `1.18rem`. |
| Gutter width | `18px` | `18px` | Yes | Admin visible gutter scales to `8.92px` at `1440 x 900`. |
| Left page width | `559.73px` | `559.73px` | Yes | Computed CSS width before Admin scaling. |
| Left page height | `652.33px` | `652.33px` | Yes | Computed CSS height before Admin scaling. |
| Right page width | `559.73px` | `559.73px` | Yes | Computed CSS width before Admin scaling. |
| Right page height | `652.33px` | `652.33px` | Yes | Computed CSS height before Admin scaling. |
| Content box width | `435.73px` | `435.73px` | Yes | Page width minus outer and inner safe padding. |
| Content box height | `552.33px` | `552.33px` | Yes | Page height minus top and bottom safe padding. |
| Page safe top | `48px` | `48px` | Yes | Both derive from `3rem`. |
| Page safe bottom | `52px` | `52px` | Yes | Both derive from `3.25rem`. |
| Page safe outer | `48px` | `48px` | Yes | Both derive from `3rem`. |
| Page safe inner | `76px` | `76px` | Yes | Both derive from `4.75rem`. |
| Title font size | `48px` canonical token | `48px` | Yes | Runtime Admin value can be lower for long-title classes or saved typography settings. |
| Title line-height | `1.08` canonical token | `51.84px` from `48px * 1.08` | Yes | Runtime Admin line-height can vary with saved typography settings. |
| Title spacing | `1.12rem` inherited title margin | `17.92px` | Yes | Matches at the token level. |
| Metadata font size | Admin metadata is renderer-specific | `18.56px` | N/A | Live Notebook metadata is a public renderer treatment; Admin entry/project metadata is not a direct one-to-one field. |
| Metadata spacing | Admin metadata is renderer-specific | `16px` | N/A | Not a geometry blocker. |
| Body font size | `16px` canonical token | `16px` | Yes | Runtime Admin value can vary when notebook typography settings are changed. |
| Body line-height | `1.68` canonical token | `26.88px` from `16px * 1.68` | Yes | Matches at canonical token level. |
| Body text max width | `none` | `none` | Yes | Content width is governed by page safe area. |
| Transform / scale behavior | Outer frame scales to fit Admin panel | No transform, full shell | Yes | This difference is intentional. |
| Responsive behavior | Internal shell remains fixed; visible wrapper scales | Full shell until viewport media query | Yes | At desktop widths tested, geometry matches. |

## Additional Viewport Checks

The same internal/live geometry values were also checked at `1600 x 1000` and `1920 x 1080`.

| Viewport | Admin Internal Shell | Admin Visible Shell | Admin Scale | Live Shell | Match? |
|---|---:|---:|---:|---:|---|
| `1440 x 900` | `1174 x 690` | `581.48 x 341.76` | `0.4953` | `1174 x 690` | Yes |
| `1600 x 1000` | `1174 x 690` | `741.50 x 435.80` | `0.6316` | `1174 x 690` | Yes |
| `1920 x 1080` | `1174 x 690` | `1061.53 x 623.90` | `0.9042` | `1174 x 690` | Yes |

## Mismatches

No fixed-geometry mismatches were found.

One important non-geometry note: Scriptorium Admin typography is now configurable and can also apply title-size reduction classes for long titles. Therefore, runtime Admin typography measurements can differ from the fixed Live Notebook CSS depending on the selected entry and saved Admin typography settings. This is expected and does not affect notebook geometry parity.

## Recommended Fixes

No code fixes are recommended in this verification pass.

The next parity improvement should not be a visual tweak. It should be a shared-token/export strategy so Scriptorium and angelgalindez.com can consume the same canonical notebook geometry values from one source.

## Validation Notes

During measurement:

- Scriptorium Admin loaded.
- The Admin Notebook preview rendered.
- Live Notebook loaded.
- Live Notebook controls remained present.
- No horizontal overflow was detected on either surface.
- No console errors were observed on either surface.

The Notebook page remains hidden and was not linked from homepage, top navigation, footer, project cards, or Workshop.
