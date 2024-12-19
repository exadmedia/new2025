import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NameInput from './NameInput';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameStateType = 'INITIAL' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'BOSS_BATTLE' | 'GAME_OVER';
type ObstacleType = '🌵' | '🦀' | '🦋' | '🌀' | '👻' | '🧟';
type BossType = '🌵' | '🦀' | '🦋' | '🌪️' | '🎃' | '🐉';

interface Obstacle {
  type: ObstacleType;
  position: Point;
  size: number;
  movement: (time: number) => Point;
}

interface Boss {
  type: BossType;
  position: Point;
  size: number;
  health: number;
  movement: (time: number) => Point;
}

const GRID_SIZE = 20;
const BASE_SPEED = 150;
const OBSTACLE_SIZE = 2;
const BOSS_SIZE = 3;

const STAGE_CONFIG = {
  1: { 
    name: "初級", 
    color: '#E8F5E9', 
    speed: BASE_SPEED, 
    obstacles: ['🌵', '🌵'] as ObstacleType[], 
    boss: '🌵' as BossType, 
    difficulty: 1, 
    bossAttack: '💣️',
    bossAttackPattern: (bossPos: Point, snakePos: Point, gridSize: number) => {
      // Single straight shot
      const dx = snakePos.x - bossPos.x;
      const dy = snakePos.y - bossPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return [{
        x: bossPos.x + BOSS_SIZE / 2 + (dx / distance) * 2,
        y: bossPos.y + BOSS_SIZE / 2 + (dy / distance) * 2,
        vx: (dx / distance) * 0.5,
        vy: (dy / distance) * 0.5
      }];
    }
  },
  2: { 
    name: "中級", 
    color: '#FFF3E0', 
    speed: BASE_SPEED - 10, 
    obstacles: ['🦀', '🦀'] as ObstacleType[], 
    boss: '🦀' as BossType, 
    difficulty: 2, 
    bossAttack: '🧨',
    bossAttackPattern: (bossPos: Point, snakePos: Point, gridSize: number) => {
      // Three-way spread shot
      const attacks = [];
      const baseAngle = Math.atan2(snakePos.y - bossPos.y, snakePos.x - bossPos.x);
      for (let i = -1; i <= 1; i++) {
        const angle = baseAngle + i * Math.PI / 6;
        attacks.push({
          x: bossPos.x + BOSS_SIZE / 2 + Math.cos(angle) * 2,
          y: bossPos.y + BOSS_SIZE / 2 + Math.sin(angle) * 2,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5
        });
      }
      return attacks;
    }
  },
  3: { 
    name: "上級", 
    color: '#E3F2FD', 
    speed: BASE_SPEED - 20, 
    obstacles: ['🦋', '🦋'] as ObstacleType[], 
    boss: '🦋' as BossType, 
    difficulty: 3, 
    bossAttack: '🔥',
    bossAttackPattern: (bossPos: Point, snakePos: Point, gridSize: number) => {
      // Circular burst
      const attacks = [];
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        attacks.push({
          x: bossPos.x + BOSS_SIZE / 2 + Math.cos(angle) * 2,
          y: bossPos.y + BOSS_SIZE / 2 + Math.sin(angle) * 2,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5
        });
      }
      return attacks;
    }
  },
  4: { 
    name: "達人", 
    color: '#EDE7F6', 
    speed: BASE_SPEED - 30, 
    obstacles: ['🌀', '🌀'] as ObstacleType[], 
    boss: '🌪️' as BossType, 
    difficulty: 3, 
    bossAttack: '⚡',
    bossAttackPattern: (bossPos: Point, snakePos: Point, gridSize: number) => {
      // Spiral pattern
      const attacks = [];
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 / 5) * i + timeRef.current / 1000;
        attacks.push({
          x: bossPos.x + BOSS_SIZE / 2 + Math.cos(angle) * 2,
          y: bossPos.y + BOSS_SIZE / 2 + Math.sin(angle) * 2,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5
        });
      }
      return attacks;
    }
  },
  5: { 
    name: "超人級", 
    color: '#FFE0B2', 
    speed: BASE_SPEED - 40, 
    obstacles: ['👻', '🧟'] as ObstacleType[], 
    boss: '🎃' as BossType, 
    difficulty: 4, 
    bossAttack: '☠️',
    bossAttackPattern: (bossPos: Point, snakePos: Point, gridSize: number) => {
      // Homing missiles
      const attacks = [];
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        attacks.push({
          x: bossPos.x + BOSS_SIZE / 2 + Math.cos(angle) * 2,
          y: bossPos.y + BOSS_SIZE / 2 + Math.sin(angle) * 2,
          vx: (snakePos.x - bossPos.x) * 0.02,
          vy: (snakePos.y - bossPos.y) * 0.02
        });
      }
      return attacks;
    }
  },
  6: { 
    name: "最終段階", 
    color: '#B2EBF2', 
    speed: BASE_SPEED - 50, 
    obstacles: ['🌵', '🦀', '🦋', '🌀', '👻', '🧟'] as ObstacleType[], 
    boss: '🎃' as BossType, 
    difficulty: 5, 
    bossAttack: '💀',
    bossAttackPattern: (bossPos: Point, snakePos: Point, gridSize: number) => {
      // Combination of previous patterns
      const attacks = [];
      // Straight shot
      const dx = snakePos.x - bossPos.x;
      const dy = snakePos.y - bossPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      attacks.push({
        x: bossPos.x + BOSS_SIZE / 2 + (dx / distance) * 2,
        y: bossPos.y + BOSS_SIZE / 2 + (dy / distance) * 2,
        vx: (dx / distance) * 0.5,
        vy: (dy / distance) * 0.5
      });
      // Circular burst
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 / 4) * i;
        attacks.push({
          x: bossPos.x + BOSS_SIZE / 2 + Math.cos(angle) * 2,
          y: bossPos.y + BOSS_SIZE / 2 + Math.sin(angle) * 2,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5
        });
      }
      return attacks;
    }
  },
  7: { 
    name: "裏最終段階", 
    color: '#000000', 
    speed: BASE_SPEED - 60, 
    obstacles: [] as ObstacleType[], 
    boss: '🐉' as BossType, 
    difficulty: 5, 
    bossAttack: '🔥',
    bossAttackPattern: (bossPos: Point, snakePos: Point, gridSize: number) => {
      // Complex pattern
      const attacks = [];
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 / 12) * i + Math.sin(timeRef.current / 500) * Math.PI / 4;
        attacks.push({
          x: bossPos.x + BOSS_SIZE / 2 + Math.cos(angle) * 3,
          y: bossPos.y + BOSS_SIZE / 2 + Math.sin(angle) * 3,
          vx: Math.cos(angle) * 0.5 + Math.random() * 0.2 - 0.1,
          vy: Math.sin(angle) * 0.5 + Math.random() * 0.2 - 0.1
        });
      }
      return attacks;
    }
  }
};

