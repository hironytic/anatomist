import { useRef, useState, type ComponentType, type DragEvent } from 'react';
import { HexView, type HexRange, type PrimaryActiveSpan } from './HexView';

/**
 * Handle passed to {@link AnatomistProps.onLoad} for the most recently
 * dropped file. Use it to drive the HexView highlight and the right-pane
 * detail rendering. Only the latest Atlas is valid; calling methods on
 * a stale Atlas after a new file has been dropped will still mutate the
 * Anatomist's internal state and is therefore unsupported.
 */
export interface Atlas {
  /** Bytes of the dropped file. */
  readonly data: Uint8Array;
  /**
   * Update HexView's primaryRange. Offsets follow the existing HexRange
   * convention: startOffset inclusive, endOffset exclusive.
   */
  setPrimaryRange(startOffset: number, endOffset: number): void;
  /**
   * Update HexView's activeSpan. Offsets are relative to the current
   * primaryRange.startOffset (see PrimaryActiveSpan).
   */
  setActiveSpan(start: number, end: number): void;
  /** Render `<component {...props} />` in the right pane. */
  setDetail<P>(component: ComponentType<P>, props: P): void;
}

export interface AnatomistProps {
  onLoad: (atlas: Atlas) => void;
}

interface DetailState {
  component: ComponentType<unknown>;
  props: unknown;
}

export function Anatomist({ onLoad }: AnatomistProps) {
  const [data, setData] = useState<Uint8Array | null>(null);
  const [primaryRange, setPrimaryRange] = useState<HexRange | undefined>(undefined);
  const [activeSpan, setActiveSpan] = useState<PrimaryActiveSpan | undefined>(undefined);
  const [detail, setDetail] = useState<DetailState | null>(null);
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
    setPrimaryRange(undefined);
    setActiveSpan(undefined);
    setDetail(null);

    const atlas: Atlas = {
      data: buf,
      setPrimaryRange: (startOffset, endOffset) =>
        setPrimaryRange({ startOffset, endOffset }),
      setActiveSpan: (start, end) => setActiveSpan({ start, end }),
      setDetail: <P,>(component: ComponentType<P>, props: P) =>
        setDetail({
          component: component as ComponentType<unknown>,
          props,
        }),
    };
    onLoad(atlas);
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

  const Detail = detail?.component;
  return (
    <div className={rootClass} {...dragHandlers}>
      <div className="anatomist-app__hex">
        <HexView data={data} primaryRange={primaryRange} activeSpan={activeSpan} />
      </div>
      <div className="anatomist-app__detail">
        {Detail ? <Detail {...(detail!.props as object)} /> : null}
      </div>
    </div>
  );
}
