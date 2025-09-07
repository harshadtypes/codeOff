import React, {useState, useEffect, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {auth} from "../firebase";
import {
    listenForChallenges,
    sendChallenge,
    acceptChallenge,
    joinQueue,
} from "../api/matchmaking";
import {database} from "../firebase";
import {ref, onChildAdded, set as dbSet} from "firebase/database";
import { motion } from "framer-motion";

export default function LandingPage() {
    const [challenges, setChallenges] = useState([]);
    const [friendId, setFriendId] = useState("");
    const [showLogoutView, setShowLogoutView] = useState(false);
    const [loggedOutEmail, setLoggedOutEmail] = useState(null);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const snackbarTimeoutRef = useRef(null);
    const navigate = useNavigate();
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;

        const roomsRef = ref(database, "rooms/");
        const unsub = onChildAdded(roomsRef, (snap) => {
            const room = snap.val();
            if (room?.players?.[user.uid] && !room.entered) {
                dbSet(ref(database, `rooms/${room.roomId}/entered`), true);
                navigate("/battle", {state: {roomId: room.roomId}});
            }
        });

        const unsubChallenge = listenForChallenges(user.uid, (challenge) => {
            setChallenges((prev) => [...prev, challenge]);
        });

        return () => {
            unsub();
            if (unsubChallenge) unsubChallenge();
        };
    }, [user, navigate]);

    const handleStartBattle = () => {
        let searching = true;
        joinQueue(
            ({roomId, opponent}) => {
                searching = false;
                navigate("/battle", {state: {roomId, opponent}});
            },
            (seconds) => {
                console.log("⏳ Searching…", seconds, "seconds");
            },
            ({roomId, opponent}) => {
                if (searching) navigate("/battle", {state: {roomId, opponent}});
            }
        );
    };

    const handleSendChallenge = async () => {
        if (!friendId || !user) return;
        try {
            await sendChallenge(friendId, user.uid, user.email);
            alert("✅ Challenge sent!");
            setFriendId("");
        } catch (err) {
            alert(err.message || "❌ Failed to send challenge.");
        }
    };

    const handleAcceptChallenge = async (challenge) => {
        const {challengerId, challengerEmail} = challenge;
        const roomId = await acceptChallenge(challengerId, user.uid);
        navigate("/battle", {
            state: {
                roomId,
                opponent: {uid: challengerId, email: challengerEmail},
            },
        });
    };

    const handleLogout = async () => {
        try {
            const emailBeforeLogout = user?.email;
            await auth.signOut();
            setLoggedOutEmail(emailBeforeLogout);
            setShowLogoutView(true);
            setShowSnackbar(true);
            if (snackbarTimeoutRef.current)
                clearTimeout(snackbarTimeoutRef.current);
            snackbarTimeoutRef.current = setTimeout(
                () => setShowSnackbar(false),
                5000
            );
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const Snackbar = () =>
        showSnackbar && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50">
                ✅ You've been logged out successfully!
                <button
                    onClick={() => setShowSnackbar(false)}
                    className="ml-4 underline hover:text-gray-200">
                    Dismiss
                </button>
            </div>
        );

    if (showLogoutView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white space-y-4">
                <h2 className="text-2xl">✅ You've been logged out</h2>
                <p className="text-lg">👋 Bye {loggedOutEmail}</p>
                <button
                    onClick={() => navigate("/login")}
                    className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500">
                    🔐 Go to Login
                </button>
                <Snackbar />
            </div>
        );
    }

    return (
        <motion.div
            className="min-h-screen bg-gray-900 text-white p-8"
            initial={{opacity: 0, y: 50}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -50}}
            transition={{duration: 0.4}}>
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="bg-gray-950 p-8 rounded-2xl shadow-2xl text-white">
                    <div className="max-w-2xl mx-auto space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <h1 className="text-3xl font-bold">
                                Welcome, {user?.displayName || user?.email}
                            </h1>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded">
                                Logout
                            </button>
                        </div>

                        <button
                            onClick={handleStartBattle}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded text-lg font-semibold">
                            🔄 Start Random Battle
                        </button>

                        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-3">
                                🎯 Challenge a Friend
                            </h2>
                            <input
                                value={friendId}
                                onChange={(e) => setFriendId(e.target.value)}
                                placeholder="Enter friend's username"
                                className="w-full p-3 mb-3 rounded bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                onClick={handleSendChallenge}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded">
                                Send Challenge
                            </button>
                        </div>

                        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4">
                                📨 Incoming Challenges
                            </h2>
                            {challenges.length === 0 ? (
                                <p className="text-gray-400">
                                    No challenges yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {challenges.map((challenge, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-gray-700 p-4 rounded flex justify-between items-center">
                                            <div>
                                                <strong>
                                                    {challenge.challengerEmail}
                                                </strong>{" "}
                                                challenged you
                                            </div>
                                            <button
                                                onClick={() =>
                                                    handleAcceptChallenge(
                                                        challenge
                                                    )
                                                }
                                                className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded text-white">
                                                Accept
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Snackbar />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
