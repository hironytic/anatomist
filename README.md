# Anatomist

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A React framework for building binary file inspector tools.

> [!WARNING]
> This library is in early development. The API may change heavily in future versions.

## Installation

```sh
npm install @hironytic/anatomist
```

Requires `react` and `react-dom` >= 19 as peer dependencies.

## Setup

Import the default stylesheet once in your app entry point:

```tsx
import '@hironytic/anatomist/style.css';
```

## Quick Start

Drop an `<Anatomist>` component into your app and supply an `onLoad` callback. When the user drops a file onto the UI, `onLoad` receives an `Atlas` handle that you use to drive the display.

```tsx
import { Anatomist, SpanListView } from '@hironytic/anatomist';
import type { Atlas, SpanListViewItem } from '@hironytic/anatomist';
import '@hironytic/anatomist/style.css';

function parseFile(atlas: Atlas) {
  const items: SpanListViewItem[] = [
    { id: 0, startOffset: 0, endOffset: 4, name: 'Magic bytes', value: '...' },
    // ...
  ];

  atlas.setFocusRegion({
    range: { startOffset: 0, endOffset: atlas.data.length },
    component: SpanListView,
    props: { atlas, items },
    title: 'File overview',
  });
}

export function App() {
  return (
    <Anatomist
      appName="My Inspector"
      version="v1.0.0"
      description="Drop a binary file to inspect it."
      onLoad={parseFile}
    />
  );
}
```

## How It Works

The framework provides the UI shell — a hex viewer, a right-side detail pane, and browser-style back/forward navigation. Parsing is your responsibility.

1. The user drops a file onto the `<Anatomist>` component.
2. Your `onLoad` callback is called with an `Atlas` handle and the file bytes.
3. You parse the bytes and call `atlas.setFocusRegion()` to populate the hex highlight and the right pane.
4. Each `setFocusRegion` call appends a navigation history entry. The user can navigate back and forward through the history.

## Components

For full prop types, refer to the TypeScript definitions bundled with the package.

| Component | Description |
|---|---|
| `<Anatomist>` | Root component. Handles file drop, layout, and navigation history. |
| `<SpanList>` | Field list with keyboard navigation and optional jump buttons. |
| `<SpanListView>` | `SpanList` wrapper that wires `atlas.setActiveSpan` on selection and `atlas.setSecondaryRange` on jump-button hover automatically. Accepts an `atlas` prop and `SpanListViewItem[]` items (which extend `SpanListItem` with an optional `jumpTargetRange`). |
| `<FocusMessage>` | Centered info/error message for the right pane. |

## Atlas API

The `Atlas` object is passed to your `onLoad` callback when a file is dropped.

| Member | Description |
|---|---|
| `atlas.data` | `Uint8Array` of the dropped file bytes. |
| `atlas.setFocusRegion(region)` | Push a new focus region. Updates the HexView highlight and the right pane. Appends a navigation history entry. |
| `atlas.setActiveSpan(start, end)` | Highlight a sub-range within the current focus region in HexView. Offsets are relative to the focus region's `startOffset`. |
| `atlas.setSecondaryRange(range)` | Show a secondary range overlay in HexView alongside the primary range. Pass `undefined` to clear. |

## Theming

The default stylesheet adapts to `prefers-color-scheme` automatically.

To force a specific theme regardless of the OS setting, add a class to any ancestor element:

```html
<div class="anatomist-theme-light">...</div>
<div class="anatomist-theme-dark">...</div>
```

To customize colors, override CSS custom properties on `:root`:

```css
:root {
  /* Typography */
  --anatomist-ui-font-family: system-ui, sans-serif;
  --anatomist-monospace-font-family: ui-monospace, monospace;

  /* HexView */
  --anatomist-hex-view-bg: #0a1929;
  --anatomist-hex-view-fg: #b8d4ed;
  --anatomist-hex-view-header-bg: #0d2035;
  --anatomist-hex-view-header-fg: #5c85a8;
  --anatomist-hex-view-border-color: #1e3a52;
  --anatomist-hex-view-offset-fg: #5ab4e2;
  --anatomist-hex-view-active-bg: rgba(90, 180, 226, 0.40);
  --anatomist-hex-range-primary-border-color: #5ab4e2;
  --anatomist-hex-range-primary-bg: rgba(90, 180, 226, 0.13);

  /* SpanList */
  --anatomist-span-list-selected-bg: rgba(90, 180, 226, 0.13);
  --anatomist-span-list-selected-border: #5ab4e2;

  /* App shell */
  --anatomist-app-bg: #0a1929;
  --anatomist-app-toolbar-bg: #0d2035;
  --anatomist-app-toolbar-border-color: #1e3a52;
}
```

All available variables are documented in [`src/styles/default.css`](src/styles/default.css).

## License

[MIT](LICENSE)
