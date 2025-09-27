// src/pages/RegisterPage.jsx
import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth, database } from "../firebase";
import { ref, set, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Liquid Ether Background Component (inspired by ReactBits)
const LiquidEtherBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-green-900/20" />
      <div className="absolute inset-0">
        {/* Animated blobs */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full mix-blend-multiply filter blur-xl opacity-70"
            style={{
              background: `radial-gradient(circle, ${
                ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"][i]
              }40, transparent)`,
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            initial={{
              width: `${200 + i * 50}px`,
              height: `${200 + i * 50}px`,
              left: `${i * 20}%`,
              top: `${i * 25}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Gaming Input Component
const GamingInput = ({
  icon,
  type,
  placeholder,
  value,
  onChange,
  showPassword,
  toggleShow,
}) => (
  <motion.div
    className="relative group"
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative flex items-center">
      <div className="absolute left-4 z-10 text-gray-400 group-focus-within:text-cyan-400 transition-colors">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-12 py-4 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
      />
      {toggleShow && (
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-4 text-gray-400 hover:text-cyan-400 transition-colors"
        >
          {showPassword ? "🙈" : "👁️"}
        </button>
      )}
    </div>
  </motion.div>
);

// Username Selection Modal
const UsernameModal = ({ isOpen, onSubmit, onClose, initialUsername = "" }) => {
  const [username, setUsername] = useState(initialUsername);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);

  const checkUsername = async (value) => {
    if (!value || value.length < 3) {
      setIsAvailable(null);
      return;
    }

    setIsChecking(true);
    try {
      const snapshot = await get(ref(database, `usernames/${value}`));
      setIsAvailable(!snapshot.exists());
    } catch (error) {
      console.error("Error checking username:", error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => checkUsername(username), 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isAvailable && username.length >= 3) {
      onSubmit(username);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              Choose Your Warrior Name
            </h2>
            <p className="text-gray-400 mb-6">
              Select a unique username for the battlefield
            </p>

            <form onSubmit={handleSubmit}>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {isChecking ? (
                    <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                  ) : isAvailable === true ? (
                    <span className="text-green-500">✓</span>
                  ) : isAvailable === false ? (
                    <span className="text-red-500">✗</span>
                  ) : null}
                </div>
              </div>

              {username.length > 0 && username.length < 3 && (
                <p className="text-red-400 text-sm mb-4">
                  Username must be at least 3 characters
                </p>
              )}
              {isAvailable === false && (
                <p className="text-red-400 text-sm mb-4">
                  Username is already taken
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isAvailable || username.length < 3}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-cyan-700 transition-all"
                >
                  Confirm
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsernameInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [tempUserData, setTempUserData] = useState(null);

  const navigate = useNavigate();

  // Set persistence based on remember me
  useEffect(() => {
    const persistence = rememberMe
      ? browserLocalPersistence
      : browserSessionPersistence;
    setPersistence(auth, persistence);
  }, [rememberMe]);

  const saveUserProfile = async (user, username) => {
    try {
      // Update user profile
      await updateProfile(user, { displayName: username });

      // Save to database
      await set(ref(database, `users/${user.uid}`), {
        email: user.email,
        username: username,
        rating: 400,
        joinedAt: Date.now(),
        matchHistory: {},
        problemsSolved: 0,
        medals: 0,
        friends: {},
      });

      // Save username mapping
      await set(ref(database, `usernames/${username}`), {
        uid: user.uid,
        email: user.email,
      });

      return true;
    } catch (error) {
      console.error("Error saving profile:", error);
      return false;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("❌ Passwords do not match.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Show username selection modal
      setTempUserData({ user: userCred.user, isGoogle: false });
      setShowUsernameModal(true);
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists
      const userSnapshot = await get(ref(database, `users/${user.uid}`));

      if (userSnapshot.exists()) {
        // User exists, redirect to landing
        navigate("/landing");
      } else {
        // New Google user, show username selection
        const suggestedUsername =
          user.displayName?.replace(/\s+/g, "").toLowerCase() ||
          user.email.split("@")[0];
        setTempUserData({ user, isGoogle: true });
        setUsernameInput(suggestedUsername);
        setShowUsernameModal(true);
      }
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setIsLoading(false);
    }
  };

  const handleUsernameSubmit = async (selectedUsername) => {
    if (!tempUserData) return;

    setIsLoading(true);
    const success = await saveUserProfile(tempUserData.user, selectedUsername);

    if (success) {
      if (!tempUserData.isGoogle) {
        await sendEmailVerification(tempUserData.user);
        setMessage(
          "✅ Registration successful! Check your email for verification."
        );
      }

      setTimeout(() => navigate("/landing"), 2000);
    } else {
      setMessage("❌ Error saving profile. Please try again.");
    }

    setShowUsernameModal(false);
    setTempUserData(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      <LiquidEtherBackground />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent mb-2">
              Join the Battle
            </h1>
            <p className="text-gray-400">Create your warrior account</p>
          </motion.div>

          {/* Registration Form */}
          <motion.form
            onSubmit={handleRegister}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <GamingInput
              icon="📧"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <GamingInput
              icon="🔒"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showPassword={showPassword}
              toggleShow={() => setShowPassword(!showPassword)}
            />

            <GamingInput
              icon="🔐"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              showPassword={showConfirm}
              toggleShow={() => setShowConfirm(!showConfirm)}
            />

            {/* Remember Me */}
            <motion.label
              className="flex items-center cursor-pointer group"
              whileHover={{ scale: 1.02 }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                  rememberMe ? "border-cyan-500 bg-cyan-500" : "border-gray-600"
                }`}
              >
                {rememberMe && <span className="text-white text-xs">✓</span>}
              </div>
              <span className="ml-3 text-gray-300 group-hover:text-white transition-colors">
                Remember me for 30 days
              </span>
            </motion.label>

            {/* Register Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold text-white hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-0 group-hover:opacity-20 transition-opacity" />
              {isLoading ? "Creating Account..." : "Enter the Arena"}
            </motion.button>

            {/* Google Sign Up */}
            <motion.button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
              className="w-full py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-3 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </motion.button>

            {/* Login Link */}
            <motion.p
              className="text-center text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
              >
                Login here
              </button>
            </motion.p>

            {/* Message */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-4 rounded-lg text-center ${
                    message.includes("✅")
                      ? "bg-green-900/50 border border-green-500"
                      : "bg-red-900/50 border border-red-500"
                  }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        </motion.div>
      </div>

      {/* Username Selection Modal */}
      <UsernameModal
        isOpen={showUsernameModal}
        onSubmit={handleUsernameSubmit}
        onClose={() => {
          setShowUsernameModal(false);
          setTempUserData(null);
          setIsLoading(false);
        }}
        initialUsername={username}
      />
    </div>
  );
}
