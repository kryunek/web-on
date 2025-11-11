// reservations_ui.js
// UI para pantallla pública de reservas + panel admin de reservas.
// Importa funciones desde app_reservas_firebase.js
// reservations_ui.js
// Interfaz de usuario para la pantalla pública de reservas + panel de administración de reservas.
// Importa funciones desde app_reservas_firebase.js
import { createPublicReservation, listenReservationsRealtime, changeReservationStatusFirebase, deleteReservationFirebase } from './app_reservas_firebase.js';

// Crea el DOM de la pantalla pública (si no existe) y exporta funciones para mostrar/ocultar
function ensurePublicScreen() {
  let el = document.getElementById('public-reservation-screen');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'public-reservation-screen';
  el.dataset.generated = 'true';
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.background = 'linear-gradient(180deg,#ffffff,#fbfbfb)';
  el.style.zIndex = '1000';
  el.innerHTML = `
    <div style="width:100%;max-width:520px;background:var(--panel);padding:22px;border-radius:12px;box-shadow:var(--card-shadow);border:1px solid var(--line);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="logo.png" alt="logo" style="width:52px;border-radius:8px;">
          <div>
            <h2 style="margin:0;font-size:1.25rem;">Reservar mesa</h2>
            <div style="color:var(--muted);font-size:0.9rem">Formulario rápido — confirmaremos por teléfono</div>
          </div>
        </div>
        <div>
          <button id="to-login-btn" class="btn-small" style="cursor:pointer;">Ir al login</button>
        </div>
      </div>

      <form id="public-reservation-form" class="form-inline" style="flex-direction:column;gap:10px;">
        <input name="name" placeholder="Nombre completo" required />
        <input name="phone" placeholder="Teléfono" required />
        <div style="display:flex;gap:8px;">
          <input name="date" type="date" required style="flex:1;" />
          <input name="time" type="time" required style="flex:1;" />
        </div>
        <input name="pax" type="number" min="1" placeholder="Personas" required />
        <textarea name="comments" placeholder="Alergias / comentarios (opcional)" rows="3"></textarea>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:6px;">
          <button type="submit" class="btn-gold">Enviar reserva</button>
        </div>
        <div id="public-reservation-msg" style="margin-top:8px;color:var(--muted)"></div>
      </form>
    </div>
  `;

  document.body.appendChild(el);

  // Vincular manejadores
  el.querySelector('#to-login-btn').addEventListener('click', ()=> {
    // Muestra la pantalla de login (login-screen está en index.html)
    document.getElementById('login-screen').style.display = '';
    el.style.display = 'none';
  });

  const form = el.querySelector('#public-reservation-form');
  form.onsubmit = async function(e){
    e.preventDefault();
    const f = e.target;
    const data = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      date: f.date.value,
      time: f.time.value,
      pax: parseInt(f.pax.value) || 1,
      comments: f.comments.value.trim()
    };
    const msg = el.querySelector('#public-reservation-msg');
    msg.style.color = 'var(--muted)';
    msg.innerText = 'Enviando...';
    try {
      const res = await createPublicReservation(data);
      if (res.ok) {
        msg.style.color = 'green';
        msg.innerText = 'Reserva enviada. Te confirmaremos por teléfono.';
        f.reset();
      } else {
        msg.style.color = 'var(--danger)';
        msg.innerText = 'Error: ' + (res.error || 'No se pudo enviar la reserva.');
      }
    } catch (err) {
      msg.style.color = 'var(--danger)';
      msg.innerText = 'Error inesperado: ' + err.message;
    }
  };

  return el;
}

// Mostrar / ocultar helpers
export function showPublicReservationScreen() {
  const el = ensurePublicScreen();
  // Ocultar otras pantallas
  document.getElementById('app-root').style.display = 'none';
  document.getElementById('login-screen').style.display = 'none';
  el.style.display = 'flex';
}

export function hidePublicReservationScreen() {
  const el = document.getElementById('public-reservation-screen');
  if (el) {
    try { el.remove(); } catch(e) { el.style.display = 'none'; }
  }
}

// --- PANEL ADMIN DE RESERVAS --- (lista simple + acciones)
let adminListEl = null;
function ensureAdminPanel() {
  if (adminListEl) return adminListEl;
  const container = document.createElement('div');
  container.id = 'admin-reservations-panel';
  container.style.padding = '14px';
  container.style.marginTop = '8px';
  container.innerHTML = `<h2 class="section-title">Reservas (admin)</h2>
    <div id="reservations-list" style="display:block;"></div>
  `;
  adminListEl = container;
  // Insertar dentro del tab de reservas para que solo aparezca ahí
  const reservasSection = document.getElementById('reservas-section');
  if (reservasSection) reservasSection.prepend(adminListEl);
  return adminListEl;
}

