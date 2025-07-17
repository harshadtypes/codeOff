import { initializeApp } from "firebase/app";
import { getAuth, updateProfile } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA3y_1n6SpDD2tR1SpTI2L2BoRyYfQvtwE",
  authDomain: "codeoff-61382.firebaseapp.com",
  projectId: "codeoff-61382",
  storageBucket: "codeoff-61382.firebasestorage.app",
  messagingSenderId: "597340905549",
  appId: "1:597340905549:web:c78b4d004772ed27873c04",
  measurementId: "G-QPFGLZVLRP",
  databaseURL: "https://codeoff-61382-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

export function setUsername(uid, username) {
  return updateProfile(auth.currentUser, { displayName: username });
}
