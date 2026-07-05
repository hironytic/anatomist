# E2E Smoke Test Guide (Playwright MCP)

This document describes how to run a quick end-to-end smoke test of the Anatomist
framework through the sandbox app, using the Playwright MCP browser tools.
It is written primarily for coding agents, but the steps work for humans too
(a human can simply do the same things by hand in a browser).

The whole run takes a few minutes and verifies:

- A binary file can be opened from the welcome screen.
- The hex pane (left) renders the file content correctly.
- The span list (right) shows correctly decoded field values.
- The alert / confirm dialog API works.
- Back/forward navigation works.
- Range highlight rendering is correct for 10 representative range shapes.

> **Note for agents**: `CLAUDE.md` forbids running `npm run sandbox` because it
> never exits. This procedure is the one exception: run it **in the background**,
> and always stop it at the end (see [Step 10](#step-10--clean-up)).

## Prerequisites

- The Playwright MCP tools are available (`browser_navigate`, `browser_click`,
  `browser_snapshot`, `browser_file_upload`, `browser_evaluate`,
  `browser_take_screenshot`, `browser_close`; tool names may carry an
  installation-specific prefix).
- Dependencies are installed in both the package root and `sandbox/`
  (`npm install` in each, if not done yet).

## Test Fixture

The test uses `sandbox/e2e/fixture.bin` (next to this document): 256 bytes
with values `0x00`–`0xFF` in order (byte at offset *n* has value *n*). If it
is missing, regenerate it from the package root:

```sh
node -e "require('fs').writeFileSync('sandbox/e2e/fixture.bin', Buffer.from(Array.from({length:256},(_,i)=>i)))"
```

Because the content is deterministic, every expected value below follows from
it. If you change the fixture, recompute the expected values with `DataView`.

> The Playwright MCP file-upload tool only accepts paths inside the project
> directory. Keep the fixture inside the repository; do not place it in a
> temp directory.

## Procedure

### Step 1 — Build the framework

```sh
npm run build
```

The sandbox consumes the framework through `dist/`, so a stale `dist/` tests
old code. Always rebuild first.

### Step 2 — Start the sandbox dev server

Run `npm run sandbox` **as a background task** (it is a Vite watch server and
never exits on its own). Read its output to get the URL — normally
`http://localhost:5173/`, but Vite picks another port if 5173 is busy.

### Step 3 — Open the app

Navigate to the dev server URL with `browser_navigate`, then take a
`browser_snapshot`. Expected welcome screen:

- App identity: “Anatomist Sandbox”, “v0.0.0”, and the description text.
- A button labeled **Open File** and the prompt “or drag a file anywhere”.

A `favicon.ico` 404 in the console is expected and harmless. Any other console
error is a failure.

### Step 4 — Open the fixture file

1. Click the **Open File** button. A file chooser modal state appears.
2. Answer it with `browser_file_upload`, passing the absolute path to
   `sandbox/e2e/fixture.bin`.

The welcome screen is replaced by the inspector view: toolbar on top, hex pane
on the left, span list on the right.

### Step 5 — Verify the hex pane

From the snapshot (or `browser_evaluate`), check:

- Column headers `+0` … `+F`.
- 16 rows with offset labels `0000`, `0010`, … `00F0`.
- Cell values equal the low byte of their absolute offset: row `0000` reads
  `00 01 02 … 0F`, row `0010` reads `10 11 … 1F`, …, row `00F0` ends with `FF`.
- Toolbar title is **Region from 0x0000**; **Go back** and **Go forward** are
  both disabled.

### Step 6 — Verify the span list

The span list (right pane) must contain exactly these items, in this order:

| Offset      | Name                 | Value                    | Jump button |
|-------------|----------------------|--------------------------|-------------|
| `0000–0000` | Dialog API tester    | `alert / confirm`        | yes |
| `0000–0000` | Range pattern viewer | `10 patterns`            | yes |
| `0000–0005` | Raw bytes            | `00 01 02 03 04 05`      | no |
| `0006–000D` | float64 LE           | `8.021579843411674e-246` | no |
| `000E–0015` | float64 BE           | `5.82309036472121e-241`  | no |
| `0016–0019` | int32 LE             | `421009174`              | no |
| `001A–001D` | int32 BE             | `437984285`              | no |
| `001E–001F` | int16 LE             | `7966`                   | no |
| `0020–0021` | int16 BE             | `8225`                   | no |
| `0022–0022` | int8                 | `34`                     | yes |
| `0023–0023` | int8                 | `35`                     | yes |

These values are what `DataView` yields for the fixture bytes at the listed
offsets, so any mismatch means a decoding or rendering bug.

### Step 7 — Verify the primary range highlight

The focus region `0x0000–0x0023` (36 bytes) must be highlighted in the hex
pane. The highlight consists of absolutely-positioned overlay divs inside each
row; verify them with `browser_evaluate`:

```js
() => {
  const OFFSET_W = 52, CELL_W = 28; // px; see HexView.tsx constants
  return [...document.querySelectorAll('.anatomist-hex-view__row')].map(row => {
    const base = parseInt(row.querySelector('.anatomist-hex-view__offset-label').textContent, 16);
    const overlays = [...row.querySelectorAll('.anatomist-hex-view__range-overlay')].map(o => {
      const c0 = Math.round((parseFloat(o.style.left) - OFFSET_W) / CELL_W);
      const n = Math.round(parseFloat(o.style.width) / CELL_W);
      return {
        bytes: `${base + c0}..${base + c0 + n - 1}`,
        bg: o.classList.contains('anatomist-hex-view__range-overlay--primary-bg'),
        borders: ['top','bottom','left','right']
          .filter(s => o.classList.contains(`anatomist-hex-view__range-overlay--border-${s}`)).join(','),
      };
    });
    return overlays.length ? { row: base.toString(16), overlays } : null;
  }).filter(Boolean);
}
```

Expected result — background (`bg: true`) segments cover **exactly** bytes
0–35 and nothing else:

- Row `0000`: bg `0..15`; border segment `0..15` with `top,left,right`.
- Row `0010`: bg `16..31`; border segments `16..19` with `left`, `20..31`
  with `bottom,right`.
- Row `0020`: bg `32..35`; border segment `32..35` with `bottom,left,right`.

(General rule: border edges appear only on the outer boundary of the
highlighted region — e.g. a `top` edge only where the row above does not cover
that column — so the borders form one closed outline.)

### Step 8 — Verify the dialog API

1. Click the jump button **Jump to Dialog API tester** on the first span-list
   item. The right pane switches to the Dialog API tester, the toolbar title
   becomes **Dialog API tester**, and **Go back** becomes enabled.
2. Click **Show alert**. A modal dialog appears with the message
   “This is an alert message from the sandbox.” and an **OK** button.
   Click **OK**; the dialog closes.
3. Click **Show confirm**. A modal dialog appears with the message
   “Do you confirm this action?” and **Cancel** / **OK** buttons.
   Click **OK**; the pane shows `Last confirm: OK`.
4. Click **Show confirm** again and click **Cancel**; the pane shows
   `Last confirm: Cancel`.

### Step 9 — Verify range pattern rendering

1. Click **Go back** in the toolbar. The title returns to
   **Region from 0x0000**, **Go back** becomes disabled, and **Go forward**
   becomes enabled.
2. Click the jump button **Jump to Range pattern viewer**. The toolbar shows
   **Pattern 1: 1 row, middle**.
3. Each pattern view has exactly one button in the right pane, which advances
   to the next pattern. Walk all 10 patterns and check the highlight for each.
   You can do the whole loop in one `browser_evaluate` call by reusing the
   overlay-reading code from Step 7:

```js
async () => {
  const readState = () => ({
    title: document.querySelector('.anatomist-app__toolbar-title')?.textContent,
    /* ... overlay reading code from Step 7 ... */
  });
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(readState());
    document.querySelector('.anatomist-app__focus-region button').click();
    await new Promise(r => setTimeout(r, 100));
  }
  results.push({ wrappedAroundTo: readState().title }); // must be Pattern 1 again
  return results;
}
```

   For each pattern, the toolbar title must match and the `bg` overlay
   segments must cover exactly the listed bytes (inclusive), contiguously:

   | # | Toolbar title                     | Highlighted bytes |
   |---|-----------------------------------|-------------------|
   | 1 | `Pattern 1: 1 row, middle`        | 3–7   |
   | 2 | `Pattern 2: 2 rows, split`        | 10–21 |
   | 3 | `Pattern 3: 2 rows, connected`    | 4–21  |
   | 4 | `Pattern 4: 2 rows, start at edge`| 0–21  |
   | 5 | `Pattern 5: 2 rows, end at edge`  | 10–31 |
   | 6 | `Pattern 6: 2 rows, full rows`    | 0–31  |
   | 7 | `Pattern 7: 3+ rows, general`     | 4–44  |
   | 8 | `Pattern 8: 3+ rows, start at edge`| 0–44 |
   | 9 | `Pattern 9: 3+ rows, end at edge` | 4–47  |
   | 10| `Pattern 10: 3+ rows, full rows`  | 0–47  |

   Border segments must follow the closed-outline rule from Step 7. Clicking
   the button on Pattern 10 must wrap around to Pattern 1.

4. Optionally take a `browser_take_screenshot` for a final visual sanity
   check (highlight box drawn around the expected cells, no layout breakage).

### Step 10 — Clean up

1. Close the browser page with `browser_close`.
2. Stop the background dev-server task (e.g. with the harness's task-stop
   facility). If you started it in a foreground terminal instead, press
   `q` then `Enter`, or `Ctrl+C`.

## Pass Criteria

The smoke test passes when all of the following held:

- [ ] Welcome screen rendered with app identity and **Open File** button.
- [ ] Hex pane showed all 256 bytes with correct values and offset labels.
- [ ] Span list matched the table in Step 6 exactly.
- [ ] Primary highlight covered exactly bytes 0–35 with a closed outline.
- [ ] Alert and confirm dialogs showed the right messages; `Last confirm`
      reflected both **OK** and **Cancel**.
- [ ] Back/forward buttons enabled/disabled correctly when navigating.
- [ ] All 10 range patterns highlighted exactly the expected bytes and
      wrapped around to Pattern 1.
- [ ] No console errors other than the `favicon.ico` 404.

## Troubleshooting

- **Span-list values look wrong after a framework change** — you probably
  forgot Step 1; the sandbox serves the framework from `dist/`.
- **Dev server URL is not 5173** — another process holds the port; use the
  URL printed in the server output.
- **`browser_file_upload` rejects the path** — the file must live inside the
  project directory (see Test Fixture above).
- **Snapshot shows the welcome screen after upload** — the file chooser was
  cancelled or the upload path was wrong; retry Step 4.
- **`.playwright-mcp/` appears in the repo** — that is the Playwright MCP
  output directory (snapshots, screenshots, console logs). It is gitignored;
  never commit it.
