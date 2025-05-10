const { Client } = require('aternos');
const mineflayer = require('mineflayer');
const fs = require('fs');

// ========= CONFIG ========= //
const config = {
  aternos: {
    username: 'official.exeiv@gmail.com',
    password: 'exeiv@123',
     // Find in Aternos server URL: https://aternos.org/server/ABC123/
  },
  minecraft: {
    host: 'Roilexboi.aternos.me',
    port: 20461,
    version: '1.21.5', // Minecraft version
    botUsername: 'DivineJudge',
    botPassword: 'bot_account_password' // If premium
  },
  punishments: {
    creativeMode: {
      message: '⚡ You dare use creative mode? Face divine wrath!',
      commands: [
        '/gamemode survival {player}',
        '/effect give {player} blindness 30 2',
        '/summon lightning_bolt ~ ~ ~',
        '/kick {player} Creative mode is forbidden!'
      ]
    },
    commandAbuse: {
      message: '🔱 Abusing commands? You shall be judged!',
      commands: [
        '/deop {player}',
        '/effect give {player} mining_fatigue 60 3',
        '/title {player} title {"text":"⚠️ Command Abuse","color":"red"}'
      ]
    }
  }
};

// ========= SETUP ========= //
const atClient = new Client({
  username: config.aternos.username,
  password: config.aternos.password,
  server: config.aternos.serverId
});

// Mineflayer bot instance
let mcBot;
let isServerOnline = false;

// Track punished players (persist to file)
let punishmentLog = {};
const LOG_FILE = './punishments.json';

// Load previous punishments
if (fs.existsSync(LOG_FILE)) {
  punishmentLog = JSON.parse(fs.readFileSync(LOG_FILE));
}

// ========= FUNCTIONS ========= //
function logPunishment(player, offense) {
  if (!punishmentLog[player]) punishmentLog[player] = [];
  punishmentLog[player].push({
    offense,
    timestamp: Date.now()
  });
  fs.writeFileSync(LOG_FILE, JSON.stringify(punishmentLog));
}

async function startMinecraftBot() {
  mcBot = mineflayer.createBot({
    host: config.minecraft.host,
    port: config.minecraft.port,
    username: config.minecraft.botUsername,
    password: config.minecraft.botPassword,
    version: config.minecraft.version
  });

  mcBot.on('chat', (username, message) => {
    if (username === mcBot.username) return;
    console.log(`[MC Chat] <${username}> ${message}`);
  });

  mcBot.on('kicked', console.error);
  mcBot.on('error', console.error);
  mcBot.on('end', () => {
    console.log('[MC Bot] Disconnected. Reconnecting...');
    setTimeout(startMinecraftBot, 10000);
  });

  mcBot.on('login', () => {
    console.log('[MC Bot] Connected to server!');
    mcBot.chat('/login ' + config.minecraft.botPassword); // For cracked servers
  });
}

async function handleAternosConsole(line) {
  console.log(`[Aternos Console] ${line}`);

  // Detect creative mode activation
  if (line.includes('set own game mode to Creative Mode')) {
    const player = line.match(/(\w+) set own game mode/)?.[1];
    if (player && !punishmentLog[player]?.includes('creative')) {
      console.log(`⚡ Punishing ${player} for creative mode!`);
      executePunishment(player, 'creativeMode');
      logPunishment(player, 'creative');
    }
  }

  // Detect command abuse (e.g., /give, /op)
  if (line.includes('issued server command')) {
    const [match, player, command] = line.match(/(\w+) issued server command: \/(\w+)/) || [];
    if (command && ['give', 'op', 'ban', 'gamemode'].includes(command)) {
      console.log(`🔱 ${player} abused command: /${command}`);
      executePunishment(player, 'commandAbuse');
      logPunishment(player, `command_${command}`);
    }
  }
}

function executePunishment(player, type) {
  const punishment = config.punishments[type];
  if (!punishment) return;

  mcBot.chat(`/say ${punishment.message.replace('{player}', player)}`);
  
  punishment.commands.forEach(cmd => {
    mcBot.chat(cmd.replace(/{player}/g, player));
    console.log(`[Punish] Executed: ${cmd}`);
  });
}

// ========= MAIN ========== //
async function main() {
  try {
    // Start Aternos connection
    await atClient.start();
    console.log('[Aternos] Logged in successfully!');

    // Check server status
    const status = await atClient.getStatus();
    isServerOnline = status === 'online';

    if (!isServerOnline) {
      console.log('[Aternos] Starting server...');
      await atClient.startServer();
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
    }

    // Start Minecraft bot
    await startMinecraftBot();

    // Monitor Aternos console
    atClient.on('console', handleAternosConsole);
    
    // Keep checking server status
    setInterval(async () => {
      const newStatus = await atClient.getStatus();
      if (newStatus !== status) {
        console.log(`[Aternos] Server status changed to: ${newStatus}`);
        isServerOnline = newStatus === 'online';
      }
    }, 60000); // Check every minute

  } catch (err) {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
  }
}

main();