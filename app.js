"use strict";

/* Limites de velocidade (Código da Estrada, art. 27.º), em km/h.
   Ordem dos valores: dentro de localidades, fora de localidades,
   vias reservadas a automóveis, autoestradas. null = não se aplica. */
const VEICULOS = [
  { id: "lig-pass-s", nome: "Ligeiro de passageiros", detalhe: "sem reboque", limites: [50, 90, 100, 120] },
  { id: "lig-pass-c", nome: "Ligeiro de passageiros", detalhe: "com reboque", limites: [50, 70, 80, 100] },
  { id: "moto-50-s", nome: "Motociclo com mais de 50 cc", detalhe: "sem carro lateral", limites: [50, 90, 100, 120] },
  { id: "moto-50-c", nome: "Motociclo com mais de 50 cc", detalhe: "com carro lateral", limites: [50, 70, 80, 100] },
  { id: "moto-ate-50", nome: "Motociclo até 50 cc", detalhe: "", limites: [40, 60, null, null] },
  { id: "triciclo", nome: "Triciclo", detalhe: "", limites: [50, 80, 90, 100] },
  { id: "ciclomotor", nome: "Ciclomotor ou quadriciclo", detalhe: "", limites: [40, 45, null, null] },
  { id: "lig-merc-s", nome: "Ligeiro de mercadorias", detalhe: "sem reboque", limites: [50, 80, 90, 110] },
  { id: "lig-merc-c", nome: "Ligeiro de mercadorias", detalhe: "com reboque", limites: [50, 70, 80, 90] },
  { id: "pes-pass-s", nome: "Pesado de passageiros", detalhe: "sem reboque", limites: [50, 80, 90, 100] },
  { id: "pes-pass-c", nome: "Pesado de passageiros", detalhe: "com reboque", limites: [50, 70, 90, 90] },
  { id: "pes-merc-s", nome: "Pesado de mercadorias", detalhe: "sem reboque", limites: [50, 80, 80, 90] },
  { id: "pes-merc-semi", nome: "Pesado de mercadorias", detalhe: "com semirreboque", limites: [50, 80, 80, 90] },
  { id: "pes-merc-c", nome: "Pesado de mercadorias", detalhe: "com reboque", limites: [40, 70, 70, 80] },
  { id: "maq-ind-c", nome: "Máquina industrial", detalhe: "com matrícula", limites: [40, 70, 70, 80] },
  { id: "maq-ind-s", nome: "Máquina industrial", detalhe: "sem matrícula", limites: [30, 30, null, null] },
  { id: "trator", nome: "Trator agrícola", detalhe: "", limites: [30, 40, null, null] },
  { id: "maq-agr", nome: "Máquina agrícola, tratocarro ou motocultivador", detalhe: "", limites: [20, 20, null, null] },
];

/* Pequenos sinais para cada tipo de via */
const PLACA_LOCALIDADE =
  '<rect x="1" y="1" width="30" height="22" rx="2" fill="#fff" stroke="#111" stroke-width="2"/>' +
  '<rect x="7" y="10" width="18" height="4" rx="1" fill="#111"/>';

const VIAS = [
  {
    nome: "Dentro de localidades",
    curto: "Dentro",
    icone: PLACA_LOCALIDADE,
  },
  {
    nome: "Fora de localidades",
    curto: "Fora",
    icone: PLACA_LOCALIDADE +
      '<line x1="4" y1="21" x2="28" y2="3" stroke="#C8102E" stroke-width="3" stroke-linecap="round"/>',
  },
  {
    nome: "Via reservada a automóveis",
    curto: "Reservadas",
    icone:
      '<rect x="1" y="1" width="30" height="22" rx="3" fill="#0B5CAD"/>' +
      '<path d="M8.5 15.5v-3l2.3-4.2h10.4l2.3 4.2v3z" fill="#fff"/>' +
      '<circle cx="11.5" cy="16.5" r="2" fill="#fff"/><circle cx="20.5" cy="16.5" r="2" fill="#fff"/>',
  },
  {
    nome: "Autoestrada",
    curto: "Autoestrada",
    icone:
      '<rect x="1" y="1" width="30" height="22" rx="3" fill="#0B5CAD"/>' +
      '<path d="M6 8h20" stroke="#fff" stroke-width="2.4"/>' +
      '<path d="M9.5 8v3.5M22.5 8v3.5" stroke="#fff" stroke-width="2"/>' +
      '<path d="M12 21l3-8.5M20 21l-3-8.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>',
  },
];

