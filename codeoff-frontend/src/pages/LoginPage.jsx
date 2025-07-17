import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth, database } from "../firebase"; // ✅ Consistent with firebase.js
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState(""); // can be email or username
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    setMessage("");

    let loginEmail = email;

    if (!email.includes("@")) {
      // Not an email → treat as username
      try {
        const usernameRef = ref(database, `usernames/${email}`);
        const snap = await get(usernameRef);
        if (!snap.exists()) {
          setMessage("❌ Username not found.");
          return;
        }
        loginEmail = snap.val().email; // ✅ Access email property
      } catch (err) {
        setMessage("❌ Error fetching username.");
        return;
      }
    }

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, loginEmail, password);
      setMessage("✅ Login successful");
      navigate("/landing");
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      const user = auth.currentUser;

      const usernameRef = ref(database, `usernames`);
      const snap = await get(usernameRef);
      let foundUsername = null;

      // 🔍 Find matching username
      snap.forEach((child) => {
        if (child.val().email === user.email) {
          foundUsername = child.key;
        }
      });

      localStorage.setItem("username", foundUsername || "Emiway Bantai");
      navigate("/landing");
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        navigate("/landing");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={login} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Username or Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-2 rounded bg-gray-800"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-2 rounded bg-gray-800"
        />
        <button
          type="submit"
          className="bg-green-600 text-white py-2 rounded"
        >
          Login
        </button>
      </form>
      <button
        onClick={googleLogin}
        className="mt-4 bg-red-500 text-white py-2 rounded w-full"
      >
        Login with Google
      </button>
      <p className="mt-4 text-yellow-400">{message}</p>
    </div>
  );
}
