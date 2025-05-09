const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock, GoalNear } } = require('mineflayer-pathfinder');
const mcData = require('minecraft-data');
const config = require('./settings.json');
const express = require('express');

const app = express();  

app.get('/', (req, res) => {
  res.send('Bot has arrived');
});

app.listen(8000, () => {
  console.log('Server started');
});

function createBot() {
   const bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
   });

   bot.loadPlugin(pathfinder);
   const defaultMove = new Movements(bot, mcData(bot.version));
   bot.settings.colorsEnabled = false;

   let pendingPromise = Promise.resolve();
   let commandPrefix = '!';
   let commandCooldowns = new Map(); // Track command attempts for punishment
   let isNightSleepEnabled = true;  // Enable night sleep behavior

   // Whitelist configuration
   const whitelistedUsers = {
      'PIXELxARYAN': {
         allowedCommands: ['restart', 'status', 'help'],
         maxCommandsPerMinute: 5,
         lastCommands: []
      }
   };

   // Function to check whitelist permissions
   function checkWhitelist(username, command) {
      if (whitelistedUsers[username]) {
         const user = whitelistedUsers[username];
         const now = Date.now();
         
         // Clean up old commands (older than 1 minute)
         user.lastCommands = user.lastCommands.filter(time => now - time < 60000);
         
         // Check command frequency
         if (user.lastCommands.length >= user.maxCommandsPerMinute) {
            bot.chat(`🕊️ ${username}, please wait before using more commands. Even the favored must show patience.`);
            return false;
         }

         // Check if command is allowed
         if (user.allowedCommands.includes(command)) {
            user.lastCommands.push(now);
            return true;
         }
      }
      return false;
   }

   // List of forbidden command patterns that indicate cheating or advantages
   const forbiddenPatterns = [
      /^\/give/i,
      /^\/gamemode c(reative)?/i,  // Detect creative mode changes
      /^\/effect/i,
      /^\/tp/i,
      /^\/teleport/i,
      /^\/xp/i,
      /^\/experience/i,
      /^\/enchant/i,
      /^\/item/i,
      /^\/op/i,
      /^\/deop/i,
      /^\/weather/i,
      /^\/time/i,
      /^\/kill/i,
      /^\/ban/i,
      /^\/pardon/i,
      /^\/kick/i,
      /^\/gamerule/i,
      /^\/setblock/i,
      /^\/fill/i,
      /^\/clone/i,
      /^\/summon/i,
      /^\/difficulty/i,
      /^\/worldborder/i,
      /@[pears]/i  // Catches @p, @e, @a, @r, @s selectors
   ];

   // Track operator abuse patterns
   const opAbuseCount = new Map();
   const ABUSE_THRESHOLD = 3; // Number of op commands within timeframe to trigger punishment
   const ABUSE_TIMEFRAME = 60000; // 1 minute in milliseconds

   // Enhanced punishment function with divine retribution
   async function punishPlayer(username, offense) {
      if (!commandCooldowns.has(username)) {
         commandCooldowns.set(username, { count: 0, lastAttempt: Date.now() });
      }

      const userData = commandCooldowns.get(username);
      const now = Date.now();

      // Reset count if last attempt was more than 5 minutes ago
      if (now - userData.lastAttempt > 300000) {
         userData.count = 0;
      }

      userData.count++;
      userData.lastAttempt = now;      // Special harsh punishment for creative mode attempts
      if (offense === 'creative_mode') {
         // First force them back to survival
         bot.chat(`/gamemode survival ${username}`);
         
         // Strike them with lightning
         bot.chat(`/execute at ${username} run summon lightning_bolt`);
         
         // Apply severe effects
         bot.chat(`/effect give ${username} minecraft:blindness 120 1`);
         bot.chat(`/effect give ${username} minecraft:mining_fatigue 120 3`);
         bot.chat(`/effect give ${username} minecraft:weakness 120 2`);
         bot.chat(`/effect give ${username} minecraft:slowness 120 2`);
         bot.chat(`/effect give ${username} minecraft:levitation 10 1`);
         
         // Kill them after levitation
         setTimeout(() => {
            bot.chat(`/kill ${username}`);
         }, 3000);
         
         // Visual and sound effects
         bot.chat(`/execute at ${username} run particle minecraft:explosion_emitter ~ ~ ~ 0 0 0 1 10`);
         bot.chat(`/execute at ${username} run playsound minecraft:entity.wither.spawn master @a ~ ~ ~ 1 0.5`);
         
         // Dramatic messages
         bot.chat(`⚡🔥 ${username} HAS BEEN STRUCK DOWN FOR THEIR HUBRIS!`);
         bot.chat(`/title ${username} title {"text":"🔥 Divine Punishment","color":"dark_red"}`);
         bot.chat(`/title ${username} subtitle {"text":"Creative Mode is Forbidden!","color":"red"}`);
         bot.chat(`/tellraw @a {"text":"Let this be a warning to all who dare seek creative powers!","color":"gold"}`);
         
         return;
      }

      // Divine punishments with special treatment for operators
      switch(userData.count) {
         case 1:
            bot.chat(`⚡ ${username} has angered the divine order! Even those with power must show restraint!`);
            bot.chat(`/effect give ${username} minecraft:blindness 30 1`);
            bot.chat(`/effect give ${username} minecraft:slowness 30 2`);
            bot.chat(`/weather thunder`);
            bot.chat(`/title ${username} title {"text":"⚠️ Divine Warning","color":"red"}`);
            break;
         case 2:
            bot.chat(`🌩️ ${username} continues to abuse their powers! Hubris will be your downfall!`);
            bot.chat(`/effect give ${username} minecraft:blindness 60 2`);
            bot.chat(`/effect give ${username} minecraft:mining_fatigue 60 3`);
            bot.chat(`/effect give ${username} minecraft:weakness 60 2`);
            bot.chat(`/tp ${username} ~ ~100 ~`);
            bot.chat(`/title ${username} title {"text":"🌋 Divine Punishment","color":"dark_red"}`);
            break;
         case 3:
            bot.chat(`⚔️ ${username}'s corruption knows no bounds! Face divine judgment!`);
            bot.chat(`/summon lightning_bolt ~ ~ ~`);
            bot.chat(`/effect give ${username} minecraft:levitation 15 1`);
            bot.chat(`/effect give ${username} minecraft:glowing 120 1`);
            bot.chat(`/time set midnight`);
            bot.chat(`/deop ${username}`);
            bot.chat(`/title ${username} title {"text":"👑 Power Corrupts","color":"dark_purple"}`);
            break;
         default:
            bot.chat(`💀 ${username} has fallen from grace! Let this be a lesson to all who would abuse their power!`);
            bot.chat(`/deop ${username}`);
            bot.chat(`/kill ${username}`);
            bot.chat(`/gamemode spectator ${username}`);
            bot.chat(`/effect give ${username} minecraft:blindness 300 1`);
            bot.chat(`/title ${username} title {"text":"🔥 Cast Down from Heaven","color":"dark_red"}`);
            bot.chat(`The divine order has been restored. Let ${username}'s fate be a warning to all.`);
      }
   }

   // Function to find nearest bed
   async function findBed() {
      const bed = bot.findBlock({
         matching: block => {
            return block.name.toLowerCase().includes('bed');
         },
         maxDistance: 32
      });
      return bed;
   }

   // Function to clear hostile mobs near the bed
   async function clearHostileMobs() {
      const SAFE_RADIUS = 16; // Radius to clear mobs (in blocks)
      const HOSTILE_MOBS = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch', 'phantom'];
      let mobsFound = false;

      // Find all entities near the bot
      const nearbyEntities = Object.values(bot.entities).filter(entity => {
         if (!entity) return false;
         const distance = bot.entity.position.distanceTo(entity.position);
         return HOSTILE_MOBS.includes(entity.name) && distance <= SAFE_RADIUS;
      });

      if (nearbyEntities.length > 0) {
         mobsFound = true;
         bot.chat("🗡️ Hostile mobs are preventing sleep. Divine cleansing initiated!");
         
         // Kill each hostile mob with divine power
         for (const mob of nearbyEntities) {
            bot.chat(`/kill ${mob.uuid}`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between kills
         }

         bot.chat(`✨ Area cleansed of ${nearbyEntities.length} hostile creatures. Sleep shall be peaceful now.`);
      }

      return mobsFound;
   }

   // Enhanced sleep function with mob clearing
   async function goToSleep() {
      try {
         const bed = await findBed();
         if (!bed) {
            bot.chat("I can't find a bed nearby!");
            return;
         }

         // Move to the bed
         await bot.pathfinder.setGoal(new GoalNear(bed.position.x, bed.position.y, bed.position.z, 1));
         
         // Try to sleep
         try {
            await bot.sleep(bed);
            bot.chat("💤 Sweet dreams everyone!");
         } catch (sleepError) {
            // If sleep fails, check for and clear hostile mobs
            console.log("Sleep failed, checking for hostile mobs...");
            const clearedMobs = await clearHostileMobs();
            
            if (clearedMobs) {
               // Try sleeping again after clearing mobs
               setTimeout(async () => {
                  try {
                     await bot.sleep(bed);
                     bot.chat("💤 Now I can rest peacefully.");
                  } catch (retryError) {
                     bot.chat("😔 Still cannot sleep, perhaps there are other disturbances.");
                  }
               }, 1000);
            } else {
               bot.chat("Cannot sleep, but no hostile mobs are nearby. Must be something else.");
            }
         }
      } catch (err) {
         console.log("Failed to sleep:", err);
         bot.chat("I couldn't get to sleep 😴");
      }
   }   // Enhanced command monitoring
   bot.on('chat', async (username, message) => {
      if (username === bot.username) return;

      // Listen for creative mode messages in chat
      if (message.includes('changed game mode') && message.toLowerCase().includes('creative')) {
         const playerMatch = message.match(/for (.+)/) || message.match(/^(\w+)'s/);
         if (playerMatch) {
            const targetPlayer = playerMatch[1];
            console.log(`[Divine Justice] Creative mode detected for player: ${targetPlayer}`);
            bot.chat(`🌩️ DIVINE WRATH DESCENDS UPON ${targetPlayer} FOR USING CREATIVE MODE!`);
            punishPlayer(targetPlayer, 'creative_mode');
         }
         return;
      }
      
      // Also catch direct creative mode commands
      if (message.match(/^\/?gamemode\s+(?:1|c|creative)/i) || message.match(/^\/gm\s*(?:1|c)/i)) {
         console.log(`[Divine Justice] Creative mode attempt by ${username}: ${message}`);
         bot.chat(`🔱 ${username} attempts to gain creative powers! UNACCEPTABLE!`);
         punishPlayer(username, 'creative_mode');
         return;
      }

      if (message.startsWith(commandPrefix)) {
         const args = message.slice(commandPrefix.length).trim().split(/ +/);
         const command = args.shift().toLowerCase();

         // Check whitelist first
         if (checkWhitelist(username, command)) {
            console.log(`[Whitelist] Allowed command by ${username}: ${command}`);
            
            switch(command) {
               case 'restart':
                  bot.chat(`✨ As you wish, ${username}. I shall return anew.`);
                  bot.quit('Restart requested by whitelisted user');
                  break;
               
               case 'help':
                  bot.chat(`Available commands for ${username}: ${whitelistedUsers[username].allowedCommands.join(', ')}`);
                  break;
               
               case 'status':
                  const pos = bot.entity.position;
                  bot.chat(`Current status - Health: ${bot.health}, Position: ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`);
                  break;
            }
            return;
         }

         // For non-whitelisted commands, proceed with punishment
         console.log(`[Divine Justice] Command attempt by ${username}: ${message}`);
         bot.chat(`🤖 No mortal may command the divine, regardless of their status!`);
         punishPlayer(username, message);
         return; // Added return to prevent duplicate punishment
      }

      // Track operator command usage frequency
      if (message.startsWith('/')) {
         if (!opAbuseCount.has(username)) {
            opAbuseCount.set(username, { commands: [], lastReset: Date.now() });
         }

         const userData = opAbuseCount.get(username);
         const now = Date.now();

         // Reset tracking if timeframe has passed
         if (now - userData.lastReset > ABUSE_TIMEFRAME) {
            userData.commands = [];
            userData.lastReset = now;
         }

         userData.commands.push(now);

         // Check for rapid command usage
         if (userData.commands.length >= ABUSE_THRESHOLD) {
            bot.chat(`⚠️ ${username} is issuing commands too rapidly! The gods grow angry!`);
            punishPlayer(username, 'rapid_commands');
            userData.commands = []; // Reset after punishment
            return; // Added return to prevent further processing
         }

         // Check for forbidden commands
         const isForbidden = forbiddenPatterns.some(pattern => pattern.test(message));
         
         if (isForbidden) {
            console.log(`[Divine Justice] Command violation by ${username}: ${message}`);
            bot.chat(`🔱 Even with authority, ${username} must respect divine law!`);
            punishPlayer(username, message);
            return;
         }
      }
   });

   // Handle time changes for night detection
   bot.on('time', () => {
      if (isNightSleepEnabled && bot.time.timeOfDay >= 12541 && bot.time.timeOfDay <= 23458) { // Night time in Minecraft
         // Check if any player is sleeping
         let playerSleeping = false;
         for (const playerName in bot.players) {
            const player = bot.players[playerName];
            if (player.entity && player.entity.sleeping) {
               playerSleeping = true;
               break;
            }
         }
         
         if (playerSleeping) {
            goToSleep();
         }
      }
   });

   // Track sleeping players with enhanced bed finding
   let sleepingPlayers = new Set();
   
   bot.on('entitySleep', (entity) => {
      if (entity.type === 'player' && entity.username !== bot.username) {
         sleepingPlayers.add(entity.username);
         const count = sleepingPlayers.size;
         const total = Object.keys(bot.players).length - 1; // Exclude bot
         bot.chat(`${entity.username} is now sleeping. (${count}/${total} players sleeping)`);
         goToSleep(); // Try to sleep when others sleep
      }
   });

   bot.on('entityWake', (entity) => {
      if (entity.type === 'player' && entity.username !== bot.username) {
         sleepingPlayers.delete(entity.username);
      }
   });

   // Sleep detection with enhanced bot response
   bot.on('sleep', () => {
      bot.chat(`💤 Sweet dreams everyone! I've joined in the slumber.`);
   });

   // Enhanced wake behavior
   bot.on('wake', () => {
      bot.chat('Good morning everyone! That was a nice rest. 🌅');
   });

   function sendRegister(password) {
      return new Promise((resolve, reject) => {
         bot.chat(`/register ${password} ${password}`);
         console.log(`[Auth] Sent /register command.`);

         // Create a timeout in case no response is received
         const timeoutId = setTimeout(() => {
            reject('Registration timeout - no response received');
         }, 10000);

         const messageHandler = (username, message) => {
            console.log(`[ChatLog] <${username}> ${message}`); // Log all chat messages

            // Check for various possible responses
            if (message.includes('successfully registered') || message.includes('already registered')) {
               clearTimeout(timeoutId);
               bot.removeListener('message', messageHandler);
               console.log('[INFO] Registration confirmed or already registered.');
               resolve();
            } else if (message.includes('Invalid command') || message.includes('failed')) {
               clearTimeout(timeoutId);
               bot.removeListener('message', messageHandler);
               reject(`Registration failed: Message: "${message}"`);
            }
         };

         // Listen for any chat message
         bot.on('message', messageHandler);
      });
   }

   function sendLogin(password) {
      return new Promise((resolve, reject) => {
         bot.chat(`/login ${password}`);
         console.log(`[Auth] Sent /login command.`);

         // Create a timeout in case no response is received
         const timeoutId = setTimeout(() => {
            reject('Login timeout - no response received');
         }, 10000);

         const messageHandler = (username, message) => {
            console.log(`[ChatLog] <${username}> ${message}`); // Log all chat messages

            if (message.includes('successfully logged in') || message.includes('already logged in')) {
               clearTimeout(timeoutId);
               bot.removeListener('message', messageHandler);
               console.log('[INFO] Login successful or already logged in.');
               resolve();
            } else if (message.includes('Invalid password') || message.includes('not registered') || message.includes('failed')) {
               clearTimeout(timeoutId);
               bot.removeListener('message', messageHandler);
               reject(`Login failed: Message: "${message}"`);
            }
         };

         // Listen for any chat message
         bot.on('message', messageHandler);
      });
   }

   bot.once('spawn', () => {
      console.log('\x1b[33m[AfkBot] Bot joined the server', '\x1b[0m');
      bot.chat('Bot is now online! Use !help to see available commands.');

      if (config.utils['auto-auth'].enabled) {
         console.log('[INFO] Started auto-auth module');

         const password = config.utils['auto-auth'].password;

         pendingPromise = pendingPromise
            .then(() => sendRegister(password))
            .then(() => sendLogin(password))
            .catch(error => console.error('[ERROR]', error));
      }

      if (config.utils['chat-messages'].enabled) {
         console.log('[INFO] Started chat-messages module');
         const messages = config.utils['chat-messages']['messages'];

         if (config.utils['chat-messages'].repeat) {
            const delay = config.utils['chat-messages']['repeat-delay'];
            let i = 0;

            let msg_timer = setInterval(() => {
               bot.chat(`${messages[i]}`);

               if (i + 1 === messages.length) {
                  i = 0;
               } else {
                  i++;
               }
            }, delay * 1000);
         } else {
            messages.forEach((msg) => {
               bot.chat(msg);
            });
         }
      }

      const pos = config.position;

      if (config.position.enabled) {
         console.log(
            `\x1b[32m[Afk Bot] Starting to move to target location (${pos.x}, ${pos.y}, ${pos.z})\x1b[0m`
         );
         bot.pathfinder.setMovements(defaultMove);
         bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z));
      }

      if (config.utils['anti-afk'].enabled) {
         bot.setControlState('jump', true);
         if (config.utils['anti-afk'].sneak) {
            bot.setControlState('sneak', true);
         }
      }
   });

   bot.on('goal_reached', () => {
      console.log(
         `\x1b[32m[AfkBot] Bot arrived at the target location. ${bot.entity.position}\x1b[0m`
      );
   });

   bot.on('death', () => {
      console.log(
         `\x1b[33m[AfkBot] Bot has died and was respawned at ${bot.entity.position}`,
         '\x1b[0m'
      );
   });

   if (config.utils['auto-reconnect']) {
      bot.on('end', () => {
         setTimeout(() => {
            createBot();
         }, config.utils['auto-reconnect-delay'] || 5000); // Fixed typo in property name
      });
   }

   bot.on('kicked', (reason) =>
      console.log(
         '\x1b[33m',
         `[AfkBot] Bot was kicked from the server. Reason: \n${reason}`,
         '\x1b[0m'
      )
   );

   bot.on('error', (err) =>
      console.log(`\x1b[31m[ERROR] ${err.message}`, '\x1b[0m')
   );
}

createBot();