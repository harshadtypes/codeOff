// src/pages/BattlePage.jsx
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Editor from "@monaco-editor/react";
import { runCode, LANGUAGES } from "../api/codeoffApi";
import { useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  push,
  serverTimestamp,
} from "firebase/database";

export default function BattlePage() {
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
  const currentLanguage = LANGUAGES.find(lang => lang.id === selectedLanguage) || LANGUAGES.find(lang => lang.id === 71);
  const oppCurrentLanguage = LANGUAGES.find(lang => lang.id === oppLanguage) || LANGUAGES.find(lang => lang.id === 71);

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
      const submissionRef = ref(db, `rooms/${finalRoomId}/submissions/${myUid}`);
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
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'cpp': 'cpp',
      'c': 'c',
      'java': 'java',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'scala': 'scala',
      'r': 'r',
      'sql': 'sql',
      'sh': 'shell',
      'pl': 'perl',
      'lua': 'lua',
      'hs': 'haskell',
      'ml': 'fsharp',
      'fs': 'fsharp',
      'clj': 'clojure',
      'pas': 'pascal',
      'asm': 'asm',
      'vb': 'vb'
    };
    return languageMap[extension] || 'text';
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
          {["🎙️", "📈", "🤝 Draw", "🏳️ Resign"].map((btn, i) => (
            <button
              key={i}
              className="px-3 py-1 rounded bg-gray-800 hover:scale-105 hover:shadow-lg transition-all hover:shadow-cyan-400/60"
            >
              {btn}
            </button>
          ))}
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
          <h2 className="text-xl font-bold mb-2 text-purple-400">
            2353. Design a Food Rating System
          </h2>
          <p className="text-sm text-gray-300 mb-4">
            Design a food rating system that can do the following: Modify the
            rating of a food...
          </p>
          <ul className="list-disc list-inside text-gray-400 space-y-1">
            <li>Modify rating of food</li>
            <li>Return highest rated food of a cuisine</li>
            <li>Break ties by lexicographically smaller name</li>
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
                    onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                    className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 text-xs transition-colors"
                  >
                    <span>{currentLanguage.name.split(' ')[0]}</span>
                    <svg 
                      className={`w-3 h-3 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showLanguageDropdown && (
                    <div className="absolute top-full right-0 mt-1 w-72 max-h-80 overflow-y-auto bg-gray-800 border border-gray-600 rounded shadow-lg z-50">
                      {LANGUAGES.map((language) => (
                        <button
                          key={language.id}
                          onClick={() => handleLanguageChange(language.id)}
                          className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-700 transition-colors ${
                            selectedLanguage === language.id ? 'bg-blue-600 text-white' : 'text-gray-300'
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
                  {oppCurrentLanguage.name.split(' ')[0]}
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
          <p>My Language: {currentLanguage.name} (ID: {selectedLanguage})</p>
          <p>Opponent Language: {oppCurrentLanguage.name} (ID: {oppLanguage})</p>
        </div>
      )}
    </div>
  );
}
