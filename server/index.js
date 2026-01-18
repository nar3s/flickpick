import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import axios from 'axios';

// TMDB API Configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'cec29c5d0a0f742eab7684aab0fe2056';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const app = express();
app.use(cors());

// TMDB helper functions
function getImageUrl(path, size = 'w500') {
    if (!path) return null;
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

function transformMovie(tmdbMovie) {
    return {
        id: tmdbMovie.id,
        title: tmdbMovie.title,
        year: tmdbMovie.release_date ? new Date(tmdbMovie.release_date).getFullYear() : null,
        rating: tmdbMovie.vote_average ? parseFloat(tmdbMovie.vote_average.toFixed(1)) : 0,
        genres: tmdbMovie.genre_ids || [],
        poster: tmdbMovie.poster_path ? getImageUrl(tmdbMovie.poster_path, 'w500') : null,
        backdrop: tmdbMovie.backdrop_path ? getImageUrl(tmdbMovie.backdrop_path, 'w1280') : null,
        synopsis: tmdbMovie.overview || 'No synopsis available.',
        popularity: tmdbMovie.popularity
    };
}

async function fetchMoviesFromTMDB(page = 1, filters = {}) {
    try {
        const params = {
            api_key: TMDB_API_KEY,
            page,
            sort_by: 'popularity.desc',
            include_adult: false,
            include_video: false,
            'vote_count.gte': 100
        };

        if (filters.genres && filters.genres.length > 0) {
            params.with_genres = filters.genres.join(',');
        }
        if (filters.language) {
            params.with_original_language = filters.language;
        }
        if (filters.year) {
            params.primary_release_year = filters.year;
        }
        if (filters.minRating) {
            params['vote_average.gte'] = filters.minRating;
        }

        const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, { params });

        return {
            results: response.data.results.map(transformMovie),
            total_pages: response.data.total_pages,
            total_results: response.data.total_results,
            page: response.data.page
        };
    } catch (error) {
        console.error('Error fetching movies from TMDB:', error.message);
        return { results: [], total_pages: 0, total_results: 0, page };
    }
}

async function fetchGenresFromTMDB() {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
            params: { api_key: TMDB_API_KEY }
        });
        return response.data.genres;
    } catch (error) {
        console.error('Error fetching genres:', error.message);
        return [];
    }
}

async function fetchLanguagesFromTMDB() {
    try {
        const response = await axios.get(`${TMDB_BASE_URL}/configuration/languages`, {
            params: { api_key: TMDB_API_KEY }
        });
        const commonLanguages = ['en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'hi', 'pt', 'ru'];
        return response.data
            .filter(lang => commonLanguages.includes(lang.iso_639_1))
            .sort((a, b) => a.english_name.localeCompare(b.english_name));
    } catch (error) {
        console.error('Error fetching languages:', error.message);
        return [
            { iso_639_1: 'en', english_name: 'English', name: 'English' },
            { iso_639_1: 'hi', english_name: 'Hindi', name: 'हिन्दी' }
        ];
    }
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST"]
    }
});

// Store room data in memory
// In production, use Redis or a database
const rooms = new Map();

/*
Room structure:
{
  id: string,
  hostId: string, // Socket ID of room creator (admin) - Transient
  hostUserId: string, // Persistent User ID of room creator
  users: Map<socketId, { id, userId, swipes: { movieId: boolean } }>,
  matches: number[], // movieIds that matched
  filters: {
    genres: number[],
    language: string,
    year: number,
    minRating: number
  },
  pendingFilters: null | { genres, language, year, minRating, proposedBy: socketId },
  currentPage: number, // Current TMDB API page
  swipedMovieIds: Set<number>, // Track ALL movies presented to this room to prevent repetition
  createdAt: Date
}
*/

