export default function MinisHeader({ user, navigate, rightLabel = 'Gestión', onRightClick, rightIcon }) {
  const irHome = () => { if (user?.role === 'master') navigate('/') }
  const handleRightClick = onRightClick || (() => navigate('/minis/gestion'))
  const iconPath = rightIcon || 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'

  return (
    <header className="minis-header">
      <button className="minis-header-logo" onClick={irHome}>
        <span className="b">[</span><span className="t">J</span><span className="b">]</span>
      </button>

      <button className="minis-header-servicios" onClick={() => navigate('/minis/servicios')}>
        Servicios
      </button>

      {user?.role === 'master' ? (
        <button className="minis-header-gestion" onClick={handleRightClick}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={iconPath}/></svg>
          {rightLabel}
        </button>
      ) : <span />}
    </header>
  )
}
