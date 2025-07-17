import { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth } from "../firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const login = async (e) => {
    e.preventDefault();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      setMessage("Login successful");
    } catch (err) {
      setMessage(err.message);
    }
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={login} className="flex flex-col gap-4">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-2 rounded bg-gray-800" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="p-2 rounded bg-gray-800" />
        <button type="submit" className="bg-green-600 text-white py-2 rounded">Login</button>
      </form>
      <button onClick={googleLogin} className="mt-4 bg-red-500 text-white py-2 rounded w-full">Login with Google</button>
      <p className="mt-4 text-yellow-400">{message}</p>
    </div>
  );
}