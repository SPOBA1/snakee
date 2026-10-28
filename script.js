(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');
  const overlay = document.getElementById('overlay');
  const overlayIcon = document.getElementById('overlay-icon');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMessage = document.getElementById('overlay-message');
  const startBtn = document.getElementById('start-btn');
  const speedLabel = document.getElementById('speed-label');

  const CELLS = 24;
  const CELL = canvas.width / CELLS;
  const INITIAL_SNAKE = [{x: 11, y: 12}, {x: 10, y: 12}, {x: 9, y: 12}];
  let snake = [];
  let direction = {x: 1, y: 0};
  let nextDirection = {x: 1, y: 0};
  let food = {x: 17, y: 12};
  let score = 0;
  let best = readBest();
  let timer = null;
  let running = false;
  let paused = false;
  let ended = false;

  bestEl.textContent = formatScore(best);
  drawScene();

  function readBest() {
    try { return Number(localStorage.getItem('pixelSnakeBest')) || 0; }
    catch (_) { return 0; }
  }

  function formatScore(value) {
    return String(value).padStart(3, '0');
  }

  function setStatus(text, mode = '') {
    statusText.textContent = text;
    statusPill.className = 'status-pill' + (mode ? ' ' + mode : '');
  }

  function showOverlay(icon, title, message, buttonText) {
    overlayIcon.textContent = icon;
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    startBtn.innerHTML = buttonText + ' <span>→</span>';
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function placeFood() {
    const empty = [];
    for (let y = 0; y < CELLS; y++) {
      for (let x = 0; x < CELLS; x++) {
        if (!snake.some(part => part.x === x && part.y === y)) empty.push({x, y});
      }
    }
    if (empty.length === 0) {
      finish(true);
      return;
    }
    food = empty[Math.floor(Math.random() * empty.length)];
  }

  function startGame() {
    stopTimer();
    snake = INITIAL_SNAKE.map(part => ({...part}));
    direction = {x: 1, y: 0};
    nextDirection = {x: 1, y: 0};
    score = 0;
    running = true;
    paused = false;
    ended = false;
    scoreEl.textContent = formatScore(score);
    placeFood();
    hideOverlay();
    setStatus('В ИГРЕ', 'playing');
    updateSpeedLabel();
    drawScene();
    scheduleTick();
  }

  function stopTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function getSpeed() {
    return Math.max(65, 145 - Math.floor(score / 30) * 10);
  }

  function updateSpeedLabel() {
    const level = Math.min(9, 1 + Math.floor(score / 30));
    speedLabel.textContent = level + ' УРОВЕНЬ';
  }

  function scheduleTick() {
    stopTimer();
    if (running && !paused) timer = setTimeout(tick, getSpeed());
  }

  function tick() {
    if (!running || paused) return;
    direction = nextDirection;
    const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};

    const hitWall = head.x < 0 || head.x >= CELLS || head.y < 0 || head.y >= CELLS;
    const ate = head.x === food.x && head.y === food.y;
    // If not eating, the tail moves away on this tick and may be entered safely.
    const bodyToCheck = ate ? snake : snake.slice(0, -1);
    const hitSelf = bodyToCheck.some(part => part.x === head.x && part.y === head.y);

    if (hitWall || hitSelf) {
      finish(false);
      return;
    }

    snake.unshift(head);
    if (ate) {
      score += 10;
      scoreEl.textContent = formatScore(score);
      if (score > best) {
        best = score;
        bestEl.textContent = formatScore(best);
        try { localStorage.setItem('pixelSnakeBest', String(best)); } catch (_) {}
      }
      placeFood();
      updateSpeedLabel();
    } else {
      snake.pop();
    }

    drawScene();
    scheduleTick();
  }

  function finish(won) {
    stopTimer();
    running = false;
    paused = false;
    ended = true;
    setStatus(won ? 'ПОБЕДА' : 'ИГРА ОКОНЧЕНА');
    drawScene();
    showOverlay(won ? '★' : '✕', won ? 'ТЫ ПОБЕДИЛ!' : 'ИГРА ОКОНЧЕНА',
      won ? 'Поле полностью заполнено. Невероятный результат!' : `Твой счёт: ${score}. Попробуй ещё раз и побей рекорд!`,
      'ИГРАТЬ СНОВА');
  }

  function togglePause() {
    if (!running || ended) return;
    paused = !paused;
    if (paused) {
      stopTimer();
      setStatus('ПАУЗА', 'paused');
      showOverlay('Ⅱ', 'ПАУЗА', 'Передохни немного. Когда будешь готов — продолжай.', 'ПРОДОЛЖИТЬ');
    } else {
      hideOverlay();
      setStatus('В ИГРЕ', 'playing');
      scheduleTick();
    }
  }

  function changeDirection(name) {
    const directions = {
      up: {x: 0, y: -1}, down: {x: 0, y: 1},
      left: {x: -1, y: 0}, right: {x: 1, y: 0}
    };
    const chosen = directions[name];
    if (!chosen) return;
    if (chosen.x === -direction.x && chosen.y === -direction.y) return;
    nextDirection = chosen;
    if (!running && !ended) startGame();
  }

  function drawScene() {
    ctx.fillStyle = '#06101d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle pixel grid.
    ctx.strokeStyle = 'rgba(48, 91, 125, 0.19)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= CELLS; i++) {
      const pos = i * CELL + 0.5;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(canvas.width, pos); ctx.stroke();
    }

    drawFood();
    snake.slice().reverse().forEach((part, reverseIndex) => {
      const index = snake.length - reverseIndex - 1;
      drawSnakePart(part, index === 0);
    });
  }

  function drawFood() {
    const x = food.x * CELL;
    const y = food.y * CELL;
    // Pixel-art apple and stem.
    ctx.fillStyle = '#ff5269';
    ctx.fillRect(x + 5, y + 7, 10, 10);
    ctx.fillRect(x + 3, y + 9, 14, 6);
    ctx.fillStyle = '#ff8291';
    ctx.fillRect(x + 5, y + 8, 4, 4);
    ctx.fillStyle = '#72ff83';
    ctx.fillRect(x + 10, y + 3, 3, 5);
    ctx.fillRect(x + 13, y + 4, 4, 3);
    ctx.fillStyle = 'rgba(255,82,105,.16)';
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
  }

  function drawSnakePart(part, isHead) {
    const pad = 2;
    const x = part.x * CELL + pad;
    const y = part.y * CELL + pad;
    const size = CELL - pad * 2;
    ctx.fillStyle = isHead ? '#a4ff8b' : '#57df82';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = isHead ? '#e2ffd9' : '#9bff9e';
    ctx.fillRect(x + 3, y + 3, size - 6, 3);
    ctx.fillStyle = '#1c875b';
    ctx.fillRect(x + 3, y + size - 5, size - 6, 2);

    if (isHead) {
      ctx.fillStyle = '#06251c';
      if (direction.x !== 0) {
        const eyeX = direction.x > 0 ? x + size - 5 : x + 3;
        ctx.fillRect(eyeX, y + 5, 2, 3);
        ctx.fillRect(eyeX, y + size - 8, 2, 3);
      } else {
        const eyeY = direction.y > 0 ? y + size - 5 : y + 3;
        ctx.fillRect(x + 5, eyeY, 3, 2);
        ctx.fillRect(x + size - 8, eyeY, 3, 2);
      }
    }
  }

  startBtn.addEventListener('click', () => {
    if (paused && running) togglePause();
    else startGame();
  });

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const map = {
      arrowup: 'up', w: 'up',
      arrowdown: 'down', s: 'down',
      arrowleft: 'left', a: 'left',
      arrowright: 'right', d: 'right'
    };
    if (map[key]) {
      event.preventDefault();
      changeDirection(map[key]);
    } else if (key === ' ' || key === 'spacebar') {
      event.preventDefault();
      if (!running && !ended) startGame();
      else togglePause();
    } else if (key === 'enter' && ended) {
      startGame();
    }
  });

  document.querySelectorAll('.touch-btn').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      changeDirection(button.dataset.dir);
    });
  });

  // Keep the canvas crisp if the browser scales it.
  window.addEventListener('blur', () => {
    if (running && !paused) togglePause();
  });
})();
