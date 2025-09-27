// src/pages/LoginPage.jsx
import { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, database } from "../firebase";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Same Liquid Ether Background as RegisterPage
const LiquidEtherBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900" />
      
      {/* Animated liquid orbs */}
      <div className="absolute inset-0">
        {/* Large flowing orbs */}
        <motion.div
          className="absolute w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, rgba(139, 92, 246, 0.1) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{
            x: ['-10%', '110%'],
            y: ['-10%', '60%', '-10%'],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          initial={{ x: '-10%', y: '50%' }}
        />
        
        <motion.div
          className="absolute w-80 h-80 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(6, 182, 212, 0.1) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
          animate={{
            x: ['110%', '-10%'],
            y: ['110%', '40%', '110%'],
            scale: [0.8, 1.3, 1, 0.8],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          initial={{ x: '110%', y: '20%' }}
        />
        
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 40%, transparent 70%)',
            filter: 'blur(50px)',
          }}
          animate={{
            x: ['50%', '20%', '80%', '50%'],
            y: ['-10%', '50%', '110%', '-10%'],
            scale: [1, 0.7, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          initial={{ x: '50%', y: '-10%' }}
        />
        
        <motion.div
          className="absolute w-72 h-72 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.1) 40%, transparent 70%)',
            filter: 'blur(45px)',
          }}
          animate={{
            x: ['80%', '10%', '90%', '80%'],
            y: ['80%', '10%', '90%', '80%'],
            scale: [1.1, 0.9, 1.2, 1.1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "linear"
          }}
          initial={{ x: '80%', y: '80%' }}
        />
        
        {/* Smaller floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full"
            style={{
              background: `radial-gradient(circle, hsla(${180 + i * 45}, 70%, 60%, 0.8) 0%, transparent 70%)`,
              filter: 'blur(2px)',
            }}
            animate={{
              x: ['-5%', '105%'],
              y: [(i * 12) + '%', ((i * 12) + 30) + '%', (i * 12) + '%'],
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              delay: i * 2,
              ease: "linear"
            }}
          />
        ))}
      </div>
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};

// Gaming Input Component
const GamingInput = ({ icon, type, placeholder, value, onChange, showPassword, toggleShow }) => (
  <motion.div 
    className="relative group"
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.2 }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative flex items-center">
      <div className="absolute left-4 z-10 text-gray-400 group-focus-within:text-cyan-400 transition-colors text-lg">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-black/30 border border-gray-600/50 rounded-lg px-12 py-4 text-white placeholder-gray-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300 backdrop-blur-sm"
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

// Forgot Password Modal
const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage("❌ Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("✅ Password reset email sent! Check your inbox.");
      setTimeout(() => {
        onClose();
        setEmail("");
        setMessage("");
      }, 3000);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setMessage("❌ No account found with this email address");
      } else {
        setMessage(`❌ ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="bg-black/60 border border-gray-600/50 rounded-xl p-8 max-w-md w-full backdrop-blur-md"
          >
            <h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Reset Password
            </h2>
            <p className="text-gray-400 mb-6">Enter your email to receive a reset link</p>
            
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none backdrop-blur-md"
                />
              </div>
              
              {message && (
                <div className={`p-3 rounded-lg text-sm mb-4 backdrop-blur-sm ${
                  message.includes("✅") 
                    ? "bg-green-900/30 border border-green-500/50 text-green-200" 
                    : "bg-red-900/30 border border-red-500/50 text-red-200"
                }`}>
                  {message}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-colors backdrop-blur-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-700 hover:to-cyan-700 transition-all"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const navigate = useNavigate();

  // Set persistence based on remember me
  useEffect(() => {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    setPersistence(auth, persistence);
  }, [rememberMe]);

  // Auto redirect if already logged in
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) navigate("/landing");
    });
    return () => unsub();
  }, [navigate]);

  const resolveEmailFromUsername = async (input) => {
    // Check if input is already an email
    if (input.includes("@")) {
      return input;
    }
    
    // Try to resolve username to email
    try {
      const snap = await get(ref(database, `usernames/${input}`));
      if (snap.exists()) {
        return snap.val().email;
      } else {
        throw new Error("Username not found");
      }
    } catch (error) {
      throw new Error("Invalid username or email");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      // Resolve email from username if needed
      const email = await resolveEmailFromUsername(emailOrUsername);
      
      // Sign in with email and password
      await signInWithEmailAndPassword(auth, email, password);
      
      // Navigate to landing page
      navigate("/landing");
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setMessage("❌ No account found with this email/username");
      } else if (error.code === 'auth/wrong-password') {
        setMessage("❌ Incorrect password");
      } else if (error.code === 'auth/invalid-email') {
        setMessage("❌ Invalid email format");
      } else if (error.code === 'auth/too-many-requests') {
        setMessage("❌ Too many failed attempts. Try again later.");
      } else {
        setMessage(`❌ ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      await signInWithPopup(auth, provider);
      navigate("/landing");
    } catch (error) {
      setMessage(`❌ ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden relative">
      {/* Liquid Ether Background */}
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
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-300 text-lg">Enter the battlefield</p>
          </motion.div>

          {/* Login Form */}
          <motion.form
            onSubmit={handleLogin}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <GamingInput
              icon="👤"
              type="text"
              placeholder="Email or Username"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
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

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
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
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                  rememberMe ? 'border-cyan-500 bg-cyan-500' : 'border-gray-600'
                }`}>
                  {rememberMe && <span className="text-white text-xs">✓</span>}
                </div>
                <span className="ml-3 text-gray-300 group-hover:text-white transition-colors text-sm">
                  Remember me
                </span>
              </motion.label>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold text-white hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 relative overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-cyan-600 opacity-0 group-hover:opacity-20 transition-opacity" />
              {isLoading ? "Logging In..." : "Enter the Arena"}
            </motion.button>

            {/* Google Login */}
            <motion.button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-4 bg-white/10 border border-gray-500/50 text-white rounded-lg font-semibold hover:bg-white/20 disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-3 group backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </motion.button>

            {/* Register Link */}
            <motion.p
              className="text-center text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              New to the battlefield?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-cyan-400 hover:text-cyan-300 transition-colors underline"
              >
                Create Account
              </button>
            </motion.p>

            {/* Message */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-4 rounded-lg text-center backdrop-blur-sm ${
                    message.includes("✅") 
                      ? "bg-green-900/30 border border-green-500/50" 
                      : "bg-red-900/30 border border-red-500/50"
                  }`}
                >
                  {message}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </div>
  );
}
