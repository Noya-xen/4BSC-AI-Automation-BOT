const COLORS = {
    reset: "\x1b[0m",
    gray: "\x1b[90m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    bgRed: "\x1b[41m",
    bgGreen: "\x1b[42m",
    bgYellow: "\x1b[43m",
    bgBlue: "\x1b[44m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
};

const EMOJIS = {
    debug: "🔍",
    info: "ℹ️",
    success: "✅",
    warn: "⚠️",
    error: "❌",
    rocket: "🚀",
    fire: "🔥",
    chain: "⛓️",
    wallet: "💼",
    check: "✓",
    cross: "✗",
    hourglass: "⏳",
    trophy: "🏆",
    robot: "🤖",
    key: "🔑",
};

const LEVELS = {
    debug: { color: COLORS.magenta, label: "DEBUG", emoji: EMOJIS.debug },
    info: { color: COLORS.blue, label: "INFO", emoji: EMOJIS.info },
    success: { color: COLORS.green, label: "SUCCESS", emoji: EMOJIS.success },
    warn: { color: COLORS.yellow, label: "WARN", emoji: EMOJIS.warn },
    error: { color: COLORS.red, label: "ERROR", emoji: EMOJIS.error },
};

const config = {
    pretty: true,
    level: "debug",
    timestamp: true,
    showEmoji: true,
};

function formatTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
}

function shouldLog(level) {
    const order = ["debug", "info", "success", "warn", "error"];
    return order.indexOf(level) >= order.indexOf(config.level);
}

function log(level, message, meta = {}, context = "4BSCAI") {
    if (!shouldLog(level)) return;

    const time = formatTime();
    const { color, label, emoji } = LEVELS[level];

    if (!config.pretty) {
        console.log(
            JSON.stringify({
                time,
                level,
                context,
                message,
                ...meta,
            })
        );
        return;
    }

    const emojiStr = config.showEmoji ? `${emoji} ` : "";
    const metaStr =
        Object.keys(meta).length > 0
            ? `\n${COLORS.dim}${JSON.stringify(meta, null, 2)}${COLORS.reset}`
            : "";

    console.log(
        `${COLORS.dim}[${time}]${COLORS.reset} ` +
        `${emojiStr}${color}${COLORS.bold}${label}${COLORS.reset} ` +
        `${COLORS.cyan}[${context}]${COLORS.reset} ` +
        `${message}${metaStr}`
    );
}

function separator(char = "─", length = 60) {
    console.log(COLORS.dim + char.repeat(length) + COLORS.reset);
}

function header(title) {
    const padding = 60;
    const titleLen = title.length;
    const pad = Math.floor((padding - titleLen - 2) / 2);
    const line = "═".repeat(padding);

    console.log(COLORS.cyan + COLORS.bold);
    console.log("╔" + line + "╗");
    console.log("║" + " ".repeat(pad) + title + " ".repeat(padding - pad - titleLen) + "║");
    console.log("╚" + line + "╝" + COLORS.reset);
}

function box(content, color = COLORS.cyan) {
    const lines = content.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));

    console.log(color);
    console.log("┌" + "─".repeat(maxLen + 2) + "┐");
    lines.forEach(line => {
        console.log("│ " + line + " ".repeat(maxLen - line.length) + " │");
    });
    console.log("└" + "─".repeat(maxLen + 2) + "┘");
    console.log(COLORS.reset);
}

function progressBar(current, total, width = 40) {
    const percentage = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * width);
    const empty = width - filled;

    const bar =
        COLORS.green + "█".repeat(filled) +
        COLORS.dim + "░".repeat(empty) +
        COLORS.reset;

    return `${bar} ${COLORS.bold}${percentage}%${COLORS.reset}`;
}

function countdown(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${COLORS.cyan}${String(hours).padStart(2, '0')}${COLORS.reset}:` +
        `${COLORS.cyan}${String(mins).padStart(2, '0')}${COLORS.reset}:` +
        `${COLORS.cyan}${String(secs).padStart(2, '0')}${COLORS.reset}`;
}

function loading(text = "Loading") {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let i = 0;

    return setInterval(() => {
        process.stdout.write(`\r${COLORS.cyan}${frames[i]} ${text}...${COLORS.reset}`);
        i = (i + 1) % frames.length;
    }, 80);
}

function stopLoading(interval) {
    clearInterval(interval);
    process.stdout.write('\r' + ' '.repeat(50) + '\r');
}

function table(data) {
    console.log(COLORS.cyan);
    console.table(data);
    console.log(COLORS.reset);
}

function banner(text, color = COLORS.green) {
    const width = 60;
    const padding = Math.floor((width - text.length) / 2);

    console.log(color + COLORS.bold);
    console.log("\n" + " ".repeat(padding) + text);
    console.log("═".repeat(width));
    console.log(COLORS.reset);
}

const logger = {
    config,
    COLORS,
    EMOJIS,
    debug: (msg, meta, ctx) => log("debug", msg, meta, ctx),
    info: (msg, meta, ctx) => log("info", msg, meta, ctx),
    success: (msg, meta, ctx) => log("success", msg, meta, ctx),
    warn: (msg, meta, ctx) => log("warn", msg, meta, ctx),
    error: (msg, meta, ctx) => log("error", msg, meta, ctx),
    separator,
    header,
    box,
    progressBar,
    countdown,
    loading,
    stopLoading,
    table,
    banner,
};

export default logger;