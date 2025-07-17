// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA3y_1n6SpDD2tR1SpTI2L2BoRyYfQvtwE",
  authDomain: "codeoff-61382.firebaseapp.com",
  projectId: "codeoff-61382",
  storageBucket: "codeoff-61382.firebasestorage.app",
  messagingSenderId: "597340905549",
  appId: "1:597340905549:web:c78b4d004772ed27873c04",
  measurementId: "G-QPFGLZVLRP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);