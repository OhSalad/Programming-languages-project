const form = document.querySelector("#expression-form");
const input = document.querySelector("#expression-input");
const lexerBoxes = document.querySelector("#lexer-boxes");
const parserBoxes = document.querySelector("#parser-boxes");
const stateTitle = document.querySelector("#state-title");
const parserMethod = document.querySelector("#parser-method");
const resultValue = document.querySelector("#result-value");
const eventLog = document.querySelector("#event-log");

const STEP_MS = 500;
let timer = null;

const TOKEN = {
  FRACTION: "FRACTION",
  PLUS: "PLUS",
  MINUS: "MINUS",
  TIMES: "TIMES",
  DIVIDE: "DIVIDE",
  LEFT_PAREN: "LEFT_PAREN",
  RIGHT_PAREN: "RIGHT_PAREN",
  EOF: "EOF",
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  startAnimation(input.value);
});

startAnimation(input.value);

function startAnimation(source) {
  clearInterval(timer);
  eventLog.innerHTML = "";
  const simulation = buildSimulation(source);
  let index = 0;
  renderStep(simulation.steps[0], simulation.tokens);

  timer = setInterval(() => {
    index += 1;
    if (index >= simulation.steps.length) {
      clearInterval(timer);
      return;
    }
    renderStep(simulation.steps[index], simulation.tokens);
  }, STEP_MS);
}

function buildSimulation(source) {
  const steps = [];
  let tokens = [];

  try {
    const lexed = lex(source, steps);
    tokens = lexed.tokens;
    parse(tokens, steps);
    steps.push({
      phase: "done",
      title: "Expression accepted",
      method: "program",
      result: "Valid syntax",
      lexerStates: makeStates(tokens, tokens.length, "accepted"),
      parserStates: makeStates(tokens, tokens.length, "accepted"),
      log: "Program matched expr EOF.",
    });
  } catch (error) {
    const knownTokens = tokens.length ? tokens : error.tokens || [];
    steps.push({
      phase: "error",
      title: "Error state",
      method: error.method || "-",
      result: "Rejected",
      lexerStates: error.lexerStates || makeStates(knownTokens, knownTokens.length, "accepted"),
      parserStates: error.parserStates || makeStates(knownTokens, error.tokenIndex ?? knownTokens.length, "error"),
      log: error.message,
    });
    tokens = knownTokens;
  }

  if (tokens.length === 0) {
    tokens = [{ type: TOKEN.EOF, lexeme: "$$", position: source.length }];
  }

  return { steps, tokens };
}

function lex(source, steps) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const current = source[index];

    if (/\s/.test(current)) {
      index += 1;
      continue;
    }

    const start = index;

    if (isDigit(current)) {
      while (isDigit(source[index])) index += 1;

      if (source[index] !== "/") {
        const errorToken = { type: "ERROR", lexeme: source.slice(start, index), position: start };
        throw makeError(`Lexer error at position ${start + 1}: '${source.slice(start, index)}' is not a fraction.`, {
          tokens: [...tokens, errorToken],
          lexerStates: makeStates([...tokens, errorToken], tokens.length, "error"),
        });
      }

      index += 1;

      if (!isDigit(source[index])) {
        const errorToken = { type: "ERROR", lexeme: source.slice(start, index) || "/", position: start };
        throw makeError(`Lexer error at position ${index + 1}: missing denominator after '/'.`, {
          tokens: [...tokens, errorToken],
          lexerStates: makeStates([...tokens, errorToken], tokens.length, "error"),
        });
      }

      while (isDigit(source[index])) index += 1;
      const token = { type: TOKEN.FRACTION, lexeme: source.slice(start, index), position: start };
      pushTokenWithSteps(tokens, token, steps, "Lexer scans a fraction.");
      continue;
    }

    const single = {
      "+": TOKEN.PLUS,
      "-": TOKEN.MINUS,
      "*": TOKEN.TIMES,
      "/": TOKEN.DIVIDE,
      "(": TOKEN.LEFT_PAREN,
      ")": TOKEN.RIGHT_PAREN,
    }[current];

    if (!single) {
      const errorToken = { type: "ERROR", lexeme: current, position: start };
      throw makeError(`Lexer error at position ${start + 1}: invalid character '${current}'.`, {
        tokens: [...tokens, errorToken],
        lexerStates: makeStates([...tokens, errorToken], tokens.length, "error"),
      });
    }

    index += 1;
    pushTokenWithSteps(tokens, { type: single, lexeme: current, position: start }, steps, `Lexer scans '${current}'.`);
  }

  pushTokenWithSteps(tokens, { type: TOKEN.EOF, lexeme: "$$", position: source.length }, steps, "Lexer reaches end of input.");
  return { tokens };
}

