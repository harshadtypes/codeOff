export const runCode = async (sourceCode) => {
  const response = await fetch(import.meta.env.VITE_API_URL + "/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source_code: sourceCode, language_id: 71 }), // Python 3
  });
  return response.json();
};