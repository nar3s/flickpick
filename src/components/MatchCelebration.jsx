import { useEffect, useState } from 'react';
import '../styles/MatchCelebration.css';

export function MatchCelebration({ movie, onClose }) {
    const [confetti, setConfetti] = useState([]);

    useEffect(() => {
        // Generate confetti particles
        const particles = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.5,
            duration: 2 + Math.random() * 2,
            color: ['#8b5cf6', '#ec4899', '#10b981', '#fbbf24', '#3b82f6'][Math.floor(Math.random() * 5)]
        }));
        setConfetti(particles);

        // Auto-close removed to let users decide when to proceed
        // const timer = setTimeout(onClose, 4000);
        // return () => clearTimeout(timer);
    }, []);

    return (
        <div className="match-overlay" onClick={onClose}>
            {/* Confetti */}
            <div className="confetti-container">
                {confetti.map(particle => (
                    <div
                        key={particle.id}
                        className="confetti"
                        style={{
                            left: `${particle.left}%`,
                            animationDelay: `${particle.delay}s`,
                            animationDuration: `${particle.duration}s`,
                            backgroundColor: particle.color
                        }}
                    />
                ))}
            </div>

            {/* Match content */}
            <div className="match-content">
                <div className="match-hearts">
                    <span className="heart left">❤️</span>
                    <span className="heart right">❤️</span>
                </div>

                <h1 className="match-title">It's a Match!</h1>
                <p className="match-subtitle">You both want to watch</p>

                <div className="match-movie">
                    <img src={movie.poster} alt={movie.title} className="match-poster" />
                    <h2 className="match-movie-title">{movie.title}</h2>
                    <div className="match-movie-meta">
                        <span className="match-year">{movie.year}</span>
                        <span className="match-rating">★ {movie.rating}</span>
                    </div>
                </div>

                <div className="match-actions">
                    <a
                        href={`https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+movie`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-success"
                    >
                        🍿 Watch Now
                    </a>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Keep Swiping
                    </button>
                </div>
            </div>
        </div>
    );
}
