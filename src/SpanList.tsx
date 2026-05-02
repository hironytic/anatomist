export interface SpanListItem {
  /** Unique identifier used as a React key and for selection matching. */
  id: string | number;
  /** Start offset in bytes, relative to the beginning of the range (inclusive). */
  startOffset: number;
  /** End offset in bytes, relative to the beginning of the range (exclusive). */
  endOffset: number;
  /** Display name of the field. */
  name: string;
  /** Display value of the field. */
  value: string;
  /** When provided, a jump button is shown on this item and clicking it invokes the handler. */
  onJump?: () => void;
}

export interface SpanListProps {
  items: SpanListItem[];
  /** The id of the currently selected item. Undefined means no selection. */
  selectedItemId?: string | number;
  onItemSelect?: (id: string | number) => void;
}

function formatOffset(offset: number): string {
  return offset.toString(16).toUpperCase().padStart(4, '0');
}

export function SpanList({ items, selectedItemId, onItemSelect }: SpanListProps) {
  return (
    <div className="anatomist-span-list">
      {items.map(item => {
        const isSelected = item.id === selectedItemId;
        const offsetLabel = `${formatOffset(item.startOffset)}–${formatOffset(item.endOffset - 1)}`;
        const onJump = item.onJump;
        return (
          <div
            key={item.id}
            className={
              'anatomist-span-list__item' +
              (isSelected ? ' anatomist-span-list__item--selected' : '') +
              (onItemSelect ? ' anatomist-span-list__item--selectable' : '')
            }
            onClick={onItemSelect ? () => onItemSelect(item.id) : undefined}
          >
            <span className="anatomist-span-list__offset">{offsetLabel}</span>
            <span className="anatomist-span-list__name">{item.name}</span>
            <span className="anatomist-span-list__value">{item.value}</span>
            {onJump && (
              <button
                className="anatomist-span-list__jump"
                onClick={e => {
                  e.stopPropagation();
                  onJump();
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
