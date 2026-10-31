# KKM Games frontend (static site, deploy on Vercel)
No build step. Edit js/config.js -> set KKM_API_URL to your Render backend address (no trailing slash), then deploy this folder on Vercel (Framework Preset: Other).

Online multiplayer (Tic Tac Toe, Rock Paper Scissors, Memory Match, Sliding Puzzle; Ninja Ramen Rush is single-player):
- js/mp.js        connection, online list, challenges, friend links and the match frame (players, status, buttons)
- js/mp-games.js  the board for each online game (one small function per game)
Friend links look like  https://YOUR-SITE.vercel.app/#/join/ABC123

Local: VS Code Live Server (port 5500), with the backend running on http://localhost:5000. On localhost the site finds the backend by itself.
