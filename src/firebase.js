import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDvmFFj_5cgZ2d-hts6atuHjb4O8eV4zLo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "recomece-cred-oficial.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "recomece-cred-oficial",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "recomece-cred-oficial.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "486214549054",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:486214549054:web:bd7cd0341db3d265735b6f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-GXF6T18K8P"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;