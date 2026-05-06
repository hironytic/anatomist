import { useEffect, useId, useRef } from 'react';

type ActiveDialogState =
  | { kind: 'alert'; message: string; resolve: () => void }
  | { kind: 'confirm'; message: string; resolve: (result: boolean) => void };

export type DialogState = ActiveDialogState | null;

interface AlertDialogProps {
  state: ActiveDialogState;
  onClose: () => void;
}

export function AlertDialog({ state, onClose }: AlertDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const msgId = useId();

  useEffect(() => {
    const dialog = dialogRef.current!;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (state.kind === 'confirm') {
        state.resolve(false);
      } else {
        state.resolve();
      }
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.showModal();

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      if (dialog.open) dialog.close();
    };
    // state and onClose are stable for the lifetime of this dialog instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOk = () => {
    if (state.kind === 'confirm') {
      state.resolve(true);
    } else {
      state.resolve();
    }
    onClose();
  };

  const handleCancel = () => {
    (state as Extract<ActiveDialogState, { kind: 'confirm' }>).resolve(false);
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="anatomist-dialog" aria-labelledby={msgId}>
      <div className="anatomist-dialog__body">
        <p id={msgId} className="anatomist-dialog__message">
          {state.message}
        </p>
      </div>
      <div className="anatomist-dialog__actions">
        {state.kind === 'confirm' && (
          <button
            type="button"
            className="anatomist-dialog__btn anatomist-dialog__btn--ghost"
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className="anatomist-dialog__btn anatomist-dialog__btn--primary"
          onClick={handleOk}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        >
          OK
        </button>
      </div>
    </dialog>
  );
}
