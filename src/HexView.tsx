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
  /** Unique identifier used as a React key and for matching against currentRangeId. */
  id: string | number;
  /** First byte of the range (inclusive). */
  startOffset: number;
  /** One past the last byte of the range (exclusive). */
  endOffset: number;
  /** Nested sub-ranges. Offsets are absolute (from file start), same as the parent. */
  children?: HexRange[];
}

export interface HexViewProps {
  data: Uint8Array;
  ranges?: HexRange[];
  /** The id of the range to highlight as "current" (accent border + background fill). Undefined means no range is current. */
  currentRangeId?: string | number;
}

interface FlatRange {
  range: HexRange;
  depth: number;
}

function flattenRanges(ranges: HexRange[], depth: number): FlatRange[] {
  return ranges.flatMap(range => {
    const result: FlatRange[] = [{ range, depth }];
    if (range.children && range.children.length > 0) {
      result.push(...flattenRanges(range.children, depth + 1));
    }
    return result;
  });
}

interface RangeOverlaySegment {
  key: string;
  isCurrent: boolean;
  /** Whether to render the current-range background fill. False for step-border segments. */
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

function computeRowOverlays(
  rowIndex: number,
  flatRanges: FlatRange[],
  currentRangeId: string | number | undefined,
): RangeOverlaySegment[] {
  const rowStart = rowIndex * BYTES_PER_ROW;
  const rowEnd = rowStart + BYTES_PER_ROW;
  const segments: RangeOverlaySegment[] = [];

  for (const { range, depth } of flatRanges) {
    if (range.startOffset >= range.endOffset) continue;
    if (range.endOffset <= rowStart || range.startOffset >= rowEnd) continue;

    const inset = (depth + 1) * OVERLAY_INSET_PX;
    const R1 = Math.floor(range.startOffset / BYTES_PER_ROW);
    const C1 = range.startOffset % BYTES_PER_ROW;
    const R2 = Math.floor((range.endOffset - 1) / BYTES_PER_ROW);
    const C2 = (range.endOffset - 1) % BYTES_PER_ROW;
    const isMultiRow = R1 !== R2;
    const isCurrent = range.id === currentRangeId;

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
    segments.push({
      key: String(range.id),
      isCurrent,
      showBackground: isCurrent,
      top,
      bottom,
      left:  OFFSET_LABEL_WIDTH_PX + cL * CELL_WIDTH_PX + inset,
      width: (cR - cL + 1) * CELL_WIDTH_PX - 2 * inset,
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
        key: `${range.id}_step_top`,
        isCurrent,
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
        key: `${range.id}_step_bottom`,
        isCurrent,
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
  }
  return segments;
}

export function HexView({ data, ranges = [], currentRangeId }: HexViewProps) {
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

  const totalRows = Math.ceil(data.length / BYTES_PER_ROW);

  const firstVisibleRow = Math.floor(scrollTop / ROW_HEIGHT_PX);
  const lastVisibleRow = Math.floor((scrollTop + containerHeight) / ROW_HEIGHT_PX);

  const startRow = Math.max(0, firstVisibleRow - BUFFER_ROWS);
  const endRow = Math.min(totalRows - 1, lastVisibleRow + BUFFER_ROWS);

  const topSpacerHeight = startRow * ROW_HEIGHT_PX;
  const bottomSpacerHeight = Math.max(0, (totalRows - 1 - endRow) * ROW_HEIGHT_PX);

  const flatRanges = flattenRanges(ranges, 0);

  const rows = [];
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const baseByteIndex = rowIndex * BYTES_PER_ROW;
    const rowLabel = baseByteIndex.toString(16).toUpperCase().padStart(4, '0');

    const cells = [];
    for (let col = 0; col < BYTES_PER_ROW; col++) {
      const byteIndex = baseByteIndex + col;
      if (byteIndex < data.length) {
        cells.push(
          <div key={col} className="anatomist-hex-view__cell">
            {data[byteIndex].toString(16).toUpperCase().padStart(2, '0')}
          </div>
        );
      } else {
        cells.push(
          <div key={col} className="anatomist-hex-view__cell anatomist-hex-view__cell--empty" />
        );
      }
    }

    const overlaySegments = computeRowOverlays(rowIndex, flatRanges, currentRangeId);
    const overlays = overlaySegments.map(seg => {
      const cls = [
        'anatomist-hex-view__range-overlay',
        seg.borderTop      ? 'anatomist-hex-view__range-overlay--border-top'    : '',
        seg.borderBottom   ? 'anatomist-hex-view__range-overlay--border-bottom' : '',
        seg.borderLeft     ? 'anatomist-hex-view__range-overlay--border-left'   : '',
        seg.borderRight    ? 'anatomist-hex-view__range-overlay--border-right'  : '',
        seg.isCurrent      ? 'anatomist-hex-view__range-overlay--current'       : '',
        seg.showBackground ? 'anatomist-hex-view__range-overlay--current-bg'    : '',
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
