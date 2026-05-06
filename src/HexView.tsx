import { useEffect, useRef, useState } from 'react';

const BYTES_PER_ROW = 16;
const ROW_HEIGHT_PX = 24;         // Must match .anatomist-hex-view__row { height } in CSS
const BUFFER_ROWS = 5;
const OFFSET_LABEL_WIDTH_PX = 52; // Must match --anatomist-hex-view-offset-label-width in CSS
const CELL_WIDTH_PX = 28;         // Must match --anatomist-hex-view-cell-width in CSS

const COLUMN_HEADERS = Array.from({ length: BYTES_PER_ROW }, (_, i) =>
  '+' + i.toString(16).toUpperCase()
);

export interface HexRange {
  /** First byte of the range (inclusive). */
  startOffset: number;
  /** One past the last byte of the range (exclusive). */
  endOffset: number;
}

export interface PrimaryActiveSpan {
  /** Inclusive offset relative to primaryRange.startOffset. */
  start: number;
  /** Exclusive offset relative to primaryRange.startOffset. */
  end: number;
}

export interface HexViewProps {
  data: Uint8Array;
  /** The primary range to highlight with an accent border and background fill. */
  primaryRange?: HexRange;
  /** Secondary ranges shown with subtle borders alongside the primary range. */
  secondaryRanges?: HexRange[];
  /**
   * Sub-portion within primaryRange whose bytes are rendered in an accent
   * text color. Offsets are relative to primaryRange.startOffset and are
   * silently clamped to the primary range's length. Ignored when primaryRange
   * is undefined or when the span is empty/inverted.
   */
  activeSpan?: PrimaryActiveSpan;
}

interface RangeOverlaySegment {
  key: string;
  isPrimary: boolean;
  isBackground: boolean;
  left: number;
  width: number;
  borderTop: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderRight: boolean;
}

function getRowColumns(rowIndex: number, range: HexRange): [number, number] | null {
  if (range.startOffset >= range.endOffset) return null;
  const rowStart = rowIndex * BYTES_PER_ROW;
  const rowEnd = rowStart + BYTES_PER_ROW;
  if (range.endOffset <= rowStart || range.startOffset >= rowEnd) return null;
  const cL = Math.max(rowStart, range.startOffset) - rowStart;
  const cR = Math.min(rowEnd, range.endOffset) - 1 - rowStart;
  return [cL, cR];
}

export function computeSegmentsForRange(
  rowIndex: number,
  range: HexRange,
  keyPrefix: string,
  isPrimary: boolean,
): RangeOverlaySegment[] {
  const cols = getRowColumns(rowIndex, range);
  if (!cols) return [];
  const [cL, cR] = cols;

  const prevCols = getRowColumns(rowIndex - 1, range);
  const nextCols = getRowColumns(rowIndex + 1, range);

  const segments: RangeOverlaySegment[] = [];

  if (isPrimary) {
    segments.push({
      key: `${keyPrefix}_bg`,
      isPrimary: true,
      isBackground: true,
      left: OFFSET_LABEL_WIDTH_PX + cL * CELL_WIDTH_PX,
      width: (cR - cL + 1) * CELL_WIDTH_PX,
      borderTop: false, borderBottom: false, borderLeft: false, borderRight: false,
    });
  }

  const colTopNeeded    = (c: number) => !prevCols || c < prevCols[0] || c > prevCols[1];
  const colBottomNeeded = (c: number) => !nextCols || c < nextCols[0] || c > nextCols[1];

  let spanStart  = cL;
  let spanTop    = colTopNeeded(cL);
  let spanBottom = colBottomNeeded(cL);

  for (let c = cL + 1; c <= cR + 1; c++) {
    const done = c > cR;
    const nextTop    = done ? false : colTopNeeded(c);
    const nextBottom = done ? false : colBottomNeeded(c);

    if (done || nextTop !== spanTop || nextBottom !== spanBottom) {
      const sR = c - 1;
      segments.push({
        key: `${keyPrefix}_${spanStart}`,
        isPrimary,
        isBackground: false,
        left: OFFSET_LABEL_WIDTH_PX + spanStart * CELL_WIDTH_PX,
        width: (sR - spanStart + 1) * CELL_WIDTH_PX,
        borderTop: spanTop,
        borderBottom: spanBottom,
        borderLeft: spanStart === cL,
        borderRight: sR === cR,
      });
      spanStart  = c;
      spanTop    = nextTop;
      spanBottom = nextBottom;
    }
  }

  return segments;
}

export function computeRowOverlays(
  rowIndex: number,
  secondaryRanges: HexRange[],
  primaryRange: HexRange | undefined,
): RangeOverlaySegment[] {
  const segments: RangeOverlaySegment[] = [];

  for (let i = 0; i < secondaryRanges.length; i++) {
    segments.push(...computeSegmentsForRange(rowIndex, secondaryRanges[i], `s${i}`, false));
  }

  if (primaryRange) {
    segments.push(...computeSegmentsForRange(rowIndex, primaryRange, 'p', true));
  }

  return segments;
}

