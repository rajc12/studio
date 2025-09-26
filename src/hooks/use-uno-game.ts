'use client';

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
import { DARES } from '@/lib/dares';
import { useToast } from './use-toast';
import {
  ref,
  set,
  remove,
  get,
  serverTimestamp,
  query,
} from 'firebase/database';
import {
  useDatabase,
  useObjectValue,
  useList,
  useMemoFirebase,
} from '@/firebase';

export type GameView = 'lobby' | 'game' | 'game-over';

const INITIAL_HAND_SIZE = 7;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

export function useUnoGame(userId?: string) {
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [view, setView] = useState<GameView>('lobby');
  const [wildCardToPlay, setWildCardToPlay] = useState<Card | null>(null);
  const { toast } = useToast();
  const db = useDatabase();

  const gameRef = useMemoFirebase(
    () => (lobbyId && db ? ref(db, `lobbies/${lobbyId}/game`) : null),
    [lobbyId, db]
  );
  const { data: gameState } = useObjectValue<GameState>(gameRef);

  const lobbyPlayersRef = useMemoFirebase(
    () => (lobbyId && db ? query(ref(db, `lobbies/${lobbyId}/players`)) : null),
    [lobbyId, db]
  );
  const { data: lobbyPlayers } = useList<Player>(lobbyPlayersRef);

  const currentPlayer = gameState
    ? gameState.players.find((p) => p.id === gameState.currentPlayerId)
    : null;
  const isProcessingTurn = gameState?.isProcessingTurn ?? false;

  const nextTurn = useCallback((state: GameState, steps = 1): GameState => {
    const { players, playDirection, currentPlayerId } = state;
    const numPlayers = players.length;
    const currentPlayerIndex = players.findIndex((p) => p.id === currentPlayerId);
    let nextIndex: number;

    if (playDirection === 'clockwise') {
      nextIndex = (currentPlayerIndex + steps) % numPlayers;
    } else {
      nextIndex = (currentPlayerIndex - steps + numPlayers * steps) % numPlayers;
    }

    const nextPlayer = players[nextIndex];
    
    // Clear dare for the player whose turn just ended
    const newPlayers = state.players.map(p => {
        if (p.id === currentPlayerId) {
            return { ...p, currentDare: null };
        }
        return p;
    });

    return {
      ...state,
      players: newPlayers,
      currentPlayerId: nextPlayer.id,
      log: [...(state.log || []), `${nextPlayer.name}'s turn.`],
    };
  }, []);

  const drawCards = useCallback(
    (playerId: string, numCards: number, state: GameState): GameState => {
      let { drawPile, discardPile, players } = state;
      const playerIndex = players.findIndex((p) => p.id === playerId);
      if (playerIndex === -1) return state;

      const player = players[playerIndex];
      const drawnCards: Card[] = [];

      for (let i = 0; i < numCards; i++) {
        if (drawPile.length === 0) {
          if (discardPile.length <= 1) break;
          const newDrawPile = shuffle(discardPile.slice(0, -1));
          drawPile = newDrawPile;
          discardPile = [getTopCard(discardPile)];
          toast({ title: 'Deck reshuffled' });
        }
        const card = drawPile.pop();
        if (card) drawnCards.push(card);
      }

      const newHand = [...(player.hand || []), ...drawnCards];
      const newPlayers = [...players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      return {
        ...state,
        drawPile,
        discardPile,
        players: newPlayers,
        log: [...(state.log || []), `${player.name} drew ${numCards} card(s).`],
      };
    },
    [toast]
  );

  const applyCardEffect = useCallback(
    (card: Card, state: GameState): GameState => {
      let newState = { ...state };
      const currentPlayer = newState.players.find(
        (p) => p.id === newState.currentPlayerId
      );
      if (!currentPlayer) return newState;
  
      let steps = 1;
      const nextPlayerId = nextTurn(newState).currentPlayerId;
  
      switch (card.value) {
        case 'skip':
          steps = 2;
          toast({
            title: 'Player Skipped!',
            description: `${
              newState.players.find((p) => p.id === nextTurn(newState, 2).currentPlayerId)
                ?.name
            } was skipped.`,
          });
          break;
        case 'reverse':
          newState.playDirection =
            newState.playDirection === 'clockwise'
              ? 'counter-clockwise'
              : 'clockwise';
          toast({
            title: 'Direction Reversed!',
            description: `Play direction is now ${newState.playDirection}.`,
          });
          break;
        case 'draw2':
          newState.pendingAction = {
            playerId: nextPlayerId,
            type: 'draw-or-dare',
            drawCount: 2,
          };
          toast({
            title: 'Draw 2!',
            description: `${
              newState.players.find((p) => p.id === nextPlayerId)?.name
            } must draw or dare.`,
          });
          // Don't advance the turn here, wait for player's choice
          steps = 0;
          break;
        case 'wildDraw4':
          newState.pendingAction = {
            playerId: nextPlayerId,
            type: 'draw-or-dare',
            drawCount: 4,
          };
          toast({
            title: 'Wild Draw 4!',
            description: `${
              newState.players.find((p) => p.id === nextPlayerId)?.name
            } must draw or dare.`,
          });
          // Don't advance the turn here, wait for player's choice
          steps = 0;
          break;
      }
  
      newState.log = [
        ...(newState.log || []),
        `${currentPlayer.name} played a ${
          card.color !== 'wild' ? card.color : ''
        } ${card.value}.`,
      ];
      
      // Only advance turn if there's no pending action
      if (steps > 0) {
        return nextTurn(newState, steps);
      }
      return newState;
    },
    [nextTurn, toast]
  );

  const selectColorForWild = useCallback(
    async (color: Color) => {
      if (!wildCardToPlay || !gameState || !userId || !gameRef) return;

      const player = gameState.players.find((p) => p.id === userId);
      if (!player) return;

      const cardToPlay: Card = { ...wildCardToPlay, chosenColor: color };

      const playerIndex = gameState.players.findIndex((p) => p.id === userId);
      if (playerIndex === -1) return;

      const newPlayers = [...gameState.players];
      const newHand = (newPlayers[playerIndex].hand || []).filter(
        (c) => !(c.value === wildCardToPlay.value && c.color === wildCardToPlay.color)
      );
      newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: newHand };

      let newState: GameState = {
        ...gameState,
        players: newPlayers,
        discardPile: [...gameState.discardPile, cardToPlay],
        isProcessingTurn: true,
      };

      setWildCardToPlay(null);
      toast({ title: 'Color Chosen', description: `${player.name} chose ${color}.` });

      if (newHand.length === 0) {
        newState = {
          ...newState,
          players: newPlayers,
          status: 'finished',
          winner: player.name,
          log: [...(newState.log || []), `${player.name} wins!`],
          isProcessingTurn: false,
        };
      } else {
        newState = applyCardEffect(cardToPlay, newState);
      }
      
      newState.isProcessingTurn = false;
      await set(gameRef, newState);
    },
    [wildCardToPlay, gameState, userId, toast, gameRef, applyCardEffect]
  );
  
  const playCard = useCallback(
    async (card: Card) => {
      if (
        !gameState ||
        gameState.status !== 'active' ||
        gameState.currentPlayerId !== userId ||
        isProcessingTurn ||
        !gameRef
      )
        return;

      const player = gameState.players.find((p) => p.id === userId);
      if (!player) return;

      const topCard = getTopCard(gameState.discardPile);

      if (!isCardPlayable(card, topCard)) {
        toast({
          title: 'Invalid Move',
          description: "You can't play that card.",
          variant: 'destructive',
        });
        return;
      }

      await set(ref(db, `lobbies/${lobbyId}/game/isProcessingTurn`), true);

      if (card.isWild) {
        setWildCardToPlay(card);
        // The rest of the turn logic is handled in selectColorForWild
        return;
      }

      const playerIndex = gameState.players.findIndex((p) => p.id === userId);
      const newPlayers = [...gameState.players];
      
      const cardInHandIndex = (newPlayers[playerIndex].hand || []).findIndex(c => c.color === card.color && c.value === card.value);
      const newHand = [...(newPlayers[playerIndex].hand || [])];
      if(cardInHandIndex > -1) {
        newHand.splice(cardInHandIndex, 1);
      }

      newPlayers[playerIndex] = { ...newPlayers[playerIndex], hand: newHand };

      let newState: GameState = {
        ...gameState,
        players: newPlayers,
        discardPile: [...gameState.discardPile, card],
      };

      if (newHand.length === 0) {
        newState = {
          ...newState,
          status: 'finished',
          winner: player.name,
          log: [...(newState.log || []), `${player.name} wins!`],
          players: newPlayers, // Keep players data on win
          isProcessingTurn: false,
        };
      } else {
        if (newHand.length === 1) {
          toast({
            title: 'UNO!',
            description: `${player.name} has one card left!`,
          });
        }
        newState = applyCardEffect(card, newState);
      }
      newState.isProcessingTurn = false;
      await set(gameRef, newState);
    },
    [
      gameState,
      userId,
      isProcessingTurn,
      applyCardEffect,
      toast,
      gameRef,
      db,
      lobbyId,
    ]
  );

  const handleDrawChoice = async (choseDraw: boolean) => {
    if (!gameState || !gameState.pendingAction || !gameRef) return;
    
    const { playerId, drawCount } = gameState.pendingAction;
    let newState: GameState = { 
        ...gameState,
        players: [...gameState.players]
    };

    if (choseDraw) {
        newState = drawCards(playerId, drawCount, newState);
        toast({
            title: 'Cards Drawn!',
            description: `${newState.players.find(p => p.id === playerId)?.name} drew ${drawCount} cards.`,
        });
        // After drawing, the turn is skipped
        newState = nextTurn(newState); 
    } else {
        // Chose Dare
        const dare = DARES[Math.floor(Math.random() * DARES.length)];
        const playerIndex = newState.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            newState.players[playerIndex] = { ...newState.players[playerIndex], currentDare: { text: dare } };
        }
        
        toast({
            title: 'Dare Chosen!',
            description: `${newState.players.find(p => p.id === playerId)?.name}'s turn. Check out their dare!`,
        });
        // The player who chose dare now takes their turn
        newState.currentPlayerId = playerId;
    }
    
    newState.pendingAction = null;
    await set(gameRef, newState);
  };

  const createGame = async (playerName: string) => {
    if (!userId || !db) return;
    const newLobbyId = Math.floor(1000 + Math.random() * 9000).toString();
    const newLobbyRef = ref(db, `lobbies/${newLobbyId}`);

    setLobbyId(newLobbyId);

    const hostPlayer: Player = { id: userId, name: playerName, hand: [], isAI: false, isHost: true };

    await set(newLobbyRef, {
      id: newLobbyId,
      createdAt: serverTimestamp(),
      hostId: userId,
      status: 'waiting',
    });

    const playerRef = ref(db, `lobbies/${newLobbyId}/players/${userId}`);
    await set(playerRef, hostPlayer);
  };

  const joinGame = async (roomCode: string, playerName: string) => {
    if (!userId || !db) return;
    const lobbyRef = ref(db, `lobbies/${roomCode}`);
    const lobbySnap = await get(lobbyRef);
    if (!lobbySnap.exists()) {
      toast({ title: "Error", description: "Lobby not found.", variant: 'destructive' });
      return;
    }

    const playersRef = ref(db, `lobbies/${roomCode}/players`);
    const playersSnap = await get(playersRef);
    const players = playersSnap.val() || {};
    if (Object.keys(players).length >= MAX_PLAYERS) {
       toast({ title: "Error", description: "Lobby is full.", variant: 'destructive' });
       return;
    }

    const newPlayer: Player = { id: userId, name: playerName, hand: [], isAI: false, isHost: false };
    const playerRef = ref(db, `lobbies/${roomCode}/players/${userId}`);
    await set(playerRef, newPlayer);
    setLobbyId(roomCode);
  };
  
  const startGame = useCallback(
    async () => {
      if (!lobbyId || !db || !userId) return;
      const lobbyRef = ref(db, `lobbies/${lobbyId}`);
      const lobbySnap = await get(lobbyRef);
      const lobbyData = lobbySnap.val();

      // In game-over state, any player can start the next round. Otherwise, only host.
      if (gameState?.status !== 'finished' && lobbyData.hostId !== userId) {
        toast({title: "Error", description: "Only the host can start the game.", variant: 'destructive'});
        return;
      }
      
      const playersRef = ref(db, `lobbies/${lobbyId}/players`);
      const playersSnap = await get(playersRef);
      const playersData = playersSnap.val();
      const players: Player[] = playersData ? Object.keys(playersData).map(key => ({...playersData[key], id: key})) : [];


      if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
        toast({
          title: 'Invalid Number of Players',
          description: `You need ${MIN_PLAYERS}-${MAX_PLAYERS} players to start.`,
          variant: 'destructive',
        });
        return;
      }

      const shuffledDeck = shuffle(createDeck());

      players.forEach((player) => {
        player.hand = shuffledDeck.splice(0, INITIAL_HAND_SIZE);
      });

      let firstCardIndex = shuffledDeck.findIndex((c) => !c.isWild);
      if (firstCardIndex === -1) {
        firstCardIndex = 0; // Fallback if all cards are wild
      }
      const firstCard = shuffledDeck.splice(firstCardIndex, 1)[0];

      const newGameState: GameState = {
        id: lobbyId,
        players: players,
        drawPile: shuffledDeck,
        discardPile: [firstCard],
        currentPlayerId: players[0].id,
        playDirection: 'clockwise',
        status: 'active',
        winner: null,
        log: [`Game started! ${players[0].name}'s turn.`],
        isProcessingTurn: false,
        pendingAction: null,
      };

      const gameDocRef = ref(db, `lobbies/${lobbyId}/game`);
      await set(gameDocRef, newGameState);

      if (lobbySnap.exists()) {
        await set(ref(db, `lobbies/${lobbyId}/status`), 'active' );
      }
    },
    [lobbyId, db, userId, toast, gameState]
  );

  const drawCard = useCallback(async () => {
    if (
      !gameState ||
      gameState.status !== 'active' ||
      gameState.currentPlayerId !== userId ||
      isProcessingTurn ||
      !gameRef ||
      !db ||
      gameState.pendingAction
    )
      return;

    await set(ref(db, `lobbies/${lobbyId}/game/isProcessingTurn`), true);

    let newState = drawCards(userId, 1, gameState);
    newState = nextTurn(newState);
    newState.isProcessingTurn = false;

    await set(gameRef, newState);
  }, [
    gameState,
    userId,
    isProcessingTurn,
    drawCards,
    nextTurn,
    gameRef,
    db,
    lobbyId,
  ]);

  const clearDare = useCallback(async () => {
    if (!gameState || !userId || !gameRef) return;
    const playerIndex = gameState.players.findIndex(p => p.id === userId);
    if (playerIndex === -1 || !gameState.players[playerIndex].currentDare) return;

    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...newPlayers[playerIndex], currentDare: null };

    await set(ref(db, `lobbies/${lobbyId}/game/players`), newPlayers);
  }, [gameState, userId, gameRef, lobbyId, db]);


  useEffect(() => {
    if (gameState?.status === 'finished' && view !== 'game-over') {
      setView('game-over');
    } else if (gameState?.status === 'active' && view !== 'game') {
      setView('game');
    } else if (!gameState && lobbyId && view !== 'lobby') {
      // Stay in lobby view if we have a lobbyId but no game state yet
      setView('lobby');
    } else if (!lobbyId && view !== 'lobby') {
      setView('lobby');
    }
  }, [gameState, view, lobbyId]);

  const exitGame = async () => {
    if (lobbyId && db) {
      const lobbyRef = ref(db, 'lobbies', lobbyId);
      await remove(lobbyRef);
    }
    setLobbyId(null);
    setView('lobby');
  };

  return {
    gameState,
    view,
    lobbyId,
    lobbyPlayers,
    currentPlayer,
    isProcessingTurn,
    wildCardToPlay,
    playCard,
    drawCard,
    selectColorForWild,
    exitGame,
    joinGame,
    createGame,
    startGame,
    handleDrawChoice,
    clearDare,
  };
}
