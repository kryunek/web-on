// app_reservas_firebase.js
// Sistema de reservas con Firebase Firestore y Auth (compatible con GitHub Pages)

import { getFirestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, orderBy, query, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } 
  from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Tomar referencias de la app inicializada (hecha en firebase_init.js o inline en index.html)
const { db, auth } = window.firebaseApp;

// Colección principal
const reservationsCol = collection(db, "reservations");

/* ---------- FUNCIONES PRINCIPALES ---------- */

// Crear reserva pública (desde formulario)
export async function createPublicReservation(data) {
  try {
    await addDoc(reservationsCol, {
      ...data,
      status: "pending",
      createdAt: serverTimestamp()
    });
    return { ok: true };
  } catch (err) {
    console.error("❌ Error creando reserva:", err);
    return { ok: false, error: err.message };
  }
}

// Cambiar estado (solo admin)
export async function changeReservationStatusFirebase(id, newStatus) {
  try {
    const ref = doc(db, "reservations", id);
    await updateDoc(ref, { status: newStatus });
    return { ok: true };
  } catch (err) {
    console.error("❌ Error al cambiar estado:", err);
    return { ok: false, error: err.message };
  }
}

// Eliminar reserva (solo admin)
export async function deleteReservationFirebase(id) {
  try {
    const ref = doc(db, "reservations", id);
    await deleteDoc(ref);
    return { ok: true };
  } catch (err) {
    console.error("❌ Error borrando reserva:", err);
    return { ok: false, error: err.message };
  }
}

// Escuchar reservas en tiempo real
export function listenReservationsRealtime(callback) {
  const q = query(reservationsCol, orderBy("date", "asc"));
  return onSnapshot(q, snapshot => {
    const list = [];
    snapshot.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
    callback(list);
  }, err => {
    console.error("❌ Error escuchando reservas:", err);
    callback([]);
  });
}

/* ---------- AUTENTICACIÓN ADMIN ---------- */
export async function adminLogin(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, user: cred.user };
  } catch (err) {
    console.error("❌ Error login:", err);
    return { ok: false, error: err.message };
  }
}

export async function adminLogout() {
  await signOut(auth);
}

export function onAuthChanged(cb) {
  return onAuthStateChanged(auth, cb);
}

/* ---------- USO BÁSICO ----------
Ejemplo rápido de integración:

import { createPublicReservation, listenReservationsRealtime, changeReservationStatusFirebase } from './app_reservas_firebase.js';

// Crear reserva desde formulario:
createPublicReservation({
  name: "Cliente", phone: "600123456", date: "2025-11-12", time: "20:00",
  pax: 2, comments: "sin gluten"
});

// Escuchar reservas (panel admin):
listenReservationsRealtime(resList => {
  console.log("Reservas actualizadas:", resList);
});

// Cambiar estado:
changeReservationStatusFirebase(id, "confirmed");
----------------------------------------------*/
