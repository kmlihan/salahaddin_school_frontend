/**
 * Round photo. Falls back to the user's initials on a coloured circle.
 * Used in Teachers and Students admin tables.
 */
export default function Avatar({ user, size = 36 }) {
  const initial =
    (user?.firstName || '?').charAt(0).toUpperCase() +
    (user?.lastName ? user.lastName.charAt(0).toUpperCase() : '');

  const dim = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  if (user?.photo) {
    return (
      <img
        src={user.photo}
        alt={`${user.firstName || ''} ${user.lastName || ''}`}
        className="rounded-full object-cover bg-slate-200 dark:bg-slate-800"
        style={dim}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold"
      style={{ ...dim, backgroundColor: 'rgb(var(--accent))' }}
      aria-label={`${user?.firstName || ''} ${user?.lastName || ''}`}
    >
      {initial}
    </div>
  );
}
