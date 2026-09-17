import api from '../../api/client';
import CrudTable from '../../components/CrudTable';
import LessonForm from '../../components/LessonForm';
import { useDialog } from '../../components/Dialog';
import { useLang } from '../../context/LanguageContext';

const empty = {
  title: { en: '', ar: '', nl: '' },
  unitName: { en: '', ar: '', nl: '' },
  section: 'Arabic',
  levels: ['A'],
  order: 0,
  blocks: [],
};

export default function AdminLessons() {
  const { t, ml } = useLang();
  const dialog = useDialog();

  // Build the displayed levels list — supports both new `levels[]` and
  // legacy single `level` documents transparently.
  const showLevels = (it) => {
    if (Array.isArray(it.levels) && it.levels.length) return it.levels.join(', ');
    if (it.level) return it.level;
    return '—';
  };

  // The Copy button reuses the row's CrudTable refresh by reloading the
  // page after the API call. We surface a tiny toast so the user knows
  // it worked even if the new row is far down the list.
  const onCopy = async (it, reload) => {
    try {
      await api.post(`/lessons/${it._id}/copy`);
      await dialog.notify({ variant: 'success', title: t('saved') });
      reload();
    } catch (e) {
      await dialog.notify({ variant: 'error', title: e.response?.data?.message || t('error') });
    }
  };

  return (
    <CrudTable
      title={t('lessons')}
      endpoint="/lessons"
      emptyForm={empty}
      columns={[
        { label: t('tableTitle'), render: (it) => ml(it.title) },
        { label: t('section'),    render: (it) => it.section },
        { label: t('levels') || 'Levels', render: showLevels },
        { label: t('tableBlocks'), render: (it) => (it.blocks || []).length },
      ]}
      Form={LessonForm}
      extraRowActions={(it, ctx) => (
        <button
          className="btn btn-soft text-xs"
          onClick={() => onCopy(it, ctx?.reload || (() => window.location.reload()))}
          title={t('copy') || 'Copy'}
        >
          ⧉ {t('copy') || 'Copy'}
        </button>
      )}
    />
  );
}
