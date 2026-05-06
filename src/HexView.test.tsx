import { render, screen } from '@testing-library/react';
import { computeSegmentsForRange, computeRowOverlays, HexView } from './HexView';

const OFFSET_LABEL_WIDTH_PX = 52;
const CELL_WIDTH_PX = 28;

// --- computeSegmentsForRange ---

describe('computeSegmentsForRange', () => {
  describe('empty / out-of-range', () => {
    it('returns [] for an empty range (start === end)', () => {
      expect(computeSegmentsForRange(0, { startOffset: 5, endOffset: 5 }, 'p', false)).toEqual([]);
    });

    it('returns [] for an inverted range (start > end)', () => {
      expect(computeSegmentsForRange(0, { startOffset: 10, endOffset: 5 }, 'p', false)).toEqual([]);
    });

    it('returns [] when the range does not touch the row', () => {
      // range occupies row 1 (offsets 16–31); rowIndex=0 has no overlap
      expect(computeSegmentsForRange(0, { startOffset: 16, endOffset: 32 }, 'p', false)).toEqual([]);
    });
  });

  describe('single-row range', () => {
    // offsets 3–7 (cols 3–7, row 0)
    const range = { startOffset: 3, endOffset: 8 };

    it('returns one body segment for isPrimary=false', () => {
      const segs = computeSegmentsForRange(0, range, 'key', false);
      expect(segs).toHaveLength(1);
      expect(segs[0]).toMatchObject({
        isPrimary: false,
        isBackground: false,
        borderTop: true,
        borderBottom: true,
        borderLeft: true,
        borderRight: true,
      });
    });

    it('adds a background segment for isPrimary=true', () => {
      const segs = computeSegmentsForRange(0, range, 'p', true);
      expect(segs).toHaveLength(2);
      const bg = segs.find(s => s.key === 'p_bg');
      expect(bg).toMatchObject({ isPrimary: true, isBackground: true });
      expect(bg).toMatchObject({ borderTop: false, borderBottom: false, borderLeft: false, borderRight: false });
      const body = segs.find(s => s.key !== 'p_bg');
      expect(body).toMatchObject({ isBackground: false });
    });

    it('computes correct left position and width', () => {
      const segs = computeSegmentsForRange(0, range, 'p', false);
      const body = segs[0];
      // cL=3, cR=7
      const expectedLeft  = OFFSET_LABEL_WIDTH_PX + 3 * CELL_WIDTH_PX;
      const expectedWidth = (7 - 3 + 1) * CELL_WIDTH_PX;
      expect(body.left).toBe(expectedLeft);
      expect(body.width).toBe(expectedWidth);
    });
  });

  describe('multi-row range spanning full rows 0–2 (offsets 0–47)', () => {
    const range = { startOffset: 0, endOffset: 48 };

    it('first row: borderTop=true, borderBottom=false, single span', () => {
      const segs = computeSegmentsForRange(0, range, 'p', false);
      expect(segs).toHaveLength(1);
      expect(segs[0]).toMatchObject({ borderTop: true, borderBottom: false, borderLeft: true, borderRight: true });
    });

    it('middle row: no top/bottom borders, single span', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs).toHaveLength(1);
      expect(segs[0]).toMatchObject({ borderTop: false, borderBottom: false, borderLeft: true, borderRight: true });
    });

    it('last row: borderTop=false, borderBottom=true, single span', () => {
      const segs = computeSegmentsForRange(2, range, 'p', false);
      expect(segs).toHaveLength(1);
      expect(segs[0]).toMatchObject({ borderTop: false, borderBottom: true, borderLeft: true, borderRight: true });
    });
  });

  describe('span split — top border varies by column', () => {
    // range offsets 4–47: R1=0,C1=4; R2=2,C2=15
    // row 1: current [0,15], prev [4,15]
    //   cols 0–3: topNeeded=true (not in prev)
    //   cols 4–15: topNeeded=false (in prev)
    const range = { startOffset: 4, endOffset: 48 };

    it('row 1 splits into 2 spans', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs).toHaveLength(2);
    });

    it('first span (cols 0–3) has borderTop=true and borderLeft=true', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      const first = segs[0];
      expect(first.borderTop).toBe(true);
      expect(first.borderLeft).toBe(true);
      expect(first.borderRight).toBe(false);
      expect(first.left).toBe(OFFSET_LABEL_WIDTH_PX + 0 * CELL_WIDTH_PX);
      expect(first.width).toBe(4 * CELL_WIDTH_PX);
    });

    it('second span (cols 4–15) has borderTop=false and borderRight=true', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      const second = segs[1];
      expect(second.borderTop).toBe(false);
      expect(second.borderLeft).toBe(false);
      expect(second.borderRight).toBe(true);
      expect(second.left).toBe(OFFSET_LABEL_WIDTH_PX + 4 * CELL_WIDTH_PX);
      expect(second.width).toBe(12 * CELL_WIDTH_PX);
    });
  });

  describe('span split — bottom border varies by column', () => {
    // range offsets 0–33: R1=0,C1=0; R2=2,C2=1
    // row 1: current [0,15], next [0,1]
    //   cols 0–1: bottomNeeded=false (in next)
    //   cols 2–15: bottomNeeded=true (not in next)
    const range = { startOffset: 0, endOffset: 34 };

    it('row 1 splits into 2 spans', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs).toHaveLength(2);
    });

    it('first span (cols 0–1) has bottomNeeded=false', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs[0]).toMatchObject({ borderBottom: false, borderLeft: true, borderRight: false });
      expect(segs[0].width).toBe(2 * CELL_WIDTH_PX);
    });

    it('second span (cols 2–15) has bottomNeeded=true', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs[1]).toMatchObject({ borderBottom: true, borderLeft: false, borderRight: true });
      expect(segs[1].width).toBe(14 * CELL_WIDTH_PX);
    });
  });

  describe('span split — both top and bottom vary (range [4, 34])', () => {
    // R1=0,C1=4; R2=2,C2=1
    // row 1: current [0,15], prev [4,15], next [0,1]
    //   top:    cols 0–3 true, cols 4–15 false
    //   bottom: cols 0–1 false, cols 2–15 true
    // combinations:
    //   cols 0–1:  top=true,  bottom=false
    //   cols 2–3:  top=true,  bottom=true
    //   cols 4–15: top=false, bottom=true (next=[0,1] so cols 4–15 not in next → bottom=true)
    // → 3 spans
    const range = { startOffset: 4, endOffset: 34 };

    it('row 1 splits into 3 spans', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs).toHaveLength(3);
    });

    it('span cols 0–1: top=true, bottom=false', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs[0]).toMatchObject({ borderTop: true, borderBottom: false, borderLeft: true, borderRight: false });
    });

    it('span cols 2–3: top=true, bottom=true', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs[1]).toMatchObject({ borderTop: true, borderBottom: true, borderLeft: false, borderRight: false });
    });

    it('span cols 4–15: top=false, bottom=true', () => {
      const segs = computeSegmentsForRange(1, range, 'p', false);
      expect(segs[2]).toMatchObject({ borderTop: false, borderBottom: true, borderLeft: false, borderRight: true });
    });
  });
});

