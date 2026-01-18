import '../styles/LandingPage.css';

export function LandingPage({ onCreateRoom, onJoinRoom, existingRoomId, isLoading, error }) {
    return (
        <div className="landing-page">
            <div className="landing-content">
                {/* Logo/Branding */}
                <div className="landing-hero">
                    <div className="logo-container">
                        <span className="logo-icon">🎬</span>
                        <span className="logo-popcorn">🍿</span>
                    </div>
                    <h1 className="app-title">
                        <span className="title-gradient">Binge</span>
                        <span className="title-light">Watchlist</span>
                    </h1>
                    <p className="app-tagline">
                        Can't decide what to watch? <br />
                        Swipe together, match on movies!
                    </p>
                </div>

                {/* Feature highlights */}
                <div className="features">
                    <div className="feature">
                        <span className="feature-icon">👆</span>
                        <span className="feature-text">Swipe right to like</span>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">❤️</span>
                        <span className="feature-text">Match when both like</span>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">🔗</span>
                        <span className="feature-text">Share via link</span>
                    </div>
                </div>

                {/* Real-time badge */}
                <div className="realtime-badge">
                    <span className="pulse-dot"></span>
                    Real-time sync via WebSockets
                </div>

                {/* Error message */}
                {error && (
                    <div className="error-message">
                        ⚠️ {error}
                    </div>
                )}

                {/* Actions */}
                <div className="landing-actions">
                    {existingRoomId ? (
                        <>
                            <div className="join-room-info">
                                <p>You've been invited to room</p>
                                <span className="room-code-display">{existingRoomId}</span>
                            </div>
                            <button
                                className="btn btn-primary btn-large"
                                onClick={onJoinRoom}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Joining...' : 'Join Room'}
                            </button>
                            <span className="or-divider">or</span>
                            <button
                                className="btn btn-secondary"
                                onClick={onCreateRoom}
                                disabled={isLoading}
                            >
                                Start New Room
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="btn btn-primary btn-large"
                                onClick={onCreateRoom}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating...' : 'Start Swiping 🎉'}
                            </button>
                            <p className="no-login-note">
                                No login needed — just swipe and share!
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Decorative elements */}
            <div className="landing-decoration">
                <div className="floating-card card-1">🎥</div>
                <div className="floating-card card-2">🎞️</div>
                <div className="floating-card card-3">🎭</div>
            </div>
        </div>
    );
}
