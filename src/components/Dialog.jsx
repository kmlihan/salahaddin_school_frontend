import { createContext, useCallback, useContext, useState } from 'react';
import Modal from './Modal';
import { useLang } from '../context/LanguageContext';

/**
 * App-wide dialog provider.
 *
 *   const dialog = useDialog();
 *
 *   await dialog.confirm({ title, message, confirmLabel?, danger?: true })
 *     -> true if confirmed, false if cancelled or dismissed
 *
 *   await dialog.prompt({ title, message?, placeholder?, defaultValue?, multiline?: true })
 *     -> string with the entered value, or null if cancelled
 *
 *   await dialog.notify({ title, message, variant?: 'info' | 'success' | 'error' })
 *     -> resolves when the user closes the modal
 *
 * Three internal pieces of state cover the three call types — at most one
 * dialog is open at a time. Each call captures a `resolve` function that we
 * call when the user picks an option, then clears the state.
 */
const DialogContext = createContext(null);
export const useDialog = () => useContext(DialogContext);

export function DialogProvider({ children }) {
  const [confirmState, setConfirmState] = useState(null);
  const [promptState, setPromptState] = useState(null);
  const [notifyState, setNotifyState] = useState(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const prompt = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setPromptState({
        ...opts,
        value: opts.defaultValue || '',
        resolve,
      });
    });
  }, []);

  const notify = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setNotifyState({ ...opts, resolve });
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm, prompt, notify }}>
      {children}
      <ConfirmModal state={confirmState} onClose={() => setConfirmState(null)} />
      <PromptModal state={promptState} onChange={setPromptState} onClose={() => setPromptState(null)} />
      <NotifyModal state={notifyState} onClose={() => setNotifyState(null)} />
    </DialogContext.Provider>
  );
}

function ConfirmModal({ state, onClose }) {
  const { t } = useLang();
  if (!state) return null;

  const settle = (result) => {
    state.resolve(result);
    onClose();
  };

  return (
    <Modal
      open={true}
      onClose={() => settle(false)}
      title={state.title || t('areYouSure') || 'Are you sure?'}
      footer={
        <>
          <button
            type="button"
            data-dialog-close
            className="btn btn-ghost"
            onClick={() => settle(false)}
          >
            {state.cancelLabel || t('cancel')}
          </button>
          <button
            type="button"
            className={'btn ' + (state.danger ? '' : 'btn-primary')}
            style={state.danger ? { backgroundColor: '#dc2626', color: 'white' } : undefined}
            onClick={() => settle(true)}
            autoFocus
          >
            {state.confirmLabel || (state.danger ? t('delete') : t('save'))}
          </button>
        </>
      }
    >
      {state.message && (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {state.message}
        </p>
      )}
    </Modal>
  );
}

function PromptModal({ state, onChange, onClose }) {
  const { t } = useLang();
  if (!state) return null;

  const settle = (result) => {
    state.resolve(result);
    onClose();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    settle(state.value);
  };

  const Field = state.multiline ? 'textarea' : 'input';

  return (
    <Modal
      open={true}
      onClose={() => settle(null)}
      title={state.title}
      footer={
        <>
          <button
            type="button"
            data-dialog-close
            className="btn btn-ghost"
            onClick={() => settle(null)}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => settle(state.value)}
          >
            {state.confirmLabel || t('save')}
          </button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-2">
        {state.message && (
          <p className="text-sm text-slate-700 dark:text-slate-300">{state.message}</p>
        )}
        <Field
          className="input"
          rows={state.multiline ? 4 : undefined}
          placeholder={state.placeholder || ''}
          value={state.value}
          onChange={(e) => onChange({ ...state, value: e.target.value })}
        />
        {/* Hidden submit button so Enter submits */}
        <button type="submit" style={{ display: 'none' }} />
      </form>
    </Modal>
  );
}

function NotifyModal({ state, onClose }) {
  const { t } = useLang();
  if (!state) return null;

  const settle = () => {
    state.resolve();
    onClose();
  };

  const colour =
    state.variant === 'success' ? '#16a34a'
    : state.variant === 'error' ? '#dc2626'
    : 'rgb(var(--accent))';

  return (
    <Modal
      open={true}
      onClose={settle}
      title={state.title}
      footer={
        <button
          type="button"
          className="btn btn-primary"
          style={{ backgroundColor: colour }}
          onClick={settle}
          autoFocus
        >
          {t('ok') || 'OK'}
        </button>
      }
    >
      {state.message && (
        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {state.message}
        </p>
      )}
    </Modal>
  );
}
