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
    // 1. Create submission
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

    // 2. Poll for result (simple 2s delay)
    setTimeout(async () => {
      const resultRes = await axios.get(
        `https://${JUDGE0_HOST}/submissions/${token}?base64_encoded=false`,
        {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": JUDGE0_HOST,
          },
        }
      );
      res.json(resultRes.data);
    }, 2000);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Judge0 error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CodeOff backend running on port ${PORT}`);
});