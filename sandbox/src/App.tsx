import { useState } from 'react';
import { Anatomist, RangeList } from '@hironytic/anatomist';
import type { Atlas, RangeListItem } from '@hironytic/anatomist';
import '@hironytic/anatomist/style.css';

interface DetailProps {
  items: RangeListItem[];
  atlas: Atlas;
}

function Detail({ items, atlas }: DetailProps) {
  const [selectedId, setSelectedId] = useState<string | number | undefined>(undefined);
  return (
    <RangeList
      items={items}
      selectedItemId={selectedId}
      onItemSelect={(id) => {
        setSelectedId(id);
        const item = items.find((it) => it.id === id);
        if (!item) return;
        atlas.setActiveSpan(item.startOffset, item.endOffset);
      }}
    />
  );
}

function buildItems(
  data: Uint8Array,
  regionStart: number,
  regionEnd: number,
  chunkSize: number,
): RangeListItem[] {
  const items: RangeListItem[] = [];
  const max = Math.min(data.length, regionEnd);
  for (let offset = regionStart; offset < max; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, max);
    const value = Array.from(data.subarray(offset, end))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    items.push({
      id: `chunk-${offset}`,
      startOffset: offset - regionStart,
      endOffset: end - regionStart,
      name: `Chunk @${offset}`,
      value,
    });
  }
  return items;
}

function focusOnSubRegion(atlas: Atlas, startOffset: number, endOffset: number) {
  const items = buildItems(atlas.data, startOffset, endOffset, 4);
  atlas.setFocusRegion({
    range: { startOffset, endOffset },
    component: Detail,
    props: { items, atlas },
  });
}

export function App() {
  const handleLoad = (atlas: Atlas) => {
    const items = buildItems(atlas.data, 0, 0x30, 8);
    const itemAt32 = items.find((it) => it.id === 'chunk-32');
    const itemAt40 = items.find((it) => it.id === 'chunk-40');
    if (itemAt32) {
      itemAt32.onJump = () => focusOnSubRegion(atlas, 0x30, 0x38);
    }
    if (itemAt40) {
      itemAt40.onJump = () => focusOnSubRegion(atlas, 0x38, 0x40);
    }
    atlas.setFocusRegion({
      range: { startOffset: 0, endOffset: 0x30 },
      component: Detail,
      props: { items, atlas },
    });
  };
  return <Anatomist onLoad={handleLoad} />;
}