function iconeVia(i, w = 32, h = 24) {
  return `<svg viewBox="0 0 32 24" width="${w}" height="${h}" aria-hidden="true">${VIAS[i].icone}</svg>`;
}

function nomeVeiculo(veic) {
  return veic.detalhe ? `${veic.nome}, ${veic.detalhe}` : veic.nome;
}

/* Todas as perguntas possíveis (veículo + via com limite) */
const PERGUNTAS = [];
VEICULOS.forEach((veic, v) => {
  veic.limites.forEach((lim, r) => {
    if (lim !== null) PERGUNTAS.push({ v, r, answer: lim, key: `${veic.id}|${r}` });
  });
});

/* ---------- Dados guardados no telemóvel ---------- */

const KEY = "limites-velocidade:v1";

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === "object") return s;
  } catch (e) { /* sem armazenamento: continua sem guardar */ }
  return {};
}

const saved = loadSaved();

const state = {
  correct: saved.correct | 0,
  best: saved.best | 0,
  streak: 0,
  // erros por pergunta: { "lig-pass-s|1": [respondidas, erradas] }
  stats: saved.stats && typeof saved.stats === "object" ? saved.stats : {},
  // escolhas
  vehicles: new Set(Array.isArray(saved.vehicles) ? saved.vehicles : VEICULOS.map((v) => v.id)),
  roads: new Set(Array.isArray(saved.roads) ? saved.roads : VIAS.map((_, i) => i)),

  typed: "",
  current: null,      // pergunta atual
  answered: false,    // já contou para as estatísticas
  mustCorrect: false, // errou: tem de escrever o valor certo para avançar
  locked: false,
};

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      correct: state.correct,
      best: state.best,
      stats: state.stats,
      vehicles: [...state.vehicles],
      roads: [...state.roads],
    }));
  } catch (e) { /* ignora */ }
}

const $ = (id) => document.getElementById(id);
const el = {
  vehicle: $("vehicle"),
  detail: $("detail"),
  road: $("road"),
  question: document.querySelector(".question"),
  sign: $("sign"),
  typed: $("typed"),
  feedback: $("feedback"),
  correct: $("correctCount"),
  streak: $("streakCount"),
  best: $("bestCount"),
  filterDot: $("filterDot"),
};

/* ---------- Perguntas ---------- */

function pool() {
  const ids = state.vehicles;
  return PERGUNTAS.filter((q) => ids.has(VEICULOS[q.v].id) && state.roads.has(q.r));
}

function nextQuestion() {
  const list = pool();
  if (!list.length) return;

  let q;
  do {
    q = list[Math.floor(Math.random() * list.length)];
  } while (list.length > 1 && state.current && q.key === state.current.key);

  state.current = q;
  state.typed = "";
  state.answered = false;
  state.mustCorrect = false;

  const veic = VEICULOS[q.v];
  el.vehicle.textContent = veic.nome;
  el.detail.textContent = veic.detalhe;
  el.road.innerHTML = iconeVia(q.r) + `<span>${VIAS[q.r].nome}</span>`;

  el.question.classList.remove("enter");
  void el.question.offsetWidth;
  el.question.classList.add("enter");

  setFeedback("Escreve o limite em km/h");
  render();
}

/* ---------- Respostas ---------- */

function press(key) {
  if (state.locked) return;

  if (key === "back") {
    state.typed = state.typed.slice(0, -1);
  } else if (key === "ok") {
    submit();
    return;
  } else if (/^\d$/.test(key)) {
    if (state.typed.length >= 3) return;
    if (state.typed === "" && key === "0") return;
    state.typed += key;
  }
  render();
}

