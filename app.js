const REPO = "dondischl12/SNS";
const BRANCH = "main";
const WORKFLOW_FILE = "log-entry.yml";

// SECURITY NOTE: the real token is NOT stored here. It's kept as an encrypted
// GitHub Actions repo secret and swapped into this placeholder only at deploy
// time by .github/workflows/deploy.yml — so it never appears in git history
// (committing the raw token directly gets it auto-revoked by GitHub's secret
// scanning the moment it's pushed to a public repo). It's still visible in the
// final deployed page source to visitors, same as before — that's unavoidable
// for a static site with no backend — but at least git history stays clean and
// rotating the token no longer means fighting push protection.
// Scope this token to ONLY this repo, with Actions: Read and write, Contents: Read-only.
const GH_TOKEN = "__GH_TOKEN__";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let selectedType = "SNS";
let entries = [];
const pending = [];

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

function buildLeaderboard(list) {
  const byNickname = new Map();
  for (const e of list) {
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
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = (target * eased).toFixed(decimals);
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

function render() {
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

  requestAnimationFrame(() => {
    document.querySelectorAll(".share-bar-fill").forEach((el) => {
      el.style.width = `${el.dataset.pct}%`;
    });
  });

  renderFeed();
}

function renderFeed() {
  const feedList = document.getElementById("feed-list");
  feedList.innerHTML = "";

  const recent = [...entries]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  document.getElementById("feed-empty").hidden = recent.length > 0 || pending.length > 0;

  pending.forEach((p) => {
    const li = document.createElement("li");
    li.className = "pending";
    const icon = p.type === "SNS" ? "🦈" : "📡";
    li.innerHTML = `
      <span>
        <span class="feed-icon">${icon}</span>
        <strong>${escapeHtml(p.nickname)}</strong> logged a ${p.type}
        ${p.note ? `<span class="feed-note"> — "${escapeHtml(p.note)}"</span>` : ""}
      </span>
      <span class="pending-tag">processing</span>
    `;
    feedList.appendChild(li);
  });

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

// ---------- data loading ----------

async function loadRoster() {
  const res = await fetch(`data/roster.json?_=${Date.now()}`);
  const roster = await res.json();
  const select = document.getElementById("nickname-select");
  roster.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
}

async function loadLog() {
  const res = await fetch(`data/log.json?_=${Date.now()}`);
  entries = await res.json();
  render();
}

// ---------- submit flow ----------

async function triggerWorkflow(nickname, type, note) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: BRANCH, inputs: { nickname, type, note } }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`.trim());
  }
}

function setStatus(msg, kind) {
  const el = document.getElementById("form-status");
  el.textContent = msg;
  el.className = `form-status ${kind || ""}`.trim();
}

function initForm() {
  const form = document.getElementById("log-form");
  const submitBtn = document.getElementById("submit-btn");
  const toggle = document.getElementById("type-toggle");

  toggle.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggle.querySelectorAll(".type-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedType = btn.dataset.type;
    });
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const nickname = document.getElementById("nickname-select").value;
    const note = document.getElementById("note-input").value.trim();

    if (!nickname) {
      setStatus("Pick a nickname first.", "error");
      return;
    }
    if (GH_TOKEN === "PASTE_YOUR_FINE_GRAINED_TOKEN_HERE") {
      setStatus("Set GH_TOKEN in app.js before this can submit anything.", "error");
      return;
    }

    submitBtn.disabled = true;
    setStatus("Sending…");

    const pendingEntry = { nickname, type: selectedType, note };
    pending.unshift(pendingEntry);
    renderFeed();
    burstConfetti();

    try {
      await triggerWorkflow(nickname, selectedType, note);
      setStatus("Logged! Takes ~15s to show up on the board.", "success");
      document.getElementById("note-input").value = "";

      setTimeout(async () => {
        const idx = pending.indexOf(pendingEntry);
        if (idx !== -1) pending.splice(idx, 1);
        await loadLog();
        setStatus("");
      }, 15000);
    } catch (err) {
      console.error("Failed to trigger workflow", err);
      const idx = pending.indexOf(pendingEntry);
      if (idx !== -1) pending.splice(idx, 1);
      renderFeed();
      setStatus("Couldn't submit — check the console / token permissions.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function init() {
  initParticles();
  initForm();
  try {
    await Promise.all([loadRoster(), loadLog()]);
  } catch (err) {
    console.error("Failed to load data", err);
  }
}

init();
