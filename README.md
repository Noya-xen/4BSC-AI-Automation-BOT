# 4BSC AI Automation (Sequential Multi-Account)

![alt text](image.png)

Automates the daily 4BSC AI tasks with **sequential multi-account processing**: processes accounts one by one, skips on errors, and continues to the next account automatically.

## Features ✨

- ✅ **Sequential Processing** - One account at a time, no parallel execution
- ✅ **Auto-Skip on Error** - Failed accounts are skipped automatically
- ✅ **Multi-Account Support** - Run unlimited wallets
- ✅ **Smart Error Handling** - Continues to next account on any failure
- ✅ **Automated Daily Tasks** - Agent & Request creation
- ✅ **Blockchain Integration** - Auto-register on BSC
- ✅ **AI-Powered Generation** - Smart agent/request creation
- ✅ **Comprehensive Stats** - Track all accounts performance

## No account?

- Register 4bsc ai [https://4bsc.ai/final-run?invite_by=qUoMOQ) (use new wallet for each account).

## Quick Start

```bash
git clone https://github.com/WongFadhil/4bscaiBot.git
cd 4bscaiBot
npm install
```

## Configuration

### 1. Copy environment file:
```bash
cp .env-example .env
nano .env
```

### 2. Setup your `.env` file (Format Khusus):

```env
PRIVATE_KEY=0x
PRIVATE_KEY=0x
PRIVATE_KEY=0x
API_KEY=sk_h
```

**Format Rules:**
- ✅ Setiap akun menggunakan baris `PRIVATE_KEY=` sendiri (tanpa angka)
- ✅ Private key harus dimulai dengan `0x`
- ✅ Private key harus valid (bukan kosong)
- ✅ Satu API_KEY untuk semua akun
- ✅ Bot akan otomatis membaca semua `PRIVATE_KEY=` dari file

### 3. Run the bot:
```bash
npm run start
```

## How It Works (Sequential Processing)

### Cycle Flow:
```
Cycle 1:
  ├─ Process Account #1 ✅
  │   ├─ Authenticate
  │   ├─ Check tasks
  │   ├─ Create agent/request
  │   └─ Update stats
  ├─ Wait 3 seconds
  ├─ Process Account #2 ✅
  │   └─ (same steps)
  ├─ Wait 3 seconds
  └─ Process Account #3 ✅
      └─ (same steps)
  
Show Summary → Wait 12 hours → Repeat
```

### Error Handling:
- ❌ **Account fails?** → Skip immediately, continue to next
- ❌ **Authentication fails?** → Skip account, try again next cycle
- ❌ **Task creation fails?** → Log error, continue to next account
- ✅ **No blocking** → One account never blocks others

## What It Does Per Account

1. ✅ **Authentication** - Login with private key
2. ✅ **Token Check** - Validate or refresh if expired
3. ✅ **Daily Tasks** - Check available tasks
4. ✅ **Agent Creation** - Generate and register agent (if available)
5. ✅ **Request Creation** - Generate and register request (if available)
6. ✅ **Blockchain TX** - Record on BSC smart contract
7. ✅ **Stats Update** - Fetch points, days, etc.
8. ✅ **Move to Next** - Process next account immediately

## Example Output

```
🔄 CYCLE 1 - SEQUENTIAL PROCESSING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

>>> Starting Account #1...

🔐 AUTHENTICATION - ACCOUNT #1
💰 Wallet Address: 0xabc123...
✅ Login successful!

🚀 STARTING DAILY TASK - ACCOUNT #1
🤖 Agent task available - proceeding...
✅ Agent created with ID: 12345
⛓️ Transaction successful!
📋 Request task available - proceeding...
✅ Request created with ID: 67890
⛓️ Transaction successful!

✅ ACCOUNT #1 COMPLETED

⏳ Waiting 3 seconds before next account...

>>> Starting Account #2...

🔐 AUTHENTICATION - ACCOUNT #2
❌ Account #2 authentication failed - SKIPPING

⏳ Waiting 3 seconds before next account...

>>> Starting Account #3...
[... continues ...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ALL ACCOUNTS SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Account #1:
  UID: qUqMOQ
  Points: 795
  Agents: 1
  Requests: 1
  Errors: 0

Account #2:
  UID: N/A
  Points: 0
  Errors: 1

Account #3:
  UID: xYz789
  Points: 450
  Agents: 1
  Requests: 0
  Errors: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                 TOTAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🏆 Total Points: 1245
  🤖 Total Agents: 2
  📋 Total Requests: 1
  ⛓️  Total TXs: 3
  ⚠️  Total Errors: 1
  ⏱️  Total Runtime: 45 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ Next task check in 12 hours
```

## Safety Features

- ✅ **Auto-Skip** - Failed accounts don't block others
- ✅ **3-Second Delay** - Prevents rate limiting
- ✅ **Token Refresh** - Auto re-authenticate if expired
- ✅ **Error Logging** - Track all issues per account
- ✅ **Graceful Shutdown** - Ctrl+C shows final stats

## Troubleshooting

### Problem: "No valid private keys found"
**Solution:** Check your .env format:
```env
PRIVATE_KEY=0x...  ✅ Correct
PRIVATE_KEY_1=0x... ❌ Wrong
PRIVATE_KEYS=0x... ❌ Wrong
```

### Problem: Account keeps failing
**Solution:** 
- Bot will automatically skip and continue
- Check wallet has BNB for gas
- Verify private key is correct
- Check wallet is registered on 4bsc.ai

### Problem: All accounts skipped
**Solution:**
- Check internet connection
- Verify API endpoint is accessible
- Check .env file has valid keys

## Stopping the Bot

Press `Ctrl+C` to stop. Bot will display:
- Final statistics for all accounts
- Total agents/requests created
- Total errors encountered

## Notes

- ⚡ Sequential = One at a time, safer for API rate limits
- 🔄 Failed accounts retry on next cycle
- ⏱️ 3-second delay between accounts
- 🛡️ No account blocks others
- 📊 Individual stats per account

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Copyright © 2026 ZLKCYBER**

**Modified Noya-xen by Claude AI for sequential multi-account processing**
