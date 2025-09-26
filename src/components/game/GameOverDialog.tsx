"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';

interface GameOverDialogProps {
  winnerName: string;
  onNextRound: () => void;
  onExit: () => void;
}

export function GameOverDialog({ winnerName, onNextRound, onExit }: GameOverDialogProps) {
  return (
    <AlertDialog open={true}>
      <AlertDialogContent>
        <AlertDialogHeader className="items-center">
            <PartyPopper className="text-accent w-16 h-16" />
          <AlertDialogTitle className="text-2xl">Game Over!</AlertDialogTitle>
          <AlertDialogDescription className="text-lg">
            Congratulations, <span className="font-bold text-primary">{winnerName}</span> is the winner!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          <Button onClick={onNextRound} className="w-full sm:w-auto">
            Next Round
          </Button>
          <Button onClick={onExit} variant="outline" className="w-full sm:w-auto">
            Exit
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
