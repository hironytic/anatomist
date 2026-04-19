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
  /** Unique identifier used as a React key and for matching against currentRangeId. */
  id: string | number;
  /** First byte of the range (inclusive). */
  startOffset: number;
  /** One past the last byte of the range (exclusive). */
  endOffset: number;
}

export interface HexViewProps {
  data: Uint8Array;
  ranges?: HexRange[];
  /** The id of the range to highlight as "current" (accent border + background fill). Undefined means no range is current. */
  currentRangeId?: string | number;
}

interface RangeOverlaySegment {
  key: string;
  isCurrent: boolean;
  /** Whether to render the current-range background fill. False for step-border segments. */
  showBackground: boolean;
  left: number;
  width: number;
  borderTop: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  borderRight: boolean;
}

function computeRowOverlays(
  rowIndex: number,
  ranges: HexRange[],
  currentRangeId: string | number | undefined,
): RangeOverlaySegment[] {
  const rowStart = rowIndex * BYTES_PER_ROW;
  const rowEnd = rowStart + BYTES_PER_ROW;
  const segments: RangeOverlaySegment[] = [];

  for (const range of ranges) {
    if (range.startOffset >= range.endOffset) continue;
    if (range.endOffset <= rowStart || range.startOffset >= rowEnd) continue;

    const R1 = Math.floor(range.startOffset / BYTES_PER_ROW);
    const C1 = range.startOffset % BYTES_PER_ROW;
    const R2 = Math.floor((range.endOffset - 1) / BYTES_PER_ROW);
    const C2 = (range.endOffset - 1) % BYTES_PER_ROW;
    const isMultiRow = R1 !== R2;
    const isCurrent = range.id === currentRangeId;

    // Main segment: the body of the range on this row.
    const isFirstRow = rowIndex === R1;
    const isLastRow = rowIndex === R2;
    const colStart = isFirstRow ? C1 : 0;
    const colEnd = isLastRow ? C2 + 1 : BYTES_PER_ROW;
    segments.push({
      key: String(range.id),
      isCurrent,
      showBackground: isCurrent,
      left: OFFSET_LABEL_WIDTH_PX + colStart * CELL_WIDTH_PX,
      width: (colEnd - colStart) * CELL_WIDTH_PX,
      borderTop: isFirstRow,
      borderBottom: isLastRow,
      borderLeft: true,
      borderRight: true,
    });

    // Step top border: on row R1+1, add a top border over cols 0 to C1-1.
    // This closes the upper-left "step" of the staircase outline.
    if (isMultiRow && C1 > 0 && rowIndex === R1 + 1) {
      segments.push({
        key: `${range.id}_step_top`,
        isCurrent,
        showBackground: false,
        left: OFFSET_LABEL_WIDTH_PX,
        width: C1 * CELL_WIDTH_PX,
        borderTop: true,
        borderBottom: false,
        borderLeft: false,
        borderRight: false,
      });
    }

    // Step bottom border: on row R2-1, add a bottom border over cols C2+1 to 15.
    // This closes the lower-right "step" of the staircase outline.
    if (isMultiRow && C2 < BYTES_PER_ROW - 1 && rowIndex === R2 - 1) {
      segments.push({
        key: `${range.id}_step_bottom`,
        isCurrent,
        showBackground: false,
        left: OFFSET_LABEL_WIDTH_PX + (C2 + 1) * CELL_WIDTH_PX,
        width: (BYTES_PER_ROW - 1 - C2) * CELL_WIDTH_PX,
        borderTop: false,
        borderBottom: true,
        borderLeft: false,
        borderRight: false,
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

    const overlaySegments = computeRowOverlays(rowIndex, ranges, currentRangeId);
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
          style={{ left: seg.left, width: seg.width }}
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
