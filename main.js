import { ethers } from 'ethers';
import { contractCall } from './src/transactions.js';
import { generateAIResponse } from './src/chat.js';
import { sign_with_private_key } from './src/auth.js';
import logger from './src/logger.js';
import { showLogo, showStats } from './src/logo.js';
import dotenv from 'dotenv';
import {
    getNonce,
    login,
    setInviter,
    verifyDailyTask,
    createNewAgent,
    createNewRequest,
    getUserData
} from './src/api.js';

dotenv.config();

const private_key = process.env.PRIVATE_KEY || '';
const WAIT_HOURS = 12;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

const stats = {
    uid: null,
    totalPoint: 0,
    days: 0,
    agents: 0,
    requests: 0,
    txs: 0,
    errors: 0,
    lastRun: null,
    startTime: Date.now()
};

async function retryWithBackoff(fn, retries = MAX_RETRIES, delay = RETRY_DELAY) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;

            const waitTime = delay * Math.pow(2, i);
            logger.warn(`Attempt ${i + 1} failed, retrying in ${waitTime / 1000}s...`);
            await sleep(waitTime);
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function countdownTimer(hours) {
    const totalSeconds = hours * 60 * 60;
    const endTime = Date.now() + (totalSeconds * 1000);

    logger.separator();
    logger.info(`${logger.EMOJIS.hourglass} Next task check in ${parseInt(hours)} hours`);

    logger.separator();

    let updateInterval = 60000;

    const countdownInterval = setInterval(() => {
        const remaining = Math.floor((endTime - Date.now()) / 1000);

        if (remaining <= 0) {
            clearInterval(countdownInterval);
            return;
        }

        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);

        process.stdout.write(`\r${logger.COLORS.dim}⏳ Time until next check: ${logger.countdown(remaining)} (${hours}h ${mins}m remaining)${logger.COLORS.reset}`);

        if (remaining < (totalSeconds - 600)) {
            updateInterval = 600000;
        }
    }, 60000);

    await sleep(totalSeconds * 1000);
    clearInterval(countdownInterval);
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
}

// Check token validity
async function checkTokenValid(token_expire_time) {
    const now = Math.floor(Date.now() / 1000);

    if (now >= token_expire_time) {
        logger.warn(`${logger.EMOJIS.key} Token expired, refreshing authentication...`);
        return false;
    } else {
        logger.success(`${logger.EMOJIS.check} Token is valid`);
        return true;
    }
}

// Get token
async function getToken() {
    logger.header('AUTHENTICATION');

    try {
        if (!private_key) {
            logger.error('Private key is not set in environment variables!');
            logger.info('Please set PRIVATE_KEY in your .env file');
            return null;
        }

        const address = new ethers.Wallet(private_key).address;
        logger.info(`${logger.EMOJIS.wallet} Wallet Address: ${logger.COLORS.cyan}${address}${logger.COLORS.reset}`);

        const loader = logger.loading('Fetching nonce');
        const message = await getNonce(address);
        logger.stopLoading(loader);

        const nonce = message.data.nonce;
        logger.success(`${logger.EMOJIS.check} Nonce received: ${logger.COLORS.yellow}${nonce}${logger.COLORS.reset}`);

        const loader2 = logger.loading('Signing message');
        const { signature } = await sign_with_private_key(private_key, nonce);
        logger.stopLoading(loader2);
        logger.success(`${logger.EMOJIS.check} Message signed successfully`);

        const loader3 = logger.loading('Authenticating');
        const loginResponse = await login(address, signature, nonce);
        logger.stopLoading(loader3);

        if (loginResponse && loginResponse.data && loginResponse.data.token) {
            logger.success(`${logger.EMOJIS.success} Login successful!`);

            const loader4 = logger.loading('Setting inviter');
            await setInviter(loginResponse.data.token);
            logger.stopLoading(loader4);
            logger.success(`${logger.EMOJIS.check} Inviter configured`);

            logger.separator();
            return loginResponse.data;
        } else {
            logger.error('Login failed - no session token received');
            stats.errors++;
            return null;
        }

    } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        stats.errors++;
        return null;
    }
}

