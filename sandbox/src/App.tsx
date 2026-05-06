import { Anatomist, FocusMessage, SpanListView } from '@hironytic/anatomist';
import type { Atlas, HexRange, SpanListViewItem } from '@hironytic/anatomist';
import '@hironytic/anatomist/style.css';

const FOCUS_SIZE = 36;

function toHex(n: number): string {
  if (n < 0) return '-' + Math.abs(n).toString(16).toUpperCase().padStart(4, '0');
  return n.toString(16).toUpperCase().padStart(4, '0');
}

function toRegionTitle(start: number): string {
  return 'Region from 0x' + start.toString(16).toUpperCase().padStart(4, '0');
}

function makeJumpTargetRange(target: number, dataLength: number): HexRange | undefined {
  const end = target + FOCUS_SIZE;
  return target >= 0 && end <= dataLength ? { startOffset: target, endOffset: end } : undefined;
}

function buildItems(
  data: Uint8Array,
  focusStart: number,
  onJump: (newStart: number) => void,
): SpanListViewItem[] {
  const view = new DataView(data.buffer, data.byteOffset + focusStart, FOCUS_SIZE);

  const rawHex = Array.from(data.subarray(focusStart, focusStart + 6))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  const int8At34 = view.getInt8(34);
  const int8At35 = view.getInt8(35);
  const jumpTarget34 = focusStart + int8At34;
  const jumpTarget35 = focusStart + int8At35;

  return [
    { id: 0, startOffset: 0, endOffset: 6, name: 'Raw bytes', value: rawHex },
    { id: 1, startOffset: 6, endOffset: 14, name: 'float64 LE', value: String(view.getFloat64(6, true)) },
    { id: 2, startOffset: 14, endOffset: 22, name: 'float64 BE', value: String(view.getFloat64(14, false)) },
    { id: 3, startOffset: 22, endOffset: 26, name: 'int32 LE', value: String(view.getInt32(22, true)) },
    { id: 4, startOffset: 26, endOffset: 30, name: 'int32 BE', value: String(view.getInt32(26, false)) },
    { id: 5, startOffset: 30, endOffset: 32, name: 'int16 LE', value: String(view.getInt16(30, true)) },
    { id: 6, startOffset: 32, endOffset: 34, name: 'int16 BE', value: String(view.getInt16(32, false)) },
    {
      id: 7,
      startOffset: 34,
      endOffset: 35,
      name: 'int8',
      value: String(int8At34),
      jumpTargetRange: makeJumpTargetRange(jumpTarget34, data.length),
      onJump: () => onJump(jumpTarget34),
    },
    {
      id: 8,
      startOffset: 35,
      endOffset: 36,
      name: 'int8',
      value: String(int8At35),
      jumpTargetRange: makeJumpTargetRange(jumpTarget35, data.length),
      onJump: () => onJump(jumpTarget35),
    },
  ];
}

function showFocusRegion(atlas: Atlas, data: Uint8Array, focusStart: number): void {
  const focusEnd = focusStart + FOCUS_SIZE;

  if (focusStart < 0 || focusEnd > data.length) {
    atlas.setFocusRegion({
      range: { startOffset: 0, endOffset: 0 },
      component: FocusMessage,
      props: { message: `${toHex(focusStart)}–${toHex(focusEnd - 1)} is outside the file bounds` },
      title: toRegionTitle(focusStart),
    });
    return;
  }

  const items = buildItems(data, focusStart, (newStart) => showFocusRegion(atlas, data, newStart));
  atlas.setFocusRegion({
    range: { startOffset: focusStart, endOffset: focusEnd },
    component: SpanListView,
    title: toRegionTitle(focusStart),
    props: { atlas, items },
  });
}

export function App() {
  return (
    <Anatomist
      appName="Anatomist Sandbox"
      version="v0.1.0"
      description="A sandbox app for validating the Anatomist framework."
      onLoad={(atlas) => showFocusRegion(atlas, atlas.data, 0)}
    />
  );
}
