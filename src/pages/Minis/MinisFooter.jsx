export default function MinisFooter({ navigate }) {
  return (
    <footer className="minis-footer">
      <div className="minis-footer-inner">
        <span>© {new Date().getFullYear()} jaijur · Miniaturas pintadas a mano</span>
        <button className="minis-footer-link" onClick={() => navigate('/minis/legal')}>Privacidad</button>
      </div>
    </footer>
  )
}
