import { ref, push, onValue, remove } from "firebase/database";

// Judge0 supported languages (unchanged)
export const LANGUAGES = [
  { id: 45, name: "Assembly (NASM 2.14.02)", extension: "asm" },
  { id: 46, name: "Bash (5.0.0)", extension: "sh" },
  { id: 47, name: "Basic (FBC 1.07.1)", extension: "bas" },
  { id: 75, name: "C (Clang 7.0.1)", extension: "c" },
  { id: 76, name: "C++ (Clang 7.0.1)", extension: "cpp" },
  { id: 48, name: "C (GCC 7.4.0)", extension: "c" },
  { id: 52, name: "C++ (GCC 7.4.0)", extension: "cpp" },
  { id: 49, name: "C (GCC 8.3.0)", extension: "c" },
  { id: 53, name: "C++ (GCC 8.3.0)", extension: "cpp" },
  { id: 50, name: "C (GCC 9.2.0)", extension: "c" },
  { id: 54, name: "C++ (GCC 9.2.0)", extension: "cpp" },
  { id: 86, name: "Clojure (1.10.1)", extension: "clj" },
  { id: 51, name: "C# (Mono 6.6.0.161)", extension: "cs" },
  { id: 77, name: "COBOL (GnuCOBOL 2.2)", extension: "cob" },
  { id: 55, name: "Common Lisp (SBCL 2.0.0)", extension: "lisp" },
  { id: 56, name: "D (DMD 2.089.1)", extension: "d" },
  { id: 57, name: "Elixir (1.9.4)", extension: "ex" },
  { id: 58, name: "Erlang (OTP 22.2)", extension: "erl" },
  { id: 44, name: "Executable", extension: "exe" },
  { id: 87, name: "F# (.NET Core SDK 3.1.202)", extension: "fs" },
  { id: 59, name: "Fortran (GFortran 9.2.0)", extension: "f90" },
  { id: 60, name: "Go (1.13.5)", extension: "go" },
  { id: 88, name: "Groovy (3.0.3)", extension: "groovy" },
  { id: 61, name: "Haskell (GHC 8.8.1)", extension: "hs" },
  { id: 62, name: "Java (OpenJDK 13.0.1)", extension: "java" },
  { id: 63, name: "JavaScript (Node.js 12.14.0)", extension: "js" },
  { id: 78, name: "Kotlin (1.3.70)", extension: "kt" },
  { id: 64, name: "Lua (5.3.5)", extension: "lua" },
  { id: 89, name: "Multi-file program", extension: "zip" },
  { id: 79, name: "Objective-C (Clang 7.0.1)", extension: "m" },
  { id: 65, name: "OCaml (4.09.0)", extension: "ml" },
  { id: 66, name: "Octave (5.1.0)", extension: "m" },
  { id: 67, name: "Pascal (FPC 3.0.4)", extension: "pas" },
  { id: 85, name: "Perl (5.28.1)", extension: "pl" },
  { id: 68, name: "PHP (7.4.1)", extension: "php" },
  { id: 43, name: "Plain Text", extension: "txt" },
  { id: 69, name: "Prolog (GNU Prolog 1.4.5)", extension: "pl" },
  { id: 70, name: "Python (2.7.17)", extension: "py" },
  { id: 71, name: "Python (3.8.1)", extension: "py" },
  { id: 80, name: "R (4.0.0)", extension: "r" },
  { id: 72, name: "Ruby (2.7.0)", extension: "rb" },
  { id: 73, name: "Rust (1.40.0)", extension: "rs" },
  { id: 81, name: "Scala (2.13.2)", extension: "scala" },
  { id: 82, name: "SQL (SQLite 3.27.2)", extension: "sql" },
  { id: 83, name: "Swift (5.2.3)", extension: "swift" },
  { id: 74, name: "TypeScript (3.7.4)", extension: "ts" },
  { id: 84, name: "Visual Basic.Net (vbnc 0.0.0.5943)", extension: "vb" }
];

export const runCode = async (sourceCode, stdin = "", languageId = 71) => {
  try {
    const response = await fetch(import.meta.env.VITE_API_URL + "/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        stdin: stdin,
        language_id: languageId,
      }),
    });

    const data = await response.json();
    console.log("🔍 Backend responded with:", data);

    return {
      stdout: data.output || data.stdout || "",
      stderr: data.stderr || "",
      compile_output: data.compile_output || "",
      message: data.message || "",
    };
  } catch (err) {
    console.error("❌ runCode error:", err);
    return { stderr: "Execution failed: " + err.message };
  }
};

// WebRTC Configuration
const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export class AudioChat {
  constructor(db, roomId, myUid) {
    this.db = db;
    this.roomId = roomId;
    this.myUid = myUid;
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isConnected = false;
    this.isMuted = false;
    this.isCaller = false;
    this.processedMessages = new Set(); // Track processed signaling messages
    this.signalingListener = null; // Store listener reference
    
    // Callbacks
    this.onConnectionStateChange = null;
    this.onRemoteStream = null;
    this.onError = null;
  }

  async initialize() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        video: false
      });

      console.log("🎤 Local audio stream obtained");
      return true;
    } catch (error) {
      console.error("❌ Failed to get user media:", error);
      if (this.onError) this.onError("Failed to access microphone: " + error.message);
      return false;
    }
  }

  async setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(rtcConfiguration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log("🔊 Received remote stream");
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 Sending ICE candidate");
        this.sendICECandidate(event.candidate);
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log("🔗 Connection state:", this.peerConnection.connectionState);
      this.isConnected = this.peerConnection.connectionState === 'connected';
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.peerConnection.connectionState);
      }
    };
  }

  async startCall(isInitiator = false) {
    this.isCaller = isInitiator;
    console.log(`🚀 Starting call as ${isInitiator ? 'caller' : 'answerer'}`);
    
    if (!this.localStream) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    await this.setupPeerConnection();

    // Start listening for signaling messages first
    this.listenForSignaling();

    if (isInitiator) {
      await this.createOffer();
    }
    
    return true;
  }

  async createOffer() {
    try {
      console.log("📞 Creating offer...");
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      await this.sendSignalingMessage({
        type: 'offer',
        offer: offer,
        from: this.myUid
      });
    } catch (error) {
      console.error("❌ Error creating offer:", error);
      if (this.onError) this.onError("Failed to create call: " + error.message);
    }
  }

  async handleOffer(offerData) {
    try {
      console.log("📱 Handling incoming offer");
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      await this.sendSignalingMessage({
        type: 'answer',
        answer: answer,
        from: this.myUid
      });
    } catch (error) {
      console.error("❌ Error handling offer:", error);
      if (this.onError) this.onError("Failed to answer call: " + error.message);
    }
  }

  async handleAnswer(answerData) {
    try {
      console.log("✅ Handling answer");
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData.answer));
    } catch (error) {
      console.error("❌ Error handling answer:", error);
      if (this.onError) this.onError("Failed to complete call: " + error.message);
    }
  }

  async handleICECandidate(candidateData) {
    try {
      // Validate ICE candidate before adding
      const candidate = candidateData.candidate;
      if (!candidate || (!candidate.sdpMid && candidate.sdpMLineIndex === null)) {
        console.log("⚠️ Skipping invalid ICE candidate:", candidate);
        return;
      }

      console.log("🧊 Adding ICE candidate");
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error("❌ Error adding ICE candidate:", error);
    }
  }

  async sendSignalingMessage(message) {
    const signalingRef = ref(this.db, `rooms/${this.roomId}/signaling`);
    const messageWithId = {
      ...message,
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9), // Unique ID
      timestamp: Date.now()
    };
    await push(signalingRef, messageWithId);
  }

  async sendICECandidate(candidate) {
    await this.sendSignalingMessage({
      type: 'ice-candidate',
      candidate: candidate,
      from: this.myUid
    });
  }

  listenForSignaling() {
    if (this.signalingListener) {
      console.log("⚠️ Signaling listener already active");
      return;
    }

    const signalingRef = ref(this.db, `rooms/${this.roomId}/signaling`);
    this.signalingListener = onValue(signalingRef, (snapshot) => {
      if (snapshot.exists()) {
        const messages = snapshot.val();
        Object.values(messages).forEach(message => {
          // Skip messages from myself and already processed messages
          if (message.from !== this.myUid && message.id && !this.processedMessages.has(message.id)) {
            this.processedMessages.add(message.id);
            this.handleSignalingMessage(message);
          }
        });
      }
    });
  }

  async handleSignalingMessage(message) {
    console.log("📨 Processing signaling message:", message.type);
    
    switch (message.type) {
      case 'offer':
        if (!this.isCaller) {
          await this.handleOffer(message);
        }
        break;
      case 'answer':
        if (this.isCaller) {
          await this.handleAnswer(message);
        }
        break;
      case 'ice-candidate':
        await this.handleICECandidate(message);
        break;
    }
  }

  toggleMute() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = this.isMuted; // Enable if currently muted
      });
      this.isMuted = !this.isMuted;
      console.log(`🎤 Microphone ${this.isMuted ? 'muted' : 'unmuted'}`);
      return this.isMuted;
    }
    return false;
  }

  async endCall() {
    console.log("📞 Ending call");

    // Stop signaling listener
    if (this.signalingListener) {
      this.signalingListener();
      this.signalingListener = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;
    this.isConnected = false;
    this.isMuted = false;

    // Clear processed messages
    this.processedMessages.clear();

    // Clear signaling data
    const signalingRef = ref(this.db, `rooms/${this.roomId}/signaling`);
    await remove(signalingRef);

    console.log("📞 Call ended and cleaned up");
  }

  getConnectionState() {
    return this.peerConnection ? this.peerConnection.connectionState : 'closed';
  }
}
