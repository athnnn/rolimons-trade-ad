const { Client, Intents } = require('discord.js');
const discordClient = new Client({ 
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] 
});

const dotenv = require('dotenv');
dotenv.config();
const app = require("express")();
app.use(require("body-parser").json());
const fetch = require("node-fetch");
const fs = require('fs');

// Load config
let config = require('./config.json');

// Discord Bot Setup
discordClient.on('ready', () => {
  console.log(`Logged in as ${discordClient.user.tag}!`);
});

discordClient.on('messageCreate', async (message) => {
  if (message.author.id !== process.env.DISCORD_USER_ID) return; // Restrict to your account

  // Update items to send
  if (message.content.startsWith('!add')) {
    const items = message.content.split(' ').slice(1).map(Number);
    config.manualItems = [...new Set([...config.manualItems, ...items])]; // Avoid duplicates
    saveConfig();
    message.reply(`✅ Added items: ${items.join(', ')}. Current items: ${config.manualItems.join(', ')}`);
  }

  // Update requested tags
  if (message.content.startsWith('!request')) {
    const tags = message.content.split(' ').slice(1);
    config.requestTags = [...new Set([...config.requestTags, ...tags])];
    saveConfig();
    message.reply(`✅ Requesting: ${tags.join(', ')}. Current tags: ${config.requestTags.join(', ')}`);
  }

  // Reset config to default
  if (message.content.startsWith('!reset')) {
    config.manualItems = [];
    config.requestTags = [];
    saveConfig();
    message.reply('✅ Reset items and tags to default.');
  }
});

function saveConfig() {
  fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
}

discordClient.login(process.env.DISCORD_BOT_TOKEN);

// Existing Rolimons Ad-Poster Code (unchanged)
const rolimonsToken = process.env.token;
const robloxId = process.env.robloxId;

let itemValues = {};
let playerInv = {};
let onHold = [];

async function getValues() { /* ... Keep your existing code here ... */ }
async function getInv() { /* ... Keep your existing code here ... */ }
function generateAd() { /* ... Keep your existing code here ... */ }
async function postAd(sending) { /* ... Keep your existing code here ... */ }

app.get("/", (req, res) => {
  res.json({ message: 'Trade ad bot is up and running!' });
});

app.listen(8080);
getValues(); // Start the ad-poster loop
