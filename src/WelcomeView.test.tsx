import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeView } from './WelcomeView';

describe('WelcomeView', () => {
  it('always renders the drop prompt', () => {
    render(<WelcomeView />);
    expect(screen.getByText('Drop a file here')).toBeInTheDocument();
  });

  it('does not render identity section when no props provided', () => {
    const { container } = render(<WelcomeView />);
    expect(container.querySelector('.anatomist-welcome-view__identity')).not.toBeInTheDocument();
  });

  it('renders appName when provided', () => {
    render(<WelcomeView appName="MyApp" />);
    expect(screen.getByText('MyApp')).toBeInTheDocument();
  });

  it('renders version when provided', () => {
    render(<WelcomeView version="v1.2.3" />);
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<WelcomeView description="Inspect binary files" />);
    expect(screen.getByText('Inspect binary files')).toBeInTheDocument();
  });

  it('renders identity section when any prop is provided', () => {
    const { container } = render(<WelcomeView appName="MyApp" />);
    expect(container.querySelector('.anatomist-welcome-view__identity')).toBeInTheDocument();
  });

  it('does not render select button when onSelectFile is not provided', () => {
    render(<WelcomeView />);
    expect(screen.queryByRole('button', { name: 'Choose a file' })).not.toBeInTheDocument();
  });

  it('renders select button when onSelectFile is provided', () => {
    render(<WelcomeView onSelectFile={() => {}} />);
    expect(screen.getByRole('button', { name: 'Choose a file' })).toBeInTheDocument();
  });

  it('calls onSelectFile when select button is clicked', () => {
    const onSelectFile = vi.fn();
    render(<WelcomeView onSelectFile={onSelectFile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose a file' }));
    expect(onSelectFile).toHaveBeenCalledOnce();
  });
});
