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
    const o = snap.val();
    const key = snap.key;
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

export async function sendChallenge(friendEmail) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  try {
    // Check if friend exists by email
    const usersRef = ref(database, "users");
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      throw new Error("No users found");
    }

    let friendUid = null;
    const users = usersSnapshot.val();
    
    // Find user by email
    Object.keys(users).forEach(uid => {
      if (users[uid].email === friendEmail) {
        friendUid = uid;
      }
    });

    if (!friendUid) {
      // Try finding by username
      const usernameRef = ref(database, `usernames/${friendEmail}`);
      const usernameSnapshot = await get(usernameRef);
      
      if (usernameSnapshot.exists()) {
        friendUid = usernameSnapshot.val().uid;
      } else {
        throw new Error("Friend not found");
      }
    }

    // Send challenge
    const challengeRef = ref(database, `challenges/${friendUid}/${user.uid}`);
    const challengeData = {
      from: user.email,
      fromUid: user.uid,
      fromUsername: user.displayName || user.email.split('@')[0],
      timestamp: Date.now(),
      status: "pending"
    };

    await dbSet(challengeRef, challengeData);
    console.log("✅ Challenge sent to", friendEmail);

  } catch (error) {
    console.error("❌ sendChallenge error:", error.message);
    throw error;
  }
}

export function listenForChallenges(callback) {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  const challengesRef = ref(database, `challenges/${user.uid}`);
  
  return onValue(challengesRef, (snapshot) => {
    const challenges = [];
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(challengerId => {
        const challenge = data[challengerId];
        if (challenge.status === "pending") {
          challenges.push({
            id: challengerId,
            from: challenge.from,
            fromUsername: challenge.fromUsername,
            timestamp: challenge.timestamp
          });
        }
      });
    }
    
    callback(challenges);
  });
}

export async function acceptChallenge(challengerId, challengerEmail) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  try {
    // Create room
    const roomId = uuid();
    
    // Set room with both users
    await dbSet(ref(database, `rooms/${roomId}`), {
      roomId,
      players: {
        [challengerId]: { ready: false, email: challengerEmail },
        [user.uid]: { ready: false, email: user.email }
      },
      createdAt: Date.now(),
      status: "waiting"
    });

    // Remove the challenge
    await remove(ref(database, `challenges/${user.uid}/${challengerId}`));
    
    console.log("✅ Challenge accepted, room created:", roomId);
    return roomId;

  } catch (error) {
    console.error("❌ acceptChallenge error:", error.message);
    throw error;
  }
}

export async function declineChallenge(challengerId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await remove(ref(database, `challenges/${user.uid}/${challengerId}`));
    console.log("✅ Challenge declined");
  } catch (error) {
    console.error("❌ declineChallenge error:", error.message);
  }
}
