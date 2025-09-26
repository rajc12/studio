"use client";

import { type Player, type Card, isCardPlayable, COLORS } from '@/lib/uno-game';
import { UnoCard } from './UnoCard';

interface PlayerHandProps {
  player: Player;
  onPlayCard: (card: Card) => void;
  isMyTurn: boolean;
  topCard: Card;
}

const colorOrder: Record<string, number> = {
  ...COLORS.reduce((acc, color, index) => ({ ...acc, [color]: index }), {}),
  wild: COLORS.length,
};

const valueOrder: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'skip': 10, 'reverse': 11, 'draw2': 12,
  'wild': 13, 'wildDraw4': 14,
};

export function PlayerHand({ player, onPlayCard, isMyTurn, topCard }: PlayerHandProps) {
  const hand = player.hand || [];

  const sortedHand = [...hand].sort((a, b) => {
    const colorComparison = colorOrder[a.color] - colorOrder[b.color];
    if (colorComparison !== 0) {
      return colorComparison;
    }
    return valueOrder[a.value] - valueOrder[b.value];
  });
  
  const cardWidth = 96; // Corresponds to w-24
  const overlap = 48; // Overlap by half
  const totalWidth = sortedHand.length > 0 
    ? (sortedHand.length - 1) * (cardWidth - overlap) + cardWidth
    : 0;

  return (
    <div 
      className="flex justify-center items-end transition-all duration-500 ease-out"
      style={{ 
        height: '160px', // h-40
        paddingBottom: '8px'
      }}
    >
      <div className="relative" style={{ width: `${totalWidth}px`, height: '144px' }}>
        {sortedHand.map((card, index) => {
          const playable = isMyTurn && isCardPlayable(card, topCard);
          return (
            <button
              key={`${card.color}-${card.value}-${index}`}
              disabled={!playable}
              onClick={() => onPlayCard(card)}
              className="absolute transition-all duration-300 ease-out focus:outline-none disabled:cursor-not-allowed"
              style={{
                left: `${index * (cardWidth - overlap)}px`,
                zIndex: index,
                bottom: 0,
              }}
              aria-label={`Play ${card.color} ${card.value}`}
            >
              <UnoCard 
                card={card}
                isPlayable={playable}
                className="hover:-translate-y-6 focus:-translate-y-6"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
