// reservations_ui.js (updated)
// UI glue between DOM and app_reservas_firebase.js
import { createPublicReservation, listenReservationsRealtime, changeReservationStatusFirebase, deleteReservationFirebase, adminLogin, adminLogout, onAuthChanged } from './app_reservas_firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const heroReserveBtn = document.getElementById('hero-reserve-btn');
  const accessPanelBtn = document.getElementById('access-panel-btn');
  const publicBtn = document.getElementById('public-reserve-btn');
  const modal = document.getElementById('public-reservation-modal');
  const form = document.getElementById('publicReservationForm');
  const cancelBtn = document.getElementById('public-reserve-cancel');
  const msg = document.getElementById('public-reserve-msg');

  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const appRoot = document.getElementById('app-root');
  const logoutBtn = document.getElementById('logout-btn');

  const reservationsSection = document.getElementById('reservations-section');
  const reservationsBody = document.getElementById('reservationsBody');
  const reservationsFilter = document.getElementById('reservations-filter');

  // open modal helpers
  function openModal(){ modal.style.display = 'flex'; msg.innerText = ''; }
  function closeModal(){ modal.style.display = 'none'; form.reset(); }

  // hook buttons
  [heroReserveBtn, publicBtn].forEach(b => { if (b) b.addEventListener('click', openModal); });
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });

  // access panel button shows login
  if (accessPanelBtn) accessPanelBtn.addEventListener('click', () => {
    loginScreen.style.display = 'flex';
    // hide public modal if open
    closeModal();
  });

  // Submit public reservation -> call createPublicReservation
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      date: f.date.value,
      time: f.time.value,
      pax: Number(f.pax.value) || 1,
      comments: f.comments.value.trim()
    };
    msg.style.color = 'var(--muted)';
    msg.innerText = 'Enviando...';
    const res = await createPublicReservation(data);
    if (res.ok) {
      msg.style.color = 'green';
      msg.innerText = 'Reserva enviada. Gracias.';
      setTimeout(()=> closeModal(), 900);
    } else {
      msg.style.color = 'var(--danger)';
      msg.innerText = 'Error: ' + (res.error || 'fallo al enviar');
      console.error('Reserva error:', res);
    }
  });

  // login form (delegated in the login modal)
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    loginError.innerText = '';
    const res = await adminLogin(email, pass);
    if (!res.ok) {
      loginError.innerText = res.error || 'Error al iniciar sesión';
    } else {
      // hide login (onAuthChanged will toggle UI)
      loginScreen.style.display = 'none';
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    await adminLogout();
  });

  // Auth state
  let unsubscribe = null;
  window._lastReservationsList = [];
  onAuthChanged(user => {
    if (user) {
      loginScreen.style.display = 'none';
      appRoot.style.display = '';
      reservationsSection.style.display = '';
      // start realtime listening
      if (!unsubscribe) {
        unsubscribe = listenReservationsRealtime(list => {
          window._lastReservationsList = list.slice().sort((a,b)=> (a.date + a.time) < (b.date + b.time) ? -1 : 1);
          renderReservations(window._lastReservationsList);
        });
      }
    } else {
      loginScreen.style.display = 'none';
      appRoot.style.display = 'none';
      reservationsSection.style.display = 'none';
      if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
    }
  });

  // render helper
  function renderReservations(list) {
    if (!reservationsBody) return;
    const filter = reservationsFilter?.value || 'all';
    const filtered = list.filter(r => filter === 'all' ? true : (r.status === filter));
    if (filtered.length === 0) {
      reservationsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:18px 0">No hay reservas.</td></tr>`;
      return;
    }
    reservationsBody.innerHTML = '';
    filtered.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.date || ''}</td>
        <td>${r.time || ''}</td>
        <td>${r.name || ''}</td>
        <td>${r.pax || ''}</td>
        <td>${r.phone || ''}${r.email ? ' / ' + r.email : ''}</td>
        <td style="font-weight:700">${r.status || 'pending'}</td>
        <td>
          <button class="btn-small" data-id="${r.id}" data-action="confirm">Confirmar</button>
          <button class="btn-small" data-id="${r.id}" data-action="cancel">Cancelar</button>
          <button class="btn-small" data-id="${r.id}" data-action="complete">Completada</button>
          <button class="btn-small" data-id="${r.id}" data-action="delete">Borrar</button>
        </td>
      `;
      reservationsBody.appendChild(tr);
    });
  }

  // actions
  reservationsBody?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (!id || !action) return;
    if (action === 'confirm') await changeReservationStatusFirebase(id, 'confirmed');
    if (action === 'cancel') await changeReservationStatusFirebase(id, 'cancelled');
    if (action === 'complete') await changeReservationStatusFirebase(id, 'completed');
    if (action === 'delete') {
      if (!confirm('Borrar reserva?')) return;
      await deleteReservationFirebase(id);
    }
  });

  reservationsFilter?.addEventListener('change', () => {
    renderReservations(window._lastReservationsList || []);
  });

});
