let score = 0;
const highScores = [];

export function updateScore() {
    score++;
    document.getElementById('score').textContent = `Score: ${score}`;
}

export function gameOver() {
    highScores.push(score);
    highScores.sort((a, b) => b - a);
    highScores.splice(5); // Keep only top 5 scores
    
    const highScoreList = document.getElementById('highScores').querySelector('ol');
    highScoreList.innerHTML = '';
    highScores.forEach((s, i) => {
        const li = document.createElement('li');
        li.textContent = `${s}`;
        highScoreList.appendChild(li);
    });
    
    score = 0;
    document.getElementById('score').textContent = `Score: ${score}`;
}

export function getScore() {
    return score;
}