// Create agent
async function createAgent(session_token) {
    logger.header('CREATING AGENT');

    try {
        const loader = logger.loading('Generating AI agent data');
        const agentData = await generateAIResponse('create agent', 'createAgent');
        logger.stopLoading(loader);

        const agent = JSON.parse(agentData);
        const { name_agent, description } = agent ?? { name_agent: '', description: '' };

        if (!name_agent || !description) {
            logger.error('Invalid agent data generated');
            return false;
        }

        logger.box(
            `Name: ${name_agent}\nDescription: ${description}`,
            logger.COLORS.green
        );

        const loader2 = logger.loading('Creating agent on platform');
        const agentResponse = await retryWithBackoff(() => createNewAgent(session_token, name_agent, description));
        logger.stopLoading(loader2);

        const agentID = agentResponse.data?.id;

        if (agentID) {
            logger.success(`${logger.EMOJIS.robot} Agent created with ID: ${logger.COLORS.yellow}${agentID}${logger.COLORS.reset}`);

            const loader3 = logger.loading('Registering on blockchain');
            const txResult = await retryWithBackoff(() => contractCall('addNewAgent', agentID, name_agent, description));
            logger.stopLoading(loader3);

            if (txResult && txResult.hash) {
                logger.success(`${logger.EMOJIS.chain} Transaction successful!`);
                logger.info(`TX Hash: ${logger.COLORS.cyan}${txResult.hash}${logger.COLORS.reset}`);
                stats.agents++;
                stats.txs++;
                logger.separator();
                return true;
            }
        }

        return false;
    } catch (error) {
        logger.error(`Agent creation failed: ${error.message}`);
        stats.errors++;
        return false;
    }
}

// Create request
async function createRequest(session_token) {
    logger.header('CREATING REQUEST');

    try {
        const loader = logger.loading('Generating AI request data');
        const requestData = await generateAIResponse('create request', 'createRequest');
        logger.stopLoading(loader);

        const request = JSON.parse(requestData);
        const { title, description } = request ?? { title: '', description: '' };

        if (!title || !description) {
            logger.error('Invalid request data generated');
            return false;
        }

        logger.box(
            `Title: ${title}\nDescription: ${description}`,
            logger.COLORS.blue
        );

        const loader2 = logger.loading('Creating request on platform');
        const requestResponse = await retryWithBackoff(() => createNewRequest(session_token, title, description));
        logger.stopLoading(loader2);

        const requestID = requestResponse.data?.id;

        if (requestID) {
            logger.success(`${logger.EMOJIS.success} Request created with ID: ${logger.COLORS.yellow}${requestID}${logger.COLORS.reset}`);

            const loader3 = logger.loading('Registering on blockchain');
            const txResult = await retryWithBackoff(() => contractCall('addNewRequest', requestID, title));
            logger.stopLoading(loader3);

            if (txResult && txResult.hash) {
                logger.success(`${logger.EMOJIS.chain} Transaction successful!`);
                logger.info(`TX Hash: ${logger.COLORS.cyan}${txResult.hash}${logger.COLORS.reset}`);
                stats.requests++;
                stats.txs++;
                logger.separator();
                return true;
            }
        }

        return false;
    } catch (error) {
        logger.error(`Request creation failed: ${error.message}`);
        stats.errors++;
        return false;
    }
}

