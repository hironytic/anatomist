import { useState } from 'react';
import { HexView, RangeList } from '@hironytic/anatomist';
import type { HexRange, RangeListItem } from '@hironytic/anatomist';
import '@hironytic/anatomist/style.css';

function makeData(size: number): Uint8Array {
  const buf = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    buf[i] = (i * 37 + 13) & 0xff;
  }
  return buf;
}

const DEMO_DATA = makeData(100_000);

interface DemoRangeEntry {
  range: HexRange;
  label: string;
}

const DEMO_RANGE_ENTRIES: DemoRangeEntry[] = [
  { range: { startOffset: 0,   endOffset: 4   }, label: 'Header (0–3)'      },
  { range: { startOffset: 10,  endOffset: 52  }, label: 'Chunk 1 (10–51)'   },
  { range: { startOffset: 80,  endOffset: 96  }, label: 'Chunk 2 (80–95)'   },
  { range: { startOffset: 100, endOffset: 200 }, label: 'Chunk 3 (100–199)' },
  { range: { startOffset: 200, endOffset: 211 }, label: 'Chunk 4 (200–210)' },
];

const DEMO_ITEMS: RangeListItem[] = [
  { id: 'magic',     startOffset: 0,  endOffset: 4,  name: 'Magic Number',  value: '0D 0A 1A 0A' },
  { id: 'width',     startOffset: 4,  endOffset: 8,  name: 'Width',         value: '256 px'       },
  { id: 'height',    startOffset: 8,  endOffset: 12, name: 'Height',        value: '256 px'       },
  { id: 'depth',     startOffset: 12, endOffset: 13, name: 'Bit Depth',     value: '8'            },
  { id: 'ctype',     startOffset: 13, endOffset: 14, name: 'Color Type',    value: '2 (RGB)'      },
  { id: 'comp',      startOffset: 14, endOffset: 15, name: 'Compression',   value: '0'            },
  { id: 'filter',    startOffset: 15, endOffset: 16, name: 'Filter Method', value: '0'            },
  { id: 'interlace', startOffset: 16, endOffset: 17, name: 'Interlace',     value: '0 (None)'     },
  { id: 'crc',       startOffset: 17, endOffset: 21, name: 'CRC',           value: '0x2BD3B498'   },
  { id: 'extra',     startOffset: 21, endOffset: 30, name: 'Reserved',      value: '(9 bytes)'    },
];

const TEAL = '#4ec9b0';
const AMBER = '#f0a500';

export function App() {
  const [focusedRange, setFocusedRange] = useState<HexRange | undefined>(DEMO_RANGE_ENTRIES[0].range);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>('magic');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '16px',
        boxSizing: 'border-box',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
      }}
    >
      <h1 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 'normal' }}>
        Anatomist Sandbox — HexView ({DEMO_DATA.length.toLocaleString()} bytes)
      </h1>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        {DEMO_RANGE_ENTRIES.map((entry, i) => {
          const isFocused = focusedRange === entry.range;
          return (
            <button
              key={i}
              onClick={() => setFocusedRange(entry.range)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                border: '1px solid',
                borderColor: isFocused ? AMBER : TEAL,
                backgroundColor: isFocused ? 'rgba(240, 165, 0, 0.15)' : 'transparent',
                color: '#d4d4d4',
                borderRadius: '3px',
                fontFamily: 'monospace',
              }}
            >
              {entry.label}
            </button>
          );
        })}
        <button
          onClick={() => setFocusedRange(undefined)}
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            border: '1px solid #555',
            backgroundColor: focusedRange === undefined ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: '#d4d4d4',
            borderRadius: '3px',
          }}
        >
          None
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <HexView
            data={DEMO_DATA}
            primaryRange={focusedRange}
            secondaryRanges={DEMO_RANGE_ENTRIES.map(e => e.range)}
          />
        </div>
        <div style={{ width: '320px', flexShrink: 0 }}>
          <RangeList
            items={DEMO_ITEMS}
            selectedItemId={selectedItemId}
            onItemSelect={id => setSelectedItemId(id as string)}
            onItemJump={id => alert(`Jump to: ${id}`)}
          />
        </div>
      </div>
    </div>
  );
}
