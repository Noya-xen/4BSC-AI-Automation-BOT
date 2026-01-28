import { ethers } from 'ethers';
import { contractCall } from './src/transactions.js';
import { generateAIResponse } from './src/chat.js';
import { sign_with_private_key } from './src/auth.js';
import logger from './src/logger.js';
import { showLogo, showStats } from './src/logo.js';
import dotenv from 'dotenv';
import fs from 'fs';
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

// Parse multiple PRIVATE_KEY entries from .env
function parsePrivateKeys() {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const lines = envContent.split('\n');
    const privateKeys = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('PRIVATE_KEY=')) {
            const key = trimmed.replace('PRIVATE_KEY=', '').trim();
            if (key && key.startsWith('0x') && key.length > 10) {
                privateKeys.push(key);
            }
        }
    }
    
    return privateKeys;
}

const PRIVATE_KEYS = parsePrivateKeys();
const WAIT_HOURS = parseInt(process.env.WAIT_HOURS) || 12;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

// Stats per account
const accountsStats = {};

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

    const countdownInterval = setInterval(() => {
        const remaining = Math.floor((endTime - Date.now()) / 1000);

        if (remaining <= 0) {
            clearInterval(countdownInterval);
            return;
        }

        const hours = Math.floor(remaining / 3600);
        const mins = Math.floor((remaining % 3600) / 60);

        process.stdout.write(`\r${logger.COLORS.dim}⏳ Time until next check: ${logger.countdown(remaining)} (${hours}h ${mins}m remaining)${logger.COLORS.reset}`);
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
async function getToken(private_key, accountIndex) {
    logger.header(`AUTHENTICATION - ACCOUNT #${accountIndex + 1}`);

    try {
        if (!private_key) {
            logger.error('Private key is not set!');
            return null;
        }

        const address = new ethers.Wallet(private_key).address;
        logger.info(`${logger.EMOJIS.wallet} Wallet Address: ${logger.COLORS.cyan}${address}${logger.COLORS.reset}`);

        const loader = logger.loading('Fetching nonce');
        const message = await getNonce(address);
        logger.stopLoading(loader);

        if (!message || !message.data) {
            logger.error('Failed to get nonce');
            return null;
        }

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
            return { ...loginResponse.data, address };
        } else {
            logger.error('Login failed - no session token received');
            return null;
        }

    } catch (error) {
        logger.error(`Authentication error: ${error.message}`);
        return null;
    }
}

// Create agent
async function createAgent(session_token, accountIndex) {
    logger.header(`CREATING AGENT - ACCOUNT #${accountIndex + 1}`);

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

        if (!agentResponse || !agentResponse.data) {
            logger.error('Failed to create agent on platform');
            return false;
        }

        const agentID = agentResponse.data?.id;

        if (agentID) {
            logger.success(`${logger.EMOJIS.robot} Agent created with ID: ${logger.COLORS.yellow}${agentID}${logger.COLORS.reset}`);

            const loader3 = logger.loading('Registering on blockchain');
            const txResult = await retryWithBackoff(() => contractCall('addNewAgent', agentID, name_agent, description));
            logger.stopLoading(loader3);

            if (txResult && txResult.hash) {
                logger.success(`${logger.EMOJIS.chain} Transaction successful!`);
                logger.info(`TX Hash: ${logger.COLORS.cyan}${txResult.hash}${logger.COLORS.reset}`);
                accountsStats[accountIndex].agents++;
                accountsStats[accountIndex].txs++;
                logger.separator();
                return true;
            }
        }

        return false;
    } catch (error) {
        logger.error(`Agent creation failed: ${error.message}`);
        accountsStats[accountIndex].errors++;
        return false;
    }
}

