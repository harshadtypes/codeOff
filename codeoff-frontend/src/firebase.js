import { initializeApp } from "firebase/app";
import { getAuth, updateProfile } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBJbI3RJaeOBMrOtkdFPEPxlFSmF8uEXys",
  authDomain: "code-off-6a8f8.firebaseapp.com",
  projectId: "code-off-6a8f8",
  storageBucket: "code-off-6a8f8.firebasestorage.app",
  messagingSenderId: "503562280000",
  appId: "1:503562280000:web:9af9cc7423c6f69aa393a5",
  measurementId: "G-EJKDVBTYQR",
  databaseURL: "https://code-off-6a8f8-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

export function setUsername(uid, username) {
  return updateProfile(auth.currentUser, { displayName: username });
}