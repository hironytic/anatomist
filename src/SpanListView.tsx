import type { Atlas } from './Anatomist';
import type { HexRange } from './HexView';
import { SpanList } from './SpanList';
import type { SpanListItem } from './SpanList';

export interface SpanListViewItem extends SpanListItem {
  /** When provided, hovering the jump button highlights this range in HexView as a secondary range. */
  jumpTargetRange?: HexRange;
}

export interface SpanListViewProps {
  atlas: Atlas;
  items: SpanListViewItem[];
}

export function SpanListView({ atlas, items }: SpanListViewProps) {
  return (
    <SpanList
      items={items}
      onItemSelect={(id) => {
        const item = items.find((it) => it.id === id);
        if (item) atlas.setActiveSpan(item.startOffset, item.endOffset);
      }}
      onJumpHover={(id) => {
        if (id === undefined) {
          atlas.setSecondaryRange(undefined);
          return;
        }
        const item = items.find((it) => it.id === id);
        atlas.setSecondaryRange(item?.jumpTargetRange);
      }}
    />
  );
}
