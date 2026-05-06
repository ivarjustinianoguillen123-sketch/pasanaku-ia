import { doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '../firebase/config'

export default function Bienvenida({ perfil, onContinuar }) {
  const marcarVista = async () => {
    await updateDoc(doc(db, 'participantes', auth.currentUser.uid), { bienvenidaVista: true })
    onContinuar()
  }

  return (
    <div className="page">
      <div style={{ background:'linear-gradient(160deg, #4B1528 0%, #2D0D18 100%)', padding:32, display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center' }}>
        <div style={{ fontSize:52 }}>🎉</div>
        <h1 style={{ color:'#F4C0D1', fontSize:24, fontWeight:700 }}>¡Bienvenido al Pasanaku!</h1>
        <p style={{ color:'rgba(244,192,209,0.75)', fontSize:14, lineHeight:1.6 }}>Tu solicitud fue aprobada. Aquí están los detalles de tu participación.</p>
      </div>

      <div className="content">
        <div className="card">
          <div className="section-title" style={{ marginBottom:12 }}>Tu información de participación</div>
          <div className="info-row"><span className="info-key">Nombre</span><span className="info-val">{perfil?.nombre}</span></div>
          <div className="info-row"><span className="info-key">Aporte diario</span><span className="info-val" style={{ color:'#4B1528' }}>Bs {perfil?.aporte || '---'}</span></div>
          <div className="info-row"><span className="info-key">Tu turno</span><span className="info-val" style={{ color:'#4B1528' }}>Día {perfil?.turno || '---'}</span></div>
          <div className="info-row">
            <span className="info-key">Fecha de transferencia</span>
            <span className="info-val" style={{ color:'#27500A' }}>{perfil?.fechaTransferencia || 'Por confirmar'}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Monto que recibirás</span>
            <span className="info-val" style={{ fontSize:20, color:'#4B1528' }}>Bs {perfil?.monto || '---'}</span>
          </div>
          <div className="info-row"><span className="info-key">Cuenta destino</span><span className="info-val" style={{ fontSize:12 }}>{perfil?.cuenta}</span></div>
        </div>

        <div className="card" style={{ background:'#FDF5F7', border:'1px solid #F4C0D1' }}>
          <p style={{ fontSize:13, color:'#4B1528', lineHeight:1.7 }}>
            📌 Recuerda subir tu comprobante de pago cada día. Si no pagas antes del mediodía, recibirás un recordatorio por WhatsApp.
          </p>
        </div>

        <button className="btn-primary" onClick={marcarVista}>Ir a mi panel de pagos →</button>
      </div>
    </div>
  )
}
