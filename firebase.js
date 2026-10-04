// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyiW_ZWza3nypV2jZpGpzXlZy0-twoFX8",
  authDomain: "world-chat-global.firebaseapp.com",
  projectId: "world-chat-global",
  storageBucket: "world-chat-global.firebasestorage.app",
  messagingSenderId: "838966105010",
  appId: "1:838966105010:web:f728724b42df7e852ccaab",
  measurementId: "G-LX7X5N0ZZ8"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };