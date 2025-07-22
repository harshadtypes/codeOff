// src/api/matchmaking.js
import { database } from "../firebase";
import {
  ref,
  push,
  set as dbSet,
  remove,
  onChildAdded,
  get,
  onValue
} from "firebase/database";
import { v4 as uuid } from "uuid";
import { auth } from "../firebase";

export function joinQueue(onMatch, onTick, onTimeout) {
  const user = auth.currentUser;
  if (!user) return;

  const entryRef = push(ref(database, "queue/"));
  dbSet(entryRef, { uid: user.uid, username: user.displayName });

  let seconds = 0;
  const tickTimer = setInterval(() => {
    seconds++;
    onTick(seconds);
    if (seconds >= 15) {
      clearInterval(tickTimer);
      remove(entryRef);
      onTimeout({ roomId: uuid(), opponent: { uid: "bot", username: "Emiway Bantai" } });
    }
  }, 1000);

  const matcher = onChildAdded(ref(database, "queue/"), (snap) => {
    const o = snap.val(); const key = snap.key;
    if (o.uid !== user.uid) {
      clearInterval(tickTimer);
      remove(entryRef);
      remove(ref(database, `queue/${key}`));
      onMatch({ roomId: uuid(), opponent: o });
    }
  });

  return () => {
    clearInterval(tickTimer);
    remove(entryRef);
    matcher();
  };
}

export async function sendChallenge(username, challengerId, challengerEmail) {
  try {
    const usernameRef = ref(database, `usernames/${username}`);
    const snapshot = await get(usernameRef);

    if (!snapshot.exists()) {
      throw new Error("❌ Username not found.");
    }

    const friendUid = snapshot.val();
    const challengeRef = ref(database, `challenges/${friendUid.uid}`);
    const challengeData = {
      challengerId,
      challengerEmail,
      timestamp: Date.now()
    };

    await dbSet(challengeRef, challengeData);
    console.log("✅ Challenge sent to", username);
  } catch (err) {
    console.error("❌ sendChallenge error:", err.message);
    throw err;
  }  
}

// No changes needed here — still works
export function listenForChallenges(userId, callback) {
  const challengeRef = ref(database, `challenges/${userId}`);

  return onValue(challengeRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback(data);
      remove(challengeRef); // delete after it's read
    }
  });
}

// matchmaking.js
export async function acceptChallenge(challengerId, opponentId) {
  const roomId = uuid();

  // Set room with both users and their ready status = false
  await dbSet(ref(database, `rooms/${roomId}`), {
    roomId,
    players: {
      [challengerId]: { ready: false },
      [opponentId]: { ready: false }
    },
    createdAt: Date.now()
  });

  return roomId;
}

