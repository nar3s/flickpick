import '../styles/MatchesList.css';

export function MatchesList({ matches, onBack }) {
    return (
        <div className="matches-page">
            <header className="matches-header">
                <button className="back-button" onClick={onBack} aria-label="Back">
                    ←
                </button>
                <h1>Your Matches</h1>
                <span className="match-count">{matches.length}</span>
            </header>

            <div className="matches-content">
                {matches.length === 0 ? (
                    <div className="no-matches">
                        <div className="no-matches-icon">💔</div>
                        <h2>No matches yet</h2>
                        <p>Keep swiping to find movies you both love!</p>
                        <button className="btn btn-primary" onClick={onBack}>
                            Back to Swiping
                        </button>
                    </div>
                ) : (
                    <div className="matches-grid">
                        {matches.map((movie, index) => (
                            <div
                                key={movie.id}
                                className="match-card"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div className="match-card-image">
                                    <img src={movie.poster} alt={movie.title} />
                                    <div className="match-card-overlay">
                                        <span className="match-badge">🎉 Matched!</span>
                                    </div>
                                </div>
                                <div className="match-card-info">
                                    <h3>{movie.title}</h3>
                                    <div className="match-card-meta">
                                        <span className="year">{movie.year}</span>
                                        <span className="rating">★ {movie.rating}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
