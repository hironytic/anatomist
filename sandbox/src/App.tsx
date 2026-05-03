import { Anatomist, SpanList } from '@hironytic/anatomist';
import type { Atlas, SpanListItem } from '@hironytic/anatomist';
import '@hironytic/anatomist/style.css';

const FOCUS_SIZE = 36;

interface OutOfRangeProps {
  start: number;
  end: number;
}

function toHex(n: number): string {
  if (n < 0) return '-' + Math.abs(n).toString(16).toUpperCase().padStart(4, '0');
  return n.toString(16).toUpperCase().padStart(4, '0');
}

function OutOfRange({ start, end }: OutOfRangeProps) {
  return (
    <div style={{ padding: '16px', color: 'var(--anatomist-app-empty-fg)' }}>
      {toHex(start)}–{toHex(end - 1)} の範囲がファイル外になるため表示できません
    </div>
  );
}

function buildItems(
  data: Uint8Array,
  focusStart: number,
  onJump: (newStart: number) => void,
): { items: SpanListItem[]; jumpTargetMap: Map<string | number, number> } {
  const view = new DataView(data.buffer, data.byteOffset + focusStart, FOCUS_SIZE);

  const rawHex = Array.from(data.subarray(focusStart, focusStart + 6))
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');

  const int8At34 = view.getInt8(34);
  const int8At35 = view.getInt8(35);

  const jumpTargetMap = new Map<string | number, number>();
  jumpTargetMap.set(7, focusStart + int8At34);
  jumpTargetMap.set(8, focusStart + int8At35);

  const items: SpanListItem[] = [
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
      onJump: () => onJump(focusStart + int8At34),
    },
    {
      id: 8,
      startOffset: 35,
      endOffset: 36,
      name: 'int8',
      value: String(int8At35),
      onJump: () => onJump(focusStart + int8At35),
    },
  ];

  return { items, jumpTargetMap };
}

function showFocusRegion(atlas: Atlas, data: Uint8Array, focusStart: number): void {
  const focusEnd = focusStart + FOCUS_SIZE;

  if (focusStart < 0 || focusEnd > data.length) {
    atlas.setFocusRegion({
      range: { startOffset: 0, endOffset: 0 },
      component: OutOfRange,
      props: { start: focusStart, end: focusEnd },
    });
    return;
  }

  const { items, jumpTargetMap } = buildItems(data, focusStart, (newStart) => showFocusRegion(atlas, data, newStart));
  atlas.setFocusRegion({
    range: { startOffset: focusStart, endOffset: focusEnd },
    component: SpanList,
    props: {
      items,
      onItemSelect: (id: string | number) => {
        const item = items.find((it) => it.id === id);
        if (item) atlas.setActiveSpan(item.startOffset, item.endOffset);
      },
      onJumpHover: (id: string | number | undefined) => {
        if (id === undefined) {
          atlas.setSecondaryRange(undefined);
          return;
        }
        const target = jumpTargetMap.get(id);
        if (target === undefined) {
          atlas.setSecondaryRange(undefined);
          return;
        }
        const newEnd = target + FOCUS_SIZE;
        if (target >= 0 && newEnd <= data.length) {
          atlas.setSecondaryRange({ startOffset: target, endOffset: newEnd });
        } else {
          atlas.setSecondaryRange(undefined);
        }
      },
    },
  });
}

export function App() {
  return <Anatomist onLoad={(atlas) => showFocusRegion(atlas, atlas.data, 0)} />;
}
