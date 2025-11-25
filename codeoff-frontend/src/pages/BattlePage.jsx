// src/pages/BattlePage.jsx
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { runCode, LANGUAGES, AudioChat } from "../api/codeoffApi";
import { useParams, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  push,
  serverTimestamp,
  remove,
} from "firebase/database";

export default function BattlePage() {
  // --- Audio Chat Control States ---
  const [audioChat, setAudioChat] = useState(null);
  const [isAudioConnected, setIsAudioConnected] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [audioConnectionState, setAudioConnectionState] =
    useState("disconnected");
  const [remoteAudioElement, setRemoteAudioElement] = useState(null);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const navigate = useNavigate();

  const [timer, setTimer] = useState(900); // 15 minutes
  const params = useParams();
  const roomId = params.roomId || params.id; // Handle both :roomId and :id params
  const auth = getAuth();
  const db = getDatabase();

  // Try to extract roomId from URL path as fallback
  const pathSegments = window.location.pathname.split("/");
  const fallbackRoomId = pathSegments[pathSegments.length - 1];
  const finalRoomId = roomId || fallbackRoomId;

  // auth-aware user state
  const [user, setUser] = useState(auth.currentUser);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, [auth]);

  const myUid = user?.uid ?? null;
  const myEmail = user?.email ?? null;

  // dynamic usernames
  const [myName, setMyName] = useState("You");
  const [oppName, setOppName] = useState("Opponent");
  const [oppUid, setOppUid] = useState(null);

  // Language selection state
  const [selectedLanguage, setSelectedLanguage] = useState(71); // Default to Python 3
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // LocalStorage helpers (room-scoped)
  const getLS = (key, fallback = "") =>
    typeof window !== "undefined"
      ? localStorage.getItem(`${key}-${roomId}`) || fallback
      : fallback;
  const setLS = (key, value) =>
    typeof window !== "undefined" &&
    localStorage.setItem(`${key}-${roomId}`, value);

  // IDE states (my / opponent)
  const [myCode, setMyCode] = useState(() => getLS("myCode"));
  const [myInput, setMyInput] = useState(getLS("myInput", "Hello World"));
  const [myOutput, setMyOutput] = useState("");
  const [myError, setMyError] = useState("");
  const [myLoading, setMyLoading] = useState(false);

  const [oppCode, setOppCode] = useState("");
  const [oppInput, setOppInput] = useState("");
  const [oppOutput, setOppOutput] = useState("");
  const [oppError, setOppError] = useState("");
  const [oppLanguage, setOppLanguage] = useState(71); // Opponent's language

  // Get current language info
  const currentLanguage =
    LANGUAGES.find((lang) => lang.id === selectedLanguage) ||
    LANGUAGES.find((lang) => lang.id === 71);
  const oppCurrentLanguage =
    LANGUAGES.find((lang) => lang.id === oppLanguage) ||
    LANGUAGES.find((lang) => lang.id === 71);

  // Load language from localStorage on component mount
  useEffect(() => {
    const savedLanguage = getLS("selectedLanguage", "71");
    if (savedLanguage) {
      setSelectedLanguage(parseInt(savedLanguage));
    }
  }, [roomId]);

  // Handle language change
  const handleLanguageChange = (languageId) => {
    setSelectedLanguage(languageId);
    setLS("selectedLanguage", languageId.toString());
    setShowLanguageDropdown(false);

    // Sync language change to Firebase
    if (myUid && finalRoomId) {
      const submissionRef = ref(
        db,
        `rooms/${finalRoomId}/submissions/${myUid}`
      );
      set(submissionRef, {
        code: myCode,
        input: myInput,
        language: languageId,
        timestamp: Date.now(),
        userId: myUid,
      });
    }
  };

  // Get Monaco editor language from file extension
  const getMonacoLanguage = (extension) => {
    const languageMap = {
      py: "python",
      js: "javascript",
      ts: "typescript",
      cpp: "cpp",
      c: "c",
      java: "java",
      cs: "csharp",
      php: "php",
      rb: "ruby",
      go: "go",
      rs: "rust",
      kt: "kotlin",
      swift: "swift",
      scala: "scala",
      r: "r",
      sql: "sql",
      sh: "shell",
      pl: "perl",
      lua: "lua",
      hs: "haskell",
      ml: "fsharp",
      fs: "fsharp",
      clj: "clojure",
      pas: "pascal",
      asm: "asm",
      vb: "vb",
    };
    return languageMap[extension] || "text";
  };

  // Timer logic
  useEffect(() => {
    const t = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const formatTime = (sec) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  // persist to localStorage when my code/input change
  useEffect(() => setLS("myCode", myCode), [myCode, roomId]);
  useEffect(() => setLS("myInput", myInput), [myInput, roomId]);

  // --- Fetch usernames and set up players
  useEffect(() => {
    if (!finalRoomId || !myUid) {
      console.log("Missing finalRoomId or myUid:", { finalRoomId, myUid });
      return;
    }

    const fetchUsernamesAndSetupPlayers = async () => {
      try {
        // Get room players
        const roomRef = ref(db, `rooms/${finalRoomId}/players`);
        const roomSnap = await get(roomRef);

        if (!roomSnap.exists()) {
          console.log("Room not found or no players");
          return;
        }

        const playersObj = roomSnap.val();
        const playerUids = Object.keys(playersObj);

        // Find opponent UID
        const foundOppUid = playerUids.find((uid) => uid !== myUid);

        if (foundOppUid) {
          setOppUid(foundOppUid);
        }

        // Get all usernames mapping
        const usernamesRef = ref(db, "usernames");
        const usernamesSnap = await get(usernamesRef);

        if (usernamesSnap.exists()) {
          const usernamesData = usernamesSnap.val();

          // Find my username
          const myUsername = Object.keys(usernamesData).find(
            (username) => usernamesData[username].uid === myUid
          );

          if (myUsername) {
            setMyName(myUsername);
          }

          // Find opponent username
          if (foundOppUid) {
            const oppUsername = Object.keys(usernamesData).find(
              (username) => usernamesData[username].uid === foundOppUid
            );

            if (oppUsername) {
              setOppName(oppUsername);
            }
          }
        } else {
          console.log("No usernames data found");
        }
      } catch (error) {
        console.error("Error fetching usernames:", error);
      }
    };

    fetchUsernamesAndSetupPlayers();
  }, [db, finalRoomId, myUid]);

  // Also listen for changes in the room players (in case someone joins later)
  useEffect(() => {
    if (!finalRoomId || !myUid) return;

    const playersRef = ref(db, `rooms/${finalRoomId}/players`);
    const unsubscribe = onValue(playersRef, async (snapshot) => {
      if (!snapshot.exists()) return;

      const playersObj = snapshot.val();
      const playerUids = Object.keys(playersObj);

      const foundOppUid = playerUids.find((uid) => uid !== myUid);
      if (foundOppUid && foundOppUid !== oppUid) {
        setOppUid(foundOppUid);

        // Fetch opponent's username
        const usernamesRef = ref(db, "usernames");
        const usernamesSnap = await get(usernamesRef);

        if (usernamesSnap.exists()) {
          const usernamesData = usernamesSnap.val();
          const oppUsername = Object.keys(usernamesData).find(
            (username) => usernamesData[username].uid === foundOppUid
          );

          if (oppUsername) {
            setOppName(oppUsername);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [db, finalRoomId, myUid, oppUid]);

  // --- Listen for code changes in the room
  useEffect(() => {
    if (!finalRoomId) return;

    const roomCodeRef = ref(db, `rooms/${finalRoomId}/code`);

    const unsub = onValue(roomCodeRef, (snapshot) => {
      if (snapshot.exists()) {
        const code = snapshot.val();
        // You can sync this if needed
      }
    });

    return () => unsub();
  }, [finalRoomId]);

  // --- Listen for submissions and sync opponent's IDE
  useEffect(() => {
    if (!finalRoomId || !oppUid) return;

    const subsRef = ref(db, `rooms/${finalRoomId}/submissions`);

    const unsub = onValue(subsRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const submissions = snapshot.val();

      // Look for opponent's latest submission
      if (submissions[oppUid]) {
        const oppSubmission = submissions[oppUid];

        setOppCode(oppSubmission.code || "");
        setOppInput(oppSubmission.input || "");
        setOppOutput(oppSubmission.stdout || "");
        setOppError(oppSubmission.stderr || "");
        setOppLanguage(oppSubmission.language || 71); // Set opponent's language
      }
    });

    return () => unsub();
  }, [finalRoomId, oppUid]);

  // Update room code when my code changes (for real-time sync)
  useEffect(() => {
    if (!finalRoomId || !myUid || !myCode) return;

    const updateRoomCode = async () => {
      try {
        const roomCodeRef = ref(db, `rooms/${finalRoomId}/code`);
        await set(roomCodeRef, myCode);
      } catch (error) {
        console.error("Error updating room code:", error);
      }
    };

    // Debounce the update to avoid too many writes
    const timeoutId = setTimeout(updateRoomCode, 1000);
    return () => clearTimeout(timeoutId);
  }, [myCode, finalRoomId, myUid]);

  // Run code and push submission to Firebase
  const handleRun = useCallback(async () => {
    console.log("🚀 handleRun called with:", {
      myUid,
      finalRoomId,
      hasCode: !!myCode,
    });

    console.log("🔍 About to send:", {
      code: myCode,
      input: myInput,
      language: selectedLanguage,
      length: myInput.length,
    });

    if (!myUid) {
      console.error("No user ID available");
      setMyError("Please log in to run code");
      return;
    }

    if (!finalRoomId) {
      console.error("No room ID available");
      setMyError("Room ID not found. Please rejoin the room.");
      return;
    }

    if (!myCode.trim()) {
      console.error("No code to run");
      setMyError("Please write some code before running");
      return;
    }

    setMyLoading(true);
    setMyOutput("");
    setMyError("");

    try {
      const res = await runCode(myCode, myInput, selectedLanguage);

      if (res.stderr) {
        setMyError(res.stderr);
      } else if (res.stdout) {
        setMyOutput(res.stdout.trim());
      } else {
        setMyOutput("(no output)");
      }

      // Push submission to Firebase for opponent to see
      const submissionRef = ref(
        db,
        `rooms/${finalRoomId}/submissions/${myUid}`
      );
      const submissionData = {
        code: myCode,
        input: myInput,
        stdout: res.stdout || "",
        stderr: res.stderr || "",
        language: selectedLanguage, // Include language in submission
        timestamp: Date.now(),
        userId: myUid,
      };

      await set(submissionRef, submissionData);
    } catch (err) {
      console.error("Code execution error:", err);
      setMyError("Execution error: " + err.message);
    } finally {
      setMyLoading(false);
    }
  }, [db, myCode, myInput, selectedLanguage, myUid, finalRoomId]);

  // Add this state to track if we're cleaning up
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // --- Audio Chat Initialization/Auto-connect ---
  useEffect(() => {
    if (finalRoomId && myUid && oppUid && !audioChat && db && !isCleaningUp) {
      console.log("🎵 Initializing audio chat");
      const chat = new AudioChat(db, finalRoomId, myUid);

      // Enhanced connection state callback
      chat.onConnectionStateChange = (state) => {
        console.log("🔗 Connection state changed to:", state);
        setAudioConnectionState(state);

        // Enable buttons for connected, connecting, or when we have streams
        const shouldEnable =
          state === "connected" || state === "connecting" || chat.remoteStream;
        setIsAudioConnected(shouldEnable);

        setDebugConnectionInfo({
          connectionState: state,
          hasRemoteStream: !!chat.remoteStream,
          hasLocalStream: !!chat.localStream,
          timestamp: new Date().toLocaleTimeString(),
        });
      };

      chat.onRemoteStream = (stream) => {
        console.log("🔊 Remote audio stream received - forcing button enable");
        console.log("🔊 Remote stream details:", {
          id: stream.id,
          active: stream.active,
          audioTracks: stream.getAudioTracks().length,
          audioTrackEnabled: stream.getAudioTracks()[0]?.enabled,
        });

        let audio = remoteAudioElement;
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audio.controls = true; // Add controls for debugging
          setRemoteAudioElement(audio);
        }

        audio.srcObject = stream;
        audio.muted = !isSpeakerOn;

        // Debug: Log when audio starts playing
        audio.onloadedmetadata = () => {
          console.log("🔊 Audio metadata loaded");
          audio
            .play()
            .then(() => {
              console.log("🔊 Audio playback started");
            })
            .catch((err) => {
              console.error("❌ Audio playback failed:", err);
            });
        };

        // Force enable audio controls when we have remote stream
        setIsAudioConnected(true);
        setAudioConnectionState("connected");
      };

      chat.onError = (error) => {
        console.error("❌ Audio chat error:", error);
        setMyError("Audio error: " + error);
      };

      setAudioChat(chat);
    }
  }, [
    finalRoomId,
    myUid,
    oppUid,
    db,
    remoteAudioElement,
    isSpeakerOn,
    audioChat,
  ]);

  // AUTO-CONNECT audio call once both users present
  useEffect(() => {
    if (
      audioChat &&
      myUid &&
      oppUid &&
      !isAudioConnected &&
      audioConnectionState === "disconnected"
    ) {
      // Initiator is lexicographically lowest UID
      const isInitiator = myUid < oppUid;
      audioChat.startCall(isInitiator);
    }
    // eslint-disable-next-line
  }, [audioChat, myUid, oppUid, isAudioConnected, audioConnectionState]);

  // Speaker toggle handler
  const handleSpeakerToggle = () => {
    setIsSpeakerOn((prev) => {
      const next = !prev;
      if (remoteAudioElement) remoteAudioElement.muted = !next;
      return next;
    });
  };

  // Microphone toggle handler
  const handleMicToggle = () => {
    if (audioChat) {
      const muted = audioChat.toggleMute();
      setIsMicMuted(muted);
    }
  };

  const [debugConnectionInfo, setDebugConnectionInfo] = useState({});

  // Add this useEffect for network testing
  useEffect(() => {
    if (audioChat && isAudioConnected) {
      // Test if we can actually reach STUN servers
      const testConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      testConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(
            "✅ STUN server reachable, got candidate:",
            event.candidate.type
          );
        }
      };

      testConnection.createDataChannel("test");
      testConnection.createOffer().then((offer) => {
        testConnection.setLocalDescription(offer);
      });

      setTimeout(() => testConnection.close(), 5000);
    }
  }, [audioChat, isAudioConnected]);

  const handleEndBattle = async (action) => {
    const actionText = action === "draw" ? "declare a draw" : "resign";
    const confirmText = `Are you sure you want to ${actionText}? This will end the battle for both players.`;

    if (!confirm(confirmText)) {
      return;
    }

    try {
      console.log(
        `${action === "draw" ? "🤝" : "🏳️"} ${
          actionText.charAt(0).toUpperCase() + actionText.slice(1)
        }ing from battle...`
      );

      // 1. End audio call first and prevent reinitialization
      if (audioChat) {
        await audioChat.endCall();
        setAudioChat(null);
        setIsAudioConnected(false);
        setAudioConnectionState("disconnected");
      }

      // 2. Set battle end status in Firebase for other player to see
      if (finalRoomId && myUid) {
        const statusData = {
          ended: true,
          endedBy: myUid,
          endedAt: serverTimestamp(),
          reason: action, // "draw" or "resign"
          winner: action === "draw" ? "draw" : oppUid || "opponent",
        };

        await set(ref(db, `rooms/${finalRoomId}/status`), statusData);
        console.log(`📢 Battle ${action} status sent to opponent`);

        // 3. Clean up room data immediately (no delay needed)
        await cleanupRoom(finalRoomId);

        // 4. Navigate back to landing page
        console.log("🏠 Redirecting to landing page...");
        navigate("/landing");
      } else {
        // If no room data, just navigate back
        navigate("/landing");
      }
    } catch (error) {
      console.error(`❌ Error during ${action}:`, error);
      // Even if cleanup fails, still navigate back
      navigate("/landing");
    }
  };

  const cleanupRoom = async (roomId) => {
    try {
      console.log("🧹 Cleaning up room data...");
      setIsCleaningUp(true); // Prevent audio reinitialization

      // Remove all room-related data
      const roomRef = ref(db, `rooms/${roomId}`);
      await remove(roomRef);

      console.log("✅ Room data cleaned up successfully");
    } catch (error) {
      console.error("❌ Error cleaning up room:", error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Battle end detection with proper cleanup
  useEffect(() => {
    if (!finalRoomId) return;

    // Listen for battle end status (draw/resign)
    const statusRef = ref(db, `rooms/${finalRoomId}/status`);
    const unsubscribe = onValue(statusRef, async (snapshot) => {
      if (snapshot.exists()) {
        const status = snapshot.val();

        if (status.ended && status.endedBy !== myUid) {
          // Opponent ended the battle
          const action = status.reason;

          // Stop listening immediately to prevent repeated alerts
          unsubscribe();

          console.log(
            `${action === "draw" ? "🤝" : "🏳️"} Opponent ${
              action === "draw" ? "declared draw" : "resigned"
            }`
          );

          // End audio call
          if (audioChat) {
            await audioChat.endCall();
            setAudioChat(null);
            setIsAudioConnected(false);
            setAudioConnectionState("disconnected");
          }

          // Show appropriate message
          const message =
            action === "draw"
              ? `${oppName} declared a draw. Battle ended!`
              : `${oppName} resigned. You win!`;

          alert(message);

          // Navigate immediately without delay
          console.log("🏠 Redirecting to landing page...");
          navigate("/landing");
        }
      }
    });

    return () => unsubscribe();
  }, [finalRoomId, myUid, oppName, navigate, audioChat]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white p-4 space-y-4 font-mono">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-400" />
          <span className="text-lg font-bold">
            Room: {finalRoomId || "Loading..."}
          </span>
        </div>
        <div className="flex gap-3 justify-center">
          {/* Speaker Toggle */}
          <button
            onClick={handleSpeakerToggle}
            disabled={!isAudioConnected}
            className={`px-3 py-1 rounded ${
              isSpeakerOn
                ? "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-400/60"
                : "bg-gray-700 hover:bg-gray-800"
            } hover:scale-105 hover:shadow-lg transition-all ${
              !isAudioConnected
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            title={isSpeakerOn ? "Turn Speaker OFF" : "Turn Speaker ON"}
          >
            {isSpeakerOn ? "🔊" : "🔊❌"}
          </button>
          {/* Microphone Toggle */}
          <button
            onClick={handleMicToggle}
            disabled={!isAudioConnected}
            className={`px-3 py-1 rounded ${
              isMicMuted
                ? "bg-red-600 hover:bg-red-700 hover:shadow-red-400/60"
                : "bg-green-600 hover:bg-green-700 hover:shadow-green-400/60"
            } hover:scale-105 hover:shadow-lg transition-all ${
              !isAudioConnected
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
            title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {isMicMuted ? "🎤❌" : "🎤"}
          </button>
          {/* Other Control Buttons */}
          {/* Replace your current Draw/Resign buttons with this: */}
          <button
            onClick={() => handleEndBattle("draw")}
            className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-700 hover:scale-105 hover:shadow-lg transition-all hover:shadow-yellow-400/60 cursor-pointer"
            title="Declare draw and end the battle"
          >
            🤝 Draw
          </button>
          <button
            onClick={() => handleEndBattle("resign")}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 hover:scale-105 hover:shadow-lg transition-all hover:shadow-red-400/60 cursor-pointer"
            title="Resign and end the battle"
          >
            🏳️ Resign
          </button>
        </div>
      </div>
      {/* Audio Status Indicator */}
      <div className="text-center">
        <div
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
            isAudioConnected
              ? "bg-green-900 border border-green-600"
              : audioConnectionState === "connecting"
              ? "bg-yellow-900 border border-yellow-600"
              : "bg-gray-800 border border-gray-600"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isAudioConnected
                ? "bg-green-400 animate-pulse"
                : audioConnectionState === "connecting"
                ? "bg-yellow-400 animate-pulse"
                : "bg-gray-400"
            }`}
          />
          <span className="text-sm">
            Audio:{" "}
            {isAudioConnected
              ? "Connected"
              : audioConnectionState === "connecting"
              ? "Connecting..."
              : "Disconnected"}
            {isSpeakerOn ? "" : " (Speaker OFF)"}
            {isMicMuted && isAudioConnected ? " (Mic Muted)" : ""}
          </span>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[myName, oppName].map((player, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className="bg-gray-800 p-4 rounded-lg shadow relative border border-gray-700 hover:border-cyan-400 transition-all"
          >
            <div className="flex justify-between mb-2">
              <span className="font-bold">
                {player}
                {i === 0 ? " (You)" : ""}
              </span>
              <span className="text-sm text-gray-400">
                Rating: {1300 + i * 150}
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded overflow-hidden">
              <motion.div
                className={`h-full rounded ${
                  i === 0 ? "bg-pink-500" : "bg-blue-500"
                } shadow-lg`}
                style={{ width: `${80 - i * 30}%` }}
                animate={{ width: `${80 - i * 30}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
      {/* Timer */}
      <motion.div
        animate={{
          color: timer <= 60 ? "#ff4d4d" : timer <= 300 ? "#ffb347" : "#00ffcc",
          scale: timer <= 60 ? [1, 1.1, 1] : 1,
        }}
        transition={{ duration: 0.6, repeat: timer <= 60 ? Infinity : 0 }}
        className="text-center text-3xl font-extrabold drop-shadow-lg"
      >
        ⏱ Time Left: {formatTime(timer)}
      </motion.div>
      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problem */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 hover:border-purple-500 transition-all"
        >
          {/* Title and tags */}
          <h2 className="font-extrabold text-lg mb-1">
            2353. Design a Food Rating System
          </h2>
          <br />
          {/* Problem description */}
          <p className="mb-3">
            Design a food rating system that can do the following:
          </p>
          <ul className="list-disc ml-6 space-y-1 mb-5">
            <li>Modify the rating of a food item listed in the system.</li>
            <li>
              Return the highest-rated food item for a type of cuisine in the
              system.
            </li>
          </ul>
          <p className="mb-1">
            Implement the{" "}
            <code className="font-mono bg-[#23272f] px-1 py-0.5 rounded text-[#fbbf24]">
              FoodRatings
            </code>{" "}
            class:
          </p>
          {/* API methods */}
          <pre className="bg-[#23272f] px-4 py-3 rounded mb-2 text-sm font-mono text-white whitespace-pre-wrap">
            {`FoodRatings(string[] foods, string[] cuisines, int[] ratings)`}{" "}
            <span className="text-cyan-300">
              Initializes the system. The food items are described by{" "}
              <b>foods</b>, <b>cuisines</b> and <b>ratings</b>, all of which
              have a length of <b>n</b>.
            </span>
          </pre>
          <ul className="ml-8 list-disc text-[15px] mb-2 space-y-1">
            <li>
              <span className="font-mono text-yellow-400">foods[i]</span> is the
              name of the <b>i-th</b> food.
            </li>
            <li>
              <span className="font-mono text-yellow-400">cuisines[i]</span> is
              the type of cuisine of the <b>i-th</b> food.
            </li>
            <li>
              <span className="font-mono text-yellow-400">ratings[i]</span> is
              the initial rating of the <b>i-th</b> food.
            </li>
          </ul>
          <pre className="bg-[#23272f] px-4 py-3 rounded mb-2 text-sm font-mono text-white whitespace-pre-wrap">
            {`void changeRating(string food, int newRating)`}{" "}
            <span className="text-cyan-300">
              Changes the rating of the food item with the name <b>food</b>.
            </span>
          </pre>
          <pre className="bg-[#23272f] px-4 py-3 rounded mb-2 text-sm font-mono text-white whitespace-pre-wrap">
            {`string highestRated(string cuisine)`}{" "}
            <span className="text-cyan-300">
              Returns the name of the food item that has the highest rating for
              the given type of <b>cuisine</b>. If there is a tie, return the
              item with the lexicographically smaller name.
            </span>
          </pre>
          {/* Note */}
          <p className="text-gray-400 text-xs mt-1 mb-8">
            <b>Note:</b> If <span className="font-mono text-yellow-400">X</span>{" "}
            is lexicographically smaller than string{" "}
            <span className="font-mono text-yellow-400">Y</span>, it comes
            before <span className="font-mono text-yellow-400">Y</span> in
            dictionary order.
            <br />
            That is, either <span className="font-mono text-yellow-400">
              X
            </span>{" "}
            is a prefix of <span className="font-mono text-yellow-400">Y</span>,
            or if <span className="font-mono text-yellow-400">i</span> is the
            first position such that{" "}
            <span className="font-mono text-yellow-400">X[i] != Y[i]</span>,
            then <span className="font-mono text-yellow-400">X[i]</span> comes
            before <span className="font-mono text-yellow-400">Y[i]</span> in
            alphabetic order.
          </p>
          {/* Example 1 */}
          <div className="font-bold text-[15px] text-yellow-400 my-2">
            Example 1:
          </div>
          <div>
            <div className="font-bold mb-1 text-blue-400">Input</div>
            <pre className="bg-[#23272f] px-4 py-3 rounded mb-3 text-sm font-mono text-white overflow-x-auto whitespace-pre-wrap">
              {`["FoodRatings", "highestRated", "changeRating", "highestRated", "changeRating", "highestRated"]
[[["kimchi","sushi","moussaka","ramen","bulgogi"],["korean","japanese","greek","japanese","korean"],[9,12,8,15,14]],"korean","japanese","ramen",16,"japanese","sushi",16,"japanese"]`}
            </pre>
            <div className="font-bold mb-1 text-blue-400">Output</div>
            <pre className="bg-[#23272f] px-4 py-3 rounded mb-3 text-sm font-mono text-white overflow-x-auto whitespace-pre-wrap">
              {`[null,"kimchi","ramen",null,"sushi",null,"ramen"]`}
            </pre>
            <div className="mb-1 mt-3 font-semibold text-white">
              Explanation:
            </div>
            <pre className="bg-[#23272f] px-4 py-3 rounded text-[13px] font-mono text-[#e0e7ef] whitespace-pre-wrap mb-6">
              {`FoodRatings foodRatings = new FoodRatings(["kimchi", "sushi", "moussaka", "ramen", "bulgogi"], ["korean", "japanese", "greek", "japanese", "korean"], [9, 12, 8, 15, 14]);
foodRatings.highestRated("korean"); // return "kimchi"
foodRatings.highestRated("japanese"); // return "ramen"
foodRatings.changeRating("sushi", 16); // sushi now has a rating of 16.
foodRatings.highestRated("japanese"); // return "sushi"
foodRatings.changeRating("ramen", 16); // ramen now has a rating of 16.
foodRatings.highestRated("japanese"); // return "ramen"
`}
            </pre>
          </div>
          {/* Constraints */}
          <div className="font-bold text-[15px] text-yellow-400 mb-1">
            Constraints:
          </div>
          <ul className="list-disc ml-6 text-xs space-y-1">
            <li>
              <span className="font-mono text-yellow-400">
                1 &lt;= foods.length == cuisines.length == ratings.length &lt;=
                2 * 10⁴
              </span>
            </li>
            <li>
              <span className="font-mono text-yellow-400">
                1 &lt;= foods[i].length, cuisines[i].length &lt;= 10
              </span>
            </li>
            <li>
              <span className="font-mono text-yellow-400">
                1 &lt;= ratings[i] &lt;= 10⁸
              </span>
            </li>
            <li>
              <span className="font-mono text-yellow-400">
                foods[i], cuisines[i]
              </span>{" "}
              consist of lowercase English letters.
            </li>
            <li>
              All the strings in{" "}
              <span className="font-mono text-yellow-400">foods</span> are
              distinct.
            </li>
            <li>
              <span className="font-mono text-yellow-400">food</span> will be
              the name of a food item in the system across all calls to{" "}
              <span className="font-mono text-yellow-400">changeRating</span>.
            </li>
            <li>
              <span className="font-mono text-yellow-400">cuisine</span> will be
              a type of cuisine of at least one food item in the system across
              all calls to{" "}
              <span className="font-mono text-yellow-400">highestRated</span>.
            </li>
            <li>
              At most <span className="font-mono text-yellow-400">2 * 10⁴</span>{" "}
              calls in total will be made to{" "}
              <span className="font-mono text-yellow-400">changeRating</span>{" "}
              and{" "}
              <span className="font-mono text-yellow-400">highestRated</span>.
            </li>
          </ul>
        </motion.div>

        {/* IDE Panels */}
        <div className="space-y-6">
          {/* My IDE */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700 hover:border-cyan-400 transition-all"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-cyan-300">{myName} (You)</h3>

              {/* Language Selector and Run Button */}
              <div className="flex items-center space-x-2 relative">
                {/* Language Dropdown */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowLanguageDropdown(!showLanguageDropdown)
                    }
                    className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 text-xs transition-colors"
                  >
                    <span>{currentLanguage.name.split(" ")[0]}</span>
                    <svg
                      className={`w-3 h-3 transition-transform ${
                        showLanguageDropdown ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showLanguageDropdown && (
                    <div className="absolute top-full right-0 mt-1 w-72 max-h-80 overflow-y-auto bg-gray-800 border border-gray-600 rounded shadow-lg z-50">
                      {LANGUAGES.map((language) => (
                        <button
                          key={language.id}
                          onClick={() => handleLanguageChange(language.id)}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-700 transition-colors ${
                            selectedLanguage === language.id
                              ? "bg-blue-600 text-white"
                              : "text-gray-300"
                          }`}
                        >
                          {language.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleRun}
                  disabled={myLoading || !myUid || !finalRoomId}
                  className="bg-cyan-600 px-3 py-1 rounded hover:scale-105 hover:shadow-lg hover:shadow-cyan-400/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {myLoading ? "Running..." : "Run"}
                </button>
              </div>
            </div>
            <Editor
              height="200px"
              language={getMonacoLanguage(currentLanguage.extension)}
              value={myCode}
              onChange={(val) => setMyCode(val || "")}
              theme="vs-dark"
              className="rounded overflow-hidden"
            />
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="bg-gray-900 p-2 rounded border border-gray-700 hover:border-purple-400 transition-all">
                <div className="text-gray-400 mb-1">Input</div>
                <textarea
                  className="w-full h-16 p-1 bg-gray-950 text-white rounded resize-none"
                  value={myInput}
                  onChange={(e) => setMyInput(e.target.value)}
                  placeholder="Enter input here..."
                />
              </div>
              <div className="bg-gray-900 p-2 rounded border border-gray-700">
                <div className="text-gray-400 mb-1">Output</div>
                <pre className="text-green-400 whitespace-pre-wrap min-h-[40px] overflow-auto">
                  {myOutput}
                </pre>
              </div>
              <div className="bg-gray-900 p-2 rounded border border-gray-700">
                <div className="text-gray-400 mb-1">Errors</div>
                <pre className="text-red-400 whitespace-pre-wrap min-h-[40px] overflow-auto">
                  {myError}
                </pre>
              </div>
            </div>
          </motion.div>

          {/* Opponent IDE (read-only) */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-700 hover:border-cyan-400 transition-all"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-pink-300">{oppName}</h3>
              <div className="flex items-center space-x-2">
                {/* Show opponent's language */}
                <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                  {oppCurrentLanguage.name.split(" ")[0]}
                </span>
                <button
                  disabled
                  className="bg-pink-600 px-3 py-1 rounded hover:scale-105 hover:shadow-lg hover:shadow-pink-400/60 transition-all"
                >
                  {oppUid ? "Synced" : "Waiting..."}
                </button>
              </div>
            </div>
            <Editor
              height="200px"
              language={getMonacoLanguage(oppCurrentLanguage.extension)}
              value={oppCode}
              onChange={() => {}}
              theme="vs-dark"
              className="rounded overflow-hidden"
              options={{ readOnly: true }}
            />
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="bg-gray-900 p-2 rounded border border-gray-700 hover:border-purple-400 transition-all">
                <div className="text-gray-400 mb-1">Input</div>
                <textarea
                  className="w-full h-16 p-1 bg-gray-950 text-white rounded resize-none"
                  value={oppInput}
                  readOnly
                />
              </div>
              <div className="bg-gray-900 p-2 rounded border border-gray-700">
                <div className="text-gray-400 mb-1">Output</div>
                <pre className="text-green-400 whitespace-pre-wrap min-h-[40px] overflow-auto">
                  {oppOutput}
                </pre>
              </div>
              <div className="bg-gray-900 p-2 rounded border border-gray-700">
                <div className="text-gray-400 mb-1">Errors</div>
                <pre className="text-red-400 whitespace-pre-wrap min-h-[40px] overflow-auto">
                  {oppError}
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      {/* Debug info (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-900 p-4 rounded text-xs space-y-1">
          <p>
            <strong>Debug Info:</strong>
          </p>
          <p>URL: {window.location.href}</p>
          <p>Path segments: {JSON.stringify(pathSegments)}</p>
          <p>URL params: {JSON.stringify(params)}</p>
          <p>finalRoomId: {finalRoomId || "null"}</p>
          <p>myUid: {myUid || "null"}</p>
          <p>oppUid: {oppUid || "null"}</p>
          <p>myName: {myName}</p>
          <p>oppName: {oppName}</p>
          <p>User email: {myEmail}</p>
          <p>
            My Language: {currentLanguage.name} (ID: {selectedLanguage})
          </p>
          <p>
            Opponent Language: {oppCurrentLanguage.name} (ID: {oppLanguage})
          </p>
        </div>
      )}
      {process.env.NODE_ENV === "development" && (
        <div className="bg-gray-900 p-4 rounded text-xs space-y-1">
          <p>
            <strong>Debug Info:</strong>
          </p>
          {/* ... your existing debug info ... */}
          <p>Audio Connection State: {audioConnectionState}</p>
          <p>Is Audio Connected: {isAudioConnected.toString()}</p>
          <p>Debug Connection Info: {JSON.stringify(debugConnectionInfo)}</p>
        </div>
      )}
    </div>
  );
}
