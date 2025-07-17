// src/api/matchmaking.js
import { database } from "../firebase";
import {
  ref,
  push,
  set as dbSet,
  remove,
  onChildAdded,
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

export async function sendChallenge(toUsername, fromUid) {
  const challengeRef = push(ref(database, `challenges/${toUsername}`));
  await dbSet(challengeRef, { fromUid });
}

export function listenForChallenges(username, handler) {
  const listenRef = ref(database, `challenges/${username}`);
  return onChildAdded(listenRef, (snap) => {
    handler({ id: snap.key, fromUid: snap.val().fromUid });
    remove(ref(database, `challenges/${username}/${snap.key}`));
  });
}

export async function acceptChallenge() {
  return uuid(); // used as roomId
}
