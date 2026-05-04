export interface FocusMessageProps {
  message: string;
}

export function FocusMessage({ message }: FocusMessageProps) {
  return (
    <div className="anatomist-focus-message">
      <svg
        className="anatomist-focus-message__icon"
        width="36"
        height="36"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="18" cy="18" r="13" stroke="currentColor" strokeWidth="1.5" />
        <line x1="18" y1="12" x2="18" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="18" cy="24" r="1.25" fill="currentColor" />
      </svg>
      <p className="anatomist-focus-message__text">{message}</p>
    </div>
  );
}