function record(wrong) {
  if (state.answered) return;
  state.answered = true;
  const s = state.stats[state.current.key] || [0, 0];
  s[0]++;
  if (wrong) s[1]++;
  state.stats[state.current.key] = s;
}

function submit() {
  if (state.typed === "") return;
  const given = Number(state.typed);
  const answer = state.current.answer;

  if (given === answer) {
    if (!state.mustCorrect) {
      record(false);
      state.correct++;
      state.streak++;
      bump(el.correct);
      bump(el.streak);
      if (state.streak > state.best) {
        state.best = state.streak;
        bump(el.best);
      }
      setFeedback("Certo!");
    } else {
      setFeedback("Isso. Agora não te esqueças.");
    }
    save();
    render();
    animate(el.sign, "right");
    state.locked = true;
    setTimeout(() => {
      state.locked = false;
      nextQuestion();
    }, state.mustCorrect ? 900 : 550);
    return;
  }

  // Errado: tem de escrever o valor certo para continuar
  record(true);
  state.streak = 0;
  state.mustCorrect = true;
  state.typed = "";
  save();
  setFeedback(
    `Errado. O limite é <strong>${answer} km/h</strong>.<br>Escreve ${answer} para continuar.`,
    true
  );
  animate(el.sign, "wrong");
  render();
}

/* ---------- Ecrã ---------- */

function render() {
  el.typed.textContent = state.typed;
  el.correct.textContent = state.correct;
  el.streak.textContent = state.streak;
  el.best.textContent = state.best;
  const n = pool().length;
  el.filterDot.hidden = n === PERGUNTAS.length;
}

function setFeedback(html, wrong = false) {
  el.feedback.innerHTML = html;
  el.feedback.classList.toggle("is-wrong", wrong);
}

function animate(node, cls) {
  node.classList.remove("right", "wrong");
  void node.offsetWidth;
  node.classList.add(cls);
}

function bump(node) {
  node.classList.remove("bump");
  void node.offsetWidth;
  node.classList.add("bump");
}

/* ---------- Teclado no ecrã e teclado físico ---------- */

$("keypad").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (btn) press(btn.dataset.key);
});

document.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  let key = null;
  if (/^\d$/.test(e.key)) key = e.key;
  else if (e.key === "Backspace") key = "back";
  else if (e.key === "Enter") key = "ok";
  if (!key) return;
  e.preventDefault();
  press(key);
  const btn = document.querySelector(`.keypad [data-key="${key}"]`);
  if (btn) {
    btn.classList.add("pressed");
    setTimeout(() => btn.classList.remove("pressed"), 120);
  }
});

/* ---------- Folhas (janelas que sobem de baixo) ---------- */

function setupSheet(dialog, openBtn, closeBtn, { onOpen, canClose, onClose } = {}) {
  const tryClose = () => {
    if (canClose && !canClose()) return;
    dialog.close();
  };
  const open = () => {
    if (onOpen) onOpen();
    dialog.showModal();
    const body = dialog.querySelector(".sheet-body");
    if (body) body.scrollTop = 0;
  };
  if (openBtn) openBtn.addEventListener("click", open);
  closeBtn.addEventListener("click", tryClose);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) tryClose(); // toque fora da folha
  });
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    tryClose();
  });
  if (onClose) dialog.addEventListener("close", onClose);
  return open;
}

/* ---------- Escolher veículos e vias ---------- */

const chooseDialog = $("chooseDialog");
const poolInfo = $("poolInfo");

function checkRow(label, sub, checked, icon) {
  const li = document.createElement("li");
  li.innerHTML =
    `<label class="check-row">${icon || ""}` +
    `<span class="check-text"></span><input type="checkbox"></label>`;
  const text = li.querySelector(".check-text");
  text.textContent = label;
  if (sub) {
    const small = document.createElement("small");
    small.textContent = sub;
    text.appendChild(small);
  }
  li.querySelector("input").checked = checked;
  return li;
}

