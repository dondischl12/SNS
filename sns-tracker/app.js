// TODO: set this to "your-github-username/your-repo-name" after you create the repo.
const REPO = "OWNER/REPO";

const ISSUE_BASE = `https://github.com/${REPO}/issues/new`;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function issueUrl(type) {
  const params = new URLSearchParams({
    template: "log-entry.yml",
    labels: "sns-log",
    type,
  });
  return `${ISSUE_BASE}?${params.toString()}`;
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function buildLeaderboard(entries) {
  const byNickname = new Map();
  for (const e of entries) {
    const key = e.nickname.trim();
    if (!byNickname.has(key)) {
      byNickname.set(key, { nickname: key, sns: 0, rsns: 0, total: 0 });
    }
    const row = byNickname.get(key);
    if (e.type === "SNS") row.sns += 1;
    else row.rsns += 1;
    row.total += e.value;
  }
  return [...byNickname.values()].sort((a, b) => b.total - a.total);
}

// ---------- count-up numbers ----------

function animateCount(el, target, decimals = 0, duration = 900) {
  if (prefersReducedMotion) {
    el.textContent = target.toFixed(decimals);
    return;
  }
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = from + (target - from) * eased;
    el.textContent = val.toFixed(decimals);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ---------- confetti ----------

function burstConfetti() {
  if (prefersReducedMotion) return;
  const root = document.getElementById("confetti-root");
  const colors = ["#4fc3f7", "#ff8a65", "#b388ff", "#ffd54f", "#69f0ae"];
  const count = 36;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    const size = 6 + Math.random() * 6;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.4}px`;
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${1.4 + Math.random() * 1.2}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    root.appendChild(piece);
    piece.addEventListener("animationend", () => piece.remove());
  }
}

// ---------- floating particle backdrop ----------

function initParticles() {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let width, height, particles;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function makeParticles() {
    const count = Math.min(50, Math.floor((width * height) / 26000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.6 + Math.random() * 2.2,
      vy: 0.12 + Math.random() * 0.35,
      vx: (Math.random() - 0.5) * 0.15,
      alpha: 0.15 + Math.random() * 0.35,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#bfe9ff";
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.y -= p.vy;
      p.x += p.vx;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * width;
      }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  resize();
  makeParticles();
  window.addEventListener("resize", () => {
    resize();
    makeParticles();
  });

  if (!prefersReducedMotion) requestAnimationFrame(draw);
}

// ---------- render ----------

function render(entries) {
  const totalValue = entries.reduce((sum, e) => sum + e.value, 0);
  animateCount(document.getElementById("stat-total"), totalValue, 1);
  animateCount(document.getElementById("stat-count"), entries.length, 0);

  const leaderboard = buildLeaderboard(entries);
  document.getElementById("stat-leader").textContent = leaderboard.length
    ? leaderboard[0].nickname
    : "–";

  const maxTotal = leaderboard.length ? leaderboard[0].total : 0;
  const medals = ["🥇", "🥈", "🥉"];

  const tbody = document.querySelector("#leaderboard tbody");
  tbody.innerHTML = "";
  document.getElementById("board-empty").hidden = leaderboard.length > 0;
  leaderboard.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.className = i < 3 ? `row-${i + 1}` : "";
    tr.style.animationDelay = `${i * 0.05}s`;
    const rankLabel = i < 3 ? medals[i] : i + 1;
    const sharePct = maxTotal > 0 ? Math.round((row.total / maxTotal) * 100) : 0;
    tr.innerHTML = `
      <td class="rank-cell">${rankLabel}</td>
      <td>${escapeHtml(row.nickname)}</td>
      <td>${row.sns}</td>
      <td>${row.rsns}</td>
      <td>${row.total.toFixed(1)}</td>
      <td class="bar-col"><div class="share-bar"><div class="share-bar-fill" data-pct="${sharePct}"></div></div></td>
    `;
    tbody.appendChild(tr);
  });

  // trigger bar fill transitions after insertion
  requestAnimationFrame(() => {
    document.querySelectorAll(".share-bar-fill").forEach((el) => {
      el.style.width = `${el.dataset.pct}%`;
    });
  });

  const feedList = document.getElementById("feed-list");
  feedList.innerHTML = "";
  const recent = [...entries]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);
  document.getElementById("feed-empty").hidden = recent.length > 0;
  recent.forEach((e, i) => {
    const li = document.createElement("li");
    li.style.animationDelay = `${i * 0.04}s`;
    const icon = e.type === "SNS" ? "🦈" : "📡";
    li.innerHTML = `
      <span>
        <span class="feed-icon">${icon}</span>
        <strong>${escapeHtml(e.nickname)}</strong> logged a ${e.type}
        ${e.note ? `<span class="feed-note"> — "${escapeHtml(e.note)}"</span>` : ""}
      </span>
      <span class="feed-time">${timeAgo(e.timestamp)}</span>
    `;
    feedList.appendChild(li);
  });
}

async function init() {
  const snsBtn = document.getElementById("log-sns");
  const rsnsBtn = document.getElementById("log-rsns");
  snsBtn.href = issueUrl("SNS");
  rsnsBtn.href = issueUrl("rSNS");
  snsBtn.addEventListener("click", burstConfetti);
  rsnsBtn.addEventListener("click", burstConfetti);

  initParticles();

  try {
    const res = await fetch(`data/log.json?_=${Date.now()}`);
    const entries = await res.json();
    render(entries);
  } catch (err) {
    console.error("Failed to load log data", err);
  }
}

init();
