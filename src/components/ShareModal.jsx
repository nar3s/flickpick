import { useState } from 'react';
import '../styles/ShareModal.css';

export function ShareModal({ shareUrl, roomId, userCount, onClose }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">
                    ✕
                </button>

                <div className="modal-header">
                    <span className="share-icon">🔗</span>
                    <h2>Share with a Friend</h2>
                    <p>Send this link so they can swipe with you!</p>
                </div>

                {/* Connection status */}
                <div className="connection-info">
                    <span className={`connection-dot ${userCount > 1 ? 'connected' : 'waiting'}`}></span>
                    <span className="connection-text">
                        {userCount > 1
                            ? `${userCount} users connected`
                            : 'Waiting for friend to join...'}
                    </span>
                </div>

                <div className="share-link-container">
                    <div className="room-id-display">
                        <span className="room-label">Room Code</span>
                        <span className="room-code">{roomId}</span>
                    </div>

                    <div className="share-url-box">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="share-url-input"
                        />
                        <button
                            className={`copy-button ${copied ? 'copied' : ''}`}
                            onClick={handleCopy}
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="share-instructions">
                    <h3>How it works:</h3>
                    <ol>
                        <li>Share this link with your friend</li>
                        <li>Both of you swipe on movies <strong>in real-time</strong></li>
                        <li>When you both swipe right, it's a match! 🎉</li>
                    </ol>
                </div>

                <button className="btn btn-secondary" onClick={onClose}>
                    Got it!
                </button>
            </div>
        </div>
    );
}
