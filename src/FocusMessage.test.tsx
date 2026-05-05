import { render, screen } from '@testing-library/react';
import { FocusMessage } from './FocusMessage';

describe('FocusMessage', () => {
  it('renders the message text', () => {
    render(<FocusMessage message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