// Execute daily tasks
async function executeDailyTasks(tokenData) {
    logger.banner('🚀 STARTING DAILY TASK EXECUTION', logger.COLORS.cyan);

    try {
        const session_token = tokenData.token;

        logger.info(`${logger.EMOJIS.info} Checking daily task status...`);
        const dailyTaskResponse = await retryWithBackoff(() => verifyDailyTask(session_token));

        const { is_create_agent, is_create_request, finish_time } = dailyTaskResponse.data;
        const now = Math.floor(Date.now() / 1000);
        const cooldownEndTime = finish_time + (24 * 60 * 60);
        const secondsUntilNextTask = cooldownEndTime - now;

        let taskCompleted = false;

        if (!is_create_agent) {
            logger.info(`${logger.EMOJIS.robot} Agent task available - proceeding...`);
            taskCompleted = await createAgent(session_token);
        }
        if (!is_create_request) {
            logger.info(`${logger.EMOJIS.info} Request task available - proceeding...`);
            taskCompleted = await createRequest(session_token);
        } else {
            logger.warn(`${logger.EMOJIS.trophy} All daily tasks completed!`);
            logger.info('No new tasks available at this time');
            logger.info(`Next tasks available in: ${logger.countdown(secondsUntilNextTask)}`);
        }

        stats.lastRun = new Date().toLocaleString();
        stats.nextTaskTime = cooldownEndTime;
        stats.cooldownSeconds = secondsUntilNextTask;

        if (taskCompleted) {
            logger.banner('✅ TASK EXECUTION SUCCESSFUL', logger.COLORS.green);
        }

    } catch (error) {
        logger.error(`Daily task execution failed: ${error.message}`);
        stats.errors++;
    }

    return stats.cooldownSeconds > 0 ? stats.cooldownSeconds : WAIT_HOURS * 60 * 60;
}

// Main loop
async function main() {
    showLogo();

    logger.banner('🔥 SYSTEM INITIALIZED', logger.COLORS.green);
    logger.info(`Start Time: ${new Date().toLocaleString()}`);
    logger.info(`Mode: Automated (${WAIT_HOURS}h intervals)`);
    logger.separator();

    let tokenData = await retryWithBackoff(() => getToken());

    if (!tokenData) {
        logger.error('Failed to authenticate. Please check your configuration.');
        return;
    }

    let cycleCount = 0;

    while (true) {
        try {
            cycleCount++;
            logger.banner(`🔄 CYCLE ${cycleCount}`, logger.COLORS.magenta);

            // Check token validity
            const isValid = await checkTokenValid(tokenData.token_expire_time);
            if (!isValid) {
                tokenData = await retryWithBackoff(() => getToken());
                if (!tokenData) {
                    logger.error('Re-authentication failed. Waiting before retry...');
                    await sleep(60000);
                    continue;
                }
            }

            // Execute daily tasks
            const cooldownSeconds = await executeDailyTasks(tokenData);
            const cooldownHours = cooldownSeconds / (60 * 60);

            // Refresh user data 
            const loader6 = logger.loading('Refreshing user data');
            try {
                const userData = await retryWithBackoff(() => getUserData(tokenData.token));
                logger.stopLoading(loader6);

                if (userData && userData.data) {
                    stats.uid = userData.data.uid;
                    stats.totalPoint = userData.data.total_point;
                    stats.days = userData.data.days;
                    logger.success(`${logger.EMOJIS.check} User data refreshed`);
                    logger.info(`UID: ${logger.COLORS.yellow}${stats.uid}${logger.COLORS.reset} | Points: ${logger.COLORS.yellow}${stats.totalPoint}${logger.COLORS.reset} | Days: ${logger.COLORS.yellow}${stats.days}${logger.COLORS.reset}`);
                } else {
                    logger.warn(`Failed to refresh user data - invalid response`);
                    if (userData) logger.info(`Response: ${JSON.stringify(userData)}`);
                }
            } catch (error) {
                logger.stopLoading(loader6);
                logger.error(`Failed to refresh user data: ${error.message}`);
            }

            showStats(stats);

            const runtime = Math.floor((Date.now() - stats.startTime) / 1000 / 60);
            logger.info(`${logger.EMOJIS.hourglass} Total Runtime: ${runtime} minutes`);

            await countdownTimer(cooldownHours);

        } catch (error) {
            logger.error(`Critical error in main loop: ${error.message}`);
            stats.errors++;
            logger.warn('Attempting recovery in 5 minutes...');
            await sleep(300000);
        }
    }
}

process.on('SIGINT', () => {
    logger.separator();
    logger.banner('🚨 SHUTDOWN INITIATED', logger.COLORS.yellow);
    logger.info('Saving session data...');
    showStats(stats);
    logger.success('Bot stopped gracefully. Goodbye! 👋');
    process.exit(0);
});

main().catch(error => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
