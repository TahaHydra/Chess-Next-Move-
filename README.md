# Chess Next Move

An interactive, premium web application that analyzes chess game screenshots (from Chess.com, Lichess, or custom setups) using client-side image processing, optional Gemini Vision AI, and Stockfish.js running in a Web Worker.

## Features
- **Drag & Drop / Paste**: Paste screenshots directly from the clipboard.
- **Board Grid Aligner**: Easy-to-use, interactive grid overlays to align the board coordinates perfectly.
- **Dual Recognition System**:
  - **Local Canvas Classifier**: Extracts piece signatures based on background-subtracted shape contours.
  - **Gemini AI Vision Classifier**: Optionally parse boards using a Gemini API key.
- **Stockfish.js Integration**: Run engine evaluations client-side to see the top 6 candidate moves and evaluation bar.
- **Interactive Play**: Play out lines directly on a virtual chessboard.
