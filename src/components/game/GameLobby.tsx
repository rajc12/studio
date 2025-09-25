"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';

interface GameLobbyProps {
  onStartGame: (playerName: string, aiCount: number) => void;
}

export function GameLobby({ onStartGame }: GameLobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [aiCount, setAiCount] = useState('2');

  const handleStart = () => {
    if (playerName.trim()) {
      onStartGame(playerName.trim(), parseInt(aiCount, 10));
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-4xl font-extrabold text-primary">UnoSync</CardTitle>
        <CardDescription>The classic card game, reimagined.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        <div className="space-y-2">
          <Label htmlFor="ai-opponents">AI Opponents</Label>
          <Select value={aiCount} onValueChange={setAiCount}>
            <SelectTrigger id="ai-opponents" className="w-full">
                <Users className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Number of opponents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Opponent</SelectItem>
              <SelectItem value="2">2 Opponents</SelectItem>
              <SelectItem value="3">3 Opponents</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleStart} disabled={!playerName.trim()} className="w-full text-lg font-bold">
          Start Game
        </Button>
      </CardFooter>
    </Card>
  );
}
