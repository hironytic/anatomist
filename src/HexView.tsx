import { useEffect, useRef, useState } from 'react';

const BYTES_PER_ROW = 16;
const ROW_HEIGHT_PX = 24;         // Must match .anatomist-hex-view__row { height } in CSS
const BUFFER_ROWS = 5;
const OFFSET_LABEL_WIDTH_PX = 52; // Must match --anatomist-hex-view-offset-label-width in CSS
const CELL_WIDTH_PX = 28;         // Must match --anatomist-hex-view-cell-width in CSS
const OVERLAY_INSET_PX = 2;       // Must match --anatomist-hex-range-inset in CSS

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
  /** Whether to render the primary-range background fill. False for border-only segments. */
  showBackground: boolean;
  top: number;
  bottom: number;
  left: number;
  width: number;
  borderTop: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderRight: boolean;
}

function computeRangeSegments(
  rowIndex: number,
  range: HexRange,
  keyPrefix: string,
  isPrimary: boolean,
): RangeOverlaySegment[] {
  const rowStart = rowIndex * BYTES_PER_ROW;
  const rowEnd = rowStart + BYTES_PER_ROW;

  if (range.startOffset >= range.endOffset) return [];
  if (range.endOffset <= rowStart || range.startOffset >= rowEnd) return [];

  const inset = OVERLAY_INSET_PX;
  const R1 = Math.floor(range.startOffset / BYTES_PER_ROW);
  const C1 = range.startOffset % BYTES_PER_ROW;
  const R2 = Math.floor((range.endOffset - 1) / BYTES_PER_ROW);
  const C2 = (range.endOffset - 1) % BYTES_PER_ROW;
  const isMultiRow = R1 !== R2;

  const isFirstRow = rowIndex === R1;
  const isLastRow = rowIndex === R2;
  const cL = isFirstRow ? C1 : 0;
  const cR = isLastRow ? C2 : BYTES_PER_ROW - 1;

  // A 2-row range where the start column is to the right of the end column has no
  // horizontal overlap between rows, so it renders as two independent rectangles.
  const isSplit = R2 === R1 + 1 && C1 > C2;

  // Main body: carries left/right borders (always) and top/bottom borders on first/last rows.
  // For staircase ranges, the first row extends below by -inset and the last row extends
  // above by -inset so that the step borders connect flush to the vertical borders.
  // The row just below R1 (if C1>0) and the row just above R2 (if C2<15) shift their
  // top/bottom by inset so the vertical border begins/ends exactly at the step border.
  // For split ranges each row is a self-contained rectangle with all four borders.
  const top    = isSplit ? inset
               : isFirstRow ? inset
               : (isLastRow && isMultiRow) ? -inset
               : (isMultiRow && C1 > 0 && rowIndex === R1 + 1) ? inset
               : 0;
  const bottom = isSplit ? inset
               : isLastRow ? inset
               : (isFirstRow && isMultiRow) ? -inset
               : (isMultiRow && C2 < BYTES_PER_ROW - 1 && rowIndex === R2 - 1) ? inset
               : 0;

  const bodyLeft  = OFFSET_LABEL_WIDTH_PX + cL * CELL_WIDTH_PX + inset;
  const bodyWidth = (cR - cL + 1) * CELL_WIDTH_PX - 2 * inset;

  const segments: RangeOverlaySegment[] = [];

  // For the primary range the background fill and the borders are rendered as separate
  // elements so the fill can sit behind the text (z-index: 0) while the borders appear
  // in front of secondary range borders (z-index: 2 via --primary class).
  if (isPrimary) {
    segments.push({
      key: `${keyPrefix}_bg`,
      isPrimary: true,
      showBackground: true,
      top, bottom, left: bodyLeft, width: bodyWidth,
      borderTop: false, borderBottom: false, borderLeft: false, borderRight: false,
    });
  }

  segments.push({
    key: keyPrefix,
    isPrimary,
    showBackground: false,
    top,
    bottom,
    left:  bodyLeft,
    width: bodyWidth,
    borderTop:    isSplit || isFirstRow,
    borderBottom: isSplit || isLastRow,
    borderLeft:   true,
    borderRight:  true,
  });

  // Step borders are only needed for staircase (non-split) shapes.

  // Step top: on row R1+1, top border spanning cols [0, C1-1].
  // Placed at top=inset so it is uniformly inset from the row boundary.
  // Its right end aligns with R1's left border; R1's bottom:-inset extension meets it there.
  if (!isSplit && isMultiRow && C1 > 0 && rowIndex === R1 + 1) {
    segments.push({
      key: `${keyPrefix}_step_top`,
      isPrimary,
      showBackground: false,
      top:    inset,
      bottom: 0,
      left:   OFFSET_LABEL_WIDTH_PX + inset,
      width:  C1 * CELL_WIDTH_PX,
      borderTop:    true,
      borderBottom: false,
      borderLeft:   false,
      borderRight:  false,
    });
  }

  // Step bottom: on row R2-1, bottom border spanning cols [C2+1, 15].
  // Placed at bottom=inset so it is uniformly inset from the row boundary.
  // Its left end aligns with R2's right border; R2's top:-inset extension meets it there.
  if (!isSplit && isMultiRow && C2 < BYTES_PER_ROW - 1 && rowIndex === R2 - 1) {
    segments.push({
      key: `${keyPrefix}_step_bottom`,
      isPrimary,
      showBackground: false,
      top:    0,
      bottom: inset,
      left:   OFFSET_LABEL_WIDTH_PX + (C2 + 1) * CELL_WIDTH_PX - inset,
      width:  (BYTES_PER_ROW - 1 - C2) * CELL_WIDTH_PX,
      borderTop:    false,
      borderBottom: true,
      borderLeft:   false,
      borderRight:  false,
    });
  }

  return segments;
}

function computeRowOverlays(
  rowIndex: number,
  secondaryRanges: HexRange[],
  primaryRange: HexRange | undefined,
): RangeOverlaySegment[] {
  const segments: RangeOverlaySegment[] = [];

  for (let i = 0; i < secondaryRanges.length; i++) {
    segments.push(...computeRangeSegments(rowIndex, secondaryRanges[i], `s${i}`, false));
  }

  if (primaryRange) {
    segments.push(...computeRangeSegments(rowIndex, primaryRange, 'p', true));
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
        seg.showBackground ? 'anatomist-hex-view__range-overlay--primary-bg'    : '',
      ].filter(Boolean).join(' ');
      return (
        <div
          key={seg.key}
          className={cls}
          style={{ top: seg.top, bottom: seg.bottom, left: seg.left, width: seg.width }}
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