// --- computeRowOverlays ---

describe('computeRowOverlays', () => {
  it('returns [] when there are no ranges', () => {
    expect(computeRowOverlays(0, [], undefined)).toEqual([]);
  });

  it('returns only secondary segments (isPrimary=false)', () => {
    const segs = computeRowOverlays(0, [{ startOffset: 0, endOffset: 16 }], undefined);
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every(s => !s.isPrimary)).toBe(true);
  });

  it('returns only primary segments (isPrimary=true)', () => {
    const segs = computeRowOverlays(0, [], { startOffset: 0, endOffset: 16 });
    expect(segs.length).toBeGreaterThan(0);
    expect(segs.every(s => s.isPrimary)).toBe(true);
  });

  it('places secondary segments before primary segments', () => {
    const segs = computeRowOverlays(0, [{ startOffset: 0, endOffset: 16 }], { startOffset: 0, endOffset: 16 });
    const firstPrimaryIdx = segs.findIndex(s => s.isPrimary);
    const secondaryIndices = segs.map((s, i) => (!s.isPrimary ? i : -1)).filter(i => i >= 0);
    const lastSecondaryIdx = secondaryIndices[secondaryIndices.length - 1] ?? -1;
    expect(lastSecondaryIdx).toBeLessThan(firstPrimaryIdx);
  });
});

// --- HexView component ---

describe('HexView', () => {
  it('renders byte values as uppercase hex', () => {
    const data = new Uint8Array([0x00, 0x0f, 0x1a, 0xff]);
    render(<HexView data={data} />);
    expect(screen.getByText('00')).toBeInTheDocument();
    expect(screen.getByText('0F')).toBeInTheDocument();
    expect(screen.getByText('1A')).toBeInTheDocument();
    expect(screen.getByText('FF')).toBeInTheDocument();
  });

  it('applies --active class to bytes within activeSpan', () => {
    const data = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
    const { container } = render(
      <HexView
        data={data}
        primaryRange={{ startOffset: 0, endOffset: 4 }}
        activeSpan={{ start: 1, end: 3 }}
      />,
    );
    const activeCells = container.querySelectorAll('.anatomist-hex-view__cell--active');
    expect(activeCells).toHaveLength(2);
    expect(activeCells[0].textContent).toBe('BB');
    expect(activeCells[1].textContent).toBe('CC');
  });

  it('does not apply --active class when activeSpan is absent', () => {
    const data = new Uint8Array([0xaa, 0xbb, 0xcc]);
    const { container } = render(
      <HexView data={data} primaryRange={{ startOffset: 0, endOffset: 3 }} />,
    );
    expect(container.querySelectorAll('.anatomist-hex-view__cell--active')).toHaveLength(0);
  });

  it('renders primary range overlay elements', () => {
    const data = new Uint8Array(32);
    const { container } = render(
      <HexView data={data} primaryRange={{ startOffset: 0, endOffset: 16 }} />,
    );
    expect(container.querySelector('.anatomist-hex-view__range-overlay--primary')).toBeInTheDocument();
  });
});
