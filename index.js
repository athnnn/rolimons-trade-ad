require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const app = express();
const fetch = require('node-fetch');

// Discord Client Setup
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

discordClient.login(process.env.DISCORD_TOKEN);

// Existing Rolimons Configuration
const rolimonsToken = process.env.token;
const robloxId = process.env.robloxId;
const config = require('./config.json');

let itemValues = {};
let playerInv = {};
let onHold = [];

// Discord Command Handling
discordClient.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    if (interaction.commandName === 'manage-trade') {
      const action = interaction.options.getString('action');
      const item = interaction.options.getString('item');
      
      if (interaction.options.getSubcommandGroup() === 'request') {
        config.manualItems = processItemAction(config.manualItems, action, item);
        await interaction.reply({ 
          content: `${action === 'add' ? '✅ Added' : '❌ Removed'} item ${item}`,
          ephemeral: true 
        });
      }
    }

    if (interaction.commandName === 'post-trade') {
      generateAd();
      await interaction.reply('Trade ad posted!');
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({ 
      content: 'Error processing command', 
      ephemeral: true 
    });
  }
});

// Autocomplete Handler
discordClient.on('interactionCreate', async interaction => {
  if (!interaction.isAutocomplete()) return;

  const focused = interaction.options.getFocused(true);
  if (focused.name === 'item') {
    const filtered = Object.keys(itemValues)
      .filter(item => item.includes(focused.value))
      .slice(0, 25);
    await interaction.respond(
      filtered.map(item => ({ 
        name: `Item ${item} (${itemValues[item].value})`, 
        value: item 
      }))
    );
  }
});

// Existing Rolimons Functions (keep your original getValues, getInv, generateAd, postAd)
// Add this at the end of postAd():
async function postAd(sending) {
  // ... existing postAd code ...
  
  // Discord Notification
  const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('New Trade Posted')
        .addFields(
          { name: 'Offering', value: sending.join(', ') || 'None' },
          { name: 'Requesting', value: config.requestTags.join(', ') }
        )
        .setTimestamp()
    ]
  });
}

// Helper function
function processItemAction(array, action, item) {
  return action === 'add' 
    ? [...new Set([...array, item])] 
    : array.filter(i => i !== item);
}

// Keep existing express and interval code
app.use(express.json());
app.get('/', (req, res) => res.json({ status: 'active' }));
app.listen(8080);

// Initialize
getValues();