// Create request
async function createRequest(session_token, accountIndex) {
    logger.header(`CREATING REQUEST - ACCOUNT #${accountIndex + 1}`);

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

        if (!requestResponse || !requestResponse.data) {
            logger.error('Failed to create request on platform');
            return false;
        }

        const requestID = requestResponse.data?.id;

        if (requestID) {
            logger.success(`${logger.EMOJIS.success} Request created with ID: ${logger.COLORS.yellow}${requestID}${logger.COLORS.reset}`);

            const loader3 = logger.loading('Registering on blockchain');
            const txResult = await retryWithBackoff(() => contractCall('addNewRequest', requestID, title));
            logger.stopLoading(loader3);

            if (txResult && txResult.hash) {
                logger.success(`${logger.EMOJIS.chain} Transaction successful!`);
                logger.info(`TX Hash: ${logger.COLORS.cyan}${txResult.hash}${logger.COLORS.reset}`);
                accountsStats[accountIndex].requests++;
                accountsStats[accountIndex].txs++;
                logger.separator();
                return true;
            }
        }

        return false;
    } catch (error) {
        logger.error(`Request creation failed: ${error.message}`);
        accountsStats[accountIndex].errors++;
        return false;
    }
}

// Execute daily tasks for one account
async function executeDailyTasks(tokenData, accountIndex) {
    logger.banner(`🚀 STARTING DAILY TASK - ACCOUNT #${accountIndex + 1}`, logger.COLORS.cyan);

    try {
        const session_token = tokenData.token;
        const address = tokenData.address;

        logger.info(`${logger.EMOJIS.info} Checking daily task status...`);
        const dailyTaskResponse = await retryWithBackoff(() => verifyDailyTask(session_token, address));

        // Validasi response
        if (!dailyTaskResponse || !dailyTaskResponse.data) {
            logger.error('Invalid response from daily task verification');
            logger.warn('Skipping this account...');
            return false;
        }

        const { is_create_agent, is_create_request, finish_time } = dailyTaskResponse.data;
        
        // Validasi property
        if (typeof is_create_agent === 'undefined' || typeof is_create_request === 'undefined') {
            logger.error('Missing required properties in response');
            logger.warn('Skipping this account...');
            return false;
        }

        const now = Math.floor(Date.now() / 1000);
        const cooldownEndTime = finish_time + (24 * 60 * 60);
        const secondsUntilNextTask = cooldownEndTime - now;

        let taskCompleted = false;

        // Process agent task
        if (!is_create_agent) {
            logger.info(`${logger.EMOJIS.robot} Agent task available - proceeding...`);
            const agentResult = await createAgent(session_token, accountIndex);
            if (agentResult) taskCompleted = true;
        } else {
            logger.info(`${logger.EMOJIS.check} Agent task already completed`);
        }

        // Process request task
        if (!is_create_request) {
            logger.info(`${logger.EMOJIS.info} Request task available - proceeding...`);
            const requestResult = await createRequest(session_token, accountIndex);
            if (requestResult) taskCompleted = true;
        } else {
            logger.info(`${logger.EMOJIS.check} Request task already completed`);
        }

        // Both tasks completed
        if (is_create_agent && is_create_request) {
            logger.warn(`${logger.EMOJIS.trophy} All daily tasks already completed!`);
            logger.info(`Next tasks available in: ${logger.countdown(secondsUntilNextTask)}`);
        }

        accountsStats[accountIndex].lastRun = new Date().toLocaleString();
        accountsStats[accountIndex].cooldownSeconds = secondsUntilNextTask;

        if (taskCompleted) {
            logger.banner('✅ TASK COMPLETED SUCCESSFULLY', logger.COLORS.green);
        }

        return true;

    } catch (error) {
        logger.error(`Daily task execution failed: ${error.message}`);
        logger.warn('Skipping this account...');
        accountsStats[accountIndex].errors++;
        return false;
    }
}

