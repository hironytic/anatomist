import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Anatomist } from './Anatomist';
import type { Atlas } from './Anatomist';

function makeFile(bytes: number[]): File {
  return new File([new Uint8Array(bytes).buffer], 'test.bin', { type: 'application/octet-stream' });
}

async function dropFile(element: Element, file: File): Promise<void> {
  await act(async () => {
    fireEvent.drop(element, { dataTransfer: { files: [file] } });
    // wait for the async arrayBuffer() read to complete
    await Promise.resolve();
  });
}

describe('Anatomist', () => {
  it('shows WelcomeView when no file is loaded', () => {
    render(<Anatomist onLoad={() => {}} />);
    expect(screen.getByText('Drop a file here')).toBeInTheDocument();
  });

  it('calls onLoad with an atlas after file drop', async () => {
    const onLoad = vi.fn();
    const { container } = render(<Anatomist onLoad={onLoad} />);
    const dropZone = container.firstElementChild!;

    await dropFile(dropZone, makeFile([1, 2, 3]));

    await waitFor(() => expect(onLoad).toHaveBeenCalledOnce());
    const atlas: Atlas = onLoad.mock.calls[0][0];
    expect(atlas.data).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('hides WelcomeView and shows hex content after file drop', async () => {
    const { container } = render(<Anatomist onLoad={() => {}} />);
    await dropFile(container.firstElementChild!, makeFile([0xde, 0xad]));
    await waitFor(() => expect(screen.queryByText('Drop a file here')).not.toBeInTheDocument());
    expect(screen.getByText('DE')).toBeInTheDocument();
  });

  describe('navigation', () => {
    const FocusComp = () => <div>Focus Content</div>;

    async function setup() {
      const onLoad = vi.fn();
      const { container } = render(<Anatomist onLoad={onLoad} />);
      await dropFile(container.firstElementChild!, makeFile(new Array(32).fill(0)));
      await waitFor(() => expect(onLoad).toHaveBeenCalledOnce());
      const atlas: Atlas = onLoad.mock.calls[0][0];
      return { atlas, container };
    }

    it('back button is disabled before any setFocusRegion call', async () => {
      await setup();
      expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled();
    });

    it('back button becomes enabled after a second setFocusRegion call', async () => {
      const { atlas } = await setup();
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 0, endOffset: 4 }, component: FocusComp, props: {}, title: 'Step 1' });
      });
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 4, endOffset: 8 }, component: FocusComp, props: {}, title: 'Step 2' });
      });
      expect(screen.getByRole('button', { name: 'Go back' })).not.toBeDisabled();
    });

    it('clicking back navigates to the previous focus region', async () => {
      const { atlas } = await setup();
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 0, endOffset: 4 }, component: FocusComp, props: {}, title: 'Step 1' });
      });
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 4, endOffset: 8 }, component: FocusComp, props: {}, title: 'Step 2' });
      });

      expect(screen.getByText('Step 2')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('clicking forward navigates to the next focus region', async () => {
      const { atlas } = await setup();
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 0, endOffset: 4 }, component: FocusComp, props: {}, title: 'Step 1' });
      });
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 4, endOffset: 8 }, component: FocusComp, props: {}, title: 'Step 2' });
      });

      fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Go forward' }));
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    it('[ key navigates back', async () => {
      const { atlas, container } = await setup();
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 0, endOffset: 4 }, component: FocusComp, props: {}, title: 'Step 1' });
      });
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 4, endOffset: 8 }, component: FocusComp, props: {}, title: 'Step 2' });
      });

      expect(screen.getByText('Step 2')).toBeInTheDocument();
      fireEvent.keyDown(container.firstElementChild!, { key: '[' });
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('] key navigates forward', async () => {
      const { atlas, container } = await setup();
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 0, endOffset: 4 }, component: FocusComp, props: {}, title: 'Step 1' });
      });
      act(() => {
        atlas.setFocusRegion({ range: { startOffset: 4, endOffset: 8 }, component: FocusComp, props: {}, title: 'Step 2' });
      });

      fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      fireEvent.keyDown(container.firstElementChild!, { key: ']' });
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });
  });
});
