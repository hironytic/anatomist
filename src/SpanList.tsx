import { useState } from 'react';

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
  onItemSelect?: (id: string | number) => void;
  onJumpHover?: (id: string | number | undefined) => void;
}

function formatOffset(offset: number): string {
  return offset.toString(16).toUpperCase().padStart(4, '0');
}

export function SpanList({ items, onItemSelect, onJumpHover }: SpanListProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | number | undefined>(undefined);
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
              ' anatomist-span-list__item--selectable' +
              (onJump ? ' anatomist-span-list__item--has-jump' : '')
            }
            onClick={() => {
              setSelectedItemId(item.id);
              onItemSelect?.(item.id);
            }}
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
                onMouseEnter={() => onJumpHover?.(item.id)}
                onMouseLeave={() => onJumpHover?.(undefined)}
                aria-label={`Jump to ${item.name}`}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <polyline points="3,2 7,5 3,8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
