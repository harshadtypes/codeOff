import { useState, useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { runCode } from "../api/codeoffApi";

// 🔒 LocalStorage key so each user keeps their own draft
const LS_KEY = "codeoff-battle-code";

export default function BattlePage() {
  // 🟢 Load code from localStorage on first render, or fall back to a template
  const [code, setCode] = useState(() =>
    localStorage.getItem(LS_KEY) || `# Write your code here
print('Hello CodeOff')`
  );
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  // 💾 Persist code after the user stops typing (300ms debounce)
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(LS_KEY, code), 300);
    return () => clearTimeout(t);
  }, [code]);

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
        <button
          onClick={handleRun}
          className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded mb-4 self-start"
        >
          {loading ? "Running…" : "Run"}
        </button>
        <pre className="bg-gray-800 p-4 rounded flex-1 overflow-auto whitespace-pre-wrap">
          {output}
        </pre>
      </div>
    </div>
  );
}
