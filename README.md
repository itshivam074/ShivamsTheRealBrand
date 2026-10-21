# Shivam's The Real Brand — Gaming Portal Starter

An original, responsive browser gaming portal with a neon blue/purple theme, three playable mini-games, and a Node/Express account API.

## Included
- Responsive home page and game lobby
- Search + game category filters
- Playable Neon Snake, Memory Match, Tic-Tac-Toe
- Register/login API using bcrypt password hashes and JWT sessions
- SQLite user database and per-user game history
- Basic rate limiting and security headers
- Demo points only (not cash, not redeemable)

## Run locally
1. Install Node.js LTS from https://nodejs.org/
2. Extract this ZIP and open the folder in VS Code.
3. Open VS Code terminal in this folder.
4. Install dependencies:
   `npm install`
5. Copy `.env.example` to `.env`.
6. In `.env`, replace `JWT_SECRET` with a random secret at least 32 characters long.
7. Start:
   `npm start`
8. Open http://localhost:3000

## Important notes
- This is a starter project, not a production audited platform.
- Login requires the backend; do not open `public/index.html` directly as a file.
- The first user is not automatically an admin; no admin web panel is included yet.
- Password reset, email verification, OTP, account deletion, CSRF protections for cookie-based auth, production monitoring, backups and formal security review are not included.
- JWT is held in sessionStorage for this prototype. For production, consider secure HttpOnly cookies and CSRF protection.
- No deposits, withdrawals, betting, cash rewards or cash-out are implemented.
- Before public launch, review applicable laws, privacy requirements, domain/trademark availability, hosting and database security.


## Additional free mini-games
This version includes Rock Paper Scissors, 2048, Whack-a-Mole, Number Guess, Reaction Test, Simon Says, Math Sprint, Hangman, Click Challenge, and Odd One Out. All games use virtual scores only; there are no deposits, wagers, or cash prizes.
