import "./styles/globals.css";
import AdminInterface from "./pages/AdminInterface";
import VoterInterface from "./pages/VoterInterface";

export default function App() {
  const isAdmin = window.location.pathname === "/admin";
  return isAdmin ? <AdminInterface /> : <VoterInterface />;
}