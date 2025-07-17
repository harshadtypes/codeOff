import {useState, useEffect, useCallback} from "react";
import Editor from "@monaco-editor/react";
import {runCode} from "../api/codeoffApi";

const LS_KEY = "codeoff-battle-code";

export default function BattlePage() {
    const [code, setCode] = useState(
        () =>
            localStorage.getItem(LS_KEY) ||
            `# Write your code here\nprint('Hello CodeOff')`
    );
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);

    const [timer, setTimer] = useState(null);
    const [matchFound, setMatchFound] = useState(false);
    const [roomId] = useState(null);

    // 💾 Save code to localStorage
    useEffect(() => {
        const t = setTimeout(() => localStorage.setItem(LS_KEY, code), 300);
        return () => clearTimeout(t);
    }, [code]);

    // useEffect(() => {
    //     const user = auth.currentUser;
    //     console.log("🔐 Current user:", user?.email || "Not signed in");

    //     const cancelQueue = joinQueue(({roomId, opponent}) => {
    //         console.log("✅ Matched with:", opponent.email);
    //         setRoomId(roomId);
    //         setMatchFound(true); // ✅ CORRECT way to update state
    //         setTimer(900); // ✅ Start 15-min countdown
    //     });

    //     return () => cancelQueue(); // cleanup when component unmounts
    // }, []);

    useEffect(() => {
        setMatchFound(true);
        setTimer(900);
    }, []);

    // ⏱️ Countdown Timer logic
    useEffect(() => {
        if (!matchFound || timer === null) return;
        if (timer === 0) return;

        const t = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(t);
                    alert("⏱️ Time's up!");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(t);
    }, [matchFound, timer]);

    const handleRun = useCallback(async () => {
        setLoading(true);
        const res = await runCode(code);
        setOutput(res || "(no output)");
        setLoading(false);
    }, [code]);

    return (
        <div className="p-4 grid gap-4 md:grid-cols-2">
            <Editor
                height="70vh"
                defaultLanguage="python"
                value={code}
                onChange={(val) => setCode(val)}
                theme="vs-dark"
            />

            <div className="flex flex-col">
                {matchFound && (
                    <div className="text-xl font-bold text-center mb-2">
                        Time Left: {Math.floor(timer / 60)}:
                        {(timer % 60).toString().padStart(2, "0")}
                    </div>
                )}
                {matchFound && roomId && (
                    <p className="text-center text-gray-400 text-sm">
                        Room ID: {roomId}
                    </p>
                )}

                <button
                    onClick={handleRun}
                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded mb-4 self-start">
                    {loading ? "Running…" : "Run"}
                </button>
                <pre className="bg-gray-800 p-4 rounded flex-1 overflow-auto whitespace-pre-wrap">
                    {output}
                </pre>
            </div>
        </div>
    );
}
