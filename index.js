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

// Configuration and State
const rolimonsToken = process.env.token;
const robloxId = process.env.robloxId;
const config = require('./config.json');
let itemValues = {};
let playerInv = {};
let onHold = [];

// 🔥 FIX 1: Define getValues before using it
async function getValues() {
  try {
    const response = await fetch('https://api.rolimons.com/items/v1/itemdetails');
    const data = await response.json();
    
    itemValues = Object.entries(data.items).reduce((acc, [itemId, itemData]) => {
      acc[itemId] = {
        value: Math.abs(itemData[4]),
        type: itemData[5] >= 0 ? itemData[5] : 0
      };
      return acc;
    }, {});
    
    await getInv();
  } catch (error) {
    console.error('Failed to fetch item values:', error);
  }
}

// 🔥 FIX 2: Define getInv
async function getInv() {
  try {
    const response = await fetch(`https://api.rolimons.com/players/v1/playerassets/${robloxId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Cookie': rolimonsToken
      }
    });
    
    const data = await response.json();
    playerInv = data.playerAssets;
    onHold = data.holds;
    
    generateAd();
  } catch (error) {
    console.error('Failed to fetch inventory:', error);
  }
}

// Keep existing Discord handlers and helper functions
// ... (your previous Discord command code remains unchanged) ...

// 🔥 FIX 3: Define generateAd
function generateAd() {
  const availableItems = Object.entries(playerInv).flatMap(([assetId, uaids]) => 
    uaids.filter(uaid => 
      !onHold.includes(uaid) &&
      itemValues[assetId]?.value >= config.minItemValue &&
      itemValues[assetId]?.value <= config.maxItemValue &&
      !config.sendBlacklist.includes(assetId)
    ).map(() => assetId)
  );
  
  postAd([...new Set([...config.manualItems, ...availableItems])]);
}

// 🔥 FIX 4: Define postAd
async function postAd(sending) {
  try {
    await fetch('https://api.rolimons.com/tradeads/v1/createad', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': rolimonsToken
      },
      body: JSON.stringify({
        player_id: robloxId,
        offer_item_ids: sending,
        request_item_ids: [],
        request_tags: config.requestTags
      })
    });

    // Discord notification
    const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
    channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Trade Posted')
          .addFields(
            { name: 'Offered Items', value: sending.join(', ') || 'None' },
            { name: 'Request Tags', value: config.requestTags.join(', ') }
          )
      ]
    });
    
    setTimeout(getValues, 1560000); // 26 minute cooldown
  } catch (error) {
    console.error('Failed to post trade:', error);
  }
}

// Initialize
app.listen(8080, () => {
  console.log('Server started');
  getValues(); // 🔥 FIX 5: Call after server starts
});
