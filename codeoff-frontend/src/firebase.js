import { initializeApp } from "firebase/app";
import { getAuth, updateProfile } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBymWiw_V8LZo-QrADlzBQ52CST4Yc-vS4",
  authDomain: "kodeoff-7f7b2.firebaseapp.com",
  projectId: "kodeoff-7f7b2",
  storageBucket: "kodeoff-7f7b2.firebasestorage.app",
  messagingSenderId: "886298485858",
  appId: "1:886298485858:web:784ac54766c53027439d3b",
  measurementId: "G-6QLJPS9JLH",
  databaseURL: "https://code-off-6a8f8-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

export function setUsername(uid, username) {
  return updateProfile(auth.currentUser, { displayName: username });
}