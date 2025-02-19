const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();
const app = require("express")();
app.use(require("body-parser").json());
const fetch = require("node-fetch");
const fs = require('fs');

// Load config
let config = require('./config.json');
let playerInv = {}; //player current inv
let itemValues = {}; //item values. Format is "itemId": {"value": "5", "type": "3"}
let onHold = []; //items on hold

// Register slash commands
const commands = [
  {
    name: 'add',
    description: 'Add items to the list',
    options: [{
      name: 'item',
      type: 3, // STRING
      description: 'Item to add',
      required: true,
      autocomplete: true
    }]
  },
  {
    name: 'request',
    description: 'Request items by tags',
    options: [{
      name: 'tag',
      type: 3, // STRING
      description: 'Tag to request',
      required: true
    }]
  },
  {
    name: 'reset',
    description: 'Reset items and tags to default',
  },
  {
    name: 'status',
    description: 'Check the current configuration status',
  }
];

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error(error);
  }
})();

// Fetch item values from Rolimons
async function getValues() {
  await fetch(`https://api.rolimons.com/items/v1/itemdetails`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then((res) => res.json()).then((json) => {
    for (const item in json.items) {
      let type = json.items[item][5] >= 0 ? json.items[item][5] : 0;
      itemValues[item] = { value: Math.abs(json.items[item][4]), type: type }; //assigns the item values and demand
    }
    getInv();
  }).catch((err) => {
    console.log(err);
  });
}

// Fetch inventory from Rolimons
async function getInv() {
  await fetch(`https://api.rolimons.com/players/v1/playerassets/${process.env.ROBLOX_USER_ID}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    },
  }).then((res) => res.json()).then((json) => {
    playerInv = json.playerAssets; //gets the players inv
    onHold = json.holds; //assigns these items on hold
    generateAd();
  }).catch((err) => {
    console.log(err);
  });
}

// Get item names from inventory
async function getItemNames() {
  await getValues();
  const itemNames = [];
  for (const asset in playerInv) {
    itemNames.push(asset); // Assuming item names are the same as asset keys
  }
  return itemNames;
}

// Save configuration to file
function saveConfig() {
  fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

// Function to generate trade ads
function generateAd() {
  let availableItems = [];
  for (const asset in playerInv) {
    for (const uaid of playerInv[asset]) {
      if (!onHold.includes(uaid) && itemValues[asset].value >= config.minItemValue && config.maxItemValue >= itemValues[asset].value && !config.sendBlacklist.includes(`${asset}`)) {
        availableItems.push(asset);
      }
    }
  }
  // Remaining ad generation logic...
}

// Discord Bot Setup
const discordClient = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

discordClient.on('ready', () => {
  console.log(`Logged in as ${discordClient.user.tag}!`);
});

discordClient.on('interactionCreate', async interaction => {
  if (!interaction.isCommand() && !interaction.isAutocomplete()) return;

  if (interaction.isCommand()) {
    const { commandName, options } = interaction;

    if (commandName === 'add') {
      const item = options.getString('item');
      config.manualItems = [...new Set([...config.manualItems, item])]; // Avoid duplicates
      saveConfig();
      await interaction.reply(`✅ Added item: ${item}. Current items: ${config.manualItems.join(', ')}`);
    } else if (commandName === 'request') {
      const tag = options.getString('tag');
      config.requestTags = [...new Set([...config.requestTags, tag])];
      saveConfig();
      await interaction.reply(`✅ Requesting: ${tag}. Current tags: ${config.requestTags.join(', ')}`);
    } else if (commandName === 'reset') {
      config.manualItems = [];
      config.requestTags = [];
      saveConfig();
      await interaction.reply('✅ Reset items and tags to default.');
    } else if (commandName === 'status') {
      const statusMessage = `
        Player ID: ${process.env.DISCORD_USER_ID}
        Trade Cooldown (in minutes): ${config.tradeCooldown}
        Specific Ads Enabled: ${config.specificAdsEnabled ? 'Yes' : 'No'}
        Allow Missing Offer Items: ${config.allowMissingOfferItems ? 'Yes' : 'No'}
        Activity Status: ${config.activityStatus}
        Auto Ads Enabled: ${config.autoAdsEnabled ? 'Yes' : 'No'}
        General Trade Ad Configuration:
        \n
        Auto Trade Ads Configuration:
        Roblox User: ${config.robloxUser}
        Trade Type: ${config.tradeType}
        User Item Type: ${config.userItemType}
        Include On Hold: ${config.includeOnHold ? 'Yes' : 'No'}
        Min Value: ${config.minValue}
        Request Item Type: ${config.requestItemType}
        Min Demand: ${config.minDemand}
        \n
        Specific Trade Ads Configuration:
        Ad 1:
          offer_item_ids: ${config.ad1.offer_item_ids.join(', ')}
          request_item_ids: ${config.ad1.request_item_ids.join(', ')}
          request_tags: ${config.ad1.request_tags.join(', ')}
          offer_robux: ${config.ad1.offer_robux}
      `;
      await interaction.reply(statusMessage);
    }
  } else if (interaction.isAutocomplete()) {
    const focusedOption = interaction.options.getFocused(true);
    let choices = [];

    if (focusedOption.name === 'item') {
      const itemNames = await getItemNames();
      choices = itemNames.filter(item => item.toLowerCase().includes(focusedOption.value.toLowerCase()));
    }

    await interaction.respond(
      choices.map(choice => ({ name: choice, value: choice }))
    );
  }
});

discordClient.login(process.env.DISCORD_BOT_TOKEN);

// Existing Rolimons Ad-Poster Code (unchanged)
// ... (remaining ad-poster code here)

app.get("/", (req, res) => {
  res.json({ message: 'Trade ad bot is up and running!' });
});

app.listen(8080);
getValues(); // Start the ad-poster loop
