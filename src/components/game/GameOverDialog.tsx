"use client";

import { type Player } from '@/lib/uno-game';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PartyPopper } from 'lucide-react';

interface GameOverDialogProps {
  winner: Player;
  onPlayAgain: () => void;
}

export function GameOverDialog({ winner, onPlayAgain }: GameOverDialogProps) {
  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-center">
            <PartyPopper className="text-accent w-16 h-16" />
          <AlertDialogTitle className="text-2xl">Game Over!</AlertDialogTitle>
          <AlertDialogDescription className="text-lg">
            Congratulations, <span className="font-bold text-primary">{winner.name}</span> is the winner!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onPlayAgain} className="w-full">
            Play Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
