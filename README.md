# 🎬 Binge Watchlist

A real-time Tinder-style movie swipe app where you and your friends can match on what to watch! Built with React 19, Socket.io, and TMDB API.

## Features

- **🎬 Real Movie Data** - Powered by TMDB API with thousands of movies
- **👥 Real-time Sync** - WebSocket-based room system for instant updates
- **🎯 Smart Filters** - Genre, language, year, and rating filters
- **👑 Admin Controls** - Room host approves filter changes
- **♾️ Infinite Scroll** - Movies load automatically as you swipe
- **🔗 Deep Link Sharing** - No login needed, just share the room link
- **❤️ Match Detection** - Celebrate when both users swipe right

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Get TMDB API Key

1. Go to https://www.themoviedb.org/signup
2. Create a free account
3. Navigate to Settings → API
4. Copy your **API Key (v3 auth)**

### 3. Configure Environment

Edit `.env` file and add your API key:

```env
VITE_TMDB_API_KEY=your_api_key_here
```

### 4. Run the App

You need to run BOTH the server and client:

**Terminal 1 - WebSocket Server:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 5. Open App

Navigate to http://localhost:5173

## How to Use

### Create a Room

1. Click **"Start Swiping 🎉"**
2. A unique room code is generated
3. Click the **🔗 Share** button to copy the link
4. Send to your friend!

### Filter Movies (With Admin Approval)

1. Click the **🎛️ Filters** button
2. Select genres, language, year range, minimum rating
3. **If you're the host**: Filters apply immediately
4. **If you're a guest**: Filters are proposed to the host for approval

### Swipe & Match

- **Drag right** or click **♥** to like
- **Drag left** or click **✕** to pass
- When both users like the same movie → **It's a Match! 🎉**
- View all matches by clicking the **❤️** button

## Project Structure

```
src/
├── components/       # React components
│   ├── FilterPanel.jsx
│   ├── LandingPage.jsx
│   ├── MatchCelebration.jsx
│   ├── MatchesList.jsx
│   ├── ShareModal.jsx
│   ├── SwipeCard.jsx
│   └── SwipeDeck.jsx
├── hooks/           # Custom React hooks
│   └── useSession.js
├── services/        # API services
│   └── tmdb.js
├── styles/          # CSS files
│   └── ...
└── App.jsx

server/
└── index.js         # Socket.io server
```

## Tech Stack

- **Frontend**: React 19, Vite 7
- **Backend**: Express, Socket.io
- **API**: TMDB (The Movie Database)
- **Real-time**: WebSockets
- **State**: React Hooks

## API Limits

TMDB free tier includes:
- 50,000 requests per day
- More than enough for personal use!

## Troubleshooting

### "Unable to connect to server"

Make sure the WebSocket server is running:
```bash
npm run server
```

### "Failed to fetch movies"

Check that your TMDB API key is correctly set in `.env`:
```env
VITE_TMDB_API_KEY=your_actual_key_here
```

Then restart the dev server (Ctrl+C and `npm run dev` again).

### No movies loading

1. Check browser console for errors
2. Verify `.env` file exists with valid API key
3. Test your API key at: https://api.themoviedb.org/3/movie/550?api_key=YOUR_KEY

## License

MIT
