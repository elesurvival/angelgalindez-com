# Live Notebook Multi-Page Viewing

The hidden `notebook.html` page reads the Scriptorium Live Notebook export from
`assets/data/live-notebook.json`.

Each top-level `pages[]` item is still a notebook entry for backward compatibility. Newer exports can
also include a nested `pages[]` array inside each entry. The website now prefers that nested entry
page data when it exists.

## Behavior

- Selecting an entry opens Page 1.
- `#entry-slug` opens the matching entry at Page 1.
- Desktop renders two physical notebook pages at a time: Pages 1-2, then Pages 3-4, and so on.
- Entry navigation remains separate from page navigation.
- Odd final pages render with a quiet blank facing page.
- Legacy entries without nested `pages[]` still render through `spread.left` and `spread.right`.
- Legacy entry-level decorations remain supported for legacy two-page rendering.
- Share keeps using the entry hash only; page-specific hashes are not required.

Visitor-facing language uses `page` and `pages`, not implementation terms from the export model.

## Compatibility

The renderer keeps support for:

- legacy `entry.body[]`
- legacy `entry.spread.left`
- legacy `entry.spread.right`
- legacy `entry.decorations[]`
- nested page-level `body`
- nested page-level `decorations`

The generated notebook geometry files remain the source of physical notebook dimensions and should not
be edited by hand.
