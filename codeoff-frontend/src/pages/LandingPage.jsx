import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
      <h1 className="text-4xl font-extrabold mb-4">Welcome to CodeOff</h1>
      <p className="max-w-lg mb-8 text-gray-300">
        Challenge friends in real‑time coding duels, beat the clock, and climb the
        weekly leaderboard for a chance to win ₹500!
      </p>
      <Link
        to="/battle"
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold transition"
      >
        Start Your First Battle
      </Link>
    </div>
  );
}