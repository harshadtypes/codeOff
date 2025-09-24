// codeoffApi.js

// Judge0 supported languages with their IDs
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

    // ✅ Normalize backend response to match Judge0 style
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