// Generate random room ID
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Check for matches in a room
function checkForMatch(room, movieId) {
    const users = Array.from(room.users.values());
    if (users.length < 2) return false;

    // Check if all users have swiped right on this movie
    const allLiked = users.every(user => {
        // Ensure type compatibility (string vs number)
        const userLiked = user.swipes[movieId] === true || user.swipes[String(movieId)] === true;

        console.log(`Debug Match: User ${user.id} (Persistent: ${user.userId}) liked movie ${movieId}? ${userLiked}. (Swipes: ${JSON.stringify(user.swipes)})`);

        return userLiked;
    });

    if (allLiked && !room.matches.includes(movieId)) {
        room.matches.push(movieId);
        return true;
    }

    return false;
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create a new room
    socket.on('create-room', async ({ userId }, callback) => {
        // userId is optional but recommended for persistence
        const finalUserId = userId || `user_${socket.id}`;

        const roomId = generateRoomId();
        const room = {
            id: roomId,
            hostId: socket.id,
            hostUserId: finalUserId, // Store persistent ID
            users: new Map(),
            matches: [],
            movieQueue: [], // Store movies server-side for sync
            seenMovieIds: new Set(), // Track currently queued movies
            swipedMovieIds: new Set(), // Track ALL movies ever seen in this session (filter-reset aware)
            filters: {
                genres: [],
                language: null,
                year: null,
                minRating: 0
            },
            pendingFilters: null,
            currentPage: 1,
            isLoadingMovies: false,
            createdAt: new Date()
        };

        room.users.set(socket.id, {
            id: socket.id,
            userId: finalUserId,
            swipes: {}
        });

        rooms.set(roomId, room);
        socket.join(roomId);
        socket.roomId = roomId;

        console.log(`Room created: ${roomId} by ${socket.id} (host, userId: ${finalUserId})`);

        // Fetch initial movies
        const movieData = await fetchMoviesFromTMDB(1, room.filters);
        room.movieQueue = movieData.results;
        movieData.results.forEach(m => {
            room.seenMovieIds.add(m.id);
            room.swipedMovieIds.add(m.id);
        });

        callback({
            success: true,
            roomId,
            isHost: true,
            userCount: 1,
            filters: room.filters,
            movies: room.movieQueue // Send movies to client
        });
    });

    // Join an existing room
    socket.on('join-room', ({ roomId, userId }, callback) => {
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const finalUserId = userId || `user_${socket.id}`;

        // Check if this is the host rejoining
        let isHost = false;
        if (room.hostUserId === finalUserId) {
            room.hostId = socket.id; // Reclaim host socket ID
            isHost = true;
            console.log(`Host reclaimed room ${roomId} (userId: ${finalUserId}, socket: ${socket.id})`);
        }

        room.users.set(socket.id, {
            id: socket.id,
            userId: finalUserId,
            swipes: {}
        });

        socket.join(roomId);
        socket.roomId = roomId;

        const userCount = room.users.size;

        console.log(`User ${socket.id} (userId: ${finalUserId}) joined room ${roomId}. Users: ${userCount}`);

        // Notify others in the room
        socket.to(roomId).emit('user-joined', {
            userCount,
            userId: socket.id
        });

        // Get existing matches and other users' swipe counts
        const otherUsers = Array.from(room.users.entries())
            .filter(([id]) => id !== socket.id)
            .map(([id, user]) => ({
                id,
                swipeCount: Object.keys(user.swipes).length
            }));

        callback({
            success: true,
            roomId,
            isHost, // Return authoritative host status
            userCount,
            matches: room.matches,
            filters: room.filters,
            pendingFilters: room.pendingFilters,
            otherUsers,
            movies: room.movieQueue // Send same movies to joining user
        });
    });

    // Record a swipe
    socket.on('swipe', ({ movieId, liked }, callback) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const user = room.users.get(socket.id);
        if (!user) {
            callback({ success: false, error: 'User not in room' });
            return;
        }

        // Record the swipe
        user.swipes[movieId] = liked;

        // Note: We don't remove from swipedMovieIds here, it's already added when fetched

        console.log(`User ${socket.id} swiped ${liked ? 'RIGHT' : 'LEFT'} on movie ${movieId} in room ${roomId}`);

        // Notify other users that this user swiped (without revealing the choice)
        socket.to(roomId).emit('user-swiped', {
            userId: socket.id,
            movieId,
            swipeCount: Object.keys(user.swipes).length
        });

        // Check for match if this was a "like"
        let isMatch = false;
        if (liked) {
            isMatch = checkForMatch(room, movieId);

            if (isMatch) {
                console.log(`MATCH! Movie ${movieId} in room ${roomId}`);
                // Notify ALL users in the room about the match
                io.to(roomId).emit('match', { movieId });
            }
        }

        callback({
            success: true,
            isMatch,
            totalMatches: room.matches.length
        });
    });

    // Propose filters (non-admin)
    socket.on('propose-filters', async (filters, callback) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        // Non-host proposes, host can apply directly
        // Note: room.hostId is reliable now due to reconnection logic
        if (socket.id === room.hostId) {
            room.filters = filters;
            room.pendingFilters = null;
            room.currentPage = 1;
            room.seenMovieIds.clear(); // Reset queue tracking
            room.swipedMovieIds.clear(); // Reset history tracking on new filter
            room.movieQueue = []; // Clear current queue

            // Fetch new movies with updated filters
            const movieData = await fetchMoviesFromTMDB(1, filters);
            room.movieQueue = movieData.results;
            room.movieQueue.forEach(m => {
                room.seenMovieIds.add(m.id);
                room.swipedMovieIds.add(m.id);
            });

            // Notify all users with new movies
            io.to(roomId).emit('filters-updated', {
                filters,
                movies: room.movieQueue
            });

            console.log(`Host ${socket.id} updated filters in room ${roomId}`);

            callback({ success: true, applied: true, movies: room.movieQueue });
        } else {
            room.pendingFilters = {
                ...filters,
                proposedBy: socket.id
            };

            // Notify host about pending filter proposal
            io.to(room.hostId).emit('filter-proposal', {
                filters: room.pendingFilters,
                proposedBy: socket.id
            });

            console.log(`User ${socket.id} proposed filters in room ${roomId}, awaiting host approval`);

            callback({ success: true, applied: false, pending: true });
        }
    });

    // Approve filters (admin only)
    socket.on('approve-filters', async (callback) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        // Only host can approve
        if (socket.id !== room.hostId) {
            callback({ success: false, error: 'Only host can approve filters' });
            return;
        }

        if (!room.pendingFilters) {
            callback({ success: false, error: 'No pending filters' });
            return;
        }

        // Apply the pending filters
        const { proposedBy, ...filters } = room.pendingFilters;
        room.filters = filters;
        room.pendingFilters = null;
        room.currentPage = 1;
        room.seenMovieIds.clear();
        room.swipedMovieIds.clear();
        room.movieQueue = [];

        // Fetch new movies with updated filters
        const movieData = await fetchMoviesFromTMDB(1, filters);
        room.movieQueue = movieData.results;
        room.movieQueue.forEach(m => {
            room.seenMovieIds.add(m.id);
            room.swipedMovieIds.add(m.id);
        });

        // Notify all users with new movies
        io.to(roomId).emit('filters-updated', {
            filters,
            movies: room.movieQueue
        });

        console.log(`Host ${socket.id} approved filters in room ${roomId}`);

        callback({ success: true, movies: room.movieQueue });
    });

    // Reject filters (admin only)
    socket.on('reject-filters', (callback) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        // Only host can reject
        if (socket.id !== room.hostId) {
            callback({ success: false, error: 'Only host can reject filters' });
            return;
        }

        if (!room.pendingFilters) {
            callback({ success: false, error: 'No pending filters' });
            return;
        }

        const proposedBy = room.pendingFilters.proposedBy;
        room.pendingFilters = null;

        // Notify the proposer
        io.to(proposedBy).emit('filter-proposal-rejected');

        console.log(`Host ${socket.id} rejected filters in room ${roomId}`);

        callback({ success: true });
    });

    // Request next page of movies (for infinite scroll)
    socket.on('request-next-page', async (callback) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        // Prevent duplicate requests
        if (room.isLoadingMovies) {
            callback({ success: false, error: 'Already loading movies' });
            return;
        }

        room.isLoadingMovies = true;

        let newMovies = [];
        let attempts = 0;
        const MAX_ATTEMPTS = 5; // Prevent infinite loops
        const MAX_PAGES = 500; // TMDB limit

        try {
            // Keep fetching until we find enough new movies or hit limits
            while (newMovies.length < 5 && attempts < MAX_ATTEMPTS && room.currentPage < MAX_PAGES) {
                room.currentPage += 1;
                attempts++;

                console.log(`Room ${roomId} requesting page ${room.currentPage} (Attempt ${attempts})`);

                const movieData = await fetchMoviesFromTMDB(room.currentPage, room.filters);

                // Filter out already seen movies ANYWHERE in this session
                const uniqueMovies = movieData.results.filter(m => !room.swipedMovieIds.has(m.id));

                // Add new unique movies to the batch
                newMovies = [...newMovies, ...uniqueMovies];

                // Mark them as seen
                uniqueMovies.forEach(m => {
                    room.seenMovieIds.add(m.id);
                    room.swipedMovieIds.add(m.id);
                });

                // If we got no results at all from TMDB, we might be at the end
                if (movieData.results.length === 0) {
                    break;
                }
            }
        } catch (err) {
            console.error(`Error fetching next page for room ${roomId}:`, err);
        }

        room.movieQueue = [...room.movieQueue, ...newMovies];
        room.isLoadingMovies = false;

        if (newMovies.length > 0) {
            // Broadcast new movies to ALL users in room
            io.to(roomId).emit('movies-loaded', {
                movies: room.movieQueue,
                page: room.currentPage
            });
        }

        callback({
            success: true,
            page: room.currentPage,
            movies: room.movieQueue
        });
    });

    // Get room status
    socket.on('get-room-status', (callback) => {
        const roomId = socket.roomId;
        const room = rooms.get(roomId);

        if (!room) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        callback({
            success: true,
            userCount: room.users.size,
            matches: room.matches,
            filters: room.filters,
            pendingFilters: room.pendingFilters,
            currentPage: room.currentPage,
            isHost: socket.id === room.hostId
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        const roomId = socket.roomId;
        if (roomId) {
            const room = rooms.get(roomId);
            if (room) {
                room.users.delete(socket.id);

                const userCount = room.users.size;

                // Notify remaining users
                socket.to(roomId).emit('user-left', {
                    userId: socket.id,
                    userCount
                });

                // Clean up empty rooms after a delay
                if (userCount === 0) {
                    setTimeout(() => {
                        const currentRoom = rooms.get(roomId);
                        if (currentRoom && currentRoom.users.size === 0) {
                            rooms.delete(roomId);
                            console.log(`Room ${roomId} deleted (empty)`);
                        }
                    }, 60000); // Keep room for 1 minute in case of reconnect
                }
            }
        }
    });
});

// REST endpoints for genres and languages
app.get('/api/genres', async (req, res) => {
    const genres = await fetchGenresFromTMDB();
    res.json(genres);
});

app.get('/api/languages', async (req, res) => {
    const languages = await fetchLanguagesFromTMDB();
    res.json(languages);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: rooms.size,
        uptime: process.uptime()
    });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
    console.log(`
🎬 FlickPick WebSocket Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server running on http://localhost:${PORT}
Health check: http://localhost:${PORT}/health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
