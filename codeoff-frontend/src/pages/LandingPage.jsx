import React, {useState, useEffect, useRef} from "react";
import {useNavigate} from "react-router-dom";
import {auth} from "../firebase"; // adjust path if needed
import {
    listenForChallenges,
    sendChallenge,
    acceptChallenge,
} from "../api/matchmaking";
import { joinQueue } from "../api/matchmaking";


export default function LandingPage() {
    const [challenges, setChallenges] = useState([]);
    const [friendId, setFriendId] = useState("");
    const [showLogoutView, setShowLogoutView] = useState(false);
    const [loggedOutEmail, setLoggedOutEmail] = useState(null);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const navigate = useNavigate();
    const user = auth.currentUser;
    const snackbarTimeoutRef = useRef(null);

    useEffect(() => {
        if (!user || showLogoutView) return;

        const unsubscribe = listenForChallenges(user.uid, (challenge) => {
            setChallenges((prev) => [...prev, challenge]);
        });

        return () => unsubscribe();
    }, [user, showLogoutView]);

    const handleStartBattle = () => {
        let searching = true;

        const _cancel = joinQueue(
            ({roomId, opponent}) => {
                searching = false;
                navigate("/battle", {state: {roomId, opponent}});
            },
            (seconds) => {
                console.log("⏳ Searching…", seconds, "seconds");
            },
            ({roomId, opponent}) => {
                if (searching) {
                    navigate("/battle", {state: {roomId, opponent}});
                }
            }
        );
    };

    const handleSendChallenge = async () => {
        if (!friendId || !user) return;
        await sendChallenge(friendId, user.uid, user.email);
        alert("Challenge sent!");
        setFriendId("");
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

    const goToLogin = () => navigate("/login");

    // ✅ Snackbar component
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
                    onClick={goToLogin}
                    className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600">
                    🔐 Go to Login
                </button>
                <Snackbar />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">
                    Welcome, {user?.displayName || user?.email}
                </h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-3 py-1 rounded">
                    🚪 Logout
                </button>
            </div>

            <div className="space-y-4">
                <button
                    onClick={handleStartBattle}
                    className="bg-blue-600 text-white px-4 py-2 rounded w-full">
                    🔄 Start Random Battle
                </button>

                <div className="bg-gray-800 p-4 rounded">
                    <h2 className="text-xl mb-2">Challenge a Friend</h2>
                    <input
                        value={friendId}
                        onChange={(e) => setFriendId(e.target.value)}
                        placeholder="Enter friend user ID"
                        className="w-full p-2 mb-2 rounded bg-gray-900 text-white"
                    />
                    <button
                        onClick={handleSendChallenge}
                        className="bg-purple-600 text-white px-4 py-2 rounded w-full">
                        🎯 Send Challenge
                    </button>
                </div>

                <div className="bg-gray-700 p-4 rounded">
                    <h2 className="text-xl mb-2">Incoming Challenges</h2>
                    {challenges.length === 0 && (
                        <p className="text-sm text-gray-400">
                            No challenges yet
                        </p>
                    )}
                    {challenges.map((challenge, idx) => (
                        <div
                            key={idx}
                            className="flex justify-between items-center bg-gray-600 p-2 rounded mb-2">
                            <div>
                                <strong>{challenge.challengerEmail}</strong>{" "}
                                challenged you
                            </div>
                            <button
                                onClick={() => handleAcceptChallenge(challenge)}
                                className="bg-green-500 text-white px-3 py-1 rounded">
                                Accept
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <Snackbar />
        </div>
    );
}
