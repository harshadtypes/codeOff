import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 px-4 py-3 flex justify-between items-center shadow-md">
      <Link to="/" className="text-xl font-bold">
        CodeOff
      </Link>
      <div className="space-x-4">
        <Link to="/battle" className="hover:underline">
          Start Battle
        </Link>
        {/* Placeholder for login */}
      </div>
    </nav>
  );
}