export function HexView({ data, primaryRange, secondaryRanges = [], activeSpan }: HexViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!primaryRange || primaryRange.endOffset <= primaryRange.startOffset) return;
    if (!containerRef.current || containerHeight === 0) return;

    const startRow = Math.floor(primaryRange.startOffset / BYTES_PER_ROW);
    const endRow = Math.floor((primaryRange.endOffset - 1) / BYTES_PER_ROW);

    const container = containerRef.current;
    const visibleHeight = containerHeight - ROW_HEIGHT_PX;

    const rowTop = startRow * ROW_HEIGHT_PX;
    const rowBottom = (endRow + 1) * ROW_HEIGHT_PX;

    if (rowTop >= container.scrollTop && rowBottom <= container.scrollTop + visibleHeight) return;

    let newScrollTop: number;
    if (rowBottom - rowTop <= visibleHeight) {
      if (rowTop < container.scrollTop) {
        newScrollTop = rowTop;
      } else {
        newScrollTop = rowBottom - visibleHeight;
      }
    } else {
      newScrollTop = rowTop;
    }

    container.scrollTop = Math.max(0, newScrollTop);
  }, [primaryRange, containerHeight]);

  useEffect(() => {
    if (!primaryRange || !activeSpan) return;
    if (!containerRef.current || containerHeight === 0) return;

    const primaryLen = primaryRange.endOffset - primaryRange.startOffset;
    const s = Math.max(0, Math.min(primaryLen, activeSpan.start));
    const e = Math.max(0, Math.min(primaryLen, activeSpan.end));
    if (s >= e) return;

    const spanStartOffset = primaryRange.startOffset + s;
    const spanEndOffset   = primaryRange.startOffset + e;

    const startRow = Math.floor(spanStartOffset / BYTES_PER_ROW);
    const endRow   = Math.floor((spanEndOffset - 1) / BYTES_PER_ROW);

    const container = containerRef.current;
    const visibleHeight = containerHeight - ROW_HEIGHT_PX;

    const rowTop    = startRow * ROW_HEIGHT_PX;
    const rowBottom = (endRow + 1) * ROW_HEIGHT_PX;

    if (rowTop >= container.scrollTop && rowBottom <= container.scrollTop + visibleHeight) return;

    let newScrollTop: number;
    if (rowBottom - rowTop <= visibleHeight) {
      if (rowTop < container.scrollTop) {
        newScrollTop = rowTop;
      } else {
        newScrollTop = rowBottom - visibleHeight;
      }
    } else {
      newScrollTop = rowTop;
    }

    container.scrollTop = Math.max(0, newScrollTop);
  }, [primaryRange, activeSpan, containerHeight]);

  const totalRows = Math.ceil(data.length / BYTES_PER_ROW);

  let activeStart = -1;
  let activeEnd = -1;
  if (primaryRange && activeSpan) {
    const primaryLen = primaryRange.endOffset - primaryRange.startOffset;
    const s = Math.max(0, Math.min(primaryLen, activeSpan.start));
    const e = Math.max(0, Math.min(primaryLen, activeSpan.end));
    if (s < e) {
      activeStart = primaryRange.startOffset + s;
      activeEnd = primaryRange.startOffset + e;
    }
  }

  const firstVisibleRow = Math.floor(scrollTop / ROW_HEIGHT_PX);
  const lastVisibleRow = Math.floor((scrollTop + containerHeight) / ROW_HEIGHT_PX);

  const startRow = Math.max(0, firstVisibleRow - BUFFER_ROWS);
  const endRow = Math.min(totalRows - 1, lastVisibleRow + BUFFER_ROWS);

  const topSpacerHeight = startRow * ROW_HEIGHT_PX;
  const bottomSpacerHeight = Math.max(0, (totalRows - 1 - endRow) * ROW_HEIGHT_PX);

  const rows = [];
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const baseByteIndex = rowIndex * BYTES_PER_ROW;
    const rowLabel = baseByteIndex.toString(16).toUpperCase().padStart(4, '0');

    const cells = [];
    for (let col = 0; col < BYTES_PER_ROW; col++) {
      const byteIndex = baseByteIndex + col;
      if (byteIndex < data.length) {
        const isActive = byteIndex >= activeStart && byteIndex < activeEnd;
        const cellClass = isActive
          ? 'anatomist-hex-view__cell anatomist-hex-view__cell--active'
          : 'anatomist-hex-view__cell';
        cells.push(
          <div key={col} className={cellClass}>
            {data[byteIndex].toString(16).toUpperCase().padStart(2, '0')}
          </div>
        );
      } else {
        cells.push(
          <div key={col} className="anatomist-hex-view__cell anatomist-hex-view__cell--empty" />
        );
      }
    }

    const overlaySegments = computeRowOverlays(rowIndex, secondaryRanges, primaryRange);
    const overlays = overlaySegments.map(seg => {
      const cls = [
        'anatomist-hex-view__range-overlay',
        seg.borderTop      ? 'anatomist-hex-view__range-overlay--border-top'    : '',
        seg.borderBottom   ? 'anatomist-hex-view__range-overlay--border-bottom' : '',
        seg.borderLeft     ? 'anatomist-hex-view__range-overlay--border-left'   : '',
        seg.borderRight    ? 'anatomist-hex-view__range-overlay--border-right'  : '',
        seg.isPrimary      ? 'anatomist-hex-view__range-overlay--primary'       : '',
        seg.isBackground   ? 'anatomist-hex-view__range-overlay--primary-bg'    : '',
      ].filter(Boolean).join(' ');
      return (
        <div
          key={seg.key}
          className={cls}
          style={{ top: 0, bottom: 0, left: seg.left, width: seg.width }}
        />
      );
    });

    rows.push(
      <div key={rowIndex} className="anatomist-hex-view__row">
        <div className="anatomist-hex-view__offset-label">{rowLabel}</div>
        {cells}
        {overlays}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="anatomist-hex-view"
      onScroll={e => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
    >
      <div className="anatomist-hex-view__header" aria-hidden="true">
        <div className="anatomist-hex-view__header-offset-label" />
        {COLUMN_HEADERS.map(label => (
          <div key={label} className="anatomist-hex-view__header-cell">
            {label}
          </div>
        ))}
      </div>
      <div className="anatomist-hex-view__scroll-content">
        <div style={{ height: topSpacerHeight }} aria-hidden="true" />
        {rows}
        <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />
      </div>
    </div>
  );
}
