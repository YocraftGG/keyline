import React from "react";
import { useTheme } from "./components/SiteChrome.jsx";
import PracticePage from "./pages/PracticePage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { ProfilePage, HistoryPage, LeaderboardPage } from "./pages/StatsPages.jsx";
export default function App() {
  const [theme,onToggle]=useTheme();
  const path=window.location.pathname.replace(/\/$/,"")||"/";
  if(path==="/login")return <AuthPage type="login" theme={theme} onToggle={onToggle}/>;
  if(path==="/register")return <AuthPage type="register" theme={theme} onToggle={onToggle}/>;
  if(path==="/profile")return <ProfilePage theme={theme} onToggle={onToggle}/>;
  if(path==="/history")return <HistoryPage theme={theme} onToggle={onToggle}/>;
  if(path==="/settings")return <SettingsPage theme={theme} onToggle={onToggle}/>;
  if(path==="/leaderboard")return <LeaderboardPage theme={theme} onToggle={onToggle}/>;
  return <PracticePage theme={theme} onToggle={onToggle}/>;
}
