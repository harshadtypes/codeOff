// src/pages/RegisterPage.jsx
import {useState} from "react";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import {auth, database} from "../firebase";
import {ref, set} from "firebase/database";
import {useNavigate} from "react-router-dom";
import { motion } from "framer-motion";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [username, setUsernameInput] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            setMessage("❌ Passwords do not match.");
            return;
        }
        try {
            const userCred = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            await updateProfile(userCred.user, {displayName: username});
            await set(ref(database, `usernames/${username}`), {
                email: email,
                uid: userCred.user.uid,
            });
            await sendEmailVerification(userCred.user);
            setMessage("✅ Verification email sent. Please check your inbox.");
            navigate("/landing");
        } catch (err) {
            setMessage(`❌ ${err.message}`);
        }
    };

    const googleRegister = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            if (!result.user.displayName) {
                await updateProfile(result.user, {
                    displayName: "User" + Date.now(),
                });
            }
            navigate("/landing");
        } catch (err) {
            setMessage(`❌ ${err.message}`);
        }
    };

    return (
        <motion.div
            className="min-h-screen bg-gray-900 text-white p-8"
            initial={{opacity: 0, y: 50}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -50}}
            transition={{duration: 0.4}}>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
                <div className="bg-gray-950 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
                    <h2 className="text-3xl font-bold mb-6 text-center">
                        Create Your CodeOff Account
                    </h2>

                    {message && (
                        <div className="bg-gray-800 text-sm text-green-400 p-2 mb-4 rounded text-center">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            required
                            className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            />
                            <span
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 cursor-pointer">
                                {showPassword ? "🙈" : "👁️"}
                            </span>
                        </div>

                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                className="w-full p-3 bg-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                            />
                            <span
                                onClick={() => setShowConfirm((prev) => !prev)}
                                className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 cursor-pointer">
                                {showConfirm ? "🙈" : "👁️"}
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-semibold transition">
                            Register
                        </button>
                    </form>

                    <div className="my-4 text-center text-gray-400">— or —</div>

                    <button
                        onClick={googleRegister}
                        className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded font-semibold">
                        Sign up with Google
                    </button>

                    <p className="mt-4 text-center text-sm text-gray-400">
                        Already have an account?{" "}
                        <span
                            onClick={() => navigate("/login")}
                            className="text-blue-400 hover:underline cursor-pointer">
                            Login here
                        </span>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
