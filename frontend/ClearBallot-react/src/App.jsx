import { useState } from "react";
import "./styles/globals.css";
import LandingPage     from "./pages/LandingPage";
import VoterInterface  from "./pages/VoterInterface";
import AdminInterface  from "./pages/AdminInterface";

export default function App() {
  // Simple client-side routing — no react-router needed
  const getInitialPage = () => {
    const path = window.location.pathname;
    if (path === "/admin")  return "admin";
    if (path === "/vote")   return "voter";
    return "landing";
  };

  const [page, setPage] = useState(getInitialPage);

  const navigate = (destination) => {
    // Update the URL without a full page reload
    const paths = { landing: "/", voter: "/vote", admin: "/admin" };
    window.history.pushState({}, "", paths[destination] ?? "/");
    setPage(destination);
  };

  if (page === "voter") return <VoterInterface onBack={() => navigate("landing")} />;
  if (page === "admin") return <AdminInterface onBack={() => navigate("landing")} />;
  return <LandingPage onNavigate={navigate} />;
}