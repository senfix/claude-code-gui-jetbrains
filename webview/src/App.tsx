import { AppProviders } from './contexts';
import { ChatPanel, Settings } from './components';
import { useRouter, isSettingsRoute } from './router';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
  useKeyboardShortcuts();
  const { route } = useRouter();

  if (isSettingsRoute(route)) {
    return <Settings />;
  }

  return <ChatPanel />;
}

function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}

export default App;
