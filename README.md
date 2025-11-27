# Capymorph
Educational game to teach language-learners about morphemes

## Tech Stack

- **Frontend**: React + TypeScript + Vite
  - **State Management**: Zustand
  - **Game Engine**: Phaser 3
- **Backend**: FastAPI (Python)

## Project Structure

```
.
├── frontend/          # React + TypeScript + Phaser frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── game/         # Phaser game scenes and config
│   │   ├── store/        # Zustand state management
│   │   ├── App.tsx       # Main App component
│   │   └── main.tsx      # Entry point
│   └── package.json
│
├── backend/           # FastAPI backend
│   ├── main.py           # FastAPI application
│   └── requirements.txt  # Python dependencies
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API will be available at http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5173

## Game Controls

- **Arrow Keys**: Move the player
- **Start/Pause/Resume**: Control game state via UI buttons

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /api/game/state` - Get initial game state

