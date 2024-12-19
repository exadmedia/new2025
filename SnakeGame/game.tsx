import React, { useState, useEffect, useCallback, useRef } from 'react';
import './styles.css';

// 型定義
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };
type GameState = 'RUNNING' | 'PAUSED' | 'GAME_OVER';

// ゲームの設定
const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION: Direction = 'RIGHT';
const INITIAL_FOOD: Position = { x: 15, y: 15 };
const GAME_SPEED = 100;

// ヘルパー関数
const randomPosition = (): Position => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE),
});

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Direction>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Position>(INITIAL_FOOD);
  const [gameState, setGameState] = useState<GameState>('RUNNING');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [effect, setEffect] = useState<'none' | 'eat' | 'collision'>('none');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTimeRef = useRef<number>(0);

  const moveSnake = useCallback((timestamp: number) => {
    if (gameState !== 'RUNNING') return;

    const deltaTime = timestamp - lastRenderTimeRef.current;
    if (deltaTime < GAME_SPEED) return;

    lastRenderTimeRef.current = timestamp;

    setSnake((prevSnake) => {
      const newHead = { ...prevSnake[0] };
      switch (direction) {
        case 'UP':
          newHead.y = (newHead.y - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'DOWN':
          newHead.y = (newHead.y + 1) % GRID_SIZE;
          break;
        case 'LEFT':
          newHead.x = (newHead.x - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'RIGHT':
          newHead.x = (newHead.x + 1) % GRID_SIZE;
          break;
      }

      // 食べ物を食べた場合
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((prevScore) => {
          const newScore = prevScore + 1;
          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('highScore', newScore.toString());
          }
          return newScore;
        });
        setFood(randomPosition());
        setEffect('eat');
        setTimeout(() => setEffect('none'), 300);
        return [newHead, ...prevSnake];
      }

      // 自分自身に衝突した場合
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameState('GAME_OVER');
        setEffect('collision');
        setTimeout(() => setEffect('none'), 300);
        return prevSnake;
      }

      return [newHead, ...prevSnake.slice(0, -1)];
    });
  }, [direction, food, gameState, highScore]);

  useEffect(() => {
    const storedHighScore = localStorage.getItem('highScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setDirection((prev) => (prev !== 'DOWN' ? 'UP' : prev));
          break;
        case 'ArrowDown':
          setDirection((prev) => (prev !== 'UP' ? 'DOWN' : prev));
          break;
        case 'ArrowLeft':
          setDirection((prev) => (prev !== 'RIGHT' ? 'LEFT' : prev));
          break;
        case 'ArrowRight':
          setDirection((prev) => (prev !== 'LEFT' ? 'RIGHT' : prev));
          break;
        case ' ':
          setGameState((prevState) => (prevState === 'RUNNING' ? 'PAUSED' : 'RUNNING'));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    const animate = (timestamp: number) => {
      moveSnake(timestamp);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [moveSnake]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    // 蛇を描画
    ctx.fillStyle = 'green';
    snake.forEach((segment, index) => {
      const gradient = ctx.createRadialGradient(
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        segment.x * CELL_SIZE + CELL_SIZE / 2,
        segment.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      gradient.addColorStop(0, index === 0 ? '#00ff00' : '#008000');
      gradient.addColorStop(1, '#005000');
      ctx.fillStyle = gradient;
      ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    // 食べ物を描画
    ctx.fillStyle = 'red';
    const foodGradient = ctx.createRadialGradient(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      0,
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2
    );
    foodGradient.addColorStop(0, '#ff0000');
    foodGradient.addColorStop(1, '#800000');
    ctx.fillStyle = foodGradient;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // エフェクトを描画
    if (effect === 'eat') {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    } else if (effect === 'collision') {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);
    }
  }, [snake, food, effect]);

  const restartGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setFood(INITIAL_FOOD);
    setGameState('RUNNING');
    setScore(0);
    setEffect('none');
  };

  return (
    <div className="game-container">
      <h1>Snake Game</h1>
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
      />
      <div className="score-board">
        <p className="score">Score: {score}</p>
        <p className="high-score">High Score: {highScore}</p>
      </div>
      {gameState === 'GAME_OVER' && (
        <div className="game-over">
          <h2>Game Over</h2>
          <button onClick={restartGame}>Restart</button>
        </div>
      )}
      {gameState === 'PAUSED' && <h2 className="paused">Paused</h2>}
    </div>
  );
};

export default SnakeGame;

