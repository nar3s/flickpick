import { useState, useRef, useEffect } from 'react';
import '../styles/SwipeCard.css';

export function SwipeCard({ movie, onSwipe, isTop }) {
    const cardRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [swipeDirection, setSwipeDirection] = useState(null);

    const SWIPE_THRESHOLD = 120;
    const ROTATION_FACTOR = 0.1;

    const handleStart = (clientX, clientY) => {
        if (!isTop) return;
        setIsDragging(true);
        setStartPosition({ x: clientX, y: clientY });
    };

    const handleMove = (clientX, clientY) => {
        if (!isDragging || !isTop) return;

        const deltaX = clientX - startPosition.x;
        const deltaY = clientY - startPosition.y;

        setPosition({ x: deltaX, y: deltaY });

        if (deltaX > 50) {
            setSwipeDirection('right');
        } else if (deltaX < -50) {
            setSwipeDirection('left');
        } else {
            setSwipeDirection(null);
        }
    };

    const handleEnd = () => {
        if (!isDragging || !isTop) return;
        setIsDragging(false);

        if (Math.abs(position.x) > SWIPE_THRESHOLD) {
            const liked = position.x > 0;
            // Animate card flying off
            setPosition({
                x: position.x > 0 ? window.innerWidth : -window.innerWidth,
                y: position.y
            });
            setTimeout(() => {
                onSwipe(movie.id, liked);
            }, 200);
        } else {
            // Spring back
            setPosition({ x: 0, y: 0 });
            setSwipeDirection(null);
        }
    };

    // Mouse events
    const handleMouseDown = (e) => {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e) => {
        handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
        handleEnd();
    };

    // Touch events
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
        handleEnd();
    };

    // Add/remove global event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isDragging, position, startPosition]);

    const rotation = position.x * ROTATION_FACTOR;
    const likeOpacity = Math.min(Math.max(position.x / 100, 0), 1);
    const nopeOpacity = Math.min(Math.max(-position.x / 100, 0), 1);

    return (
        <div
            ref={cardRef}
            className={`swipe-card ${isDragging ? 'dragging' : ''} ${isTop ? 'is-top' : ''}`}
            style={{
                transform: isTop
                    ? `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`
                    : undefined,
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: isTop ? 10 : 1
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
        >
            {/* Movie Poster */}
            <div className="card-image">
                <img src={movie.poster} alt={movie.title} draggable="false" />
                <div className="card-gradient"></div>
            </div>

            {/* Like/Nope Overlays */}
            {isTop && (
                <>
                    <div className="swipe-indicator like" style={{ opacity: likeOpacity }}>
                        <span>LIKE</span>
                    </div>
                    <div className="swipe-indicator nope" style={{ opacity: nopeOpacity }}>
                        <span>NOPE</span>
                    </div>
                </>
            )}

            {/* Movie Info */}
            <div className="card-info">
                <div className="card-header">
                    <h2 className="card-title">{movie.title}</h2>
                    <span className="card-year">{movie.year}</span>
                </div>

                <div className="card-meta">
                    <div className="card-rating">
                        <span className="star">★</span>
                        <span>{movie.rating}</span>
                    </div>
                    <div className="card-genres">
                        {movie.genres.slice(0, 2).map((genre, idx) => (
                            <span key={idx} className="genre-tag">{genre}</span>
                        ))}
                    </div>
                </div>

                <p className="card-synopsis">{movie.synopsis}</p>
            </div>
        </div>
    );
}
