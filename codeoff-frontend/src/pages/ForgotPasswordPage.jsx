import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const resetPassword = async (e) => {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Reset link sent to email.");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
      <form onSubmit={resetPassword} className="flex flex-col gap-4">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="p-2 rounded bg-gray-800" />
        <button type="submit" className="bg-purple-600 text-white py-2 rounded">Send Reset Link</button>
      </form>
      <p className="mt-4 text-blue-400">{message}</p>
    </div>
  );
}