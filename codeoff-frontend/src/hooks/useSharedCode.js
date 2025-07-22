// src/hooks/useSharedCode.js
import { useEffect, useState } from "react";
import { database } from "../firebase";
import { ref, onValue, set } from "firebase/database";

export function useSharedCode(roomId) {
  const [code, setCodeState] = useState("");

  useEffect(() => {
    const codeRef = ref(database, `rooms/${roomId}/code`);
    const unsubscribe = onValue(codeRef, (snapshot) => {
      const value = snapshot.val();
      if (value !== null) setCodeState(value);
    });

    return () => unsubscribe();
  }, [roomId]);

  const setCode = (newCode) => {
    setCodeState(newCode);
    set(ref(database, `rooms/${roomId}/code`), newCode);
  };

  return [code, setCode];
}
