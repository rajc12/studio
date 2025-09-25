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
import { useToast } from './use-toast';
import { doc, getFirestore, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, where } from 'firebase/firestore';

export type GameView = 'lobby' | 'game' | 'game-over';

const INITIAL_HAND_SIZE = 7;
const MIN_PLAYERS = 2;

export function useUnoGame(userId?: string) {
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [view, setView] = useState<GameView>('lobby');
  const [wildCardToPlay, setWildCardToPlay] = useState<Card | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();

  const gameRef = useMemoFirebase(() => (lobbyId ? doc(firestore, 'games', lobbyId) : null), [lobbyId, firestore]);
  const { data: gameState } = useDoc<GameState>(gameRef);

  const lobbyPlayersRef = useMemoFirebase(() => (lobbyId ? collection(firestore, 'lobbies', lobbyId, 'players') : null), [lobbyId, firestore]);
  const { data: lobbyPlayers } = useCollection<Player>(lobbyPlayersRef);

  const currentPlayer = gameState ? gameState.players.find(p => p.id === gameState.currentPlayerId) : null;
  const isProcessingTurn = false; // Placeholder for now

  useEffect(() => {
    if (lobbyId && lobbyPlayers && lobbyPlayers.length >= MIN_PLAYERS) {
        const lobbyRef = doc(firestore, 'lobbies', lobbyId);
        const gameIsActive = gameState?.status === 'active';
        if (!gameIsActive) {
            getDoc(lobbyRef).then(lobbySnap => {
                if (lobbySnap.exists() && lobbySnap.data().hostId === userId) {
                    startGame(lobbyPlayers);
                }
            });
        }
    }
  }, [lobbyId, lobbyPlayers, userId, firestore, gameState]);


  const createGame = async (playerName: string) => {
    if (!userId) return;
    const newLobbyId = doc(collection(firestore, 'lobbies')).id;
    setLobbyId(newLobbyId);

    const hostPlayer: Player = { id: userId, name: playerName, hand: [], isAI: false };
    
    // Create lobby document
    const lobbyRef = doc(firestore, 'lobbies', newLobbyId);
    setDocumentNonBlocking(lobbyRef, {
      id: newLobbyId,
      createdAt: new Date().toISOString(),
      hostId: userId,
      status: 'waiting'
    }, { merge: true });

    // Add host to players subcollection
    const playerRef = doc(firestore, 'lobbies', newLobbyId, 'players', userId);
    setDocumentNonBlocking(playerRef, hostPlayer, { merge: true });
  };

  const joinGame = async (roomCode: string, playerName: string) => {
    if (!userId) return;
    
    const newPlayer: Player = { id: userId, name: playerName, hand: [], isAI: false };
    const playerRef = doc(firestore, 'lobbies', roomCode, 'players', userId);
    setDocumentNonBlocking(playerRef, newPlayer, { merge: true });
    setLobbyId(roomCode);
  };

  const startGame = useCallback(async (players: Player[]) => {
    if (!lobbyId) return;

    const shuffledDeck = shuffle(createDeck());
    
    players.forEach(player => {
      player.hand = shuffledDeck.splice(0, INITIAL_HAND_SIZE);
    });

    let firstCardIndex = shuffledDeck.findIndex(c => !c.isWild);
    if (firstCardIndex === -1) {
      // Reshuffle and try again if no non-wild card is found.
      const newDeck = shuffle(createDeck());
      players.forEach(p => { p.hand = newDeck.splice(0, INITIAL_HAND_SIZE) });
      firstCardIndex = newDeck.findIndex(c => !c.isWild);
      if (firstCardIndex === -1) {
        // Fallback to any card if still no non-wild card found.
        firstCardIndex = 0;
      }
    }
    const firstCard = shuffledDeck.splice(firstCardIndex, 1)[0];

    const newGameState: GameState = {
      id: lobbyId,
      players,
      drawPile: shuffledDeck,
      discardPile: [firstCard],
      currentPlayerId: players[0].id,
      playDirection: 'clockwise',
      status: 'active',
      winner: null,
      log: [`Game started! ${players[0].name}'s turn.`],
    };

    const gameDocRef = doc(firestore, 'games', lobbyId);
    setDocumentNonBlocking(gameDocRef, newGameState, { merge: true });
    
    const lobbyDocRef = doc(firestore, 'lobbies', lobbyId);
    setDocumentNonBlocking(lobbyDocRef, { status: 'active' }, { merge: true });

    setView('game');
  }, [lobbyId, firestore]);
  
  const nextTurn = useCallback((state: GameState, steps = 1): GameState => {
    const { players, playDirection, currentPlayerId } = state;
    const numPlayers = players.length;
    const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
    let nextIndex: number;

    if (playDirection === 'clockwise') {
      nextIndex = (currentPlayerIndex + steps) % numPlayers;
    } else {
      nextIndex = (currentPlayerIndex - steps + numPlayers * steps) % numPlayers;
    }
    
    const nextPlayer = players[nextIndex];
    return {
      ...state,
      currentPlayerId: nextPlayer.id,
      log: [...state.log, `${nextPlayer.name}'s turn.`],
    };
  }, []);
  
  const drawCards = useCallback((playerId: string, numCards: number, state: GameState): GameState => {
    let { drawPile, discardPile, players } = state;
    const playerIndex = players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return state;

    const player = players[playerIndex];
    const drawnCards: Card[] = [];

    for (let i = 0; i < numCards; i++) {
      if (drawPile.length === 0) {
        if (discardPile.length <= 1) break;
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
    const currentPlayer = newState.players.find(p => p.id === newState.currentPlayerId);
    if (!currentPlayer) return newState;

    let steps = 1;

    switch (card.value) {
      case 'skip':
        steps = 2;
        toast({ title: 'Player Skipped!', description: `${newState.players.find(p=>p.id === nextTurn(newState).currentPlayerId)?.name} was skipped.` });
        break;
      case 'reverse':
        newState.playDirection = newState.playDirection === 'clockwise' ? 'counter-clockwise' : 'clockwise';
        toast({ title: 'Direction Reversed!', description: `Play direction is now ${newState.playDirection}.` });
        break;
      case 'draw2':
        const nextPlayerIdD2 = nextTurn(newState).currentPlayerId;
        newState = drawCards(nextPlayerIdD2, 2, newState);
        steps = 2;
        toast({ title: 'Draw 2!', description: `${newState.players.find(p=>p.id === nextPlayerIdD2)?.name} draws 2 cards and is skipped.` });
        break;
      case 'wildDraw4':
        const nextPlayerIdD4 = nextTurn(newState).currentPlayerId;
        newState = drawCards(nextPlayerIdD4, 4, newState);
        steps = 2;
        toast({ title: 'Wild Draw 4!', description: `${newState.players.find(p=>p.id === nextPlayerIdD4)?.name} draws 4 cards and is skipped.` });
        break;
    }
    
    newState.log.push(`${currentPlayer.name} played a ${card.color !== 'wild' ? card.color : ''} ${card.value}.`);
    
    return nextTurn(newState, steps);
  }, [drawCards, nextTurn, toast]);
  
  const selectColorForWild = useCallback(async (color: Color) => {
    if (!wildCardToPlay || !gameState || !userId) return;

    const player = gameState.players.find(p => p.id === userId);
    if (!player) return;
    
    const cardToPlay: Card = { ...wildCardToPlay, chosenColor: color };
    
    const newHand = player.hand.filter(c => c.value !== wildCardToPlay.value || c.color !== wildCardToPlay.color);
    const playerIndex = gameState.players.findIndex(p => p.id === userId);
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...player, hand: newHand };

    let newState: GameState = {
      ...gameState,
      players: newPlayers,
      discardPile: [...gameState.discardPile, cardToPlay],
    };
    
    setWildCardToPlay(null);
    toast({title: 'Color Chosen', description: `${player.name} chose ${color}.`});

    if (newHand.length === 0) {
      newState = { ...newState, status: 'finished', winner: player.name, log: [...newState.log, `${player.name} wins!`] };
    } else {
      newState = applyCardEffect(cardToPlay, newState);
    }
    
    if (gameRef) await setDocumentNonBlocking(gameRef, newState, { merge: true });

  }, [wildCardToPlay, gameState, userId, applyCardEffect, toast, gameRef]);

  const playCard = useCallback(async (card: Card) => {
    if (!gameState || !gameState.status || gameState.currentPlayerId !== userId) return;

    const player = gameState.players.find(p => p.id === userId);
    if(!player) return;
    
    const topCard = getTopCard(gameState.discardPile);
    
    if (!isCardPlayable(card, topCard)) {
      toast({ title: "Invalid Move", description: "You can't play that card.", variant: "destructive" });
      return;
    }
    
    if (card.isWild) {
      setWildCardToPlay(card);
      return;
    }

    const newHand = player.hand.filter(c => c !== card);
    const playerIndex = gameState.players.findIndex(p => p.id === userId);
    const newPlayers = [...gameState.players];
    newPlayers[playerIndex] = { ...player, hand: newHand };

    let newState: GameState = {
      ...gameState,
      players: newPlayers,
      discardPile: [...gameState.discardPile, card],
    };

    if (newHand.length === 0) {
      newState = { ...newState, status: 'finished', winner: player.name, log: [...newState.log, `${player.name} wins!`] };
    } else {
      if (newHand.length === 1) {
        toast({ title: "UNO!", description: `${player.name} has one card left!` });
      }
      newState = applyCardEffect(card, newState);
    }
    
    if(gameRef) await setDocumentNonBlocking(gameRef, newState, { merge: true });
  }, [gameState, userId, applyCardEffect, toast, gameRef, selectColorForWild]);

  const drawCard = useCallback(async () => {
    if (!gameState || !gameState.status || gameState.currentPlayerId !== userId) return;
    
    let newState = drawCards(userId, 1, gameState);
    newState = nextTurn(newState);

    if(gameRef) await setDocumentNonBlocking(gameRef, newState, { merge: true });
  }, [gameState, userId, drawCards, nextTurn, gameRef]);

  useEffect(() => {
    if (gameState?.status === 'finished') {
      setView('game-over');
    } else if (gameState?.status === 'active') {
      setView('game');
    } else {
      setView('lobby');
    }
  }, [gameState?.status]);
  
  const resetGame = async () => {
    if(lobbyId && gameRef) {
        const lobbyRef = doc(firestore, 'lobbies', lobbyId);
        await deleteDoc(lobbyRef);
        await deleteDoc(gameRef);
    }
    setLobbyId(null);
    setView('lobby');
  };

  return {
    gameState,
    view,
    currentPlayer,
    isProcessingTurn,
    wildCardToPlay,
    playCard,
    drawCard,
    selectColorForWild,
    resetGame,
    joinGame,
    createGame,
    lobbyId,
    startGame,
  };
}
