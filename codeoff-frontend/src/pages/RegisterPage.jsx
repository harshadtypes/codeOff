import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Passwords do not match");
      return;
    }
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCred.user);
      setMessage("Verification email sent. Please check your inbox.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Register</h2>
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-2 rounded bg-gray-800" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="p-2 rounded bg-gray-800" />
        <input type="password" placeholder="Confirm Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="p-2 rounded bg-gray-800" />
        <button type="submit" className="bg-blue-600 text-white py-2 rounded">Register</button>
      </form>
      <p className="mt-4 text-green-400">{message}</p>
    </div>
  );
}