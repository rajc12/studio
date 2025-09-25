
"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  type GameState,
  type Player,
  type Card,
  type Color,
  createDeck,
  shuffle,
  getTopCard,
  isCardPlayable,
} from '@/lib/uno-game';
import { aiPlayerOpponent, type AIPlayerOpponentInput, type AIPlayerOpponentOutput } from '@/ai/flows/ai-player-opponent';
import { useToast } from './use-toast';

export type GameView = 'lobby' | 'game' | 'game-over';

const INITIAL_HAND_SIZE = 7;

export function useUnoGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [view, setView] = useState<GameView>('lobby');
  const [humanPlayerId, setHumanPlayerId] = useState<string>('player-0');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [wildCardToPlay, setWildCardToPlay] = useState<Card | null>(null);
  const { toast } = useToast();

  const currentPlayer = gameState ? gameState.players[gameState.currentPlayerIndex] : null;

  const startGame = useCallback((humanPlayerName: string, aiPlayerCount: number) => {
    const players: Player[] = [
      { id: 'player-0', name: humanPlayerName, hand: [], isAI: false },
    ];
    for (let i = 1; i <= aiPlayerCount; i++) {
      players.push({ id: `player-${i}`, name: `AI Player ${i}`, hand: [], isAI: true });
    }

    const shuffledDeck = shuffle(createDeck());
    
    // Deal cards
    players.forEach(player => {
      player.hand = shuffledDeck.splice(0, INITIAL_HAND_SIZE);
    });

    // Find the first card that is not a wild card to start the discard pile
    let firstCardIndex = shuffledDeck.findIndex(c => !c.isWild);
    if (firstCardIndex === -1) {
      // Highly unlikely, but if the deck is all wild cards, restart
      startGame(humanPlayerName, aiPlayerCount);
      return;
    }
    const firstCard = shuffledDeck.splice(firstCardIndex, 1)[0];

    setGameState({
      players,
      drawPile: shuffledDeck,
      discardPile: [firstCard],
      currentPlayerIndex: 0,
      playDirection: 'clockwise',
      isGameOver: false,
      winner: null,
      log: [`Game started! ${players[0].name}'s turn.`],
    });
    setView('game');
  }, []);

  const nextTurn = useCallback((state: GameState, steps = 1): GameState => {
    const { players, playDirection, currentPlayerIndex } = state;
    const numPlayers = players.length;
    let nextIndex: number;

    if (playDirection === 'clockwise') {
      nextIndex = (currentPlayerIndex + steps) % numPlayers;
    } else {
      nextIndex = (currentPlayerIndex - steps + numPlayers * steps) % numPlayers;
    }
    
    const nextPlayer = players[nextIndex];
    return {
      ...state,
      currentPlayerIndex: nextIndex,
      log: [...state.log, `${nextPlayer.name}'s turn.`],
    };
  }, []);
  
  const drawCards = useCallback((playerIndex: number, numCards: number, state: GameState): GameState => {
    let { drawPile, discardPile, players } = state;
    const player = players[playerIndex];
    const drawnCards: Card[] = [];

    for (let i = 0; i < numCards; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length <= 1) break; // Not enough cards to replenish
        const newDrawPile = shuffle(discardPile.slice(0, -1));
        drawPile = newDrawPile;
        discardPile = [getTopCard(discardPile)];
        toast({ title: "Deck reshuffled" });
      }
      const card = drawPile.pop();
      if (card) drawnCards.push(card);
    }
    
    const newHand = [...player.hand, ...drawnCards];
    const newPlayers = [...players];
    newPlayers[playerIndex] = { ...player, hand: newHand };
    
    return { ...state, drawPile, discardPile, players: newPlayers, log: [...state.log, `${player.name} drew ${numCards} card(s).`] };
  }, [toast]);

  const applyCardEffect = useCallback((card: Card, state: GameState): GameState => {
    let newState = { ...state };
    const currentPlayer = newState.players[newState.currentPlayerIndex];
    let steps = 1;

    switch (card.value) {
      case 'skip':
        steps = 2;
        toast({ title: 'Player Skipped!', description: `${newState.players[nextTurn(newState).currentPlayerIndex].name} was skipped.` });
        break;
      case 'reverse':
        newState.playDirection = newState.playDirection === 'clockwise' ? 'counter-clockwise' : 'clockwise';
        toast({ title: 'Direction Reversed!', description: `Play direction is now ${newState.playDirection}.` });
        break;
      case 'draw2':
        const nextPlayerIndexD2 = nextTurn(newState).currentPlayerIndex;
        newState = drawCards(nextPlayerIndexD2, 2, newState);
        steps = 2;
        toast({ title: 'Draw 2!', description: `${newState.players[nextPlayerIndexD2].name} draws 2 cards and is skipped.` });
        break;
      case 'wildDraw4':
        const nextPlayerIndexD4 = nextTurn(newState).currentPlayerIndex;
        newState = drawCards(nextPlayerIndexD4, 4, newState);
        steps = 2;
        toast({ title: 'Wild Draw 4!', description: `${newState.players[nextPlayerIndexD4].name} draws 4 cards and is skipped.` });
        break;
    }
    
    newState.log.push(`${currentPlayer.name} played a ${card.color !== 'wild' ? card.color : ''} ${card.value}.`);
    
    return nextTurn(newState, steps);
  }, [drawCards, nextTurn, toast]);

  const selectColorForWild = useCallback((color: Color) => {
    if (!wildCardToPlay) return;

    setGameState(prevState => {
      if (!prevState) return prevState;

      const playerIndex = prevState.currentPlayerIndex;
      const player = prevState.players[playerIndex];
      
      // If the AI is making this choice, it might already be in the process of its turn.
      // We check if it is still the AI's turn before proceeding.
      if (player.isAI && prevState.currentPlayerIndex !== playerIndex) {
          // It's not the AI's turn anymore, so we shouldn't proceed.
          // This can happen if the game state updated while the AI was "thinking"
          setWildCardToPlay(null);
          return prevState;
      }

      const cardToPlay: Card = { ...wildCardToPlay, chosenColor: color };

      const newHand = player.hand.filter(c => c.value !== wildCardToPlay.value || c.color !== wildCardToPlay.color);
      const newPlayers = [...prevState.players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      const newState: GameState = {
        ...prevState,
        players: newPlayers,
        discardPile: [...prevState.discardPile, cardToPlay],
      };
      
      setWildCardToPlay(null);
      
      if (!player.isAI) {
        toast({title: 'Color Chosen', description: `${player.name} chose ${color}.`});
      }

      if (newHand.length === 0) {
        return { ...newState, isGameOver: true, winner: player, log: [...newState.log, `${player.name} wins!`] };
      }

      return applyCardEffect(cardToPlay, newState);
    });
  }, [wildCardToPlay, applyCardEffect, toast]);

  const playCard = useCallback((card: Card, playerIndex: number) => {
    setGameState(prevState => {
      if (!prevState || prevState.isGameOver || prevState.currentPlayerIndex !== playerIndex) return prevState;

      const player = prevState.players[playerIndex];
      const topCard = getTopCard(prevState.discardPile);
      
      if (!isCardPlayable(card, topCard)) {
        toast({ title: "Invalid Move", description: "You can't play that card.", variant: "destructive" });
        return prevState;
      }
      
      if (card.isWild) {
        setWildCardToPlay(card);
        // This is a special case for AI players. Human players select color via UI.
        if (player.isAI) {
          const colorsInHand = player.hand.filter(c => !c.isWild).map(c => c.color);
          const mostCommonColor = colorsInHand.sort((a,b) => colorsInHand.filter(v => v===a).length - colorsInHand.filter(v => v===b).length).pop() || 'blue';
          selectColorForWild(mostCommonColor);
        }
        return prevState;
      }

      const newHand = player.hand.filter(c => c !== card);
      const newPlayers = [...prevState.players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      const newState: GameState = {
        ...prevState,
        players: newPlayers,
        discardPile: [...prevState.discardPile, card],
      };

      if (newHand.length === 0) {
        return { ...newState, isGameOver: true, winner: player, log: [...newState.log, `${player.name} wins!`] };
      }
      
      if (newHand.length === 1) {
        toast({ title: "UNO!", description: `${player.name} has one card left!` });
      }

      return applyCardEffect(card, newState);
    });
  }, [applyCardEffect, toast, selectColorForWild]);

  const onDrawCard = useCallback((playerIndex: number) => {
    setGameState(prevState => {
      if (!prevState || prevState.isGameOver || prevState.currentPlayerIndex !== playerIndex) return prevState;
      
      const newState = drawCards(playerIndex, 1, prevState);
      return nextTurn(newState);
    });
  }, [drawCards, nextTurn]);

  const runAIPlayer = useCallback(async (player: Player, state: GameState) => {
    setIsProcessingAI(true);

    const nextPlayer = state.players[nextTurn(state, 1).currentPlayerIndex];

    const input: AIPlayerOpponentInput = {
      playerName: player.name,
      gameState: {
        topCard: getTopCard(state.discardPile),
        currentPlayerHand: player.hand,
        nextPlayer: nextPlayer.name,
        playDirection: state.playDirection,
        players: state.players.reduce((acc, p) => {
          acc[p.name] = { name: p.name, cardCount: p.hand.length };
          return acc;
        }, {} as Record<string, {name: string; cardCount: number}>),
      }
    };

    try {
      const output: AIPlayerOpponentOutput = await aiPlayerOpponent(input);
      
      // Simulate AI "thinking" time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      setGameState(currentState => {
        if (!currentState || currentState.currentPlayerIndex !== state.currentPlayerIndex || currentState.isGameOver) {
          // Game state has changed while AI was thinking, abort action.
          return currentState;
        }

        if (output.cardToPlay) {
          const cardToPlayInHand = currentState.players[currentState.currentPlayerIndex].hand.find(c => 
            c.value === output.cardToPlay?.value && 
            (c.color === output.cardToPlay.color || c.isWild)
          );
          
          if (cardToPlayInHand && isCardPlayable(cardToPlayInHand, getTopCard(currentState.discardPile))) {
            toast({ title: `AI plays a card`, description: `${player.name} played a ${cardToPlayInHand.value}` });
            playCard(cardToPlayInHand, currentState.currentPlayerIndex);
          } else {
             onDrawCard(currentState.currentPlayerIndex);
          }
        } else {
          toast({ title: `AI draws a card`, description: `${player.name} is drawing a card.` });
          onDrawCard(currentState.currentPlayerIndex);
        }
        return currentState; // playCard and onDrawCard will trigger their own re-renders with the new state
      });

    } catch(e) {
       console.error("AI Error:", e);
       toast({ title: "AI Error", description: "The AI opponent encountered an error and will draw a card.", variant: "destructive" });
       onDrawCard(state.currentPlayerIndex);
    } finally {
        setIsProcessingAI(false);
    }
  }, [playCard, onDrawCard, nextTurn, toast]);
  
  // Game loop effect
  useEffect(() => {
    if (!gameState || gameState.isGameOver || isProcessingAI) return;

    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.isAI) {
      runAIPlayer(player, gameState);
    }
  }, [gameState, isProcessingAI, runAIPlayer]);
  
  const resetGame = () => {
    setGameState(null);
    setView('lobby');
  };

  return {
    gameState,
    view,
    humanPlayerId,
    currentPlayer,
    isProcessingAI,
    wildCardToPlay,
    startGame,
    playCard,
    onDrawCard,
    selectColorForWild,
    resetGame,
  };
}

    