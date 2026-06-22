# Chess Next Move - Project Plan

## Overview
A web-based chess analysis tool that allows users to upload screenshots of chess boards (supporting Chess.com and Lichess styles). The app identifies piece positions using computer vision (conceptually) and provides the top 6 engine moves using Stockfish, helping users understand where games flipped and how to improve.

## Core Features
1. **Board Recognition**: Support for common chess board themes (Chess.com, Lichess).
2. **Engine Analysis**: Integration with Stockfish to provide the top 6 moves.
3. **Evaluation Bar**: Visual representation of the current advantage.
4. **Move List**: A ranked list of the best 1st, 2nd, 3rd, 4th, 5th, and 6th moves with their respective centipawn or mate evaluations.
5. **Game Flip Insights**: Identifying "blunders" or "brilliant" moves where the advantage shifted significantly.

## Technical Strategy
- **Platform**: Web App (Responsive Desktop/Mobile).
- **Frontend**: Clean, dark-themed UI optimized for focus.
- **Engine**: Stockfish WASM/Web Worker for client-side analysis.
- **Input**: PNG/JPG screenshot upload or clipboard paste.

## Screen List
1. **Landing/Upload**: Hero section with an "Analyze Screenshot" dropzone.
2. **Analysis Dashboard**: The main interface showing the board, eval bar, and ranked move list.
3. **History/Collection**: A list of previously analyzed positions.
4. **Settings**: Theme selection and engine depth configuration.
