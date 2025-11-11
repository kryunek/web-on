// reservations_ui.js
// UI glue between DOM and app_reservas_firebase.js
import { createPublicReservation, listenReservationsRealtime, changeReservationStatusFirebase, deleteReservationFirebase, adminLogin, adminLogout, onAuthChanged } from './app_reservas_firebase.js';

document.addEventListener('DOMContentLoaded', () => {
  // Elements
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

  const tabReservations = document.getElementById('tab-reservations');
  const reservationsSection = document.getElementById('reservations-section');
  const reservationsBody = document.getElementById('reservationsBody');
  const reservationsFilter = document.getElementById('reservations-filter');
  const syncPublicBtn = document.getElementById('sync-public-btn');

  // Open/close modal
  function openModal(){ modal.style.display = 'flex'; msg.innerText = ''; }
  function closeModal(){ modal.style.display = 'none'; form.reset(); }

  publicBtn?.addEventListener('click', openModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });

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
    }
  });

  // Simple login form logic (uses adminLogin)
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    loginError.innerText = '';
    const res = await adminLogin(email, pass);
    if (!res.ok) {
      loginError.innerText = res.error || 'Error al iniciar sesión';
    } else {
      // onAuthChanged will handle UI swap
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    await adminLogout();
  });

  // Listen auth state and show/hide admin UI
  onAuthChanged(user => {
    if (user) {
      // logged in
      loginScreen.style.display = 'none';
      appRoot.style.display = '';
      // mount reservations listener
      startRealtimeListener();
    } else {
      // logged out
      loginScreen.style.display = '';
      appRoot.style.display = 'none';
      stopRealtimeListener();
    }
  });

  // Tab click to show reservations section
  tabReservations?.addEventListener('click', () => {
    // show reservations section, hide others (simple)
    document.querySelectorAll('main section').forEach(s => s.style.display = 'none');
    reservationsSection.style.display = '';
    // mark active
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    tabReservations.classList.add('active');
  });

  // Render helper for reservations list
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

  // Handle action clicks (event delegation)
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

  // filter change
  reservationsFilter?.addEventListener('change', () => {
    // if we have lastList, re-render
    if (window._lastReservationsList) renderReservations(window._lastReservationsList);
  });

  // Sync public -> admin: simply re-fetch (public creates in same collection)
  syncPublicBtn?.addEventListener('click', () => {
    alert('Las reservas públicas se guardan directamente en Firestore; no hace falta sincronizar si todo está en la nube.');
  });

  // Realtime listener management
  let unsubscribe = null;
  window._lastReservationsList = [];
  function startRealtimeListener() {
    if (unsubscribe) return;
    unsubscribe = listenReservationsRealtime(list => {
      // save globally and render
      window._lastReservationsList = list.slice().sort((a,b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);
      renderReservations(window._lastReservationsList);
    });
  }
  function stopRealtimeListener() {
    if (typeof unsubscribe === 'function') { unsubscribe(); unsubscribe = null; }
    window._lastReservationsList = [];
    if (reservationsBody) reservationsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:18px 0">No estás logueado.</td></tr>`;
  }

});
