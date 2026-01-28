export function showLogo() {
    const width = process.stdout.columns || 80;
    const cyan = "\x1b[36m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const magenta = "\x1b[35m";
    const bold = "\x1b[1m";
    const reset = "\x1b[0m";

    const FULL = `
${cyan}${bold}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        ██╗  ██╗██████╗ ███████╗ ██████╗     █████╗ ██╗       ║
║        ██║  ██║██╔══██╗██╔════╝██╔════╝    ██╔══██╗██║       ║
║        ███████║██████╔╝███████╗██║         ███████║██║       ║
║        ╚════██║██╔══██╗╚════██║██║         ██╔══██║██║       ║
║             ██║██████╔╝███████║╚██████╗    ██║  ██║██║       ║
║             ╚═╝╚═════╝ ╚══════╝ ╚═════╝    ╚═╝  ╚═╝╚═╝       ║
║                                                              ║
║${green}              🤖 Automation Bot by ZLKCYBER 🚀${cyan}                ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${reset}`;

    const MEDIUM = `
${cyan}${bold}
╔═════════════════════════════════════════╗
║                                         ║
║        🔥  4BSC.AI  AUTOMATION  🔥     ║
║                                         ║
║${green}        Powered by ZLKCYBER Team${cyan}        ║
║                                         ║
╚═════════════════════════════════════════╝
${reset}`;

    const SMALL = `
${cyan}[ ${bold}4BSC.AI BOT${reset}${cyan} ]${reset}
`;

    let box;
    if (width >= 70) box = FULL;
    else if (width >= 45) box = MEDIUM;
    else box = SMALL;

    console.clear();
    console.log(box);
    console.log(yellow + bold + "\n  ⚡ System Status: ONLINE" + reset);
    console.log(green + "  📡 Network: BSC Mainnet" + reset);
    console.log(magenta + "  🎯 Mode: Automated Task Execution\n" + reset);

    return box;
}

export function showStats(stats) {
    const cyan = "\x1b[36m";
    const green = "\x1b[32m";
    const yellow = "\x1b[33m";
    const reset = "\x1b[0m";
    const bold = "\x1b[1m";

    console.log(cyan + bold + "\n╔════════════════ USER & SESSION STATS ════════════════╗" + reset);
    console.log(cyan + "║" + reset + green + "  👤 User ID (UID):            " + yellow + bold + String(stats.uid || 'N/A').padStart(18) + reset + cyan + "   ║" + reset);
    console.log(cyan + "║" + reset + green + "  📊 Total Points:             " + yellow + bold + String(stats.totalPoint || 0).padStart(18) + reset + cyan + "   ║" + reset);
    console.log(cyan + "║" + reset + green + "  🔥 Days Streak:              " + yellow + bold + String(stats.days || 0).padStart(18) + reset + cyan + "   ║" + reset);
    console.log(cyan + "║" + reset + reset);
    console.log(cyan + "║" + reset + green + "  🏆 Total Agents Created:     " + yellow + bold + String(stats.agents || 0).padStart(18) + reset + cyan + "   ║" + reset);
    console.log(cyan + "║" + reset + green + "  📝 Total Requests Created:   " + yellow + bold + String(stats.requests || 0).padStart(18) + reset + cyan + "   ║" + reset);
    console.log(cyan + "║" + reset + green + "  ⛓️  Blockchain Transactions:  " + yellow + bold + String(stats.txs || 0).padStart(18) + reset + cyan + "   ║" + reset);
    console.log(cyan + "║" + reset + green + "  ⚠️  Errors Encountered:       " + yellow + bold + String(stats.errors || 0).padStart(18) + reset + cyan + "   ║" + reset);
    console.log(cyan + "╚════════════════════════════════════════════════════════╝" + reset + "\n");
}