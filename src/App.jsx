import { useState, useEffect } from 'react';
import { useSession } from './hooks/useSession';
import { LandingPage } from './components/LandingPage';
import { SwipeDeck } from './components/SwipeDeck';
import { MatchCelebration } from './components/MatchCelebration';
import { MatchesList } from './components/MatchesList';
import { ShareModal } from './components/ShareModal';
import { FilterPanel } from './components/FilterPanel';
import { PendingFilterBanner } from './components/PendingFilterBanner';
import './styles/App.css';

function App() {
  const {
    isConnected,
    connectionError,
    roomId,
    isHost,
    isReady,
    userCount,
    movieQueue,
    currentIndex,
    isLoadingMovies,
    matches,
    newMatch,
    filters,
    pendingFilters,
    availableGenres,
    availableLanguages,
    createRoom,
    joinRoom,
    recordSwipe,
    proposeFilters,
    approveFilters,
    rejectFilters,
    clearNewMatch,
    getShareUrl,
    resetSession,
    getRoomIdFromUrl,
    hasMoreMovies
  } = useSession();

  const [view, setView] = useState('landing'); // landing, swiping, matches
  const [showShareModal, setShowShareModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [existingRoomId, setExistingRoomId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check for room ID in URL on mount
  useEffect(() => {
    const urlRoomId = getRoomIdFromUrl();
    if (urlRoomId) {
      setExistingRoomId(urlRoomId);
    }
  }, [getRoomIdFromUrl]);

  // Handle creating a new room
  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await createRoom();
      setView('swiping');
      // Auto-show share modal so user can invite friend
      setTimeout(() => setShowShareModal(true), 500);
    } catch (err) {
      setError(err.message);
      console.error('Failed to create room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle joining an existing room
  const handleJoinRoom = async () => {
    if (!existingRoomId) return;

    setIsLoading(true);
    setError(null);

    try {
      await joinRoom(existingRoomId);
      setView('swiping');
    } catch (err) {
      setError(err.message);
      console.error('Failed to join room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle swipe action
  const handleSwipe = async (movieId, liked) => {
    try {
      await recordSwipe(movieId, liked);
    } catch (err) {
      console.error('Failed to record swipe:', err);
    }
  };

  // Handle showing matches
  const handleShowMatches = () => {
    setView('matches');
  };

  // Handle going back to swiping
  const handleBackToSwiping = () => {
    if (hasMoreMovies) {
      setView('swiping');
    } else {
      resetSession();
      setView('landing');
      setExistingRoomId(null);
    }
  };

  // Handle filter proposal/application
  const handleApplyFilters = async (newFilters) => {
    try {
      await proposeFilters(newFilters);
    } catch (err) {
      console.error('Failed to apply filters:', err);
    }
  };

  // Handle filter approval (host only)
  const handleApproveFilters = async () => {
    try {
      await approveFilters();
    } catch (err) {
      console.error('Failed to approve filters:', err);
    }
  };

  // Handle filter rejection (host only)
  const handleRejectFilters = async () => {
    try {
      await rejectFilters();
    } catch (err) {
      console.error('Failed to reject filters:', err);
    }
  };

  // Connection status indicator component
  const ConnectionStatus = () => {
    if (connectionError) {
      return (
        <div className="connection-status error">
          ⚠️ {connectionError}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app">
      <ConnectionStatus />

      {/* Header - shown when in swiping mode */}
      {view === 'swiping' && (
        <header className="app-header">
          <button
            className="header-btn logo-btn"
            onClick={() => {
              if (confirm('Leave this room?')) {
                resetSession();
                setView('landing');
                setExistingRoomId(null);
              }
            }}
          >
            🎬
          </button>

          <div className="header-center">
            <span className="room-badge">Room: {roomId}</span>
            <div className="header-stats">
              <span className="user-count" title="Users in room">
                👥 {userCount}
              </span>
              <span className="movies-remaining">
                🎬 {movieQueue.length - currentIndex} left
              </span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="header-btn"
              onClick={() => setShowFilterPanel(true)}
              title="Filters"
            >
              {pendingFilters && isHost && (
                <span className="notification-badge"></span>
              )}
              🎛️
            </button>
            <button
              className="header-btn"
              onClick={() => setShowShareModal(true)}
              title="Share link"
            >
              🔗
            </button>
            <button
              className="header-btn matches-btn"
              onClick={handleShowMatches}
              title="View matches"
            >
              ❤️
              {matches.length > 0 && (
                <span className="matches-badge">{matches.length}</span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Pending Filter Banner */}
      {view === 'swiping' && (
        <PendingFilterBanner
          pendingFilters={pendingFilters}
          isHost={isHost}
          onApprove={handleApproveFilters}
          onReject={handleRejectFilters}
        />
      )}

      {/* Main Content */}
      <main className="app-main">
        {view === 'landing' && (
          <LandingPage
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            existingRoomId={existingRoomId}
            isLoading={isLoading}
            error={error}
          />
        )}

        {view === 'swiping' && isReady && (
          <SwipeDeck
            movies={movieQueue}
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
            onShowMatches={handleShowMatches}
            userCount={userCount}
          />
        )}

        {view === 'matches' && (
          <MatchesList
            matches={matches}
            onBack={handleBackToSwiping}
          />
        )}
      </main>

      {/* Match Celebration Overlay */}
      {newMatch && (
        <MatchCelebration
          movie={newMatch}
          onClose={clearNewMatch}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          shareUrl={getShareUrl()}
          roomId={roomId}
          userCount={userCount}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <FilterPanel
          isHost={isHost}
          currentFilters={filters}
          pendingFilters={pendingFilters}
          availableGenres={availableGenres}
          availableLanguages={availableLanguages}
          onApplyFilters={handleApplyFilters}
          onApproveFilters={handleApproveFilters}
          onRejectFilters={handleRejectFilters}
          onClose={() => setShowFilterPanel(false)}
        />
      )}
    </div>
  );
}

export default App;
