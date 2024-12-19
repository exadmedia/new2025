import React, { useState } from 'react';
import SnakeGame from './components/SnakeGame';
import RankingDemo from './components/RankingDemo';
import RankingBoard from './components/RankingBoard';

const App: React.FC = () => {
  const [showRanking, setShowRanking] = useState(false);
  const [latestScore, setLatestScore] = useState(0);

  const handleGameOver = (score: number) => {
    setLatestScore(score);
    setShowRanking(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-100 to-emerald-200 p-4">
    {!showRanking ? (
      <SnakeGame onGameOver={(score) => {
        setLatestScore(score);
        setShowRanking(true);
      }} />
    ) : (
      <RankingBoard initialScore={latestScore} onBack={() => setShowRanking(false)} />
    )}
    </div>
  );
};

export default App;

