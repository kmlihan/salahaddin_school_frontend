/**
 * Filter bar for user lists. The `q` field searches across name/email/phone
 * on the server (case-insensitive). The `gender` select is optional — pass
 * `withGender` for the Students/Teachers tables.
 */
export default function UserFilterBar({ value, onChange, withGender = false }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="card flex flex-wrap items-end gap-3">
      <label className="block flex-1 min-w-[200px]">
        <span className="block text-xs mb-1">Search (name, email, phone)</span>
        <input
          className="input"
          placeholder="Type to filter…"
          value={value.q || ''}
          onChange={(e) => set('q', e.target.value)}
        />
      </label>
      {withGender && (
        <label className="block">
          <span className="block text-xs mb-1">Gender</span>
          <select
            className="input"
            value={value.gender || ''}
            onChange={(e) => set('gender', e.target.value)}
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>
      )}
      {(value.q || value.gender) && (
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={() => onChange({ q: '', gender: '' })}
        >
          Clear
        </button>
      )}
    </div>
  );
}
