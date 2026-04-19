import { HexView } from '@hironytic/anatomist';
import '@hironytic/anatomist/style.css';

function makeData(size: number): Uint8Array {
  const buf = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    buf[i] = (i * 37 + 13) & 0xff;
  }
  return buf;
}

const DEMO_DATA = makeData(100_000);

export function App() {
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
      <div style={{ flex: 1, minHeight: 0 }}>
        <HexView data={DEMO_DATA} />
      </div>
    </div>
  );
}
