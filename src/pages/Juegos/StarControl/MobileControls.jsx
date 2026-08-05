import './StarControl.css'

export default function MobileControls({ setMobileControl }) {
  const bind = (name) => ({
    onTouchStart: (e) => { e.preventDefault(); setMobileControl(name, true) },
    onTouchEnd: (e) => { e.preventDefault(); setMobileControl(name, false) },
    onTouchCancel: (e) => { e.preventDefault(); setMobileControl(name, false) },
    onMouseDown: () => setMobileControl(name, true),
    onMouseUp: () => setMobileControl(name, false),
    onMouseLeave: () => setMobileControl(name, false),
  })

  return (
    <>
      <div className="sc-controls-left">
        <button className="sc-btn sc-btn-rotate" {...bind('rotateLeft')}>⟲</button>
        <button className="sc-btn sc-btn-rotate" {...bind('rotateRight')}>⟳</button>
      </div>
      <div className="sc-controls-right">
        <button className="sc-btn sc-btn-thrust" {...bind('thrust')}>▲</button>
        <button className="sc-btn sc-btn-fire" {...bind('fire')}>●</button>
        <button className="sc-btn sc-btn-missile" {...bind('missile')}>🚀</button>
      </div>
    </>
  )
}
