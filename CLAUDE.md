# Anatomist — Developer Notes

## What This Project Is

A React + TypeScript framework (NPM package) for building binary file inspector tools.
The framework provides UI components; users supply their own parser and pre-parsed data.
The parser is intentionally **out of scope** for this framework.

## Repository Layout

```
anatomist/           ← framework package root (@hironytic/anatomist)
  src/               ← framework source (published via dist/)
    styles/          ← CSS only; default.css is copied to dist/style.css at build time
  sandbox/           ← private validation app; never published
    src/
      format/        ← sandbox-specific binary format definition and parser
```

The sandbox references the framework as `"@hironytic/anatomist": "file:.."`.
It must be installed and built separately from the root.

## Development Workflow

Two terminals are needed when iterating on the framework while viewing it in the sandbox:

```
# Terminal 1 — rebuild framework on every change
npm run dev

# Terminal 2 — sandbox dev server
npm run sandbox
```

The sandbox picks up framework changes automatically because Vite resolves the `file:..`
symlink and tsup's watch mode rebuilds `dist/` on save.

## Naming Conventions

| Target | Convention |
|--------|-----------|
| NPM package | `@hironytic/anatomist` |
| CSS custom properties | `--anatomist-*` (e.g. `--anatomist-hex-highlight-bg`) |
| CSS class names | `.anatomist-*` BEM-style (e.g. `.anatomist-hex-viewer__cell--highlighted`) |

## CSS Distribution

`src/styles/default.css` is **not** processed by tsup.
It is copied verbatim to `dist/style.css` by the `build` script (`cp` after tsup).
Consumers import it as `@hironytic/anatomist/style.css`.

## Key Design Decisions

- **No bundled parser**: the framework receives already-parsed data structures; parsing is the consumer's responsibility.
- **CSS Custom Properties for theming**: no CSS-in-JS, no external styling library. Consumers override variables in `:root`.
- **Peer dependencies**: `react` and `react-dom` are peer deps so consumers use their own React instance.