function buildChoose() {
  const roadList = $("roadList");
  VIAS.forEach((via, i) => {
    const li = checkRow(via.nome, "", state.roads.has(i), iconeVia(i, 28, 21));
    li.querySelector("input").addEventListener("change", (e) => {
      e.target.checked ? state.roads.add(i) : state.roads.delete(i);
      choiceChanged();
    });
    roadList.appendChild(li);
  });

  const vehicleList = $("vehicleList");
  VEICULOS.forEach((veic) => {
    const li = checkRow(veic.nome, veic.detalhe, state.vehicles.has(veic.id));
    li.querySelector("input").dataset.id = veic.id;
    li.querySelector("input").addEventListener("change", (e) => {
      e.target.checked ? state.vehicles.add(veic.id) : state.vehicles.delete(veic.id);
      choiceChanged();
    });
    vehicleList.appendChild(li);
  });

  $("selectAll").addEventListener("click", () => setAllVehicles(true));
  $("selectNone").addEventListener("click", () => setAllVehicles(false));
}

function setAllVehicles(on) {
  state.vehicles = new Set(on ? VEICULOS.map((v) => v.id) : []);
  document.querySelectorAll("#vehicleList input").forEach((input) => {
    input.checked = on;
  });
  choiceChanged();
}

function choiceChanged() {
  const n = pool().length;
  if (n === 0) {
    poolInfo.textContent = state.vehicles.size && state.roads.size
      ? "Estes veículos não têm limite nestas vias. Escolhe outra via ou outro veículo."
      : "Escolhe pelo menos um veículo e uma via.";
    poolInfo.classList.add("is-empty");
  } else {
    poolInfo.textContent = n === PERGUNTAS.length
      ? `Todas as ${n} perguntas`
      : `${n} de ${PERGUNTAS.length} perguntas`;
    poolInfo.classList.remove("is-empty");
  }
  save();
  render();
}

const openChoose = setupSheet(chooseDialog, null, $("closeChoose"), {
  onOpen: choiceChanged,
  canClose: () => pool().length > 0,
  onClose: () => {
    const inPool = state.current && pool().some((q) => q.key === state.current.key);
    if (!inPool) nextQuestion();
  },
});

/* ---------- Erros ---------- */

const errorsDialog = $("errorsDialog");
const errorList = $("errorList");
let errorTab = "questions";

function sumStats(match) {
  let tries = 0, wrong = 0;
  PERGUNTAS.forEach((q) => {
    const s = state.stats[q.key];
    if (s && match(q)) { tries += s[0]; wrong += s[1]; }
  });
  return { tries, wrong };
}

function errorItem({ name, sub, icon, tries, wrong }) {
  const li = document.createElement("li");
  li.className = "error-item";
  const pct = tries ? Math.round((wrong / tries) * 100) : 0;
  li.innerHTML =
    `<span class="error-name"></span>` +
    `<span class="error-count"><strong>${wrong}</strong>${wrong === 1 ? "erro" : "erros"} em ${tries}</span>` +
    `<span class="error-sub">${icon || ""}<span></span></span>` +
    `<span class="error-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>`;
  li.querySelector(".error-name").textContent = name;
  li.querySelector(".error-sub span:last-child").textContent = sub;
  return li;
}

function byMostWrong(a, b) {
  return b.wrong - a.wrong || b.wrong / b.tries - a.wrong / a.tries || b.tries - a.tries;
}

