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

function buildItems(data: Uint8Array): RangeListItem[] {
  const items: RangeListItem[] = [];
  const max = Math.min(data.length, 64);
  for (let offset = 0; offset < max; offset += 8) {
    const end = Math.min(offset + 8, max);
    const value = Array.from(data.subarray(offset, end))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    items.push({
      id: `chunk-${offset}`,
      startOffset: offset,
      endOffset: end,
      name: `Chunk @${offset}`,
      value,
    });
  }
  return items;
}

export function App() {
  const handleLoad = (atlas: Atlas) => {
    const items = buildItems(atlas.data);
    const headerEnd = Math.min(atlas.data.length, 64);
    atlas.setPrimaryRange(0, headerEnd);
    atlas.setDetail(Detail, { items, atlas });
  };
  return <Anatomist onLoad={handleLoad} />;
}
