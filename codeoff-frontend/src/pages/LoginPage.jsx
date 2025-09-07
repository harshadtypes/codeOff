import {useState, useEffect} from "react";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
} from "firebase/auth";
import {auth, database} from "../firebase";
import {ref, get} from "firebase/database";
import {useNavigate} from "react-router-dom";
import { motion } from "framer-motion";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            if (user) navigate("/landing");
        });
        return () => unsub();
    }, [navigate]);

    const login = async (e) => {
        e.preventDefault();
        setMessage("");

        let loginEmail = email;

        if (!email.includes("@")) {
            try {
                const snap = await get(ref(database, `usernames/${email}`));
                if (!snap.exists()) {
                    setMessage("❌ Username not found.");
                    return;
                }
                loginEmail = snap.val().email;
            } catch {
                setMessage("❌ Error fetching username.");
                return;
            }
        }

        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, loginEmail, password);
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
            const snap = await get(ref(database, `usernames`));
            let foundUsername = null;

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

    return (
        <motion.div
            className="min-h-screen bg-gray-900 text-white p-8"
            initial={{opacity: 0, y: 50}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -50}}
            transition={{duration: 0.4}}>
            <div className="p-8 max-w-md mx-auto text-white">
                <div className="bg-gray-950 p-8 rounded-2xl shadow-2xl w-full max-w-md text-white">
                    <h2 className="text-3xl font-bold mb-6 text-center">
                        Login
                    </h2>

                    <form onSubmit={login} className="flex flex-col gap-4">
                        <input
                            type="text"
                            placeholder="Username or Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="p-3 rounded bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full p-3 rounded bg-gray-800 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer text-gray-400">
                                {showPassword ? "🙈" : "👁️"}
                            </span>
                        </div>

                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-500 text-white py-2 rounded">
                            Login
                        </button>
                    </form>

                    <button
                        onClick={googleLogin}
                        className="mt-4 bg-red-600 hover:bg-red-500 text-white py-2 rounded w-full">
                        Login with Google
                    </button>

                    {message && (
                        <p className="mt-4 text-yellow-400 text-center text-sm">
                            {message}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