// Process single account completely
async function processAccount(private_key, accountIndex, tokenData = null) {
    logger.separator();
    logger.info(`${logger.COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${logger.COLORS.reset}`);
    logger.info(`${logger.COLORS.cyan}           PROCESSING ACCOUNT #${accountIndex + 1}/${PRIVATE_KEYS.length}${logger.COLORS.reset}`);
    logger.info(`${logger.COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${logger.COLORS.reset}`);
    logger.separator();

    try {
        // Authenticate if no token data
        if (!tokenData) {
            tokenData = await getToken(private_key, accountIndex);
            if (!tokenData) {
                logger.error(`❌ Account #${accountIndex + 1} authentication failed - SKIPPING`);
                logger.separator();
                return null;
            }
        } else {
            // Check token validity
            const isValid = await checkTokenValid(tokenData.token_expire_time);
            if (!isValid) {
                logger.info('Token expired, re-authenticating...');
                tokenData = await getToken(private_key, accountIndex);
                if (!tokenData) {
                    logger.error(`❌ Account #${accountIndex + 1} re-authentication failed - SKIPPING`);
                    logger.separator();
                    return null;
                }
            }
        }

        // Execute daily tasks
        const taskResult = await executeDailyTasks(tokenData, accountIndex);
        
        if (!taskResult) {
            logger.warn(`⚠️ Account #${accountIndex + 1} task execution failed - SKIPPING`);
            logger.separator();
            return tokenData; // Return token data for next cycle
        }

        // Refresh user data
        const loader = logger.loading('Refreshing user data');
        try {
            const userData = await getUserData(tokenData.token);
            logger.stopLoading(loader);

            if (userData && userData.data) {
                accountsStats[accountIndex].uid = userData.data.uid;
                accountsStats[accountIndex].totalPoint = userData.data.total_point;
                accountsStats[accountIndex].days = userData.data.days;
                logger.success(`${logger.EMOJIS.check} User data refreshed`);
                logger.info(`UID: ${logger.COLORS.yellow}${accountsStats[accountIndex].uid}${logger.COLORS.reset} | Points: ${logger.COLORS.yellow}${accountsStats[accountIndex].totalPoint}${logger.COLORS.reset} | Days: ${logger.COLORS.yellow}${accountsStats[accountIndex].days}${logger.COLORS.reset}`);
            }
        } catch (error) {
            logger.stopLoading(loader);
            logger.warn(`Failed to refresh user data: ${error.message}`);
        }

        logger.banner(`✅ ACCOUNT #${accountIndex + 1} COMPLETED`, logger.COLORS.green);
        logger.separator();

        return tokenData;

    } catch (error) {
        logger.error(`❌ Critical error processing account #${accountIndex + 1}: ${error.message}`);
        logger.warn('SKIPPING to next account...');
        accountsStats[accountIndex].errors++;
        logger.separator();
        return tokenData;
    }
}

