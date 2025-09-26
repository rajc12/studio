'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Player } from '@/lib/uno-game';

interface GameLobbyProps {
  onStartGame: (playerName: string) => void;
  onJoinGame: (roomCode: string, playerName: string) => void;
  lobbyId: string | null;
  onManualStart: () => void;
  lobbyPlayers: Player[] | null;
  userId: string | undefined;
}

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;

export function GameLobby({
  onStartGame,
  onJoinGame,
  lobbyId,
  onManualStart,
  lobbyPlayers,
  userId,
}: GameLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const { toast } = useToast();

  const handleCreate = () => {
    if (playerName.trim()) {
      onStartGame(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim() && joinCode.trim()) {
      onJoinGame(joinCode.trim(), playerName.trim());
    }
  };

  const copyLobbyId = () => {
    if (lobbyId) {
      navigator.clipboard.writeText(lobbyId);
      toast({
        title: 'Copied!',
        description: 'Lobby code copied to clipboard.',
      });
    }
  };

  const handleStartGame = () => {
    onManualStart();
  };

  const isHost = lobbyPlayers?.find(p => p.id === userId)?.isHost;
  const canStart = lobbyPlayers && lobbyPlayers.length >= MIN_PLAYERS && lobbyPlayers.length <= MAX_PLAYERS;


  if (lobbyId) {
    return (
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-extrabold text-primary">
            Waiting for Players
          </CardTitle>
          <CardDescription>
            Share this 4-digit code with your friends to have them join.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
            <span className="text-3xl font-bold tracking-widest text-muted-foreground">
              {lobbyId}
            </span>
            <Button size="icon" variant="ghost" onClick={copyLobbyId}>
              <Copy className="h-6 w-6" />
            </Button>
          </div>
           <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span>{lobbyPlayers?.length || 1} / {MAX_PLAYERS} Players</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            {lobbyPlayers?.map(p => <div key={p.id}>{p.name} {p.isHost ? '(Host)' : ''}</div>)}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
            {isHost && (
                 <Button onClick={handleStartGame} disabled={!canStart} className="w-full text-lg">
                    Start Game
                </Button>
            )}
            <p className="text-sm text-muted-foreground text-center w-full">
                {isHost ? `The game requires ${MIN_PLAYERS}-${MAX_PLAYERS} players to start.` : 'Waiting for the host to start the game...'}
            </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-4xl font-extrabold text-primary">
          UnoSync
        </CardTitle>
        <CardDescription>The classic card game, reimagined.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Game</TabsTrigger>
            <TabsTrigger value="join">Join Game</TabsTrigger>
          </TabsList>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">Your Name</Label>
              <Input
                id="player-name"
                placeholder="e.g., Player One"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="text-base"
              />
            </div>
          </div>
          <TabsContent value="create">
            <CardFooter className="px-0 pt-4">
              <Button
                onClick={handleCreate}
                disabled={!playerName.trim()}
                className="w-full text-lg font-bold"
              >
                Create Game
              </Button>
            </CardFooter>
          </TabsContent>
          <TabsContent value="join">
            <div className="space-y-2 pt-4">
              <Label htmlFor="join-code">Room Code</Label>
              <Input
                id="join-code"
                placeholder="Enter 4-digit room code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="text-base"
                maxLength={4}
              />
            </div>
            <CardFooter className="px-0 pt-4">
              <Button
                onClick={handleJoin}
                disabled={!playerName.trim() || joinCode.length !== 4}
                className="w-full text-lg font-bold"
              >
                Join Game
              </Button>
            </CardFooter>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
