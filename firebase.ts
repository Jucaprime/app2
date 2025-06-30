import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCSPqg6j4JznoKbCGMKT2JS3ubpUzbnnbk",
  authDomain: "financeiro-28503.firebaseapp.com",
  projectId: "financeiro-28503",
  storageBucket: "financeiro-28503.appspot.com",
  messagingSenderId: "431660968383",
  appId: "1:431660968383:web:6150e075381875cc79d90a",
  measurementId: "G-0Q96CKSS94"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
