# RayEx Server API

Express TypeScript backend for the RayEx currency exchange platform.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Compression**: Compression middleware

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration

### Development

Start the development server with hot-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3003`

### Build

Compile TypeScript to JavaScript:
```bash
npm run build
```

### Production

Run the compiled JavaScript:
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /` - Server info
- `GET /health` - Health check with uptime

## Project Structure

```
server/
├── src/
│   └── index.ts               # Express app entry point
├── .env                       # Environment variables
├── .env.example               # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

- `PORT` - Server port (default: 3003)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens
- `CORS_ORIGIN` - Allowed CORS origin

## License

ISC
