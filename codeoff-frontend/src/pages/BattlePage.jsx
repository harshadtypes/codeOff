import { useState } from "react";
import Editor from "@monaco-editor/react";
import { runCode } from "../api/codeoffApi";

export default function BattlePage() {
  const [code, setCode] = useState("# Write your code here\nprint('Hello CodeOff')");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    const res = await runCode(code);
    setOutput(res.stdout || res.stderr || "(no output)");
    setLoading(false);
  };

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
        <pre className="bg-gray-800 p-4 rounded flex-1 overflow-auto">
          {output}
        </pre>
      </div>
    </div>
  );
}