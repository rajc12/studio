import { GameContainer } from '@/components/game/GameContainer';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <GameContainer />
    </main>
  );
}
