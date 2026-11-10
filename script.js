(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const speedDisplay = document.getElementById('speedDisplay');
  const statusMessage = document.getElementById('statusMessage');

  // DIMENSI
  const LANE_COUNT = 3;
  const LANE_WIDTH = 200;
  const ROAD_LEFT = 100;
  const ROAD_RIGHT = 700;
  const CAR_WIDTH = 56;
  const CAR_HEIGHT = 100;
  const PLAYER_FIXED_Y = 500;

  // STATE
  let gameActive = false;
  let score = 0;
  let speed = 1.0;
  let frameCount = 0;
  let animationId = null;
  let playerLane = 1;
  let playerX = ROAD_LEFT + LANE_WIDTH * 1 + (LANE_WIDTH - CAR_WIDTH) / 2;

  let obstacles = [];
  let particles = [];
  let roadOffset = 0;

  // ========== INIT / RESET ==========
  function resetGame() {
    gameActive = true;
    score = 0;
    speed = 1.0;
    frameCount = 0;
    playerLane = 1;
    playerX = ROAD_LEFT + LANE_WIDTH * 1 + (LANE_WIDTH - CAR_WIDTH) / 2;
    obstacles = [];
    particles = [];
    roadOffset = 0;
    updateScoreAndSpeed();
    statusMessage.textContent = '🏁 BALAPAN DIMULAI!';
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
  }

  function gameOver() {
    gameActive = false;
    statusMessage.textContent = '💥 GAME OVER — Tekan R / Klik';
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: playerX + CAR_WIDTH / 2,
        y: PLAYER_FIXED_Y + CAR_HEIGHT / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 2,
        life: 1.0,
        color: `hsl(${Math.random() * 60 + 280}, 100%, 65%)`,
        size: Math.random() * 12 + 5,
      });
    }
    cancelAnimationFrame(animationId);
    render();

    function particleLoop() {
      if (!gameActive && particles.length > 0) {
        updateParticles();
        render();
        requestAnimationFrame(particleLoop);
      } else if (!gameActive) {
        render();
      }
    }
    requestAnimationFrame(particleLoop);
  }

  // ========== UPDATE SCORE & SPEED ==========
  function updateScoreAndSpeed() {
    scoreDisplay.textContent = Math.floor(score);
    speedDisplay.textContent = speed.toFixed(1);
  }

  // ========== PERGERAKAN PEMAIN ==========
  function movePlayer(direction) {
    if (!gameActive) return;
    if (direction === 'left' && playerLane > 0) {
      playerLane--;
    } else if (direction === 'right' && playerLane < LANE_COUNT - 1) {
      playerLane++;
    } else {
      return;
    }
    playerX = ROAD_LEFT + LANE_WIDTH * playerLane + (LANE_WIDTH - CAR_WIDTH) / 2;
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: playerX + CAR_WIDTH / 2,
        y: PLAYER_FIXED_Y + CAR_HEIGHT - 10,
        vx: (Math.random() - 0.5) * 5,
        vy: Math.random() * 3 + 1,
        life: 0.8,
        color: `hsl(${Math.random() * 40 + 180}, 100%, 70%)`,
        size: Math.random() * 6 + 3,
      });
    }
  }

  // ========== SPAWN OBSTACLE ==========
  function spawnObstacle() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = ROAD_LEFT + lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    const hue = Math.random() * 360;
    obstacles.push({
      x,
      y: -CAR_HEIGHT - Math.random() * 100,
      width: CAR_WIDTH,
      height: CAR_HEIGHT,
      lane,
      color: `hsl(${hue}, 100%, 60%)`,
      glow: `hsl(${hue}, 100%, 70%)`,
      speedVariation: 0.8 + Math.random() * 0.6,
    });
  }

  // ========== UPDATE PARTIKEL ==========
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.015;
      if (p.life <= 0 || p.y > canvas.height + 50) {
        particles.splice(i, 1);
      }
    }
  }

  // ========== UPDATE GAME ==========
  function update() {
    if (!gameActive) return;

    frameCount++;
    score += 0.1 * speed;
    speed = Math.min(3.0, 1.0 + frameCount * 0.0012);
    updateScoreAndSpeed();

    const spawnRate = Math.max(18, 40 - Math.floor(speed * 6));
    if (frameCount % spawnRate === 0) {
      spawnObstacle();
    }

    roadOffset = (roadOffset + speed * 3) % 60;

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.y += (3.2 + speed * 2.0) * obs.speedVariation;

      if (gameActive) {
        const playerRect = { x: playerX, y: PLAYER_FIXED_Y, w: CAR_WIDTH, h: CAR_HEIGHT };
        const obsRect = { x: obs.x, y: obs.y, w: CAR_WIDTH, h: CAR_HEIGHT };
        if (rectCollide(playerRect, obsRect)) {
          gameOver();
          return;
        }
      }

      if (obs.y > canvas.height + 100) {
        obstacles.splice(i, 1);
      }
    }

    updateParticles();
  }

  function rectCollide(r1, r2) {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  // ========== RENDER ==========
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.strokeStyle = '#0ff2';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.strokeStyle = '#f0f2';
      ctx.stroke();
    }

    // Jalan
    ctx.fillStyle = '#0d0d1a';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 20;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, canvas.height);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Garis tepi jalan
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 5;
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT, 0);
    ctx.lineTo(ROAD_LEFT, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ROAD_RIGHT, 0);
    ctx.lineTo(ROAD_RIGHT, canvas.height);
    ctx.stroke();

    // Marka putus-putus
    ctx.strokeStyle = '#f0f';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#f0f';
    ctx.shadowBlur = 18;
    ctx.setLineDash([30, 30]);
    ctx.beginPath();
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const x = ROAD_LEFT + lane * LANE_WIDTH;
      ctx.moveTo(x, -roadOffset + 30);
      ctx.lineTo(x, canvas.height - roadOffset + 60);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Obstacles
    obstacles.forEach((obs) => {
      ctx.shadowColor = obs.glow;
      ctx.shadowBlur = 25;
      ctx.fillStyle = obs.color;
      ctx.beginPath();
      ctx.roundRect(obs.x, obs.y, CAR_WIDTH, CAR_HEIGHT, 12);
      ctx.fill();

      ctx.fillStyle = '#ffffffcc';
      ctx.shadowBlur = 15;
      ctx.shadowColor = obs.glow;
      ctx.beginPath();
      ctx.roundRect(obs.x + 8, obs.y + 10, CAR_WIDTH - 16, 22, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffa0';
      ctx.shadowColor = '#ff0';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(obs.x + 10, obs.y + CAR_HEIGHT - 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(obs.x + CAR_WIDTH - 10, obs.y + CAR_HEIGHT - 12, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#00e0ff';
    ctx.beginPath();
    ctx.roundRect(playerX, PLAYER_FIXED_Y, CAR_WIDTH, CAR_HEIGHT, 16);
    ctx.fill();

    ctx.shadowBlur = 25;
    ctx.shadowColor = '#f0f';
    ctx.fillStyle = '#ff00c8';
    ctx.beginPath();
    ctx.roundRect(playerX + 8, PLAYER_FIXED_Y + 12, CAR_WIDTH - 16, 14, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(playerX + 10, PLAYER_FIXED_Y + 8, CAR_WIDTH - 20, 20, 8);
    ctx.fill();

    ctx.fillStyle = '#ffd966';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(playerX + 12, PLAYER_FIXED_Y + CAR_HEIGHT - 10, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(playerX + CAR_WIDTH - 12, PLAYER_FIXED_Y + CAR_HEIGHT - 10, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0ff';
    ctx.shadowColor = '#0ff';
    ctx.beginPath();
    ctx.roundRect(playerX + 6, PLAYER_FIXED_Y + CAR_HEIGHT - 28, CAR_WIDTH - 12, 8, 4);
    ctx.fill();

    // Partikel
    particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = 20;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Speed line
    if (gameActive && speed > 1.2) {
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#0ff';
      for (let i = 0; i < 8; i++) {
        const x = ROAD_LEFT + 30 + Math.random() * (ROAD_RIGHT - ROAD_LEFT - 60);
        const y = Math.random() * canvas.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8, y + 30 + Math.random() * 30);
        ctx.strokeStyle = `hsl(${180 + Math.random() * 60}, 100%, 70%)`;
        ctx.stroke();
      }
    }

    if (!gameActive) {
      ctx.fillStyle = '#000000aa';
      ctx.shadowBlur = 0;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 48px "Segoe UI", Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f0f';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#f0f';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = '28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0ff';
      ctx.shadowColor = '#0ff';
      ctx.fillText('Tekan R / KLIK', canvas.width / 2, canvas.height / 2 + 40);
    }
  }

  // Helper roundRect
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
  };

  // ========== GAME LOOP ==========
  function gameLoop() {
    if (!gameActive) return;
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // ========== EVENT ==========
  function handleKeyDown(e) {
    const key = e.key;
    if ([' ', 'Space', 'ArrowLeft', 'ArrowRight', 'r', 'R'].includes(key)) {
      e.preventDefault();
    }
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      movePlayer('left');
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      movePlayer('right');
    } else if (key === ' ' || key === 'Space') {
      if (!gameActive) resetGame();
    } else if (key === 'r' || key === 'R') {
      resetGame();
    }
  }

  function handleCanvasClick(e) {
    if (!gameActive) {
      resetGame();
    } else {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const clickX = (e.clientX - rect.left) * scaleX;
      if (clickX < canvas.width / 2) movePlayer('left');
      else movePlayer('right');
    }
  }

  document.getElementById('restartButton').addEventListener('click', (e) => {
    e.stopPropagation();
    resetGame();
  });

  function initialRender() {
    gameActive = false;
    statusMessage.textContent = '▶ TEKAN SPACE / KLIK';
    render();
    ctx.font = 'bold 36px "Segoe UI", Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#0ff';
    ctx.fillText('NEON RACER', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#f0f';
    ctx.shadowColor = '#f0f';
    ctx.fillText('KLIK / SPACE untuk mulai', canvas.width / 2, canvas.height / 2 + 30);
  }

  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
  });

  initialRender();
})();