function renderErrors() {
  document.querySelectorAll(".segmented button").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.tab === errorTab));
  });
  errorList.innerHTML = "";

  const anyAnswer = Object.keys(state.stats).length > 0;
  let items = [];

  if (errorTab === "questions") {
    items = PERGUNTAS
      .filter((q) => state.stats[q.key] && state.stats[q.key][1] > 0)
      .map((q) => {
        const [tries, wrong] = state.stats[q.key];
        return {
          name: nomeVeiculo(VEICULOS[q.v]),
          sub: `${VIAS[q.r].nome}: ${q.answer} km/h`,
          icon: iconeVia(q.r, 20, 15),
          tries, wrong,
        };
      });
  } else if (errorTab === "vehicles") {
    items = VEICULOS.map((veic, v) => {
      const t = sumStats((q) => q.v === v);
      return { name: veic.nome, sub: veic.detalhe, ...t };
    }).filter((i) => i.tries > 0);
  } else {
    items = VIAS.map((via, r) => ({
      name: via.nome,
      sub: "",
      icon: iconeVia(r, 20, 15),
      ...sumStats((q) => q.r === r),
    })).filter((i) => i.tries > 0);
  }

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = !anyAnswer
      ? "Ainda não respondeste a nenhuma pergunta. Os erros aparecem aqui à medida que treinas."
      : "Ainda não erraste nenhuma pergunta.";
    errorList.appendChild(li);
    return;
  }

  items.sort(byMostWrong).forEach((i) => errorList.appendChild(errorItem(i)));
}

document.querySelectorAll(".segmented button").forEach((b) => {
  b.addEventListener("click", () => {
    errorTab = b.dataset.tab;
    renderErrors();
  });
});

const resetBtn = $("resetStats");
const RESET_LABEL = resetBtn.textContent;
let resetArmed = false;

function disarmReset() {
  resetArmed = false;
  resetBtn.textContent = RESET_LABEL;
  resetBtn.classList.remove("armed");
}

resetBtn.addEventListener("click", () => {
  if (!resetArmed) {
    resetArmed = true;
    resetBtn.textContent = "Toca outra vez para apagar";
    resetBtn.classList.add("armed");
    return;
  }
  state.correct = 0;
  state.streak = 0;
  state.best = 0;
  state.stats = {};
  save();
  render();
  disarmReset();
  renderErrors();
});

const openErrors = setupSheet(errorsDialog, null, $("closeErrors"), {
  onOpen: () => { disarmReset(); renderErrors(); },
});

/* ---------- Tabela ---------- */

function buildTable() {
  const head = $("tableHead");
  VIAS.forEach((via, i) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.innerHTML = iconeVia(i, 28, 21) + via.curto;
    head.appendChild(th);
  });

  const body = $("tableBody");
  VEICULOS.forEach((veic) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = veic.nome;
    if (veic.detalhe) {
      const small = document.createElement("small");
      small.textContent = veic.detalhe;
      th.appendChild(small);
    }
    tr.appendChild(th);
    veic.limites.forEach((lim) => {
      const td = document.createElement("td");
      if (lim === null) {
        td.textContent = "–";
        td.className = "none";
        td.setAttribute("aria-label", "não se aplica");
      } else {
        td.textContent = lim;
      }
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

const openTable = setupSheet($("tableDialog"), null, $("closeTable"));

/* ---------- Menu ---------- */

const menuDialog = $("menuDialog");

function updateMenu() {
  const n = pool().length;
  $("menuChooseSub").textContent = n === PERGUNTAS.length
    ? `Todas as ${n} perguntas`
    : `${n} de ${PERGUNTAS.length} perguntas`;
  const wrong = Object.values(state.stats).reduce((sum, s) => sum + s[1], 0);
  $("menuErrorsSub").textContent = wrong === 0
    ? "Ainda sem erros"
    : `${wrong} ${wrong === 1 ? "erro" : "erros"} até agora`;
}

setupSheet(menuDialog, $("openMenu"), $("closeMenu"), { onOpen: updateMenu });

[["openChoose", openChoose], ["openErrors", openErrors], ["openTable", openTable]].forEach(([id, open]) => {
  $(id).addEventListener("click", () => {
    menuDialog.close();
    open();
  });
});

/* ---------- Arranque ---------- */

buildTable();
buildChoose();

// Se uma escolha guardada não tiver perguntas, volta a escolher tudo
if (!pool().length) {
  state.vehicles = new Set(VEICULOS.map((v) => v.id));
  state.roads = new Set(VIAS.map((_, i) => i));
  document.querySelectorAll(".check-list input").forEach((i) => { i.checked = true; });
}

nextQuestion();

// Funcionar sem internet (só quando a app está num site, não ao abrir o ficheiro)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
