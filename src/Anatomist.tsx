import { useRef, useState, type ComponentType, type DragEvent } from 'react';
import { HexView, type HexRange, type PrimaryActiveSpan } from './HexView';

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
}

export interface AnatomistProps {
  onLoad: (atlas: Atlas) => void;
}

interface FocusRegionEntry {
  range: HexRange;
  component: ComponentType<unknown>;
  props: unknown;
}

interface NavigationState {
  entries: FocusRegionEntry[];
  index: number;
}

const EMPTY_NAV: NavigationState = { entries: [], index: -1 };

export function Anatomist({ onLoad }: AnatomistProps) {
  const [data, setData] = useState<Uint8Array | null>(null);
  const [nav, setNav] = useState<NavigationState>(EMPTY_NAV);
  const [activeSpan, setActiveSpan] = useState<PrimaryActiveSpan | undefined>(undefined);
  const [isDragOver, setIsDragOver] = useState(false);
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

    const atlas: Atlas = {
      data: buf,
      setFocusRegion: <P,>(region: FocusRegion<P>) => {
        const entry: FocusRegionEntry = {
          range: region.range,
          component: region.component as ComponentType<unknown>,
          props: region.props,
        };
        setNav((prev) => {
          const kept = prev.entries.slice(0, prev.index + 1);
          return { entries: [...kept, entry], index: kept.length };
        });
        setActiveSpan(undefined);
      },
      setActiveSpan: (start, end) => setActiveSpan({ start, end }),
    };
    onLoad(atlas);
  };

  const handleBack = () => {
    setNav((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
    setActiveSpan(undefined);
  };

  const handleForward = () => {
    setNav((prev) =>
      prev.index < prev.entries.length - 1 ? { ...prev, index: prev.index + 1 } : prev,
    );
    setActiveSpan(undefined);
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
        <div className="anatomist-app__empty-message">Drop a file here</div>
      </div>
    );
  }

  const current = nav.index >= 0 ? nav.entries[nav.index] : undefined;
  const Focused = current?.component;
  const canGoBack = nav.index > 0;
  const canGoForward = nav.index < nav.entries.length - 1;

  return (
    <div className={rootClass} {...dragHandlers}>
      <div className="anatomist-app__toolbar">
        <div className="anatomist-app__nav">
          <button
            type="button"
            className="anatomist-app__nav-button"
            onClick={handleBack}
            disabled={!canGoBack}
            aria-label="Go back"
          >
            {'‹'}
          </button>
          <button
            type="button"
            className="anatomist-app__nav-button"
            onClick={handleForward}
            disabled={!canGoForward}
            aria-label="Go forward"
          >
            {'›'}
          </button>
        </div>
      </div>
      <div className="anatomist-app__panes">
        <div className="anatomist-app__hex">
          <HexView data={data} primaryRange={current?.range} activeSpan={activeSpan} />
        </div>
        <div className="anatomist-app__focus-region">
          {Focused ? <Focused {...(current!.props as object)} /> : null}
        </div>
      </div>
    </div>
  );
}
