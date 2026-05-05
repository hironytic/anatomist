import { render, screen } from '@testing-library/react';
import { computeRangeSegments, computeRowOverlays, HexView } from './HexView';

const OFFSET_LABEL_WIDTH_PX = 52;
const CELL_WIDTH_PX = 28;
const OVERLAY_INSET_PX = 2;

// --- computeRangeSegments ---

describe('computeRangeSegments', () => {
  describe('empty / out-of-range', () => {
    it('returns [] for an empty range (start === end)', () => {
      expect(computeRangeSegments(0, { startOffset: 5, endOffset: 5 }, 'p', false)).toEqual([]);
    });

    it('returns [] for an inverted range (start > end)', () => {
      expect(computeRangeSegments(0, { startOffset: 10, endOffset: 5 }, 'p', false)).toEqual([]);
    });

    it('returns [] when the range does not touch the row', () => {
      // range occupies row 1 (offsets 16–31); rowIndex=0 has no overlap
      expect(computeRangeSegments(0, { startOffset: 16, endOffset: 32 }, 'p', false)).toEqual([]);
    });
  });

  describe('single-row range', () => {
    // offsets 3–7 (cols 3–7, row 0)
    const range = { startOffset: 3, endOffset: 8 };

    it('returns one body segment for isPrimary=false', () => {
      const segs = computeRangeSegments(0, range, 'key', false);
      expect(segs).toHaveLength(1);
      expect(segs[0]).toMatchObject({
        key: 'key',
        isPrimary: false,
        showBackground: false,
        borderTop: true,
        borderBottom: true,
        borderLeft: true,
        borderRight: true,
      });
    });

    it('adds a background segment for isPrimary=true', () => {
      const segs = computeRangeSegments(0, range, 'p', true);
      expect(segs).toHaveLength(2);
      expect(segs.find(s => s.key === 'p_bg')).toMatchObject({ isPrimary: true, showBackground: true });
      expect(segs.find(s => s.key === 'p')).toMatchObject({ showBackground: false });
    });

    it('computes correct left position and width', () => {
      const segs = computeRangeSegments(0, range, 'p', false);
      const body = segs[0];
      // cL=3, cR=7
      const expectedLeft = OFFSET_LABEL_WIDTH_PX + 3 * CELL_WIDTH_PX + OVERLAY_INSET_PX;
      const expectedWidth = (7 - 3 + 1) * CELL_WIDTH_PX - 2 * OVERLAY_INSET_PX;
      expect(body.left).toBe(expectedLeft);
      expect(body.width).toBe(expectedWidth);
    });
  });

  describe('multi-row range (full rows 0–2, C1=0 C2=15)', () => {
    // Full-width: no staircase step, so no -inset extension — rows meet exactly at boundary.
    const range = { startOffset: 0, endOffset: 48 };

    it('first row has borderTop=true and bottom=0 (no extension when C1=0)', () => {
      const segs = computeRangeSegments(0, range, 'p', false);
      expect(segs[0]).toMatchObject({ borderTop: true, borderBottom: false, bottom: 0 });
    });

    it('middle row has no top/bottom borders and zero top/bottom offsets', () => {
      const segs = computeRangeSegments(1, range, 'p', false);
      expect(segs[0]).toMatchObject({ borderTop: false, borderBottom: false, top: 0, bottom: 0 });
    });

    it('last row has borderBottom=true and top=0 (no extension when C2=15)', () => {
      const segs = computeRangeSegments(2, range, 'p', false);
      expect(segs[0]).toMatchObject({ borderTop: false, borderBottom: true, top: 0 });
    });
  });

  describe('multi-row range (2 rows, full-width)', () => {
    // Two adjacent full-width rows: bg segments must not overlap (top=0/bottom=0 at boundary).
    const range = { startOffset: 0, endOffset: 32 };

    it('first row has bottom=0 so bg does not bleed into next row', () => {
      const segs = computeRangeSegments(0, range, 'p', false);
      expect(segs[0]).toMatchObject({ bottom: 0 });
    });

    it('last row has top=0 so bg does not bleed into previous row', () => {
      const segs = computeRangeSegments(1, range, 'p', false);
      expect(segs[0]).toMatchObject({ top: 0 });
    });
  });

  describe('multi-row range (3 rows, C1=0 C2=3) — user-reported bug case', () => {
    // startOffset=0 (C1=0), endOffset=36 (R2=2, C2=3): rows 0 and 1 are full-width.
    const range = { startOffset: 0, endOffset: 36 };

    it('first row (full-width) has bottom=0, preventing bg overlap with row 1', () => {
      const segs = computeRangeSegments(0, range, 'p', false);
      expect(segs[0]).toMatchObject({ bottom: 0 });
    });

    it('middle row (full-width) has top=0 and bottom=inset (step at bottom)', () => {
      const segs = computeRangeSegments(1, range, 'p', false);
      expect(segs[0]).toMatchObject({ top: 0, bottom: OVERLAY_INSET_PX });
    });
  });

  describe('multi-row staircase range — extensions preserved when C1>0 or C2<15', () => {
    // offsets 4–47: R1=0,C1=4; R2=2,C2=15. C1>0 so first-row extension must be kept.
    const rangeC1 = { startOffset: 4, endOffset: 48 };

    it('first row keeps bottom=-inset extension when C1>0 (step connection needed)', () => {
      const segs = computeRangeSegments(0, rangeC1, 'p', false);
      expect(segs[0]).toMatchObject({ bottom: -OVERLAY_INSET_PX });
    });

    // offsets 0–43: R1=0,C1=0; R2=2,C2=11. C2<15 so last-row extension must be kept.
    const rangeC2 = { startOffset: 0, endOffset: 44 };

    it('last row keeps top=-inset extension when C2<15 (step connection needed)', () => {
      const segs = computeRangeSegments(2, rangeC2, 'p', false);
      expect(segs[0]).toMatchObject({ top: -OVERLAY_INSET_PX });
    });
  });

  describe('staircase shape', () => {
    // offsets 4–33: R1=0,C1=4; R2=2,C2=1
    // row 1 is both R1+1 and R2-1, so it gets step_top and step_bottom
    const range = { startOffset: 4, endOffset: 34 };

    it('row R1+1 has a step_top segment when C1 > 0', () => {
      const segs = computeRangeSegments(1, range, 'p', false);
      const stepTop = segs.find(s => s.key === 'p_step_top');
      expect(stepTop).toBeDefined();
      expect(stepTop).toMatchObject({ borderTop: true, borderBottom: false, borderLeft: false, borderRight: false });
    });

    it('row R2-1 has a step_bottom segment when C2 < 15', () => {
      const segs = computeRangeSegments(1, range, 'p', false);
      const stepBottom = segs.find(s => s.key === 'p_step_bottom');
      expect(stepBottom).toBeDefined();
      expect(stepBottom).toMatchObject({ borderTop: false, borderBottom: true, borderLeft: false, borderRight: false });
    });
  });

  describe('split range (2 rows, C1 > C2)', () => {
    // offsets 10–21: R1=0,C1=10; R2=1,C2=5; C1>C2 and R2=R1+1 → split
    const range = { startOffset: 10, endOffset: 22 };

    it('row 0 is a self-contained rectangle with all borders', () => {
      const segs = computeRangeSegments(0, range, 'p', false);
      expect(segs).toHaveLength(1);
      expect(segs[0]).toMatchObject({ borderTop: true, borderBottom: true, borderLeft: true, borderRight: true });
      expect(segs.find(s => s.key.includes('step'))).toBeUndefined();
    });

    it('row 1 is also a self-contained rectangle with all borders', () => {
      const segs = computeRangeSegments(1, range, 'p', false);
      expect(segs).toHaveLength(1);
      expect(segs[0]).toMatchObject({ borderTop: true, borderBottom: true, borderLeft: true, borderRight: true });
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
