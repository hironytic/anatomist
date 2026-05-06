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
```

The sandbox references the framework as `"@hironytic/anatomist": "file:.."`.
It must be installed and built separately from the root.

## Development Workflow

After editing framework source, rebuild to update `dist/`:

```
npm run build             # build the framework
npm run sandbox:build     # build the sandbox (uses the framework dist/)
```

Type-check without building:

```
npm run typecheck                    # type-check the framework
npm run sandbox:typecheck            # type-check the sandbox
npm run typecheck --prefix sandbox   # equivalent to the above
```

> **Note for AI assistants**: `npm run dev` and `npm run sandbox` start watch-mode
> servers that never exit. Do **not** run them. Use the build and typecheck commands
> above instead, and leave UI verification to the user.

LSP errors in sandbox files are expected before the first `npm run build`. They resolve
once `dist/` exists. If no errors remain after building, the code is correct.

## Naming Conventions

| Target | Convention |
|--------|-----------|
| NPM package | `@hironytic/anatomist` |
| CSS custom properties | `--anatomist-*` (e.g. `--anatomist-hex-highlight-bg`) |
| CSS class names | `.anatomist-*` BEM-style (e.g. `.anatomist-hex-viewer__cell--highlighted`) |

## CSS Distribution

`src/styles/default.css` is copied verbatim to `dist/style.css` by tsup.
Consumers import it as `@hironytic/anatomist/style.css`.

## Documentation

`README.md` documents the public API. When modifying any of the following, update `README.md` in the same commit or PR:

- Components exposed to consumers (`<Anatomist>`, `<SpanList>`, `<FocusMessage>`)
- `Atlas` API (`data`, `setFocusRegion`, `setActiveSpan`, `setSecondaryRange`)
- CSS custom properties (`--anatomist-*`) listed in the Theming section

## Key Design Decisions

- **No bundled parser**: the framework receives already-parsed data structures; parsing is the consumer's responsibility.
- **CSS Custom Properties for theming**: no CSS-in-JS, no external styling library. Consumers override variables in `:root`.
- **Peer dependencies**: `react` and `react-dom` are peer deps (`>=19`) so consumers use their own React instance.
