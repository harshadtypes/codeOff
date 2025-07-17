import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JUDGE0_HOST = "judge0-ce.p.rapidapi.com";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

app.post("/run", async (req, res) => {
  const { source_code, language_id } = req.body;

  try {
    // 1. Submit code
    const submissionRes = await axios.post(
      `https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=false`,
      {
        source_code,
        language_id,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": JUDGE0_HOST,
        },
      }
    );

    const { token } = submissionRes.data;

    // 2. Poll once after delay (wrap polling in its own function)
    setTimeout(() => {
      axios
        .get(`https://${JUDGE0_HOST}/submissions/${token}?base64_encoded=false`, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": JUDGE0_HOST,
          },
        })
        .then((resultRes) => {
          const result = resultRes.data;
          const output =
            result.stdout || result.stderr || result.compile_output || "No output.";
          console.log("✅ Sending back:", output);
          res.json({ output: output.trim() });
        })
        .catch((pollError) => {
          console.error("❌ Polling error:", pollError);
          res.status(500).json({ error: "Failed to fetch execution result" });
        });
    }, 2000);
  } catch (err) {
    console.error("❌ Submission error:", err);
    res.status(500).json({ error: "Code submission failed" });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`CodeOff backend running on port ${PORT}`);
});
