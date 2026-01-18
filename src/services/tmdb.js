import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'cec29c5d0a0f742eab7684aab0fe2056';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Create axios instance
const tmdbApi = axios.create({
    baseURL: BASE_URL,
    params: {
        api_key: API_KEY
    }
});

/**
 * Fetch movies with filters
 * @param {number} page - Page number (1-indexed)
 * @param {object} filters - Filter options
 * @param {number[]} filters.genres - Array of genre IDs
 * @param {string} filters.language - Language code (e.g., 'en', 'hi')
 * @param {number} filters.year - Release year
 * @param {number} filters.minRating - Minimum vote average (0-10)
 * @returns {Promise<{results: Array, total_pages: number, total_results: number}>}
 */
export async function fetchMovies(page = 1, filters = {}) {
    try {
        const params = {
            page,
            sort_by: 'popularity.desc',
            include_adult: false,
            include_video: false,
            'vote_count.gte': 100, // Only movies with at least 100 votes
        };

        // Apply filters
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

        const response = await tmdbApi.get('/discover/movie', { params });

        return {
            results: response.data.results.map(transformMovie),
            total_pages: response.data.total_pages,
            total_results: response.data.total_results,
            page: response.data.page
        };
    } catch (error) {
        console.error('Error fetching movies:', error);
        throw new Error('Failed to fetch movies from TMDB');
    }
}

/**
 * Transform TMDB movie to our app format
 */
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

/**
 * Fetch all available genres
 * @returns {Promise<{id: number, name: string}[]>}
 */
export async function fetchGenres() {
    try {
        const response = await tmdbApi.get('/genre/movie/list');
        return response.data.genres;
    } catch (error) {
        console.error('Error fetching genres:', error);
        return [];
    }
}

/**
 * Fetch supported languages
 * @returns {Promise<{iso_639_1: string, english_name: string, name: string}[]>}
 */
export async function fetchLanguages() {
    try {
        const response = await tmdbApi.get('/configuration/languages');
        // Filter to most common languages
        const commonLanguages = ['en', 'es', 'fr', 'de', 'it', 'ja', 'ko', 'zh', 'hi', 'pt', 'ru'];
        return response.data
            .filter(lang => commonLanguages.includes(lang.iso_639_1))
            .sort((a, b) => a.english_name.localeCompare(b.english_name));
    } catch (error) {
        console.error('Error fetching languages:', error);
        // Fallback common languages
        return [
            { iso_639_1: 'en', english_name: 'English', name: 'English' },
            { iso_639_1: 'es', english_name: 'Spanish', name: 'Español' },
            { iso_639_1: 'fr', english_name: 'French', name: 'Français' },
            { iso_639_1: 'hi', english_name: 'Hindi', name: 'हिन्दी' },
            { iso_639_1: 'ja', english_name: 'Japanese', name: '日本語' },
            { iso_639_1: 'zh', english_name: 'Chinese', name: '中文' }
        ];
    }
}

/**
 * Get full image URL from TMDB path
 * @param {string} path - Image path from TMDB (e.g., '/abc123.jpg')
 * @param {string} size - Size (w92, w154, w185, w342, w500, w780, original)
 * @returns {string} - Full image URL
 */
export function getImageUrl(path, size = 'w500') {
    if (!path) return null;
    return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Search movies by title
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @returns {Promise<{results: Array, total_pages: number}>}
 */
export async function searchMovies(query, page = 1) {
    try {
        const response = await tmdbApi.get('/search/movie', {
            params: { query, page }
        });

        return {
            results: response.data.results.map(transformMovie),
            total_pages: response.data.total_pages,
            total_results: response.data.total_results
        };
    } catch (error) {
        console.error('Error searching movies:', error);
        throw new Error('Failed to search movies');
    }
}

/**
 * Get movie details by ID
 * @param {number} movieId - TMDB movie ID
 * @returns {Promise<object>}
 */
export async function getMovieDetails(movieId) {
    try {
        const response = await tmdbApi.get(`/movie/${movieId}`, {
            params: {
                append_to_response: 'credits,videos,images'
            }
        });

        return {
            ...transformMovie(response.data),
            runtime: response.data.runtime,
            tagline: response.data.tagline,
            genres: response.data.genres, // Full genre objects
            credits: response.data.credits,
            videos: response.data.videos?.results || [],
            images: response.data.images
        };
    } catch (error) {
        console.error('Error fetching movie details:', error);
        throw new Error('Failed to fetch movie details');
    }
}
