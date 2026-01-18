import { SwipeCard } from './SwipeCard';
import '../styles/SwipeDeck.css';

export function SwipeDeck({ movies, currentIndex, onSwipe, onShowMatches }) {
    // Show top 2 cards for stack effect
    const visibleCards = movies.slice(currentIndex, currentIndex + 2);

    if (visibleCards.length === 0) {
        return (
            <div className="swipe-deck-empty">
                <div className="empty-content">
                    <div className="empty-icon">🎬</div>
                    <h2>All caught up!</h2>
                    <p>You've swiped through all the movies.</p>
                    <button className="btn btn-primary" onClick={onShowMatches}>
                        View Matches
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="swipe-deck">
            <div className="cards-container">
                {visibleCards.map((movie, index) => (
                    <SwipeCard
                        key={movie.id}
                        movie={movie}
                        isTop={index === 0}
                        onSwipe={onSwipe}
                    />
                )).reverse()}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                <button
                    className="btn btn-icon btn-danger"
                    onClick={() => {
                        console.log('Nope button clicked for movie:', visibleCards[0].id);
                        onSwipe(visibleCards[0].id, false);
                    }}
                    aria-label="Nope"
                >
                    ✕
                </button>
                <button
                    className="btn btn-icon btn-success"
                    onClick={() => {
                        console.log('Like button clicked for movie:', visibleCards[0].id);
                        onSwipe(visibleCards[0].id, true);
                    }}
                    aria-label="Like"
                >
                    ♥
                </button>
            </div>
        </div>
    );
}
