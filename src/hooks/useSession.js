import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = 'http://localhost:3001';

export function useSession() {
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [roomId, setRoomId] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [userCount, setUserCount] = useState(0);
    const [movieQueue, setMovieQueue] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMovies, setIsLoadingMovies] = useState(false);
    const [mySwipes, setMySwipes] = useState({});
    const [matches, setMatches] = useState([]);
    const [newMatch, setNewMatch] = useState(null);
    const [isReady, setIsReady] = useState(false);
    const [connectionError, setConnectionError] = useState(null);

    // Filter state
    const [filters, setFilters] = useState({
        genres: [],
        language: null,
        year: null,
        minRating: 0
    });
    const [pendingFilters, setPendingFilters] = useState(null);
    const [availableGenres, setAvailableGenres] = useState([]);
    const [availableLanguages, setAvailableLanguages] = useState([]);

    // Load genres and languages from server
    useEffect(() => {
        axios.get(`${SOCKET_URL}/api/genres`)
            .then(res => setAvailableGenres(res.data))
            .catch(err => console.error('Failed to load genres:', err));
        axios.get(`${SOCKET_URL}/api/languages`)
            .then(res => setAvailableLanguages(res.data))
            .catch(err => console.error('Failed to load languages:', err));
    }, []);

    // Initialize socket connection
    useEffect(() => {
        // Prevent multiple connections
        if (socketRef.current) return;

        const socket = io(SOCKET_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            transports: ['websocket', 'polling'] // Explicit transports for stability
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server:', socket.id);
            setIsConnected(true);
            setConnectionError(null);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            setConnectionError('Unable to connect to server. Make sure the server is running.');
        });

        // Listen for other user joining
        socket.on('user-joined', ({ userCount: count, userId }) => {
            console.log(`User ${userId} joined. Total users: ${count}`);
            setUserCount(count);
        });

        // Listen for user leaving
        socket.on('user-left', ({ userId, userCount: count }) => {
            console.log(`User ${userId} left. Total users: ${count}`);
            setUserCount(count);
        });

        // Listen for matches
        socket.on('match', ({ movieId }) => {
            console.log('Match detected for movie:', movieId);
            const matchedMovie = movieQueue.find(m => m.id === movieId);
            if (matchedMovie) {
                setMatches(prev => {
                    if (prev.find(m => m.id === movieId)) return prev;
                    return [...prev, matchedMovie];
                });
                setNewMatch(matchedMovie);
            }
        });

        // Listen for filter updates (includes movies from server)
        socket.on('filters-updated', ({ filters: newFilters, movies }) => {
            console.log('Filters updated:', newFilters);
            setFilters(newFilters);
            setPendingFilters(null);
            if (movies) {
                setMovieQueue(movies);
                setCurrentIndex(0);
            }
        });

        // Listen for movies loaded from server (pagination)
        socket.on('movies-loaded', ({ movies, page }) => {
            console.log('Movies loaded from server, page:', page);
            setMovieQueue(movies);
            setCurrentPage(page);
        });

        // Listen for filter proposals (host only)
        socket.on('filter-proposal', ({ filters: proposedFilters, proposedBy }) => {
            console.log('Filter proposal received:', proposedFilters);
            setPendingFilters({ ...proposedFilters, proposedBy });
        });

        // Listen for rejected proposals
        socket.on('filter-proposal-rejected', () => {
            console.log('Your filter proposal was rejected');
            setPendingFilters(null);
        });

        return () => {
            socket.disconnect();
        };
    }, []); // Don't include movieQueue or loadMovies - they change frequently and will cause socket to disconnect

    // Create a new room
    const createRoom = useCallback(() => {
        return new Promise((resolve, reject) => {
            const socket = socketRef.current;
            if (!socket) {
                reject(new Error('Socket not initialized'));
                return;
            }

            socket.connect();

            const doCreate = () => {
                socket.emit('create-room', (response) => {
                    if (response.success) {
                        setRoomId(response.roomId);
                        setIsHost(response.isHost);
                        setUserCount(response.userCount);
                        setFilters(response.filters);
                        setIsReady(true);
                        setCurrentIndex(0);
                        setMySwipes({});
                        setMatches([]);
                        setCurrentPage(1);

                        // Update URL with room ID
                        window.location.hash = `room=${response.roomId}`;

                        // Use movies from server (synchronized across all users)
                        if (response.movies) {
                            setMovieQueue(response.movies);
                        }

                        resolve(response);
                    } else {
                        reject(new Error(response.error));
                    }
                });
            };

            socket.once('connect', doCreate);

            if (socket.connected) {
                doCreate();
            }
        });
    }, []);

    // Join an existing room
    const joinRoom = useCallback((roomIdToJoin) => {
        return new Promise((resolve, reject) => {
            const socket = socketRef.current;
            if (!socket) {
                reject(new Error('Socket not initialized'));
                return;
            }

            socket.connect();

            const doJoin = () => {
                socket.emit('join-room', roomIdToJoin, (response) => {
                    if (response.success) {
                        setRoomId(response.roomId);
                        setIsHost(response.isHost);
                        setUserCount(response.userCount);
                        setFilters(response.filters);
                        setPendingFilters(response.pendingFilters);
                        setIsReady(true);
                        setCurrentIndex(0);
                        setMySwipes({});
                        setCurrentPage(1);

                        // Use movies from server (synchronized across all users)
                        if (response.movies) {
                            setMovieQueue(response.movies);
                        }

                        // Match movieIds to movie objects for existing matches
                        if (response.matches && response.matches.length > 0 && response.movies) {
                            const matchedMovies = response.movies.filter(m => response.matches.includes(m.id));
                            setMatches(matchedMovies);
                        }

                        window.location.hash = `room=${response.roomId}`;

                        resolve(response);
                    } else {
                        reject(new Error(response.error || 'Failed to join room'));
                    }
                });
            };

            const checkConnectionAndJoin = () => {
                const socket = socketRef.current;
                if (socket && socket.connected) {
                    doJoin();
                } else if (socket) {
                    socket.once('connect', doJoin);
                    socket.connect(); // Force connect if needed
                } else {
                    // Should actally not happen due to layout, but just in case
                    setTimeout(checkConnectionAndJoin, 500);
                }
            };

            checkConnectionAndJoin();
        });
    }, []);

    // Record a swipe
    const recordSwipe = useCallback((movieId, liked) => {
        return new Promise((resolve, reject) => {
            console.log('Recording swipe:', { movieId, liked });
            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                console.error('Socket not connected during swipe');
                reject(new Error('Not connected to server'));
                return;
            }

            socket.emit('swipe', { movieId, liked }, (response) => {
                console.log('Swipe response:', response);
                if (response.success) {
                    setMySwipes(prev => ({ ...prev, [movieId]: liked }));
                    setCurrentIndex(prev => prev + 1);

                    // Check if we need to load more movies (infinite scroll)
                    if (movieQueue.length - currentIndex < 5) {
                        requestNextPage();
                    }

                    resolve(response);
                } else {
                    console.error('Swipe error:', response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }, [movieQueue.length, currentIndex]);

    // Request next page of movies (server handles fetching and broadcasting)
    const requestNextPage = useCallback(() => {
        const socket = socketRef.current;
        if (!socket || !socket.connected || isLoadingMovies) return;

        setIsLoadingMovies(true);
        socket.emit('request-next-page', (response) => {
            setIsLoadingMovies(false);
            if (response.success && response.movies) {
                setCurrentPage(response.page);
                setMovieQueue(response.movies);
            }
        });
    }, [isLoadingMovies]);

    // Propose or apply filters
    const proposeFilters = useCallback((newFilters) => {
        return new Promise((resolve, reject) => {
            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                reject(new Error('Not connected to server'));
                return;
            }

            socket.emit('propose-filters', newFilters, (response) => {
                if (response.success) {
                    if (response.applied) {
                        // Host applied directly - use movies from server
                        setFilters(newFilters);
                        setCurrentIndex(0);
                        if (response.movies) {
                            setMovieQueue(response.movies);
                        }
                    } else if (response.pending) {
                        // Non-host proposed, waiting for approval
                        setPendingFilters({ ...newFilters, proposedBy: socket.id });
                    }
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, []);

    // Approve filters (host only)
    const approveFilters = useCallback(() => {
        return new Promise((resolve, reject) => {
            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                reject(new Error('Not connected to server'));
                return;
            }

            socket.emit('approve-filters', (response) => {
                if (response.success) {
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, []);

    // Reject filters (host only)
    const rejectFilters = useCallback(() => {
        return new Promise((resolve, reject) => {
            const socket = socketRef.current;
            if (!socket || !socket.connected) {
                reject(new Error('Not connected to server'));
                return;
            }

            socket.emit('reject-filters', (response) => {
                if (response.success) {
                    setPendingFilters(null);
                    resolve(response);
                } else {
                    reject(new Error(response.error));
                }
            });
        });
    }, []);

    // Clear the new match notification
    const clearNewMatch = useCallback(() => {
        setNewMatch(null);
    }, []);

    // Get share URL
    const getShareUrl = useCallback(() => {
        return `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    }, [roomId]);

    // Reset session
    const resetSession = useCallback(() => {
        const socket = socketRef.current;
        if (socket) {
            socket.disconnect();
        }

        setRoomId(null);
        setIsHost(false);
        setUserCount(0);
        setMovieQueue([]);
        setCurrentIndex(0);
        setCurrentPage(1);
        setMySwipes({});
        setMatches([]);
        setNewMatch(null);
        setIsReady(false);
        setFilters({ genres: [], language: null, year: null, minRating: 0 });
        setPendingFilters(null);
        window.location.hash = '';
    }, []);

    // Get room ID from URL on mount
    const getRoomIdFromUrl = useCallback(() => {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#room=')) {
            return hash.substring(6);
        }
        return null;
    }, []);

    // Computed values
    const currentMovie = movieQueue[currentIndex];
    const hasMoreMovies = currentIndex < movieQueue.length;
    const remainingMovies = movieQueue.length - currentIndex;

    return {
        // Connection state
        isConnected,
        connectionError,

        // Room state
        roomId,
        isHost,
        isReady,
        userCount,

        // Movie state
        movieQueue,
        currentIndex,
        currentMovie,
        remainingMovies,
        hasMoreMovies,
        isLoadingMovies,

        // Swipe state
        mySwipes,
        matches,
        newMatch,

        // Filter state
        filters,
        pendingFilters,
        availableGenres,
        availableLanguages,

        // Actions
        createRoom,
        joinRoom,
        recordSwipe,
        proposeFilters,
        approveFilters,
        rejectFilters,
        clearNewMatch,
        getShareUrl,
        resetSession,
        getRoomIdFromUrl
    };
}