interface SnakeGameProps {
  onGameOver: (score: number) => void;
}

const SnakeGame: React.FC<SnakeGameProps> = ({ onGameOver }) => {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [food, setFood] = useState<Point | null>(null);
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState(1);
  const [gameState, setGameState] = useState<GameStateType>('INITIAL');
  const [stageProgress, setStageProgress] = useState(0);
  const [hasUsedContinue, setHasUsedContinue] = useState(false);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [bossHealth, setBossHealth] = useState(3);
  const [snakeHealth, setSnakeHealth] = useState(0);
  const [phase, setPhase] = useState<'α' | 'β'>('α');
  const [bossAttacks, setBossAttacks] = useState<Point[]>([]);
  const [weaknessItem, setWeaknessItem] = useState<Point | null>(null);
  const [isSnakeInvincible, setIsSnakeInvincible] = useState(false);
  const [isBossWeak, setIsBossWeak] = useState(false);
  const [showDebugControls, setShowDebugControls] = useState(false);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const timeRef = useRef(0);

  const sendScoreToSpreadsheet = useCallback(async (score: number, stage: number) => {
    const url = 'https://script.google.com/macros/s/AKfycbyQp_py847USyAEKH8D6nuFnJBEcyu8r7ry75za0VpPCl7UoORYdIZRPtIcsSNYCBPf/exec';
    const data = {
      score: score,
      stage: stage,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'no-cors', // This is important when making requests to Google Apps Script
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      console.log('Score sent successfully');
    } catch (error) {
      console.error('Error sending score:', error);
    }
  }, []);

  const generateFood = useCallback(() => {
    if (food) return; // Don't generate new food if it already exists
    let newFood: Point;
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
    } while (
      snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
      obstacles.some(obstacle => 
        newFood.x >= obstacle.position.x && newFood.x < obstacle.position.x + obstacle.size &&
        newFood.y >= obstacle.position.y && newFood.y < obstacle.position.y + obstacle.size
      ) ||
      (boss && 
        newFood.x >= boss.position.x && newFood.x < boss.position.x + boss.size &&
        newFood.y >= boss.position.y && newFood.y < boss.position.y + boss.size
      )
    );
    setFood(newFood);
  }, [snake, obstacles, boss, food]);

  const generateObstacles = useCallback(() => {
    const newObstacles: Obstacle[] = [];
    const obstacleTypes = STAGE_CONFIG[stage].obstacles;
    
    for (let i = 0; i < obstacleTypes.length; i++) {
      let position: Point;
      do {
        position = {
          x: Math.floor(Math.random() * (GRID_SIZE - OBSTACLE_SIZE)),
          y: Math.floor(Math.random() * (GRID_SIZE - OBSTACLE_SIZE))
        };
      } while (
        snake.some(segment => 
          segment.x >= position.x && segment.x < position.x + OBSTACLE_SIZE &&
          segment.y >= position.y && segment.y < position.y + OBSTACLE_SIZE
        ) ||
        newObstacles.some(obstacle => 
          Math.abs(obstacle.position.x - position.x) < OBSTACLE_SIZE * 2 &&
          Math.abs(obstacle.position.y - position.y) < OBSTACLE_SIZE * 2
        )
      );

      const movement = (time: number) => {
        switch (obstacleTypes[i]) {
          case '🦀':
            return { x: position.x + Math.sin(time / 1000 + i * Math.PI) * 3, y: position.y };
          case '🦋':
            return { 
              x: position.x + Math.sin(time / 1000 + i * Math.PI) * 3, 
              y: position.y + Math.cos(time / 1000 + i * Math.PI) * 3 
            };
          case '🌀':
            return { 
              x: position.x + Math.cos(time / 500 + i * Math.PI) * 3, 
              y: position.y + Math.sin(time / 500 + i * Math.PI) * 3 
            };
          case '👻':
            return { 
              x: position.x + (snake[0].x > position.x ? 0.3 : -0.3), 
              y: position.y + (snake[0].y > position.y ? 0.3 : -0.3) 
            };
          case '🧟':
            return { 
              x: position.x + Math.cos(time / 1000) * 2, 
              y: position.y + Math.sin(time / 1000) * 2 
            };
          default:
            return position;
        }
      };

      newObstacles.push({ type: obstacleTypes[i], position, size: OBSTACLE_SIZE, movement });
    }
    setObstacles(newObstacles);
  }, [stage, snake]);

  const generateBoss = useCallback(() => {
    const bossType = STAGE_CONFIG[stage].boss;
    const position: Point = { 
      x: Math.floor(GRID_SIZE / 2) - Math.floor(BOSS_SIZE / 2), 
      y: Math.floor(GRID_SIZE / 2) - Math.floor(BOSS_SIZE / 2) 
    };

    const movement = (time: number) => {
      switch (bossType) {
        case '🦀':
          return { x: position.x + Math.sin(time / 500) * 5, y: position.y };
        case '🦋':
          return { 
            x: position.x + Math.sin(time / 500) * 5, 
            y: position.y + Math.cos(time / 500) * 5 
          };
        case '🌪️':
          return { 
            x: position.x + Math.cos(time / 250) * 5, 
            y: position.y + Math.sin(time / 250) * 5 
          };
        case '🎃':
          return { 
            x: position.x + Math.sin(time / 500) * 5, 
            y: position.y + Math.cos(time / 750) * 5 
          };
        case '🐉':
          return { 
            x: position.x + Math.sin(time / 500 + Math.cos(time / 750)) * 7, 
            y: position.y + Math.cos(time / 750 + Math.sin(time / 500)) * 7 
          };
        default:
          return position;
      }
    };

    setBoss({ type: bossType, position, size: BOSS_SIZE, health: 3, movement });
    setBossHealth(3);
  }, [stage]);

  const togglePause = useCallback(() => {
    setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : 'PLAYING');
  }, []);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameState === 'GAME_OVER') return;

    const keyMap: { [key: string]: Direction } = {
      ArrowUp: 'UP',
      ArrowDown: 'DOWN',
      ArrowLeft: 'LEFT',
      ArrowRight: 'RIGHT',
      w: 'UP',
      s: 'DOWN',
      a: 'LEFT',
      d: 'RIGHT'
    };

    const newDirection = keyMap[event.key.toLowerCase()];
    if (newDirection) {
      event.preventDefault();
      if (gameState === 'INITIAL') {
        setGameState('PLAYING');
        generateObstacles();
        generateFood();
      }
      
      const opposites = {
        UP: 'DOWN',
        DOWN: 'UP',
        LEFT: 'RIGHT',
        RIGHT: 'LEFT'
      };
      if (opposites[newDirection] !== direction) {
        setDirection(newDirection);
      }
    }

    if (event.code === 'Space' && gameState !== 'INITIAL') {
      event.preventDefault();
      togglePause();
    }

    if (event.ctrlKey && event.key === 'd') {
      setShowDebugControls(prev => !prev);
    }
  }, [gameState, direction, togglePause, generateObstacles, generateFood]);

  useEffect(() => {
    if (gameState !== 'PLAYING' && gameState !== 'BOSS_BATTLE') return;

    const gameLoop = setInterval(() => {
      timeRef.current += STAGE_CONFIG[stage].speed;

      setSnake(prevSnake => {
        const head = { ...prevSnake[0] };
        
        switch (direction) {
          case 'UP':
            head.y = (head.y - 1 + GRID_SIZE) % GRID_SIZE;
            break;
          case 'DOWN':
            head.y = (head.y + 1) % GRID_SIZE;
            break;
          case 'LEFT':
            head.x = (head.x - 1 + GRID_SIZE) % GRID_SIZE;
            break;
          case 'RIGHT':
            head.x = (head.x + 1) % GRID_SIZE;
            break;
        }

        // Check collision with obstacles
        const hitObstacle = phase === 'α' && obstacles.some(obstacle => {
          const obstaclePos = obstacle.movement(timeRef.current);
          return (
            head.x >= Math.floor(obstaclePos.x) && head.x < Math.floor(obstaclePos.x) + obstacle.size &&
            head.y >= Math.floor(obstaclePos.y) && head.y < Math.floor(obstaclePos.y) + obstacle.size
          );
        });

        // Check collision with boss
        const hitBoss = boss && (
          head.x >= Math.floor(boss.position.x) && head.x < Math.floor(boss.position.x) + boss.size &&
          head.y >= Math.floor(boss.position.y) && head.y < Math.floor(boss.position.y) + boss.size
        );

        // Check collision with boss attacks
        const hitBossAttack = bossAttacks.some(attack => 
          Math.abs(head.x - attack.x) < 1 && Math.abs(head.y - attack.y) < 1
        );

        // Check collision with weakness item
        const hitWeaknessItem = weaknessItem && 
          Math.abs(head.x - weaknessItem.x) < 1 && Math.abs(head.y - weaknessItem.y) < 1;

        if ((hitObstacle || hitBoss || hitBossAttack) && !isSnakeInvincible) {
          setSnakeHealth(prev => {
            const newHealth = prev - 1;
            if (newHealth <= 0) {
              setGameState('GAME_OVER');
              return 0;
            }
            return newHealth;
          });
          return prevSnake;
        }

        if (hitBoss && isSnakeInvincible && isBossWeak) {
          setBossHealth(prev => {
            const newHealth = prev - 1;
            if (newHealth <= 0) {
              if (stage < 7) {
                setStage(s => s + 1);
                setGameState('STAGE_CLEAR');
                setTimeout(() => {
                  setGameState('PLAYING');
                  setPhase('α');
                  generateObstacles();
                  setSnake([{ x: 10, y: 10 }]);
                  setDirection('RIGHT');
                  setFood(null);
                  setBossAttacks([]);
                  setWeaknessItem(null);
                  setIsSnakeInvincible(false);
                  setIsBossWeak(false);
                  setSnakeHealth(0);
                  setBoss(null);
                  setObstacles([]);
                }, 2000);
              } else {
                setGameState('GAME_OVER');
              }
            }
            return newHealth;
          });
        }

        const newSnake = [head, ...prevSnake];
        
        if (food && head.x === food.x && head.y === food.y) {
          setScore(prev => {
            const newScore = prev + (10 * stage);
            const stageTarget = stage * 100;
            setStageProgress((newScore % stageTarget) / stageTarget);
            if (phase === 'α') {
              setSnakeHealth(prev => prev + 1);
            } else {
              setSnakeHealth(prev => Math.min(prev + 1, 10)); // Limit max health to 10
            }

            if (newScore >= stageTarget && phase === 'α') {
              setPhase('β');
              setGameState('BOSS_BATTLE');
              generateBoss();
            }
            return newScore;
          });
          setFood(null);
          generateFood();
        } else if (hitWeaknessItem) {
          setIsSnakeInvincible(true);
          setIsBossWeak(true);
          setWeaknessItem(null);
          setTimeout(() => {
            setIsSnakeInvincible(false);
            setIsBossWeak(false);
            if (boss) {
              setBoss(prevBoss => ({
                ...prevBoss!,
                position: { 
                  x: Math.floor(GRID_SIZE / 2) - Math.floor(BOSS_SIZE / 2), 
                  y: Math.floor(GRID_SIZE / 2) - Math.floor(BOSS_SIZE / 2) 
                }
              }));
            }
          }, 10000); // Increased to 10 seconds (2x original duration)
        } else {
          newSnake.pop();
        }

        return newSnake;
      });

      // Update obstacle positions with screen wrapping
      if (phase === 'α') {
        setObstacles(prevObstacles => 
          prevObstacles.map(obstacle => {
            const newPos = obstacle.movement(timeRef.current);
            return {
              ...obstacle,
              position: {
                x: (newPos.x + GRID_SIZE) % GRID_SIZE,
                y: (newPos.y + GRID_SIZE) % GRID_SIZE
              }
            };
          })
        );
      }

      // Update boss position and generate attacks
      if (boss && phase === 'β') {
        setBoss(prevBoss => {
          let newPosition = isBossWeak
            ? {
                x: prevBoss!.position.x + (prevBoss!.position.x < snake[0].x ? -0.5 : 0.5),
                y: prevBoss!.position.y + (prevBoss!.position.y < snake[0].y ? -0.5 : 0.5)
              }
            : prevBoss!.movement(timeRef.current);
          
          // Ensure boss stays within the grid
          newPosition.x = Math.max(0, Math.min(GRID_SIZE - prevBoss!.size, newPosition.x));
          newPosition.y = Math.max(0, Math.min(GRID_SIZE - prevBoss!.size, newPosition.y));
          
          return {
            ...prevBoss!,
            position: newPosition
          };
        });

        if (Math.random() < 0.1 && !isBossWeak) {  // 10% chance to generate an attack
          const attackPattern = STAGE_CONFIG[stage].bossAttackPattern;
          const newAttacks = attackPattern(boss.position, snake[0], GRID_SIZE);
          setBossAttacks(prev => [...prev, ...newAttacks]);
        }
      }

      // Move and update boss attacks
      setBossAttacks(prev => 
        prev.map(attack => ({
          ...attack,
          x: attack.x + attack.vx,
          y: attack.y + attack.vy,
          timeAlive: (attack.timeAlive || 0) + 1
        })).filter(attack => 
          attack.x >= 0 && attack.x < GRID_SIZE && 
          attack.y >= 0 && attack.y < GRID_SIZE &&
          attack.timeAlive < 100 // Remove attacks after 5 seconds (assuming 20 FPS)
        )
      );

      // Move weakness item away from snake
      if (weaknessItem) {
        setWeaknessItem(prev => {
          if (!prev) return null;
          const dx = snake[0].x - prev.x;
          const dy = snake[0].y - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          let newX = prev.x - (dx / distance) * 0.3;
          let newY = prev.y - (dy / distance) * 0.3;
          newX = (newX + GRID_SIZE) % GRID_SIZE;
          newY = (newY + GRID_SIZE) % GRID_SIZE;
          return { x: newX, y: newY };
        });
      }

      // Generate weakness item
      if (phase === 'β' && !weaknessItem && Math.random() < 0.05) {  // 5% chance to generate weakness item
        setWeaknessItem({
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        });
      }

      // Refresh food if it doesn't exist
      if (!food) {
        generateFood();
      }
    }, STAGE_CONFIG[stage].speed);

    return () => clearInterval(gameLoop);
  }, [direction, food, gameState, stage, hasUsedContinue, generateFood, generateObstacles, generateBoss, boss, phase, snake, isSnakeInvincible, isBossWeak]);

  useEffect(() => {
    if (!food && (gameState === 'PLAYING' || gameState === 'BOSS_BATTLE')) {
      generateFood();
    }
  }, [food, gameState, generateFood]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Update the game over logic to send the score
  useEffect(() => {
    if (gameState === 'GAME_OVER') {
      sendScoreToSpreadsheet(score, stage);
      onGameOver(score);
    }
  }, [gameState, score, stage, sendScoreToSpreadsheet, onGameOver]);

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-2xl font-bold">スコア: {score}</div>
          <div className={`text-lg ${stage === 7 ? 'text-red-600 font-bold' : ''}`}>
            {STAGE_CONFIG[stage].name}
          </div>
          <div className="text-sm">
            難易度: {'👹'.repeat(STAGE_CONFIG[stage].difficulty)}
            <br />
            {phase === 'β' && (
              <span>✨️状態でボスにぶつかれ！</span>
            )}
          </div>
          {gameState === 'BOSS_BATTLE' && (
            <div className="text-sm">
              ボスの弱点をねらえ！
            </div>
          )}
        </div>
        <div>
          <div className="text-lg">🍎 x {snakeHealth}</div>
          {gameState === 'BOSS_BATTLE' && (
            <div className="text-lg">
              ボス体力: {'❤️'.repeat(bossHealth)}
            </div>
          )}
        </div>
        {gameState !== 'INITIAL' && (
          <button
            onClick={togglePause}
            className="px-4 py-2 bg-emerald-500 text-white rounded-full"
          >
            {gameState === 'PAUSED' ? '再開' : '一時停止'}
          </button>
        )}
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
        <motion.div
          className="h-full bg-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${stageProgress * 100}%` }}
        />
      </div>

      <div className="relative aspect-square w-full border-2 rounded-lg overflow-hidden"
           style={{ 
             backgroundColor: STAGE_CONFIG[stage].color,
             borderColor: stage === 7 ? '#FF0000' : `hsl(${stage * 60}, 70%, 50%)`
           }}>
        <div className="absolute inset-0">
          <AnimatePresence>
            {snake.map((segment, index) => (
              <motion.div
                key={`${segment.x}-${segment.y}`}
                className={`absolute rounded-lg ${isSnakeInvincible ? 'animate-pulse' : ''}`}
                style={{
                  backgroundColor: isSnakeInvincible ? '#FFD700' : (index === 0 ? '#FFFFFF' : '#E0E0E0'),
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  boxShadow: index === 0 ? '0 0 10px rgba(0,0,0,0.3)' : 'none'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              />
            ))}

            {food && (
              <motion.div
                key={`food-${food.x}-${food.y}`}
                className="absolute flex items-center justify-center text-2xl"
                style={{
                  left: `${(food.x / GRID_SIZE) * 100}%`,
                  top: `${(food.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`
                }}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: [1, 1.2, 1],
                  transition: { duration: 0.6, repeat: Infinity }
                }}
              >
                🍎
              </motion.div>
            )}

            {obstacles.map((obstacle, index) => (
              <motion.div
                key={`obstacle-${index}`}
                className="absolute flex items-center justify-center text-4xl"
                style={{
                  left: `${(obstacle.position.x / GRID_SIZE) * 100}%`,
                  top: `${(obstacle.position.y / GRID_SIZE) * 100}%`,
<continuation_point>
                  width: `${(obstacle.size / GRID_SIZE) * 100}%`,
                  height: `${(obstacle.size / GRID_SIZE) * 100}%`
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {obstacle.type}
              </motion.div>
            ))}

            {boss && (
              <motion.div
                key={`boss`}
                className={`absolute flex items-center justify-center text-6xl ${isBossWeak ? 'animate-pulse' : ''}`}
                style={{
                  left: `${(boss.position.x / GRID_SIZE) * 100}%`,
                  top: `${(boss.position.y / GRID_SIZE) * 100}%`,
                  width: `${(boss.size / GRID_SIZE) * 100}%`,
                  height: `${(boss.size / GRID_SIZE) * 100}%`,
                  filter: isBossWeak ? 'hue-rotate(180deg)' : 'none'
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {boss.type}
              </motion.div>
            )}

            {bossAttacks.map((attack, index) => (
              <motion.div
                key={`attack-${index}`}
                className="absolute flex items-center justify-center text-2xl"
                style={{
                  left: `${(attack.x / GRID_SIZE) * 100}%`,
                  top: `${(attack.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                {STAGE_CONFIG[stage].bossAttack}
              </motion.div>
            ))}

            {weaknessItem && (
              <motion.div
                key={`weakness-${weaknessItem.x}-${weaknessItem.y}`}
                className="absolute flex items-center justify-center text-2xl"
                style={{
                  left: `${(weaknessItem.x / GRID_SIZE) * 100}%`,
                  top: `${(weaknessItem.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                ✨️
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {gameState === 'INITIAL' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-white text-2xl text-center">
                矢印キーで開始
              </div>
            </motion.div>
          )}

          {gameState === 'PAUSED' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-white text-4xl">PAUSE</div>
            </motion.div>
          )}

          {gameState === 'STAGE_CLEAR' && stage < 7 && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
            >
              <div className="text-white text-4xl font-bold">
                STAGE {stage} CLEAR!
              </div>
            </motion.div>
          )}

          {gameState === 'GAME_OVER' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <h2 className="text-4xl text-white mb-4">Game Over</h2>
                <p className="text-2xl text-white mb-4">スコア: {score}</p>
                {playerName === null ? (
                  <NameInput 
                    onSubmit={(name) => {
                      setPlayerName(name);
                      sendScoreToFirebase(name, score, stage);
                      onGameOver(score);
                    }} 
                  />
                ) : (
                  <p className="text-xl text-white mb-4">スコアを送信しました！</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showDebugControls && (
        <div className="absolute top-4 right-4 bg-white p-2 rounded shadow">
          <button
            onClick={() => {
              setStage(prev => Math.min(prev + 1, 7));
              setGameState('PLAYING');
              setPhase('α');
              generateObstacles();
              setSnake([{ x: 10, y: 10 }]);
              setDirection('RIGHT');
              setFood(null);
              setBossAttacks([]);
              setWeaknessItem(null);
              setIsSnakeInvincible(false);
              setIsBossWeak(false);
              if (phase === 'α') {
                setSnakeHealth(0);
              }
            }}
            className="px-2 py-1 bg-blue-500 text-white rounded mr-2"
          >
            Next Stage
          </button>
          <button
            onClick={() => {
              setPhase('β');
              setGameState('BOSS_BATTLE');
              generateBoss();
            }}
            className="px-2 py-1 bg-red-500 text-white rounded"
          >
            Boss Battle
          </button>
        </div>
      )}
    </div>
  );
};

const sendScoreToFirebase = async (name: string, score: number, stage: number) => {
  try {
    const scoreData = {
      userId: name,
      score: score,
      stage: stage,
      playtime: Math.floor(timeRef.current / 1000).toString(),
      timestamp: new Date()
    };
    await addDoc(collection(db, 'SnakeScores'), scoreData);
    console.log('Score sent successfully');
  } catch (error) {
    console.error('Error sending score:', error);
  }
};

export default SnakeGame;

