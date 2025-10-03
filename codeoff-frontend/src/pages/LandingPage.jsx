// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, database } from "../firebase";
import { signOut } from "firebase/auth";
import {
  ref,
  get,
  set,
  onValue,
  push,
  serverTimestamp,
  onChildAdded,
} from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { 
  listenForChallenges, 
  sendChallenge, 
  acceptChallenge,
  declineChallenge, 
  joinQueue 
} from "../api/matchmaking";

// Liquid Ether Background (Same as RegisterPage/LoginPage)
const LiquidEtherBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900" />
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
        
        {/* More animated orbs */}
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
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};

// ReactBits Text Trail Effect Component (Fixed for mobile)
const TextTrail = ({ text, className = "" }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      return () => container.removeEventListener("mousemove", handleMouseMove);
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-green-400 bg-clip-text text-transparent leading-tight">
        {text.split("").map((char, index) => (
          <motion.span
            key={index}
            className="inline-block"
            animate={{
              x: Math.sin((mousePosition.x + index * 10) * 0.01) * 2,
              y: Math.cos((mousePosition.y + index * 10) * 0.01) * 2,
              scale: 1 + Math.sin((mousePosition.x + mousePosition.y + index * 20) * 0.01) * 0.1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 0.8,
            }}
            style={{
              textShadow: `${Math.sin((mousePosition.x + index * 15) * 0.01) * 3}px ${Math.cos((mousePosition.y + index * 15) * 0.01) * 3}px 10px rgba(139, 92, 246, 0.5)`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </h1>
    </div>
  );
};

// Profile Card Component (ReactBits Style)
const ProfileCard = ({ user, onClick, isOwn = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative group cursor-pointer"
      whileHover={{ y: -10, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-xl blur opacity-0 group-hover:opacity-75 transition duration-300" />
      
      <div className="relative bg-black/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md overflow-hidden">
        {/* Animated background particles */}
        <AnimatePresence>
          {isHovered && (
            <>
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-cyan-400 rounded-full"
                  initial={{ 
                    x: Math.random() * 200, 
                    y: Math.random() * 150, 
                    opacity: 0 
                  }}
                  animate={{ 
                    y: -50, 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0] 
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 2, 
                    delay: i * 0.2,
                    repeat: Infinity 
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
            {user.username?.charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{user.username}</h3>
            <p className="text-sm text-gray-400">Rating: {user.rating || 400}</p>
          </div>
          {isOwn && (
            <div className="ml-auto">
              <span className="px-2 py-1 bg-green-600/20 border border-green-500/50 rounded text-green-400 text-xs">
                You
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{user.problemsSolved || 0}</div>
            <div className="text-xs text-gray-400">Problems</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{user.medals || 0}</div>
            <div className="text-xs text-gray-400">Medals</div>
          </div>
        </div>

        {/* Join Date */}
        <div className="text-xs text-gray-500">
          Joined: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Recently'}
        </div>

        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
          initial={false}
        />
      </div>
    </motion.div>
  );
};

// Friends List Modal
const FriendsModal = ({ isOpen, onClose, friends = [], onViewProfile }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredFriends = friends.filter(friend => 
    friend.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            className="bg-black/60 border border-gray-600/50 rounded-xl p-8 max-w-2xl w-full max-h-[80vh] overflow-hidden backdrop-blur-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Friends Arena
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search friends..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none backdrop-blur-md"
              />
            </div>

            {/* Friends Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {filteredFriends.length > 0 ? (
                filteredFriends.map((friend, index) => (
                  <ProfileCard
                    key={friend.uid || index}
                    user={friend}
                    onClick={() => onViewProfile(friend)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-gray-400">
                    {searchTerm ? "No friends found matching your search" : "No friends yet. Start battling to make connections!"}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// User Profile Modal
const UserProfileModal = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  const matchHistory = Object.values(user.matchHistory || {}).slice(-5); // Last 5 matches

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
            className="bg-black/60 border border-gray-600/50 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-hidden backdrop-blur-md"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Warrior Profile
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Main Profile Info */}
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-4xl font-bold text-white">
                  {user.username?.charAt(0).toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{user.username}</h3>
                  <p className="text-gray-400">{user.email}</p>
                  <p className="text-sm text-gray-500">
                    Joined: {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Recently'}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-purple-600/20 border border-purple-500/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{user.rating || 400}</div>
                  <div className="text-sm text-gray-400">Rating</div>
                </div>
                <div className="bg-cyan-600/20 border border-cyan-500/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{user.problemsSolved || 0}</div>
                  <div className="text-sm text-gray-400">Problems</div>
                </div>
                <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{user.medals || 0}</div>
                  <div className="text-sm text-gray-400">Medals</div>
                </div>
                <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{matchHistory.length}</div>
                  <div className="text-sm text-gray-400">Battles</div>
                </div>
              </div>

              {/* Match History */}
              <div>
                <h4 className="text-xl font-bold text-white mb-4">Recent Battles</h4>
                <div className="space-y-3">
                  {matchHistory.length > 0 ? (
                    matchHistory.map((match, index) => (
                      <div key={index} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">vs {match.opponent || 'Unknown'}</div>
                          <div className="text-sm text-gray-400">
                            {match.date ? new Date(match.date).toLocaleDateString() : 'Recent'}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded text-sm font-medium ${
                          match.result === 'win' 
                            ? 'bg-green-600/20 border border-green-500/50 text-green-400'
                            : match.result === 'loss'
                            ? 'bg-red-600/20 border border-red-500/50 text-red-400'
                            : 'bg-yellow-600/20 border border-yellow-500/50 text-yellow-400'
                        }`}>
                          {match.result?.toUpperCase() || 'DRAW'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-4xl mb-2">⚔️</div>
                      <p>No battles fought yet. Ready for your first challenge?</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function LandingPage() {
  const [challenges, setChallenges] = useState([]);
  const [friendId, setFriendId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [message, setMessage] = useState("");
  const [quickMatchCleanup, setQuickMatchCleanup] = useState(null);
  
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Authentication guard
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  // Load user profile
  useEffect(() => {
    if (!user) return;
    
    const loadUserProfile = async () => {
      try {
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setUserProfile(snapshot.val());
        } else {
          // Create default profile if doesn't exist
          const defaultProfile = {
            email: user.email,
            username: user.displayName || user.email.split('@')[0],
            rating: 400,
            joinedAt: Date.now(),
            matchHistory: {},
            problemsSolved: 0,
            medals: 0,
            friends: {},
          };
          await set(userRef, defaultProfile);
          setUserProfile(defaultProfile);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setMessage("❌ Error loading profile");
        setTimeout(() => setMessage(""), 3000);
      }
    };

    loadUserProfile();
  }, [user]);

  // Listen for challenges with error handling
  useEffect(() => {
    if (!user) return;
    
    try {
      const unsubscribe = listenForChallenges((newChallenges) => {
        setChallenges(newChallenges);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error("Error listening for challenges:", error);
      setMessage("❌ Error loading challenges");
      setTimeout(() => setMessage(""), 3000);
    }
  }, [user]);

  // Auto-redirect to battle if room exists
  useEffect(() => {
    if (!user) return;
    
    const roomsRef = ref(database, "rooms/");
    const unsubscribe = onChildAdded(roomsRef, (snapshot) => {
      const room = snapshot.val();
      const roomId = snapshot.key;
      
      if (room?.players?.[user.uid] && !room.entered) {
        // Mark room as entered
        set(ref(database, `rooms/${roomId}/entered`), true);
        navigate(`/battle/${roomId}`);
      }
    });
    
    return () => unsubscribe();
  }, [user, navigate]);

  const handleSendChallenge = async () => {
    if (!friendId.trim()) {
      setMessage("❌ Please enter a friend's email or username");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    
    setIsLoading(true);
    try {
      await sendChallenge(friendId);
      setFriendId("");
      setMessage("✅ Challenge sent successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error sending challenge:", error);
      setMessage(`❌ ${error.message || 'Failed to send challenge'}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptChallenge = async (challengeId, challengerEmail) => {
    try {
      setMessage("⚔️ Accepting challenge...");
      const roomId = await acceptChallenge(challengeId, challengerEmail);
      if (roomId) {
        navigate(`/battle/${roomId}`);
      }
    } catch (error) {
      console.error("Error accepting challenge:", error);
      setMessage(`❌ ${error.message || 'Failed to accept challenge'}`);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handleDeclineChallenge = async (challengeId) => {
    try {
      await declineChallenge(challengeId);
      setMessage("Challenge declined");
      setTimeout(() => setMessage(""), 3000);
      // Remove from local state
      setChallenges(challenges.filter(c => c.id !== challengeId));
    } catch (error) {
      console.error("Error declining challenge:", error);
      setMessage(`❌ Failed to decline challenge`);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleQuickMatch = () => {
    setIsLoading(true);
    setMessage("🔍 Finding opponent...");
    
    const cleanup = joinQueue(
      (match) => {
        setIsLoading(false);
        setMessage("");
        setQuickMatchCleanup(null);
        navigate(`/battle/${match.roomId}`);
      },
      (seconds) => {
        setMessage(`🔍 Finding opponent... ${seconds}s`);
      },
      (timeout) => {
        setIsLoading(false);
        setMessage("");
        setQuickMatchCleanup(null);
        navigate(`/battle/${timeout.roomId}`);
      }
    );

    setQuickMatchCleanup(() => cleanup);

    // Auto cancel after 30 seconds
    setTimeout(() => {
      if (isLoading) {
        cleanup();
        setIsLoading(false);
        setQuickMatchCleanup(null);
        setMessage("❌ Matchmaking timed out. Try again!");
        setTimeout(() => setMessage(""), 3000);
      }
    }, 30000);
  };

  const handleCancelQuickMatch = () => {
    if (quickMatchCleanup) {
      quickMatchCleanup();
      setQuickMatchCleanup(null);
    }
    setIsLoading(false);
    setMessage("❌ Matchmaking cancelled");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleLogout = async () => {
    try {
      // Cleanup any ongoing matchmaking
      if (quickMatchCleanup) {
        quickMatchCleanup();
      }
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleViewProfile = (profileUser) => {
    setSelectedUser(profileUser);
    setShowProfile(true);
    setShowFriends(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-white">Loading warrior profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white overflow-hidden relative">
      {/* Liquid Ether Background */}
      <LiquidEtherBackground />
      
      <div className="relative z-10 min-h-screen p-4 lg:p-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4"
        >
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            CodeOff Arena
          </h2>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setShowFriends(true)}
              className="px-3 py-2 text-sm bg-purple-600/20 border border-purple-500/50 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              👥 Friends
            </button>
            <button
              onClick={() => handleViewProfile(userProfile)}
              className="px-3 py-2 text-sm bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors"
            >
              👤 Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </motion.header>

        {/* Hero Section with Text Trail */}
        <motion.section
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 lg:mb-12"
        >
          <TextTrail 
            text={`Get Ready to Fight, ${userProfile.username}!`}
            className="mb-4"
          />
          <motion.p 
            className="text-lg lg:text-xl text-gray-300 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Challenge warriors, solve problems, claim victory
          </motion.p>
        </motion.section>

        {/* Message */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-6 p-4 rounded-lg text-center backdrop-blur-sm max-w-2xl mx-auto ${
                message.includes("✅") 
                  ? "bg-green-900/30 border border-green-500/50" 
                  : message.includes("❌")
                  ? "bg-red-900/30 border border-red-500/50"
                  : "bg-blue-900/30 border border-blue-500/50"
              }`}
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Profile Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ProfileCard 
              user={userProfile} 
              onClick={() => handleViewProfile(userProfile)}
              isOwn={true}
            />
          </motion.div>

          {/* Center Column - Battle Actions */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            {/* Quick Match */}
            <div className="bg-black/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md">
              <h3 className="text-2xl font-bold text-white mb-4">⚡ Quick Battle</h3>
              <p className="text-gray-400 mb-6">Jump into a random match against another warrior</p>
              <div className="flex gap-3">
                <motion.button
                  onClick={handleQuickMatch}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg font-semibold text-white hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isLoading ? "Finding..." : "Enter Arena"}
                </motion.button>
                {isLoading && (
                  <button
                    onClick={handleCancelQuickMatch}
                    className="px-4 py-4 bg-red-600/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-600/30 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Challenge Friend */}
            <div className="bg-black/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md">
              <h3 className="text-2xl font-bold text-white mb-4">⚔️ Challenge Friend</h3>
              <p className="text-gray-400 mb-4">Send a direct challenge to a specific warrior</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Friend's email or username"
                  value={friendId}
                  onChange={(e) => setFriendId(e.target.value)}
                  className="flex-1 bg-black/30 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChallenge()}
                />
                <motion.button
                  onClick={handleSendChallenge}
                  disabled={isLoading || !friendId.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 rounded-lg font-semibold text-white hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Challenge
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Incoming Challenges */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-black/40 border border-gray-700/50 rounded-xl p-6 backdrop-blur-md">
              <h3 className="text-2xl font-bold text-white mb-4">🔥 Incoming Challenges</h3>
              
              {challenges.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {challenges.map((challenge) => (
                    <motion.div
                      key={challenge.id}
                      className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">{challenge.fromUsername || challenge.from}</div>
                          <div className="text-sm text-gray-400">wants to battle</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptChallenge(challenge.id, challenge.from)}
                            className="px-3 py-1 bg-green-600/20 border border-green-500/50 text-green-400 rounded hover:bg-green-600/30 transition-colors text-sm"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => handleDeclineChallenge(challenge.id)}
                            className="px-3 py-1 bg-red-600/20 border border-red-500/50 text-red-400 rounded hover:bg-red-600/30 transition-colors text-sm"
                          >
                            ✗ Decline
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">⚔️</div>
                  <p>No incoming challenges</p>
                  <p className="text-sm">Challenge friends or join quick match!</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <FriendsModal
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        friends={friends}
        onViewProfile={handleViewProfile}
      />
      
      <UserProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={selectedUser}
      />
    </div>
  );
}
