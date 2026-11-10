(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreDisplay = document.getElementById('scoreDisplay');
  const speedDisplay = document.getElementById('speedDisplay');
  const coinDisplay = document.getElementById('coinDisplay');
  const highScoreDisplay = document.getElementById('highScoreDisplay');
  const statusMessage = document.getElementById('statusMessage');
  const carSelector = document.getElementById('carSelector');

  // ========== DIMENSI ==========
  const LANE_COUNT = 3;
  const LANE_WIDTH = 200;
  const ROAD_LEFT = 100;
  const ROAD_RIGHT = 700;
  const CAR_WIDTH = 56;
  const CAR_HEIGHT = 100;
  const PLAYER_FIXED_Y = 500;

  // ========== DAFTAR MOBIL ==========
  const CARS = [
    { name: 'CYBER', body: '#00e0ff', accent: '#ff00c8', speedMul: 1.15, handling: 1.0 },
    { name: 'BLAZE', body: '#ffd966', accent: '#ff0080', speedMul: 0.95, handling: 1.3 },
    { name: 'VENOM', body: '#7bff5e', accent: '#00e0ff', speedMul: 1.05, handling: 1.15 },
  ];
  let selectedCar = 0;

  // ========== STATE ==========
  let gameActive = false;
  let score = 0;
  let speed = 1.0;
  let frameCount = 0;
  let animationId = null;
  let playerLane = 1;
  let playerX = ROAD_LEFT + LANE_WIDTH * 1 + (LANE_WIDTH - CAR_WIDTH) / 2;

  let obstacles = [];
  let particles = [];
  let coins = [];
  let powerUps = [];
  let roadOffset = 0;

  let coinCount = 0;
  let shieldActive = false;
  let nitroActive = false;
  let nitroTimer = 0;
  let shieldTimer = 0;
  let highScore = parseInt(localStorage.getItem('neonRacerHigh') || '0', 10);
  highScoreDisplay.textContent = highScore;

  // ========== AUDIO (Web Audio API – tanpa file) ==========
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function beep(freq = 440, dur = 0.1, type = 'square', vol = 0.08) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }

  function sfxCoin() { beep(880, 0.08, 'sine', 0.06); setTimeout(() => beep(1320, 0.08, 'sine', 0.06), 60); }
  function sfxCrash() { beep(120, 0.4, 'sawtooth', 0.15); }
  function sfxNitro() { beep(300, 0.15, 'sawtooth', 0.1); setTimeout(() => beep(600, 0.2, 'sawtooth', 0.1), 100); }
  function sfxShield() { beep(500, 0.1, 'triangle', 0.08); setTimeout(() => beep(800, 0.15, 'triangle', 0.08), 80); }

  // ========== RESET ==========
  function if (!currentUser) return;
    gameActive = true;
    score = 0;
    speed = CARS[selectedCar].speedMul;
    gameActive = true;
    score = 0;
    speed = CARS[selectedCar].speedMul;
    frameCount = 0;
    playerLane = 1;
    playerX = ROAD_LEFT + LANE_WIDTH * 1 + (LANE_WIDTH - CAR_WIDTH) / 2;
    obstacles = [];
    particles = [];
    coins = [];
    powerUps = [];
    roadOffset = 0;
    coinCount = 0;
    shieldActive = false;
    nitroActive = false;
    nitroTimer = 0;
    shieldTimer = 0;
    updateScoreAndSpeed();
    statusMessage.textContent = '🏁 BALAPAN DIMULAI!';
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
    initAudio();
  }

  function gameOver() {
    gameActive = false;
    statusMessage.textContent = '💥 GAME OVER — Tekan R / Klik';
    sfxCrash();

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

    if (currentUser && currentUser.name !== 'Tamu') {
        currentUser.high_score = currentHigh;
      }
  }

    cancelAnimationFrame(animationId);
    render();
    submitScore(score);

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

  // ========== SCORE ==========
  function updateScoreAndSpeed() {
    scoreDisplay.textContent = Math.floor(score);
    speedDisplay.textContent = speed.toFixed(1);
    coinDisplay.textContent = coinCount;
  }

  // ========== MOVEMENT ==========
  function movePlayer(direction) {
    if (!gameActive) return;
    if (direction === 'left' && playerLane > 0) playerLane--;
    else if (direction === 'right' && playerLane < LANE_COUNT - 1) playerLane++;
    else return;

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

  // ========== SPAWN ==========
  function spawnObstacle() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = ROAD_LEFT + lane * LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2;
    const hue = Math.random() * 360;
    obstacles.push({
      x, y: -CAR_HEIGHT - Math.random() * 100,
      width: CAR_WIDTH, height: CAR_HEIGHT, lane,
      color: `hsl(${hue}, 100%, 60%)`,
      glow: `hsl(${hue}, 100%, 70%)`,
      speedVariation: 0.8 + Math.random() * 0.6,
    });
  }

  function spawnCoin() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
    coins.push({ x, y: -30, radius: 14, collected: false });
  }

  function spawnPowerUp() {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    const x = ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
    const type = Math.random() < 0.5 ? 'nitro' : 'shield';
    powerUps.push({ x, y: -30, radius: 18, type, collected: false });
  }

  // ========== UPDATE PARTICLES ==========
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.015;
      if (p.life <= 0 || p.y > canvas.height + 50) particles.splice(i, 1);
    }
  }

  // ========== UPDATE ==========
  function update() {
    if (!gameActive) return;

    frameCount++;
    score += 0.1 * speed;
    speed = Math.min(3.0, CARS[selectedCar].speedMul + frameCount * 0.0012);
    updateScoreAndSpeed();

    // Timer power-up
    if (nitroActive) { nitroTimer--; if (nitroTimer <= 0) nitroActive = false; }
    if (shieldActive) { shieldTimer--; if (shieldTimer <= 0) shieldActive = false; }

    const effectiveSpeed = speed * (nitroActive ? 1.6 : 1.0);

    const spawnRate = Math.max(18, 40 - Math.floor(effectiveSpeed * 6));
    if (frameCount % spawnRate === 0) spawnObstacle();
    if (frameCount % 55 === 0) spawnCoin();
    if (frameCount % 220 === 0) spawnPowerUp();

    roadOffset = (roadOffset + effectiveSpeed * 3) % 60;

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.y += (3.2 + effectiveSpeed * 2.0) * obs.speedVariation;

      if (gameActive) {
        const playerRect = { x: playerX, y: PLAYER_FIXED_Y, w: CAR_WIDTH, h: CAR_HEIGHT };
        const obsRect = { x: obs.x, y: obs.y, w: CAR_WIDTH, h: CAR_HEIGHT };
        if (rectCollide(playerRect, obsRect)) {
          if (shieldActive) {
            obstacles.splice(i, 1);
            shieldActive = false;
            sfxShield();
            continue;
          } else {
            gameOver();
            return;
          }
        }
      }
      if (obs.y > canvas.height + 100) obstacles.splice(i, 1);
    }

    // Coins
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.y += effectiveSpeed * 3;
      const dx = (playerX + CAR_WIDTH / 2) - c.x;
      const dy = (PLAYER_FIXED_Y + CAR_HEIGHT / 2) - c.y;
      if (Math.hypot(dx, dy) < 40) {
        coins.splice(i, 1);
        coinCount++;
        score += 5;
        sfxCoin();
        updateScoreAndSpeed();
        continue;
      }
      if (c.y > canvas.height + 50) coins.splice(i, 1);
    }

    // Power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += effectiveSpeed * 3;
      const dx = (playerX + CAR_WIDTH / 2) - pu.x;
      const dy = (PLAYER_FIXED_Y + CAR_HEIGHT / 2) - pu.y;
      if (Math.hypot(dx, dy) < 40) {
        if (pu.type === 'nitro') { nitroActive = true; nitroTimer = 180; sfxNitro(); }
        else { shieldActive = true; shieldTimer = 300; sfxShield(); }
        powerUps.splice(i, 1);
        continue;
      }
      if (pu.y > canvas.height + 50) powerUps.splice(i, 1);
    }

    updateParticles();
  }

  function rectCollide(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
  }

  // ========== RENDER ==========
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
      ctx.strokeStyle = '#0ff2'; ctx.lineWidth = 1; ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i);
      ctx.strokeStyle = '#f0f2'; ctx.stroke();
    }

    // Road
    ctx.fillStyle = '#0d0d1a';
    ctx.shadowColor = '#0ff'; ctx.shadowBlur = 20;
    ctx.fillRect(ROAD_LEFT, 0, ROAD_RIGHT - ROAD_LEFT, canvas.height);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#0ff'; ctx.lineWidth = 5;
    ctx.shadowColor = '#0ff'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.moveTo(ROAD_LEFT, 0); ctx.lineTo(ROAD_LEFT, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ROAD_RIGHT, 0); ctx.lineTo(ROAD_RIGHT, canvas.height); ctx.stroke();

    ctx.strokeStyle = '#f0f'; ctx.lineWidth = 6;
    ctx.shadowColor = '#f0f'; ctx.shadowBlur = 18;
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
      ctx.shadowColor = obs.glow; ctx.shadowBlur = 25;
      ctx.fillStyle = obs.color;
      ctx.beginPath(); ctx.roundRect(obs.x, obs.y, CAR_WIDTH, CAR_HEIGHT, 12); ctx.fill();
      ctx.fillStyle = '#ffffffcc'; ctx.shadowBlur = 15; ctx.shadowColor = obs.glow;
      ctx.beginPath(); ctx.roundRect(obs.x + 8, obs.y + 10, CAR_WIDTH - 16, 22, 8); ctx.fill();
      ctx.fillStyle = '#ffffa0'; ctx.shadowColor = '#ff0'; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(obs.x + 10, obs.y + CAR_HEIGHT - 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(obs.x + CAR_WIDTH - 10, obs.y + CAR_HEIGHT - 12, 6, 0, Math.PI * 2); ctx.fill();
    });

    // Coins
    coins.forEach((c) => {
      ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 25;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff2a0';
      ctx.beginPath(); ctx.arc(c.x - 4, c.y - 4, c.radius * 0.4, 0, Math.PI * 2); ctx.fill();
    });

    // Power-ups
    powerUps.forEach((pu) => {
      const color = pu.type === 'nitro' ? '#ff00c8' : '#00e0ff';
      ctx.shadowColor = color; ctx.shadowBlur = 30;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(pu.x, pu.y, pu.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pu.type === 'nitro' ? '⚡' : '🛡', pu.x, pu.y + 1);
    });

    // Player
    const car = CARS[selectedCar];
    ctx.shadowColor = car.body; ctx.shadowBlur = 35;
    ctx.fillStyle = car.body;
    ctx.beginPath(); ctx.roundRect(playerX, PLAYER_FIXED_Y, CAR_WIDTH, CAR_HEIGHT, 16); ctx.fill();

    ctx.shadowBlur = 25; ctx.shadowColor = car.accent;
    ctx.fillStyle = car.accent;
    ctx.beginPath(); ctx.roundRect(playerX + 8, PLAYER_FIXED_Y + 12, CAR_WIDTH - 16, 14, 8); ctx.fill();

    ctx.fillStyle = '#ffffff'; ctx.shadowColor = car.body; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.roundRect(playerX + 10, PLAYER_FIXED_Y + 8, CAR_WIDTH - 20, 20, 8); ctx.fill();

    ctx.fillStyle = '#ffd966'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(playerX + 12, PLAYER_FIXED_Y + CAR_HEIGHT - 10, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(playerX + CAR_WIDTH - 12, PLAYER_FIXED_Y + CAR_HEIGHT - 10, 8, 0, Math.PI * 2); ctx.fill();

    // Shield aura
    if (shieldActive) {
      ctx.strokeStyle = '#00e0ff'; ctx.lineWidth = 4;
      ctx.shadowColor = '#00e0ff'; ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(playerX + CAR_WIDTH / 2, PLAYER_FIXED_Y + CAR_HEIGHT / 2, 70, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Nitro flame
    if (nitroActive) {
      ctx.fillStyle = '#ff00c8'; ctx.shadowColor = '#ff00c8'; ctx.shadowBlur = 30;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(playerX + 15 + i * 15, PLAYER_FIXED_Y + CAR_HEIGHT + 8 + Math.random() * 15,
               6 + Math.random() * 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Particles
    particles.forEach((p) => {
      ctx.globalAlpha = p.life;
      ctx.shadowBlur = 20; ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1.0; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    // Speed lines
    if (gameActive && speed > 1.2) {
      ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
      ctx.shadowBlur = 15; ctx.shadowColor = '#0ff';
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

    // Game over overlay
    if (!gameActive && particles.length === 0) {
      ctx.fillStyle = '#000000aa';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 48px "Segoe UI", Poppins, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f0f'; ctx.shadowBlur = 30;
      ctx.fillStyle = '#f0f';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = '28px "Segoe UI", sans-serif';
      ctx.fillStyle = '#0ff'; ctx.shadowColor = '#0ff';
      ctx.fillText('Tekan R / KLIK', canvas.width / 2, canvas.height / 2 + 40);
    }
  }

  // roundRect helper
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

  // ========== LOOP ==========
  function gameLoop() {
    if (!gameActive) return;
    update();
    render();
    animationId = requestAnimationFrame(gameLoop);
  }

  // ========== STATE LOGIN ==========
  let currentUser = null;
  let currentHigh = 0;

  // ========== UI LOGIN ==========
  const loginPanel = document.getElementById('loginPanel');
  const loginName = document.getElementById('loginName');
  const loginPass = document.getElementById('loginPass');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const guestBtn = document.getElementById('guestBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginMsg = document.getElementById('loginMsg');
  const welcomeMsg = document.getElementById('welcomeMsg');

  async function apiLogin(name, pass) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pass }),
    });
    return res.json();
  }

  async function apiRegister(name, pass) {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pass }),
    });
    return res.json();
  }

  function onLoginSuccess(user) {
    currentUser = user;
    currentHigh = user.high_score || 0;
    highScore = currentHigh;
    highScoreDisplay.textContent = highScore;
    if(welcomeMsg) welcomeMsg.textContent = `Halo, ${user.name}! 🏎️`;
    
    if(loginPanel) loginPanel.classList.add('hidden');
    if(carSelector) carSelector.classList.remove('hidden');
    if(loginMsg) loginMsg.textContent = '';
  }

  function onGuest() {
    currentUser = { name: 'Tamu', high_score: highScore };
    if(welcomeMsg) welcomeMsg.textContent = 'Halo, Tamu! (skor tidak disimpan)';
    if(loginPanel) loginPanel.classList.add('hidden');
    if(carSelector) carSelector.classList.remove('hidden');
  }

  // TOMBOL MASUK
  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = loginName.value.trim();
      const pass = loginPass.value;
      if (!name || !pass) { loginMsg.textContent = 'Isi nama & password!'; return; }
      loginMsg.textContent = 'Menghubungi server...';
      try {
        const data = await apiLogin(name, pass);
        if (data.error) { loginMsg.textContent = data.error; return; }
        onLoginSuccess(data.user);
      } catch (err) {
        loginMsg.textContent = 'Gagal terhubung ke server.';
      }
    });
  }

  // TOMBOL DAFTAR
  if (registerBtn) {
    registerBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const name = loginName.value.trim();
      const pass = loginPass.value;
      if (!name || !pass) { loginMsg.textContent = 'Isi nama & password!'; return; }
      if (name.length < 3) { loginMsg.textContent = 'Nama minimal 3 huruf'; return; }
      loginMsg.textContent = 'Mendaftarkan...';
      try {
        const data = await apiRegister(name, pass);
        if (data.error) { loginMsg.textContent = data.error; return; }
        onLoginSuccess(data.user);
      } catch (err) {
        loginMsg.textContent = 'Gagal terhubung ke server.';
      }
    });
  }

  // TOMBOL TAMU
  if (guestBtn) {
    guestBtn.addEventListener('click', (e) => {
      e.preventDefault();
      onGuest();
    });
  }

  // TOMBOL LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      currentUser = null;
      if(carSelector) carSelector.classList.add('hidden');
      if(loginPanel) loginPanel.classList.remove('hidden');
      if(loginName) loginName.value = '';
      if(loginPass) loginPass.value = '';
    });
  }

  // ========== BACKEND SKOR ==========
  async function submitScore(finalScore) {
    if (!currentUser || currentUser.name === 'Tamu') {
      console.log('Tamu: skor tidak dikirim ke server');
      return;
    }
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, score: Math.floor(finalScore) }),
      });
      if (res.ok) {
        console.log('✅ Skor tersimpan di SQLite!');
        showLeaderboard();
      }
    } catch (err) {
      console.warn('⚠️ Backend tidak aktif:', err);
    }
  }

  async function showLeaderboard() {
    try {
      const res = await fetch('/api/scores');
      const list = await res.json();
      const ol = document.getElementById('scoreList');
      if (!ol) return;
      ol.innerHTML = list.length
        ? list.map((s) => `<li><strong>${s.name}</strong> — ${s.score}</li>`).join('')
        : '<li>Belum ada data</li>';
    } catch (err) {
      console.warn('Gagal ambil leaderboard:', err);
    }
  }

  // ========== MENU PILIH MOBIL ==========
  document.querySelectorAll('.car-card').forEach((card) => {
    card.addEventListener('click', () => {
      selectedCar = parseInt(card.dataset.car, 10);
      if(carSelector) carSelector.classList.add('hidden');
      statusMessage.textContent = `🏎️ ${CARS[selectedCar].name} siap! Tekan SPACE`;
      initialRender();
    });
  });

  // ========== INITIAL RENDER ==========
  function initialRender() {
    gameActive = false;
    render();
    ctx.font = 'bold 36px "Segoe UI", Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#0ff';
    ctx.fillText('NEON RACER', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#f0f';
    ctx.shadowColor = '#f0f';
    ctx.fillText('KLIK / SPACE untuk mulai', canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#ffd966';
    ctx.shadowColor = '#ffd966';
    ctx.fillText(`Mobil: ${CARS[selectedCar].name}`, canvas.width / 2, canvas.height / 2 + 60);
  }

  // ========== LISTENERS BAWAH ==========
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
  });

  // START
  initialRender();
  showLeaderboard();

})(); // <--- PASTIKAN TUTUP KURUNG INI ADA DI PALING BAWAH
