'use server';

/**
 * @fileOverview This file defines the Genkit flow for an AI Uno player.
 *
 * - aiPlayerOpponent - A function that initiates the AI player's turn and determines its move.
 * - AIPlayerOpponentInput - The input type for the aiPlayerOpponent function.
 * - AIPlayerOpponentOutput - The return type for the aiPlayerOpponent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CardSchema = z.object({
  color: z.enum(['red', 'yellow', 'green', 'blue', 'wild']),
  value: z.string(), // Can be a number, or action card like 'skip', 'reverse', 'draw2', 'wildDraw4'
});
export type Card = z.infer<typeof CardSchema>;

const AIPlayerOpponentInputSchema = z.object({
  gameState: z.object({
    topCard: CardSchema,
    currentPlayerHand: z.array(CardSchema),
    nextPlayer: z.string(),
    players: z.record(z.string(), z.object({
      name: z.string(),
      cardCount: z.number(),
    })),
    playDirection: z.enum(['clockwise', 'counter-clockwise']),
    lastPlayedCard: z.optional(CardSchema),
    penalizeNextPlayer: z.optional(z.boolean()).describe('if true, the next player should be penalized, such as drawing a card'),
  }).describe('The current state of the Uno game.'),
  playerName: z.string().describe('The name of the AI player.'),
});
export type AIPlayerOpponentInput = z.infer<typeof AIPlayerOpponentInputSchema>;

const AIPlayerOpponentOutputSchema = z.object({
  cardToPlay: z
    .optional(CardSchema)
    .describe('The card the AI player has decided to play, if any.'),
  action: z
    .optional(z.enum(['draw']))
    .describe("The action the AI player has decided to take, if any.  If 'draw', the AI player will draw a card."),
  saidUno: z.optional(z.boolean()).describe('Whether the AI player has said Uno.'),
  targetPlayer: z.optional(z.string()).describe('The player the AI wishes to target, if applicable.')
});
export type AIPlayerOpponentOutput = z.infer<typeof AIPlayerOpponentOutputSchema>;

export async function aiPlayerOpponent(input: AIPlayerOpponentInput): Promise<AIPlayerOpponentOutput> {
  return aiPlayerOpponentFlow(input);
}

const aiPlayerOpponentPrompt = ai.definePrompt({
  name: 'aiPlayerOpponentPrompt',
  input: {schema: AIPlayerOpponentInputSchema},
  output: {schema: AIPlayerOpponentOutputSchema},
  prompt: `You are an AI that plays the Uno card game. Your name is {{playerName}}.

You are playing a game of Uno. The current game state is as follows:

{{#each gameState.players as |playerData playerKey|}}
  Player Name: {{playerKey}}, Card Count: {{playerData.cardCount}}
{{/each}}

It is your turn. Your hand is as follows:

{{#each gameState.currentPlayerHand as |card|}}
  Color: {{card.color}}, Value: {{card.value}}
{{/each}}

The top card on the discard pile is:

Color: {{gameState.topCard.color}}, Value: {{gameState.topCard.value}}

The next player is: {{gameState.nextPlayer}}

The play direction is: {{gameState.playDirection}}

Decide what card to play, or whether to draw a card. If you have a card that matches either the color or the value of the top card, you must play it. If the top card is a wild card, you can play any card.

If you have a wild draw 4 card and no other playable cards, you must play it and choose a color. You should pick the color most represented in your hand.

If you have a wild card, you can play it and choose a color. You should pick the color most represented in your hand.

If you cannot play a card, you must draw a card. Return action: "draw" in this case.

If you have only one card left, you must say "Uno". Set saidUno to true in this case.

Consider targeting other players with draw 2, skip or reverse if possible to maximize your chance of winning. Set targetPlayer to the name of the player you wish to target.

Output your decision in JSON format.
`,
});

const aiPlayerOpponentFlow = ai.defineFlow(
  {
    name: 'aiPlayerOpponentFlow',
    inputSchema: AIPlayerOpponentInputSchema,
    outputSchema: AIPlayerOpponentOutputSchema,
  },
  async input => {
    const {output} = await ai.generate({
      prompt: aiPlayerOpponentPrompt.prompt,
      model: 'googleai/gemini-2.5-flash',
      input: input,
      output: {
        schema: AIPlayerOpponentOutputSchema,
      }
    });
    return output!;
  }
);
