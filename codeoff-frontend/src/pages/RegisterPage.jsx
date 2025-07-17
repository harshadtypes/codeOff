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

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [username, setUsernameInput] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [message, setMessage] = useState("");

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirm) {
            setMessage("Passwords do not match");
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
            setMessage("Verification email sent. Please check your inbox.");
            navigate("/landing");
        } catch (err) {
            setMessage(err.message);
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
            setMessage(err.message);
        }
    };

    return (
        <div className="p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Register</h2>
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                    className="p-2 rounded bg-gray-800"
                />
                <input
                    type="email"
                    placeholder="Email"
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
                <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="p-2 rounded bg-gray-800"
                />
                <button
                    type="submit"
                    className="bg-blue-600 text-white py-2 rounded">
                    Register
                </button>
            </form>

            <button
                onClick={googleRegister}
                className="mt-4 bg-red-600 text-white py-2 rounded w-full">
                Sign up with Google
            </button>

            <p className="mt-4 text-green-400">{message}</p>
        </div>
    );
}
