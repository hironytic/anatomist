export interface WelcomeViewProps {
  appName?: string;
  version?: string;
  description?: string;
  onSelectFile?: () => void;
}

export function WelcomeView({ appName, version, description, onSelectFile }: WelcomeViewProps) {
  const hasIdentity = appName !== undefined || version !== undefined || description !== undefined;
  return (
    <div className="anatomist-welcome-view">
      {hasIdentity && (
        <div className="anatomist-welcome-view__identity">
          {appName && <span className="anatomist-welcome-view__app-name">{appName}</span>}
          {version && <span className="anatomist-welcome-view__version">{version}</span>}
          {description && <p className="anatomist-welcome-view__description">{description}</p>}
        </div>
      )}
      <div className="anatomist-welcome-view__drop">
        <svg
          className="anatomist-welcome-view__icon"
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M10 7H30L38 15V42H10V7Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M30 7V15H38"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line
            x1="24" y1="20" x2="24" y2="31"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M18 27L24 33L30 27"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {onSelectFile !== undefined && (
          <button
            type="button"
            className="anatomist-welcome-view__select-button"
            onClick={onSelectFile}
          >
            Open File
          </button>
        )}
        <p className="anatomist-welcome-view__prompt">
          {onSelectFile !== undefined ? 'or drag a file anywhere' : 'Drop a file here'}
        </p>
      </div>
    </div>
  );
}
