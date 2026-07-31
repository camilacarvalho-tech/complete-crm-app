import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDvmFFj_5cgZ2d-hts6atuHjb4O8eV4zLo",
  authDomain: "recomece-cred-oficial.firebaseapp.com",
  projectId: "recomece-cred-oficial",
  storageBucket: "recomece-cred-oficial.firebasestorage.app",
  messagingSenderId: "486214549054",
  appId: "1:486214549054:web:bd7cd0341db3d265735b6f",
  measurementId: "G-GXF6T18K8P"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;