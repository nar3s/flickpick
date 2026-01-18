import '../styles/App.css';

export function PendingFilterBanner({
    pendingFilters,
    isHost,
    onApprove,
    onReject
}) {
    if (!pendingFilters) return null;

    // Filters to display string
    const getFilterSummary = () => {
        const parts = [];
        if (pendingFilters.genres && pendingFilters.genres.length > 0) {
            parts.push(`${pendingFilters.genres.length} Genres`);
        }
        if (pendingFilters.language) {
            parts.push(`Language: ${pendingFilters.language}`);
        }
        if (pendingFilters.year) {
            parts.push(`Year: ${pendingFilters.year}`);
        }
        if (pendingFilters.minRating > 0) {
            parts.push(`Rating: ${pendingFilters.minRating}+`);
        }
        return parts.join(' • ') || 'New Filters';
    };

    return (
        <div className="pending-filter-banner">
            <div className="pending-filter-content">
                <span className="pending-icon">🗳️</span>
                <div className="pending-info">
                    <span className="pending-title">
                        {isHost ? 'New Filter Proposal' : 'Waiting for Approval'}
                    </span>
                    <span className="pending-details">
                        {getFilterSummary()}
                    </span>
                </div>
            </div>

            {isHost && (
                <div className="pending-actions">
                    <button
                        className="btn-mini btn-approve"
                        onClick={onApprove}
                        title="Accept filters"
                    >
                        ✓ Accept
                    </button>
                    <button
                        className="btn-mini btn-reject"
                        onClick={onReject}
                        title="Reject filters"
                    >
                        ✗ Reject
                    </button>
                </div>
            )}
        </div>
    );
}
