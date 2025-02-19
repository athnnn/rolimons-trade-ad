var app = require("express")() // Hosting the API and putting it on uptimerobot
app.use(require("body-parser").json())

const dotenv = require('dotenv') // Reading secrets from env
dotenv.config()

const fetch = require("node-fetch");

const rolimonsToken = process.env.token // Rolimons verification token from environment
const robloxId = process.env.robloxId // Roblox verification token from environment
const config = require("./config.json"); // Your configuration

let itemValues = {}; // Item values. Format: "itemId": {"value": "5", "type": "3"}
let playerInv = {}; // Player current inventory
let onHold = []; // Items on hold

// Get item values from Rolimons
async function getValues() {
  await fetch(`https://api.rolimons.com/items/v1/itemdetails`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })
  .then(res => res.json())
  .then(json => {
    for (const item in json.items) {
      let type = json.items[item][5] >= 0 ? json.items[item][5] : 0;
      itemValues[item] = { value: Math.abs(json.items[item][4]), type: type }; // Assign item values and demand
    }
    getInv();
  })
  .catch(err => console.log(err));
}

// Get user inventory and see items on hold
async function getInv() {
  await fetch(`https://api.rolimons.com/players/v1/playerassets/${robloxId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
  })
  .then(res => res.json())
  .then(json => {
    playerInv = json.playerAssets; // Get player's inventory
    onHold = json.holds; // Assign items on hold
    generateAd();
  })
  .catch(err => console.log(err));
}

// Function to decide what items to put in the ad
function generateAd() {
  let availableItems = [];
  for (const asset in playerInv) {
    for (const uaid of playerInv[asset]) {
      if (!onHold.includes(uaid) && itemValues[asset] && itemValues[asset].value >= config.minItemValue && config.maxItemValue >= itemValues[asset].value && !config.sendBlacklist.includes(`${asset}`)) {
        availableItems.push(asset);
      }
    }
  }

  // Manually specified items
  let sendingSide = config.manualItems;

  // Post the ad
  postAd(sendingSide);
}

// Function to post the trade ad
async function postAd(sending) {
  let allRTags = config.requestTags || [];

  let reqBody = {
    "player_id": parseFloat(robloxId),
    "offer_item_ids": sending,
    "request_item_ids": [],
    "request_tags": allRTags
  };

  fetch(`https://api.rolimons.com/tradeads/v1/createad`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cookie": `${rolimonsToken}`
    },
    body: JSON.stringify(reqBody),
  })
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.log(err));

  setTimeout(() => { getValues(); }, 1560000);
}

getValues(); // Start the script from here

app.get("/", (req, res) => {
  res.json({ message: 'Trade ad bot is up and running!' });
})
app.listen(8080)
