import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import { useLang } from '../../context/LanguageContext';
import { useDialog } from '../../components/Dialog';
import HomeworkStatusBadge from '../../components/HomeworkStatusBadge';

/**
 * The student's homework detail page. Branches on `kind`:
 *
 *   writing         -> list of prompts; one input per prompt; submit
 *   recordedReading -> MediaRecorder UI; upload; submit audioUrl
 *   bookReading     -> read-only instructions; tells the student a parent
 *                      will confirm via the parent app
 */
export default function StudentHomeworkDo() {
  const { id } = useParams();
  const { t, ml } = useLang();
  const dialog = useDialog();

  const [hw, setHw] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // writing state
  const [answers, setAnswers] = useState([]);
  // recorded reading state
  const [audioUrl, setAudioUrl] = useState('');

  // Submission, if any (annotated by the list endpoint, but we re-fetch to
  // get fresh state when navigating directly).
  const [submission, setSubmission] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: hwDoc }, { data: list }] = await Promise.all([
          api.get(`/homeworks/${id}`),
          api.get('/homeworks'),
        ]);
        if (!alive) return;
        setHw(hwDoc);
        const sub = list.find((h) => h._id === id)?.mySubmission || null;
        setSubmission(sub);

        // Pre-fill writing answers from a previous submission if any.
        if (hwDoc.kind === 'writing') {
          const prev = sub?.answers || [];
          setAnswers((hwDoc.prompts || []).map((_, i) => prev[i] || ''));
        }
        if (hwDoc.kind === 'recordedReading' && sub?.audioUrl) {
          setAudioUrl(sub.audioUrl);
        }
      } catch (e) {
        if (alive) setErr(e.response?.data?.message || t('error'));
      }
    })();
    return () => { alive = false; };
  }, [id, t]);

  const submitWriting = async () => {
    setBusy(true); setErr('');
    try {
      const { data } = await api.post(`/homeworks/${id}/submit`, { answers });
      setSubmission(data);
      await dialog.notify({
        variant: 'success',
        title: t('homeworkSubmitted'),
        message: data.autoScore != null
          ? `${t('autoScore')}: ${data.autoScore}%`
          : '',
      });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  const submitRecording = async () => {
    if (!audioUrl) {
      setErr('Record audio first.');
      return;
    }
    setBusy(true); setErr('');
    try {
      const { data } = await api.post(`/homeworks/${id}/submit`, { audioUrl });
      setSubmission(data);
      await dialog.notify({ variant: 'success', title: t('homeworkSubmitted') });
    } catch (e) {
      setErr(e.response?.data?.message || t('error'));
    } finally { setBusy(false); }
  };

  if (err && !hw) return <div className="text-red-600">{err}</div>;
  if (!hw) return <p className="text-slate-500">{t('loading')}</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link to="/student/homeworks" className="text-sm text-slate-500 hover:underline">
        ← {t('back')}
      </Link>

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{ml(hw.title)}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('level')} {hw.level}
              {hw.dueDate && ` · ${t('dueDate')}: ${new Date(hw.dueDate).toLocaleDateString()}`}
            </p>
          </div>
          <HomeworkStatusBadge homework={hw} submission={submission} />
        </div>
        {ml(hw.instructions) && (
          <p className="mt-3 whitespace-pre-wrap">{ml(hw.instructions)}</p>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {hw.kind === 'writing' && (
        <WritingTask
          hw={hw} answers={answers} setAnswers={setAnswers}
          onSubmit={submitWriting} busy={busy}
          submission={submission}
          t={t} ml={ml}
        />
      )}

      {hw.kind === 'recordedReading' && (
        <RecordingTask
          audioUrl={audioUrl} setAudioUrl={setAudioUrl}
          onSubmit={submitRecording} busy={busy}
          submission={submission}
          t={t}
        />
      )}

      {hw.kind === 'bookReading' && (
        <BookReadingTask submission={submission} t={t} ml={ml} />
      )}

      {/* Teacher feedback / score, if present */}
      {submission?.teacherScore != null && (
        <div className="card">
          <p className="text-sm">
            <span className="text-slate-500">{t('score')}:</span>{' '}
            <span className="font-semibold">{submission.teacherScore}%</span>
          </p>
          {ml(submission.teacherFeedback) && (
            <p className="text-sm mt-2 italic">{ml(submission.teacherFeedback)}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Writing -------------------------------------------------------- */

function WritingTask({ hw, answers, setAnswers, onSubmit, busy, submission, t, ml }) {
  const setAt = (i, v) =>
    setAnswers((cur) => cur.map((x, idx) => idx === i ? v : x));

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">{t('writing')}</h2>
      {(hw.prompts || []).map((p, i) => (
        <div key={i} className="space-y-1">
          <p className="font-medium text-lg" dir="rtl">{ml(p.prompt)}</p>
          <input
            className="input"
            value={answers[i] || ''}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder={t('yourAnswer')}
            dir="rtl"
          />
        </div>
      ))}
      <div className="pt-2">
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={onSubmit}
        >
          {busy ? t('loading') : t('submitHomework')}
        </button>
        {submission?.autoScore != null && (
          <span className="ms-3 text-sm text-slate-500">
            {t('autoScore')}: <strong>{submission.autoScore}%</strong>
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Recorded reading ---------------------------------------------- */

/**
 * Browser MediaRecorder UI. Tap record, the browser asks for mic permission,
 * tap stop when done, an HTML <audio> appears with the recording. Clicking
 * "submit" uploads the blob to /api/upload and posts the returned URL to
 * /api/homeworks/:id/submit.
 */
function RecordingTask({ audioUrl, setAudioUrl, onSubmit, busy, submission, t }) {
  const [recording, setRecording] = useState(false);
  const [localBlobUrl, setLocalBlobUrl] = useState('');
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const start = async () => {
    setErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // webm/opus is the most reliable browser default. Falls through to
      // whatever the browser picks if unsupported.
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        // Stop tracks so the browser's mic indicator goes away.
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setLocalBlobUrl(url);
        // Upload right away — the user gets immediate feedback if upload
        // fails, and on success the audioUrl is ready for submit.
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append('file', new File([blob], `recording-${Date.now()}.webm`, { type: blob.type }));
          const { data } = await api.post('/upload', fd);
          setAudioUrl(data.url);
        } catch (e) {
          setErr(e.response?.data?.message || 'Upload failed');
        } finally {
          setUploading(false);
        }
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      setErr(e.message || 'Microphone permission denied');
    }
  };

  const stop = () => {
    if (mediaRef.current && recording) {
      mediaRef.current.stop();
      setRecording(false);
    }
  };

  const previewUrl = localBlobUrl || (audioUrl ? audioUrl : '');

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold">{t('recordedReading')}</h2>

      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <button type="button" className="btn btn-primary" onClick={start} disabled={uploading}>
            🎙️ {previewUrl ? t('rerecord') : t('recordAudio')}
          </button>
        ) : (
          <button type="button" className="btn" style={{ backgroundColor: '#dc2626', color: 'white' }} onClick={stop}>
            ⏹ {t('stopRecording')}
          </button>
        )}
        {recording && <span className="text-xs text-red-600">● recording…</span>}
        {uploading && <span className="text-xs text-slate-500">uploading…</span>}
      </div>

      {previewUrl && (
        <audio src={previewUrl} controls className="w-full" />
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <div>
        <button
          className="btn btn-primary"
          disabled={busy || !audioUrl || uploading || recording}
          onClick={onSubmit}
        >
          {busy ? t('loading') : t('submitHomework')}
        </button>
      </div>

      {submission?.audioUrl && submission.audioUrl !== audioUrl && (
        <p className="text-xs text-slate-500">
          Previous submission: <a href={submission.audioUrl} target="_blank" rel="noreferrer" className="underline">audio</a>
        </p>
      )}
    </div>
  );
}

/* ---------- Book reading -------------------------------------------------- */

function BookReadingTask({ submission, t, ml }) {
  return (
    <div className="card space-y-2">
      <h2 className="font-semibold">{t('bookReading')}</h2>
      <p className="text-sm text-slate-700 dark:text-slate-300">
        Read the page aloud at home. Your parent will leave a note in their app
        once you've read it.
      </p>
      {submission?.confirmedByParent && (
        <div className="mt-2 text-sm">
          <p className="font-medium">{t('parentConfirmed')} ✓</p>
          {ml(submission.parentNote) && (
            <p className="italic mt-1">{ml(submission.parentNote)}</p>
          )}
        </div>
      )}
    </div>
  );
}
