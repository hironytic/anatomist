import { useRef, useState, type ComponentType, type DragEvent } from 'react';
import { AlertDialog, type DialogState } from './AlertDialog';
import { HexView, type HexRange, type PrimaryActiveSpan } from './HexView';
import { WelcomeView } from './WelcomeView';

/**
 * A region of the binary that the user is currently focused on.
 * Updating it via {@link Atlas.setFocusRegion} drives both the HexView
 * primary highlight and the right-pane rendering.
 */
export interface FocusRegion<P = unknown> {
  /** Byte range to highlight in the HexView (startOffset inclusive, endOffset exclusive). */
  range: HexRange;
  /** Component rendered in the right pane to describe the region. */
  component: ComponentType<P>;
  /** Props passed to the component. */
  props: P;
  /** Title displayed above the right pane. */
  title: string;
}

/**
 * Handle passed to {@link AnatomistProps.onLoad} for the most recently
 * dropped file. Use it to drive the HexView highlight and the right-pane
 * rendering. Only the latest Atlas is valid; calling methods on a stale
 * Atlas after a new file has been dropped will still mutate the
 * Anatomist's internal state and is therefore unsupported.
 */
export interface Atlas {
  /** Bytes of the dropped file. */
  readonly data: Uint8Array;
  /**
   * Push a new focus region. Each call appends a navigation history entry,
   * truncating any forward history first (browser-style). The HexView
   * activeSpan is reset to undefined.
   */
  setFocusRegion<P>(region: FocusRegion<P>): void;
  /**
   * Update HexView's activeSpan. Offsets are relative to the current
   * focus region's range.startOffset (see PrimaryActiveSpan).
   */
  setActiveSpan(start: number, end: number): void;
  /**
   * Set a single secondary range shown in HexView alongside the primary range.
   * Pass undefined to clear it.
   */
  setSecondaryRange(range: HexRange | undefined): void;
  /**
   * Show a modal alert dialog with the given message. Returns a Promise that
   * resolves when the user dismisses the dialog.
   */
  showAlert(message: string): Promise<void>;
  /**
   * Show a modal confirm dialog with the given message. Returns a Promise that
   * resolves to true if the user clicks OK, or false if they click Cancel or
   * press Escape.
   */
  showConfirm(message: string): Promise<boolean>;
}

export interface AnatomistProps {
  onLoad: (atlas: Atlas) => void;
  appName?: string;
  version?: string;
  description?: string;
}

interface FocusRegionEntry {
  range: HexRange;
  component: ComponentType<unknown>;
  props: unknown;
  title: string;
}

interface NavigationState {
  entries: FocusRegionEntry[];
  index: number;
}

const EMPTY_NAV: NavigationState = { entries: [], index: -1 };

export function Anatomist({ onLoad, appName, version, description }: AnatomistProps) {
  const [data, setData] = useState<Uint8Array | null>(null);
  const [nav, setNav] = useState<NavigationState>(EMPTY_NAV);
  const [activeSpan, setActiveSpan] = useState<PrimaryActiveSpan | undefined>(undefined);
  const [secondaryRanges, setSecondaryRanges] = useState<HexRange[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const dragDepthRef = useRef(0);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const buf = new Uint8Array(await file.arrayBuffer());

    setData(buf);
    setNav(EMPTY_NAV);
    setActiveSpan(undefined);
    setSecondaryRanges([]);

    const atlas: Atlas = {
      data: buf,
      setFocusRegion: <P,>(region: FocusRegion<P>) => {
        const entry: FocusRegionEntry = {
          range: region.range,
          component: region.component as ComponentType<unknown>,
          props: region.props,
          title: region.title,
        };
        setNav((prev) => {
          const kept = prev.entries.slice(0, prev.index + 1);
          return { entries: [...kept, entry], index: kept.length };
        });
        setActiveSpan(undefined);
      },
      setActiveSpan: (start, end) => setActiveSpan({ start, end }),
      setSecondaryRange: (range) => setSecondaryRanges(range ? [range] : []),
      showAlert: (message) =>
        new Promise<void>((resolve) => {
          setDialogState({ kind: 'alert', message, resolve });
        }),
      showConfirm: (message) =>
        new Promise<boolean>((resolve) => {
          setDialogState({ kind: 'confirm', message, resolve });
        }),
    };
    onLoad(atlas);
  };

  const handleBack = () => {
    setNav((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
    setActiveSpan(undefined);
    setSecondaryRanges([]);
  };

  const handleForward = () => {
    setNav((prev) =>
      prev.index < prev.entries.length - 1 ? { ...prev, index: prev.index + 1 } : prev,
    );
    setActiveSpan(undefined);
    setSecondaryRanges([]);
  };

  const dragHandlers = {
    onDragOver: handleDragOver,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  const rootClass =
    'anatomist-app' +
    (isDragOver ? ' anatomist-app--drag-over' : '') +
    (data === null ? ' anatomist-app--empty' : '');

  if (data === null) {
    return (
      <div className={rootClass} {...dragHandlers}>
        <WelcomeView appName={appName} version={version} description={description} />
        {dialogState !== null && (
          <AlertDialog state={dialogState} onClose={() => setDialogState(null)} />
        )}
      </div>
    );
  }

  const current = nav.index >= 0 ? nav.entries[nav.index] : undefined;
  const Focused = current?.component;
  const canGoBack = nav.index > 0;
  const canGoForward = nav.index < nav.entries.length - 1;

  return (
    <div className={rootClass} {...dragHandlers}>
      {dialogState !== null && (
        <AlertDialog state={dialogState} onClose={() => setDialogState(null)} />
      )}
      <div className="anatomist-app__toolbar">
        <div className="anatomist-app__nav">
          <button
            type="button"
            className="anatomist-app__nav-button"
            onClick={handleBack}
            disabled={!canGoBack}
            aria-label="Go back"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            type="button"
            className="anatomist-app__nav-button"
            onClick={handleForward}
            disabled={!canGoForward}
            aria-label="Go forward"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {current && (
          <>
            <div className="anatomist-app__toolbar-divider" />
            <div className="anatomist-app__toolbar-title" key={nav.index}>
              {current.title}
            </div>
          </>
        )}
      </div>
      <div className="anatomist-app__panes">
        <div className="anatomist-app__hex">
          <HexView data={data} primaryRange={current?.range} activeSpan={activeSpan} secondaryRanges={secondaryRanges} />
        </div>
        <div className="anatomist-app__focus-region">
          {Focused ? <Focused key={nav.index} {...(current!.props as object)} /> : null}
        </div>
      </div>
    </div>
  );
}
