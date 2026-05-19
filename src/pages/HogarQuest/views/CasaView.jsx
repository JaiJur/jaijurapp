import '../views/views.css'

const BOSS_PLACEHOLDER = '👾'

function daysUntilMonday() {
  const now = new Date()
  const day = now.getDay() // 0=dom, 1=lun...
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7
  return diff
}

function hpPercent(boss, poolXP) {
  if (!boss) return 0
  return Math.min(100, Math.round((poolXP / boss.xpRequired) * 100))
}

export default function CasaView({ data }) {
  const { boss, bossHistory = [], poolXP = 0 } = data
  const days = daysUntilMonday()
  const pct  = hpPercent(boss, poolXP)
  const remaining = boss ? Math.max(0, boss.xpRequired - poolXP) : 0

  return (
    <div className="hq-casa">
      {/* Jefe semanal */}
      <div className="hq-boss-card">
        <div className="hq-boss-sprite">{BOSS_PLACEHOLDER}</div>
        <div>
          <div className="hq-boss-name">{boss?.name || 'Sin jefe activo'}</div>
          <div className="hq-boss-subtitle">Jefe de la semana</div>
        </div>
        <div style={{ width: '100%' }}>
          <div className="hq-boss-hp-label">
            <span>❤️ {poolXP} / {boss?.xpRequired || '?'} XP</span>
            <span>{remaining > 0 ? `Faltan ${remaining} XP` : '¡Derrotado!'}</span>
          </div>
          <div className="hq-boss-hp-bg">
            <div className="hq-boss-hp-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="hq-boss-timer">
          ⏳ Huye en <span>{days} día{days !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Pool global */}
      <div className="hq-pool-card">
        <div className="hq-pool-title">⚔️ XP del Hogar (semana)</div>
        <div className="hq-pool-xp">{poolXP} XP</div>
        <div className="hq-pool-sub">Suma de ambos guerreros esta semana</div>
      </div>

      {/* Historial de jefes */}
      {bossHistory.length > 0 && (
        <div>
          <div className="hq-boss-history-title">Historial de jefes</div>
          <div className="hq-boss-history">
            {bossHistory.slice().reverse().map((entry, i) => (
              <div key={i} className="hq-boss-history-item">
                <span>{entry.name}</span>
                <span style={{ color: '#555', fontSize: '0.68rem' }}>{entry.week}</span>
                <span className={`hq-boss-result ${entry.defeated ? 'win' : 'loss'}`}>
                  {entry.defeated ? '⚔️ Derrotado' : '💨 Escapó'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
