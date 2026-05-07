import { useEffect, useRef, useState } from 'react';

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
  /** When true, the list receives focus immediately after mounting. */
  focusOnMount?: boolean;
}

export function formatOffset(offset: number): string {
  return offset.toString(16).toUpperCase().padStart(4, '0');
}

export function SpanList({ items, onItemSelect, onJumpHover, focusOnMount }: SpanListProps) {
  const [selectedItemId, setSelectedItemId] = useState<string | number | undefined>(undefined);
  const itemRefs = useRef<Map<string | number, HTMLDivElement>>(new Map());
  const rootRef = useRef<HTMLDivElement>(null);
  const focusOnMountRef = useRef(focusOnMount);

  useEffect(() => {
    if (focusOnMountRef.current) rootRef.current?.focus();
  }, []);

  function selectItem(id: string | number) {
    setSelectedItemId(id);
    onItemSelect?.(id);
    itemRefs.current.get(id)?.scrollIntoView({ block: 'nearest' });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (items.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') {
      e.preventDefault();
      const currentIndex = selectedItemId !== undefined
        ? items.findIndex(item => item.id === selectedItemId)
        : -1;
      let nextIndex: number;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, items.length - 1);
      } else {
        nextIndex = currentIndex === -1 ? items.length - 1 : Math.max(currentIndex - 1, 0);
      }
      selectItem(items[nextIndex].id);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedItemId !== undefined) {
        items.find(item => item.id === selectedItemId)?.onJump?.();
      }
    }
  }

  return (
    <div ref={rootRef} className="anatomist-span-list" tabIndex={0} role="listbox" onKeyDown={handleKeyDown}>
      {items.map(item => {
        const isSelected = item.id === selectedItemId;
        const offsetLabel = `${formatOffset(item.startOffset)}–${formatOffset(item.endOffset - 1)}`;
        const onJump = item.onJump;
        return (
          <div
            key={item.id}
            ref={el => {
              if (el) {
                itemRefs.current.set(item.id, el);
              } else {
                itemRefs.current.delete(item.id);
              }
            }}
            className={
              'anatomist-span-list__item' +
              (isSelected ? ' anatomist-span-list__item--selected' : '') +
              ' anatomist-span-list__item--selectable' +
              (onJump ? ' anatomist-span-list__item--has-jump' : '')
            }
            role="option"
            aria-selected={isSelected}
            onClick={() => selectItem(item.id)}
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