// Main loop
async function main() {
    showLogo();

    logger.banner('🔥 SYSTEM INITIALIZED', logger.COLORS.green);
    logger.info(`Start Time: ${new Date().toLocaleString()}`);
    logger.info(`Mode: Sequential Processing (${WAIT_HOURS}h intervals)`);
    logger.info(`Total Accounts: ${PRIVATE_KEYS.length}`);
    logger.separator();

    if (PRIVATE_KEYS.length === 0) {
        logger.error('No valid private keys found in .env file!');
        logger.info('Please add PRIVATE_KEY entries in your .env file');
        logger.info('Format:');
        logger.info('PRIVATE_KEY=0x...');
        logger.info('PRIVATE_KEY=0x...');
        return;
    }

    // Initialize stats for each account
    PRIVATE_KEYS.forEach((_, index) => {
        accountsStats[index] = {
            uid: null,
            totalPoint: 0,
            days: 0,
            agents: 0,
            requests: 0,
            txs: 0,
            errors: 0,
            lastRun: null,
            startTime: Date.now(),
            cooldownSeconds: 0
        };
    });

    // Store token data for each account
    const tokenDataArray = new Array(PRIVATE_KEYS.length).fill(null);

    let cycleCount = 0;

    while (true) {
        try {
            cycleCount++;
            logger.banner(`🔄 CYCLE ${cycleCount} - SEQUENTIAL PROCESSING`, logger.COLORS.magenta);

            // Process each account ONE BY ONE
            for (let i = 0; i < PRIVATE_KEYS.length; i++) {
                logger.info(`\n${logger.COLORS.yellow}>>> Starting Account #${i + 1}...${logger.COLORS.reset}\n`);
                
                tokenDataArray[i] = await processAccount(PRIVATE_KEYS[i], i, tokenDataArray[i]);
                
                // Wait before next account (except for last account)
                if (i < PRIVATE_KEYS.length - 1) {
                    logger.info(`${logger.COLORS.dim}⏳ Waiting 3 seconds before next account...${logger.COLORS.reset}\n`);
                    await sleep(3000);
                }
            }

            // Show summary for all accounts
            logger.separator();
            logger.banner('📊 ALL ACCOUNTS SUMMARY', logger.COLORS.blue);
            
            let totalAgents = 0;
            let totalRequests = 0;
            let totalTxs = 0;
            let totalErrors = 0;
            let totalPoints = 0;

            for (let i = 0; i < PRIVATE_KEYS.length; i++) {
                if (accountsStats[i]) {
                    logger.info(`\n${logger.COLORS.cyan}Account #${i + 1}:${logger.COLORS.reset}`);
                    logger.info(`  UID: ${accountsStats[i].uid || 'N/A'}`);
                    logger.info(`  Points: ${accountsStats[i].totalPoint}`);
                    logger.info(`  Days: ${accountsStats[i].days}`);
                    logger.info(`  Agents: ${accountsStats[i].agents}`);
                    logger.info(`  Requests: ${accountsStats[i].requests}`);
                    logger.info(`  Blockchain TXs: ${accountsStats[i].txs}`);
                    logger.info(`  Errors: ${accountsStats[i].errors}`);

                    totalAgents += accountsStats[i].agents;
                    totalRequests += accountsStats[i].requests;
                    totalTxs += accountsStats[i].txs;
                    totalErrors += accountsStats[i].errors;
                    totalPoints += accountsStats[i].totalPoint;
                }
            }

            logger.separator();
            logger.info(`${logger.COLORS.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${logger.COLORS.reset}`);
            logger.info(`${logger.COLORS.green}                 TOTAL SUMMARY${logger.COLORS.reset}`);
            logger.info(`${logger.COLORS.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${logger.COLORS.reset}`);
            logger.info(`  🏆 Total Points: ${logger.COLORS.yellow}${totalPoints}${logger.COLORS.reset}`);
            logger.info(`  🤖 Total Agents: ${logger.COLORS.yellow}${totalAgents}${logger.COLORS.reset}`);
            logger.info(`  📋 Total Requests: ${logger.COLORS.yellow}${totalRequests}${logger.COLORS.reset}`);
            logger.info(`  ⛓️  Total Blockchain TXs: ${logger.COLORS.yellow}${totalTxs}${logger.COLORS.reset}`);
            logger.info(`  ⚠️  Total Errors: ${logger.COLORS.yellow}${totalErrors}${logger.COLORS.reset}`);

            const runtime = Math.floor((Date.now() - accountsStats[0].startTime) / 1000 / 60);
            logger.info(`\n  ⏱️  Total Runtime: ${logger.COLORS.cyan}${runtime} minutes${logger.COLORS.reset}`);
            logger.info(`${logger.COLORS.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${logger.COLORS.reset}`);

            // Wait for next cycle
            await countdownTimer(WAIT_HOURS);

        } catch (error) {
            logger.error(`❌ Critical error in main loop: ${error.message}`);
            logger.warn('⚠️ Attempting recovery in 5 minutes...');
            await sleep(300000);
        }
    }
}

process.on('SIGINT', () => {
    logger.separator();
    logger.banner('🚨 SHUTDOWN INITIATED', logger.COLORS.yellow);
    logger.info('Saving session data...');
    
    logger.info('\n📊 Final Statistics:');
    for (let i = 0; i < PRIVATE_KEYS.length; i++) {
        if (accountsStats[i]) {
            logger.info(`Account #${i + 1}: ${accountsStats[i].agents} agents, ${accountsStats[i].requests} requests, ${accountsStats[i].txs} txs, ${accountsStats[i].errors} errors`);
        }
    }
    
    logger.success('\n👋 Bot stopped gracefully. Goodbye!');
    process.exit(0);
});

main().catch(error => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
});
