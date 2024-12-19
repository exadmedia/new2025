import { updateScore, gameOver } from './score.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const snake = [{x: 200, y: 200}];
let direction = 'right';
let food = getRandomFood();
let gameRunning = true;
let growthQueue = 0; // Added to track snake growth

function getRandomFood() {
    return {
        x: Math.floor(Math.random() * (canvas.width / 10)) * 10,
        y: Math.floor(Math.random() * (canvas.height / 10)) * 10
    };
}

function drawSnake() {
    ctx.fillStyle = 'green';
    snake.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, 10, 10);
    });
}

function drawFood() {
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x, food.y, 10, 10);
}

function moveSnake() {
    if (!gameRunning) return;

    const head = {x: snake[0].x, y: snake[0].y};
    switch(direction) {
        case 'up': head.y -= 10; break;
        case 'down': head.y += 10; break;
        case 'left': head.x -= 10; break;
        case 'right': head.x += 10; break;
    }

    // Check for collision with walls
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        gameRunning = false;
        showGameOverEffect(); // Changed to call showGameOverEffect
        return;
    }

    // Check for collision with self
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameRunning = false;
        showGameOverEffect(); // Changed to call showGameOverEffect
        return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        food = getRandomFood();
        updateScore();
        growthQueue++; // Increment growth queue on food consumption
    } else if (growthQueue > 0) {
        growthQueue--;
    } else {
        snake.pop();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveSnake();
    drawSnake();
    drawFood();

    if (gameRunning) {
        requestAnimationFrame(gameLoop);
    }
}

document.addEventListener('keydown', (e) => {
    if (!gameRunning) return;

    switch(e.key) {
        case 'ArrowUp': if (direction !== 'down') direction = 'up'; break;
        case 'ArrowDown': if (direction !== 'up') direction = 'down'; break;
        case 'ArrowLeft': if (direction !== 'right') direction = 'left'; break;
        case 'ArrowRight': if (direction !== 'left') direction = 'right'; break;
    }
});

const restartButton = document.getElementById('restartButton');

function resetGame() {
    snake.length = 1;
    snake[0] = {x: 200, y: 200};
    direction = 'right';
    food = getRandomFood();
    gameRunning = true;
    growthQueue = 0;
    restartButton.style.display = 'none';
    gameLoop();
}

restartButton.addEventListener('click', resetGame);

function showGameOverEffect() {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTimeout(() => {
        gameOver();
        restartButton.style.display = 'block';
    }, 1000);
}

gameLoop();

