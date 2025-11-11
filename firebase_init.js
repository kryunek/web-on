import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC_8-FLjtzPJ_Viily8b_Py7Lurbvj-PvM",
  authDomain: "web-clase-1bc70.firebaseapp.com",
  projectId: "web-clase-1bc70",
  storageBucket: "web-clase-1bc70.firebasestorage.app",
  messagingSenderId: "286333514119",
  appId: "1:286333514119:web:221cc8ffc21d8ce0432322",
  measurementId: "G-SQP4JVS1BB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

window.firebaseApp = { db, auth };