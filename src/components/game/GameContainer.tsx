"use client";

import { useUnoGame } from '@/hooks/use-uno-game';
import { GameLobby } from './GameLobby';
import { GameTable } from './GameTable';
import { GameOverDialog } from './GameOverDialog';

export function GameContainer() {
  const { view, gameState, startGame, playCard, onDrawCard, selectColorForWild, wildCardToPlay, currentPlayer, isProcessingAI, resetGame } = useUnoGame();

  switch (view) {
    case 'lobby':
      return <GameLobby onStartGame={startGame} />;
    case 'game':
      if (gameState) {
        return (
          <GameTable
            gameState={gameState}
            onPlayCard={playCard}
            onDrawCard={onDrawCard}
            onSelectColor={selectColorForWild}
            wildCardToPlay={wildCardToPlay}
            currentPlayer={currentPlayer}
            isProcessingTurn={isProcessingAI}
          />
        );
      }
      return null;
    case 'game-over':
        if(gameState && gameState.winner) {
            return <GameOverDialog winner={gameState.winner} onPlayAgain={resetGame} />;
        }
        return null; // or some fallback
    default:
      return <GameLobby onStartGame={startGame} />;
  }
}