function pushTokenWithSteps(tokens, token, steps, message) {
  const previewTokens = [...tokens, token];
  const activeIndex = previewTokens.length - 1;

  steps.push({
    phase: "lexer",
    title: message,
    method: "-",
    result: "-",
    lexerStates: makeStates(previewTokens, activeIndex, "active"),
    parserStates: [],
    log: `${tokenName(token)} queued.`,
  });

  tokens.push(token);

  steps.push({
    phase: "lexer",
    title: "Token accepted by lexer",
    method: "-",
    result: "-",
    lexerStates: makeStates(tokens, activeIndex, "accepted"),
    parserStates: [],
    log: `${tokenName(token)} becomes a token.`,
  });
}

function parse(tokens, steps) {
  let index = 0;

  const current = () => tokens[index];

  const consume = (expected, method) => {
    const token = current();
    steps.push({
      phase: "parser",
      title: `Parser expects ${expected}`,
      method,
      result: "-",
      lexerStates: makeStates(tokens, tokens.length, "accepted"),
      parserStates: makeStates(tokens, index, "active"),
      log: `${method} looks at ${tokenName(token)}.`,
    });

    if (!token || token.type !== expected) {
      throw makeError(`Parser error at position ${(token?.position ?? 0) + 1}: expected ${expected}, found ${tokenName(token)}.`, {
        tokens,
        method,
        tokenIndex: index,
        parserStates: makeStates(tokens, index, "error"),
      });
    }

    steps.push({
      phase: "parser",
      title: `${tokenName(token)} matched`,
      method,
      result: "-",
      lexerStates: makeStates(tokens, tokens.length, "accepted"),
      parserStates: makeStates(tokens, index, "accepted"),
      log: `${method} consumes ${tokenName(token)}.`,
    });

    index += 1;
  };

  function program() {
    expr();
    consume(TOKEN.EOF, "program");
  }

  function expr() {
    enterMethod("expr", "Parse an expression.");
    term();
    termTail();
  }

  function termTail() {
    enterMethod("termTail", "Check for + or -.");
    while (current().type === TOKEN.PLUS || current().type === TOKEN.MINUS) {
      consume(current().type, "termTail");
      term();
    }
  }

  function term() {
    enterMethod("term", "Parse a term.");
    factor();
    factorTail();
  }

  function factorTail() {
    enterMethod("factorTail", "Check for * or /.");
    while (current().type === TOKEN.TIMES || current().type === TOKEN.DIVIDE) {
      consume(current().type, "factorTail");
      factor();
    }
  }

  function factor() {
    enterMethod("factor", "Parse a factor.");
    if (current().type === TOKEN.FRACTION) {
      consume(TOKEN.FRACTION, "factor");
      return;
    }

    if (current().type === TOKEN.LEFT_PAREN) {
      consume(TOKEN.LEFT_PAREN, "factor");
      expr();
      consume(TOKEN.RIGHT_PAREN, "factor");
      return;
    }

    throw makeError(`Parser error at position ${current().position + 1}: expected FRACTION or '(', found ${tokenName(current())}.`, {
      tokens,
      method: "factor",
      tokenIndex: index,
      parserStates: makeStates(tokens, index, "error"),
    });
  }

  function enterMethod(method, log) {
    steps.push({
      phase: "parser",
      title: log,
      method,
      result: "-",
      lexerStates: makeStates(tokens, tokens.length, "accepted"),
      parserStates: makeStates(tokens, index, "active"),
      log: `${method} starts with ${tokenName(current())}.`,
    });
  }

  program();
}

function renderStep(step, tokens) {
  stateTitle.textContent = step.title;
  parserMethod.textContent = step.method || "-";
  resultValue.textContent = step.result || "-";

  renderBoxes(lexerBoxes, step.lexerStates || [], tokens);
  renderBoxes(parserBoxes, step.parserStates || [], tokens);
  appendLog(step.log, step.phase === "error");
}

function renderBoxes(container, states, tokens) {
  container.innerHTML = "";
  const visible = states.length ? states : tokens.map((token, index) => ({ token, index, state: "waiting" }));

  visible.forEach(({ token, index, state }) => {
    const box = document.createElement("div");
    box.className = `box ${state}`;
    box.textContent = token.lexeme;
    box.title = token.type;
    box.style.setProperty("--x", `${index * 108}px`);
    container.appendChild(box);
  });
}

function appendLog(message, isError = false) {
  const item = document.createElement("li");
  item.textContent = message;
  item.className = "latest";
  if (isError) item.style.color = "var(--red)";

  eventLog.querySelectorAll(".latest").forEach((node) => node.classList.remove("latest"));
  eventLog.appendChild(item);
  eventLog.scrollTop = eventLog.scrollHeight;
}

function makeStates(tokens, activeIndex, activeState) {
  return tokens.map((token, index) => {
    let state = "waiting";

    if (index < activeIndex) {
      state = "accepted";
    }

    if (index === activeIndex) {
      state = activeState;
    }

    if (activeIndex >= tokens.length) {
      state = "accepted";
    }

    return { token, index, state };
  });
}

function tokenName(token) {
  if (!token) return "end of input";
  return token.type === TOKEN.EOF ? "EOF" : `${token.type}(${token.lexeme})`;
}

function makeError(message, extra = {}) {
  return Object.assign(new Error(message), extra);
}

function isDigit(char) {
  return char >= "0" && char <= "9";
}
