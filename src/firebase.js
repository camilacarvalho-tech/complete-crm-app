import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDZLihDMnH7CpNo_VoyPe6OGwB_nqHkoOo",
  authDomain: "crm-recomece.firebaseapp.com",
  projectId: "crm-recomece",
  storageBucket: "crm-recomece.firebasestorage.app",
  messagingSenderId: "419886271583",
  appId: "1:419886271583:web:c89049e9113c25587e9fea",
  measurementId: "G-6GQCMND62H"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export default app;