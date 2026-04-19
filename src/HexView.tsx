import { useEffect, useRef, useState } from 'react';

const BYTES_PER_ROW = 16;
const ROW_HEIGHT_PX = 24; // Must match .anatomist-hex-view__row { height } in CSS
const BUFFER_ROWS = 5;

const COLUMN_HEADERS = Array.from({ length: BYTES_PER_ROW }, (_, i) =>
  '+' + i.toString(16).toUpperCase()
);

export interface HexViewProps {
  data: Uint8Array;
}

export function HexView({ data }: HexViewProps) {
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

    rows.push(
      <div key={rowIndex} className="anatomist-hex-view__row">
        <div className="anatomist-hex-view__offset-label">{rowLabel}</div>
        {cells}
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
