export interface RangeListItem {
  /** Unique identifier used as a React key and for selection matching. */
  id: string | number;
  /** Start offset in bytes, relative to the beginning of the parent HexRange (inclusive). */
  startOffset: number;
  /** End offset in bytes, relative to the beginning of the parent HexRange (exclusive). */
  endOffset: number;
  /** Display name of the field. */
  name: string;
  /** Display value of the field. */
  value: string;
}

export interface RangeListProps {
  items: RangeListItem[];
  /** The id of the currently selected item. Undefined means no selection. */
  selectedItemId?: string | number;
  onItemSelect?: (id: string | number) => void;
  onItemJump?: (id: string | number) => void;
}

function formatOffset(offset: number): string {
  return offset.toString(16).toUpperCase().padStart(4, '0');
}

export function RangeList({ items, selectedItemId, onItemSelect, onItemJump }: RangeListProps) {
  return (
    <div className="anatomist-range-list">
      {items.map(item => {
        const isSelected = item.id === selectedItemId;
        const offsetLabel = `${formatOffset(item.startOffset)}–${formatOffset(item.endOffset - 1)}`;
        return (
          <div
            key={item.id}
            className={
              'anatomist-range-list__item' +
              (isSelected ? ' anatomist-range-list__item--selected' : '') +
              (onItemSelect ? ' anatomist-range-list__item--selectable' : '')
            }
            onClick={onItemSelect ? () => onItemSelect(item.id) : undefined}
          >
            <span className="anatomist-range-list__offset">{offsetLabel}</span>
            <span className="anatomist-range-list__name">{item.name}</span>
            <span className="anatomist-range-list__value">{item.value}</span>
            {onItemJump && (
              <button
                className="anatomist-range-list__jump"
                onClick={e => {
                  e.stopPropagation();
                  onItemJump(item.id);
                }}
                aria-label={`Jump to ${item.name}`}
              >
                {'>'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
