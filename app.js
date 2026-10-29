"use strict";

/* Limites de velocidade (Código da Estrada, art. 27.º), em km/h.
   Ordem dos valores: dentro de localidades, fora de localidades,
   vias reservadas a automóveis, autoestradas. null = não se aplica. */
const VEICULOS = [
  { nome: "Ligeiro de passageiros", detalhe: "sem reboque", limites: [50, 90, 100, 120] },
  { nome: "Ligeiro de passageiros", detalhe: "com reboque", limites: [50, 70, 80, 100] },
  { nome: "Motociclo com mais de 50 cc", detalhe: "sem carro lateral", limites: [50, 90, 100, 120] },
  { nome: "Motociclo com mais de 50 cc", detalhe: "com carro lateral", limites: [50, 70, 80, 100] },
  { nome: "Motociclo até 50 cc", detalhe: "", limites: [40, 60, null, null] },
  { nome: "Triciclo", detalhe: "", limites: [50, 80, 90, 100] },
  { nome: "Ciclomotor ou quadriciclo", detalhe: "", limites: [40, 45, null, null] },
  { nome: "Ligeiro de mercadorias", detalhe: "sem reboque", limites: [50, 80, 90, 110] },
  { nome: "Ligeiro de mercadorias", detalhe: "com reboque", limites: [50, 70, 80, 90] },
  { nome: "Pesado de passageiros", detalhe: "sem reboque", limites: [50, 80, 90, 100] },
  { nome: "Pesado de passageiros", detalhe: "com reboque", limites: [50, 70, 90, 90] },
  { nome: "Pesado de mercadorias", detalhe: "sem reboque", limites: [50, 80, 80, 90] },
  { nome: "Pesado de mercadorias", detalhe: "com semirreboque", limites: [50, 80, 80, 90] },
  { nome: "Pesado de mercadorias", detalhe: "com reboque", limites: [40, 70, 70, 80] },
  { nome: "Máquina industrial", detalhe: "com matrícula", limites: [40, 70, 70, 80] },
  { nome: "Máquina industrial", detalhe: "sem matrícula", limites: [30, 30, null, null] },
  { nome: "Trator agrícola", detalhe: "", limites: [30, 40, null, null] },
  { nome: "Máquina agrícola, tratocarro ou motocultivador", detalhe: "", limites: [20, 20, null, null] },
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

/* ---------- Contadores guardados no telemóvel ---------- */

const KEY = "limites-velocidade:v1";

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && typeof s === "object") return { correct: s.correct | 0, best: s.best | 0 };
  } catch (e) { /* sem armazenamento: continua sem guardar */ }
  return { correct: 0, best: 0 };
}

function saveStats() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ correct: state.correct, best: state.best }));
  } catch (e) { /* ignora */ }
}

/* ---------- Estado ---------- */

const saved = loadStats();
const state = {
  correct: saved.correct,
  best: saved.best,
  streak: 0,
  typed: "",
  current: null,      // { v, r, answer }
  mustCorrect: false, // errou: tem de escrever o valor certo para avançar
  locked: false,
};

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
};

/* ---------- Perguntas ---------- */

const PERGUNTAS = [];
VEICULOS.forEach((veic, v) => {
  veic.limites.forEach((lim, r) => {
    if (lim !== null) PERGUNTAS.push({ v, r, answer: lim });
  });
});

function nextQuestion() {
  let q;
  do {
    q = PERGUNTAS[Math.floor(Math.random() * PERGUNTAS.length)];
  } while (state.current && q.v === state.current.v && q.r === state.current.r);

  state.current = q;
  state.typed = "";
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

function submit() {
  if (state.typed === "") return;
  const given = Number(state.typed);
  const answer = state.current.answer;

  if (given === answer) {
    if (!state.mustCorrect) {
      state.correct++;
      state.streak++;
      bump(el.correct);
      bump(el.streak);
      if (state.streak > state.best) {
        state.best = state.streak;
        bump(el.best);
      }
      saveStats();
      setFeedback("Certo!");
    } else {
      setFeedback("Isso. Agora não te esqueças.");
    }
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
  state.streak = 0;
  state.mustCorrect = true;
  state.typed = "";
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

document.getElementById("keypad").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (btn) press(btn.dataset.key);
});

document.addEventListener("keydown", (e) => {
  if (dialog.open) return;
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

/* ---------- Tabela ---------- */

const dialog = $("tableDialog");

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

$("openTable").addEventListener("click", () => dialog.showModal());
$("closeTable").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close(); // toque fora da folha
});

$("resetScores").addEventListener("click", () => {
  state.correct = 0;
  state.streak = 0;
  state.best = 0;
  saveStats();
  render();
  dialog.close();
});

/* ---------- Arranque ---------- */

buildTable();
nextQuestion();

// Funcionar sem internet (só quando a app está num site, não ao abrir o ficheiro)
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
