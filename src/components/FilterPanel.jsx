import { useState, useEffect } from 'react';
import '../styles/FilterPanel.css';

export function FilterPanel({
    isHost,
    currentFilters,
    pendingFilters,
    availableGenres,
    availableLanguages,
    onApplyFilters,
    onApproveFilters,
    onRejectFilters,
    onClose
}) {
    const [filters, setFilters] = useState(currentFilters || {
        genres: [],
        language: null,
        year: null,
        minRating: 0
    });

    useEffect(() => {
        if (currentFilters) {
            setFilters(currentFilters);
        }
    }, [currentFilters]);

    const handleGenreToggle = (genreId) => {
        setFilters(prev => ({
            ...prev,
            genres: prev.genres.includes(genreId)
                ? prev.genres.filter(id => id !== genreId)
                : [...prev.genres, genreId]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onApplyFilters(filters);
        // Always close the dialog on save, regardless of host status
        // The user request was "when i save the filters close the dialog"
        onClose();
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

    return (
        <div className="filter-modal-overlay" onClick={onClose}>
            <div className="filter-modal" onClick={e => e.stopPropagation()}>
                <div className="filter-header">
                    <h2>🎬 Filters</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Pending filter notification (host only) */}
                {isHost && pendingFilters && (
                    <div className="pending

-filters-notice">
                        <p>⏳ A user proposed filter changes</p>
                        <div className="filter-actions">
                            <button
                                className="btn btn-success btn-sm"
                                onClick={() => {
                                    onApproveFilters();
                                    onClose();
                                }}
                            >
                                ✓ Approve
                            </button>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                    onRejectFilters();
                                }}
                            >
                                ✕ Reject
                            </button>
                        </div>
                    </div>
                )}

                {/* Non-host pending notice */}
                {!isHost && pendingFilters && (
                    <div className="pending-filters-notice info">
                        <p>⏳ Your filter changes are pending host approval</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="filter-form">
                    {/* Genres */}
                    <div className="filter-section">
                        <label className="filter-label">Genres</label>
                        <div className="genre-grid">
                            {availableGenres.map(genre => (
                                <button
                                    key={genre.id}
                                    type="button"
                                    className={`genre-chip ${filters.genres.includes(genre.id) ? 'active' : ''}`}
                                    onClick={() => handleGenreToggle(genre.id)}
                                >
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div className="filter-section">
                        <label className="filter-label" htmlFor="language">Language</label>
                        <select
                            id="language"
                            className="filter-select"
                            value={filters.language || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value || null }))}
                        >
                            <option value="">Any Language</option>
                            {availableLanguages.map(lang => (
                                <option key={lang.iso_639_1} value={lang.iso_639_1}>
                                    {lang.english_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Year */}
                    <div className="filter-section">
                        <label className="filter-label" htmlFor="year">Release Year</label>
                        <select
                            id="year"
                            className="filter-select"
                            value={filters.year || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value ? parseInt(e.target.value) : null }))}
                        >
                            <option value="">Any Year</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Minimum Rating */}
                    <div className="filter-section">
                        <label className="filter-label">
                            Minimum Rating: <span className="rating-value">{filters.minRating.toFixed(1)} ★</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={filters.minRating}
                            onChange={(e) => setFilters(prev => ({ ...prev, minRating: parseFloat(e.target.value) }))}
                            className="rating-slider"
                        />
                        <div className="slider-labels">
                            <span>0</span>
                            <span>5</span>
                            <span>10</span>
                        </div>
                    </div>

                    <div className="filter-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                        >
                            {isHost ? 'Apply Filters' : 'Propose Filters'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