export function initAdminReservationsPanel() {
  const panel = ensureAdminPanel();
  const list = panel.querySelector('#reservations-list');
  list.innerHTML = '<div style="color:var(--muted)">Cargando reservas...</div>';

  // Escucha en tiempo real
  const unsubscribe = listenReservationsRealtime(resList => {
    list.innerHTML = '';
    if (!resList || resList.length === 0) {
      list.innerHTML = `<div style="color:var(--muted)">No hay reservas.</div>`;
      return;
    }
    resList.forEach(r => {
      const item = document.createElement('div');
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.style.border = '1px solid var(--line)';
      item.style.padding = '8px';
      item.style.borderRadius = '8px';
      item.style.marginBottom = '8px';
      item.innerHTML = `
        <div>
          <div style="font-weight:700">${r.name} — ${r.pax} pax</div>
          <div style="color:var(--muted);font-size:0.95rem">${r.date} ${r.time} — ${r.phone}</div>
          <div style="font-size:0.9rem;margin-top:4px">${r.comments || ''}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <div style="font-weight:700;color:${r.status === 'confirmada' ? 'green' : r.status === 'Cancelada' ? 'var(--danger)' : 'var(--muted)'}">${r.status || 'pendiente'}</div>
          <div style="display:flex;gap:6px;">
            <button class="btn-small" data-id="${r.id}" data-act="confirm">Confirmar</button>
            <button class="btn-small" data-id="${r.id}" data-act="cancel">Cancelar</button>
            <button class="btn-small" data-id="${r.id}" data-act="delete" style="color:var(--danger);border-color:rgba(176,0,32,0.12)">Borrar</button>
          </div>
        </div>
      `;
      list.appendChild(item);
    });

    // Acciones
    list.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = async function(){
        const id = this.dataset.id; const act = this.dataset.act;
        if (act === 'delete') {
          if (!confirm('¿Borrar reserva?')) return;
          await deleteReservationFirebase(id);
        } else if (act === 'confirm') {
          await changeReservationStatusFirebase(id, 'confirmed');
        } else if (act === 'cancel') {
          await changeReservationStatusFirebase(id, 'cancelled');
        }
      };
    });
  });

  return unsubscribe; // si se necesita detener el listener
}

// Pequeño modal para ver los detalles de la reserva y tomar acciones
function ensureReservationModal() {
  let m = document.getElementById('reservation-detail-modal');
  if (m) return m;
  m = document.createElement('div');
  m.id = 'reservation-detail-modal';
  m.style.position = 'fixed';
  m.style.inset = '0';
  m.style.display = 'none';
  m.style.alignItems = 'center';
  m.style.justifyContent = 'center';
  m.style.background = 'rgba(0,0,0,0.45)';
  m.style.zIndex = '2000';
  m.innerHTML = `<div style="background:var(--panel);padding:18px;border-radius:12px;max-width:520px;width:100%;">
    <div id="reservation-detail-content"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
      <button id="reservation-detail-close" class="btn-small">Cerrar</button>
      <button id="reservation-detail-confirm" class="btn-small">Confirmar</button>
      <button id="reservation-detail-cancel" class="btn-small">Cancelar</button>
      <button id="reservation-detail-delete" class="btn-small" style="color:var(--danger);">Borrar</button>
    </div>
  </div>`;
  document.body.appendChild(m);
  m.addEventListener('click',(ev)=>{ if(ev.target===m) m.style.display='none'; });
  return m;
}

function openReservationModal(r) {
  const m = ensureReservationModal();
  const content = m.querySelector('#reservation-detail-content');
  content.innerHTML = `
    <h3 style="margin:0 0 8px 0">Reserva: ${r.name}</h3>
    <div style="color:var(--muted);font-size:0.95rem">${r.date || ''} ${r.time || ''} — ${r.pax || ''} pax</div>
    <div style="margin-top:8px">Tel: ${r.phone || ''} ${r.email ? '<br>Email: '+r.email : ''}</div>
    <div style="margin-top:8px">Comentarios: ${r.comments || ''}</div>
    <div style="margin-top:8px">Estado: <b>${r.status || 'pendiente'}</b></div>
  `;
  // Acciones del modal
  m.style.display = 'flex';
  const closeBtn = document.getElementById('reservation-detail-close');
  const confirmBtn = document.getElementById('reservation-detail-confirm');
  const cancelBtn = document.getElementById('reservation-detail-cancel');
  const deleteBtn = document.getElementById('reservation-detail-delete');
  closeBtn.onclick = ()=> m.style.display = 'none';
  confirmBtn.onclick = async ()=> { await changeReservationStatusFirebase(r.id, 'confirmed'); m.style.display='none'; };
  cancelBtn.onclick = async ()=> { await changeReservationStatusFirebase(r.id, 'cancelled'); m.style.display='none'; };
  deleteBtn.onclick = async ()=> { if(confirm('¿Borrar reserva?')){ await deleteReservationFirebase(r.id); m.style.display='none'; } };
}