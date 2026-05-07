import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { formatOffset, SpanList } from './SpanList';
import type { SpanListItem } from './SpanList';

// --- formatOffset ---

describe('formatOffset', () => {
  it('formats 0 as "0000"', () => {
    expect(formatOffset(0)).toBe('0000');
  });

  it('formats 255 as "00FF"', () => {
    expect(formatOffset(255)).toBe('00FF');
  });

  it('formats 4096 as "1000"', () => {
    expect(formatOffset(4096)).toBe('1000');
  });

  it('does not truncate values that exceed 4 digits', () => {
    expect(formatOffset(65536)).toBe('10000');
  });
});

// --- SpanList ---

const baseItems: SpanListItem[] = [
  { id: 'a', startOffset: 0, endOffset: 4, name: 'magic', value: '0xDEAD' },
  { id: 'b', startOffset: 4, endOffset: 8, name: 'version', value: '2' },
  { id: 'c', startOffset: 8, endOffset: 12, name: 'flags', value: '0x0F' },
];

describe('SpanList', () => {
  it('renders offset, name and value for each item', () => {
    render(<SpanList items={baseItems} />);
    expect(screen.getByText('magic')).toBeInTheDocument();
    expect(screen.getByText('0xDEAD')).toBeInTheDocument();
    expect(screen.getByText('0000–0003')).toBeInTheDocument();
  });

  it('calls onItemSelect with the item id when clicked', async () => {
    const onItemSelect = vi.fn();
    render(<SpanList items={baseItems} onItemSelect={onItemSelect} />);
    await userEvent.click(screen.getByText('magic'));
    expect(onItemSelect).toHaveBeenCalledWith('a');
  });

  it('ArrowDown selects the first item when nothing is selected', async () => {
    const onItemSelect = vi.fn();
    render(<SpanList items={baseItems} onItemSelect={onItemSelect} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(onItemSelect).toHaveBeenCalledWith('a');
  });

  it('ArrowDown moves selection to the next item', async () => {
    const onItemSelect = vi.fn();
    render(<SpanList items={baseItems} onItemSelect={onItemSelect} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(onItemSelect).toHaveBeenLastCalledWith('b');
  });

  it('ArrowUp selects the last item when nothing is selected', async () => {
    const onItemSelect = vi.fn();
    render(<SpanList items={baseItems} onItemSelect={onItemSelect} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(onItemSelect).toHaveBeenCalledWith('c');
  });

  it('ArrowUp moves selection to the previous item', async () => {
    const onItemSelect = vi.fn();
    render(<SpanList items={baseItems} onItemSelect={onItemSelect} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    expect(onItemSelect).toHaveBeenLastCalledWith('a');
  });

  it('Enter calls onJump for the selected item', () => {
    const onJump = vi.fn();
    const items: SpanListItem[] = [
      { ...baseItems[0], onJump },
      baseItems[1],
    ];
    const onItemSelect = vi.fn();
    render(<SpanList items={items} onItemSelect={onItemSelect} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onJump).toHaveBeenCalledOnce();
  });

  it('j key moves selection to the next item', () => {
    const onItemSelect = vi.fn();
    render(<SpanList items={baseItems} onItemSelect={onItemSelect} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'j' });
    fireEvent.keyDown(list, { key: 'j' });
    expect(onItemSelect).toHaveBeenLastCalledWith('b');
  });

  it('k key moves selection to the previous item', () => {
    const onItemSelect = vi.fn();
    render(<SpanList items={baseItems} onItemSelect={onItemSelect} />);
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'j' });
    fireEvent.keyDown(list, { key: 'j' });
    fireEvent.keyDown(list, { key: 'k' });
    expect(onItemSelect).toHaveBeenLastCalledWith('a');
  });

  it('shows jump button only for items with onJump', () => {
    const items: SpanListItem[] = [
      { ...baseItems[0], onJump: vi.fn() },
      baseItems[1],
    ];
    render(<SpanList items={items} />);
    expect(screen.getByRole('button', { name: 'Jump to magic' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Jump to version' })).not.toBeInTheDocument();
  });

  it('calls onJumpHover with item id on jump button mouseenter', async () => {
    const onJumpHover = vi.fn();
    const items: SpanListItem[] = [{ ...baseItems[0], onJump: vi.fn() }];
    render(<SpanList items={items} onJumpHover={onJumpHover} />);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Jump to magic' }));
    expect(onJumpHover).toHaveBeenCalledWith('a');
  });

  it('calls onJumpHover with undefined on jump button mouseleave', async () => {
    const onJumpHover = vi.fn();
    const items: SpanListItem[] = [{ ...baseItems[0], onJump: vi.fn() }];
    render(<SpanList items={items} onJumpHover={onJumpHover} />);
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Jump to magic' }));
    expect(onJumpHover).toHaveBeenCalledWith(undefined);
  });
});
