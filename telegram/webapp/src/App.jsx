import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Send from './pages/Send';
import Settings from './pages/Settings';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const { isReady, user } = useTelegram();

  // Show loading screen while initializing
  if (!isReady) {
    return <LoadingScreen />;
  }

  // Show error if no user data (shouldn't happen in Telegram Mini App)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Telegram Required</h2>
          <p className="text-telegram-hint">
            This app can only be opened within Telegram
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-telegram-bg pb-safe-bottom">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/send" element={<Send />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
