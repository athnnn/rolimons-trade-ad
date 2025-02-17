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

// Generate possible trade ads
function findValidPairs(items, min, max) {
  const validPairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const sum = items[i].value + items[j].value;
      if (sum > min && sum < max) {
        validPairs.push([items[i], items[j]]);
      }
    }
  }
  return validPairs;
}

// Decide what items to put in the ad
function generateAd() {
  let availableItems = [];
  for (const asset in playerInv) {
    for (const uaid of playerInv[asset]) {
      if (!onHold.includes(uaid) && itemValues[asset].value >= config.minItemValue && config.maxItemValue >= itemValues[asset].value && !config.sendBlacklist.includes(`${asset}`)) {
        availableItems.push(asset);
      }
    }
  }

  let sendingSideNum = Math.floor(Math.random() * (config.maxItemsSend - config.minItemsSend + 1)) + config.minItemsSend;
  let sendingSide = [];
  for (let i = 0; i < sendingSideNum; i++) {
    let item = availableItems[Math.floor(Math.random() * availableItems.length)];
    sendingSide.push(parseFloat(item));
    availableItems.splice(availableItems.indexOf(item), 1);
  }

  if (config.smartAlgo) {
    let receivingSide = [];
    let totalSendValue = 0;
    for (const item of sendingSide) {
      totalSendValue = totalSendValue + itemValues[item].value;
    }
    let upgOrDown = Math.floor(Math.random() * 2);
    if (upgOrDown == 1) {
      let requestValue = totalSendValue * (1 - config.RequestPercent / 100);
      let options = [];
      for (const item in itemValues) {
        if (itemValues[item].value >= requestValue && itemValues[item].value <= totalSendValue && itemValues[item].type >= config.minDemand && !sendingSide.includes(parseFloat(item))) {
          options.push(item);
        }
      }
      if (options.length >= 1) {
        let item = options[Math.floor(Math.random(options.length))];
        receivingSide.push(parseFloat(item));
        receivingSide.push("upgrade");
        receivingSide.push("adds");
        postAd(sendingSide, receivingSide);
      } else {
        receivingSide.push("adds");
        let itemIdValArr = [];
        for (const item in itemValues) {
          if (itemValues[item].type >= config.minDemand) {
            itemIdValArr.push({ id: item, value: itemValues[item].value });
          }
        }
        let validPairs = findValidPairs(itemIdValArr, totalSendValue * (1 - config.RequestPercent / 100), totalSendValue);
        if (validPairs.length > 0) {
          const randomPair = validPairs[Math.floor(Math.random() * validPairs.length)];
          const ids = randomPair.map(item => item.id);
          for (const id of ids) {
            receivingSide.push(parseFloat(id));
          }
          let maxRValue = 0, maxSValue = 0;
          for (const item of receivingSide) {
            if (typeof item === 'number' && parseFloat(itemValues[`${item}`].value) > maxRValue) {
              maxRValue = itemValues[`${item}`].value;
            }
          }
          for (const item of sendingSide) {
            if (typeof item === 'number' && parseFloat(itemValues[`${item}`].value) > maxSValue) {
              maxSValue = itemValues[`${item}`].value;
            }
          }
          if (maxSValue < maxRValue) {
            receivingSide.push("upgrade");
          } else {
            receivingSide.push("downgrade");
          }
          postAd(sendingSide, receivingSide);
        } else {
          generateAd();
        }
      }
    } else {
      receivingSide.push("adds");
      let itemIdValArr = [];
      for (const item in itemValues) {
        if (itemValues[item].type >= config.minDemand) {
          itemIdValArr.push({ id: item, value: itemValues[item].value });
        }
      }
      let validPairs = findValidPairs(itemIdValArr, totalSendValue * (1 - config.RequestPercent / 100), totalSendValue);
      if (validPairs.length > 0) {
        const randomPair = validPairs[Math.floor(Math.random() * validPairs.length)];
        const ids = randomPair.map(item => item.id);
        for (const id of ids) {
          receivingSide.push(parseFloat(id));
        }
        let maxRValue = 0, maxSValue = 0;
        for (const item of receivingSide) {
          if (typeof item === 'number' && parseFloat(itemValues[`${item}`].value) > maxRValue) {
            maxRValue = itemValues[`${item}`].value;
          }
        }
        for (const item of sendingSide) {
          if (typeof item === 'number' && parseFloat(itemValues[`${item}`].value) > maxSValue) {
            maxSValue = itemValues[`${item}`].value;
          }
        }
        if (maxSValue < maxRValue) {
          receivingSide.push("upgrade");
        } else {
          receivingSide.push("downgrade");
        }
        postAd(sendingSide, receivingSide);
      } else {
        generateAd();
      }
    }
  } else {
    // Adding manual item selection
    let manualItems = config.manualItems; // Add an array of manual items in your config.json
    postAd(sendingSide, manualItems);
  }
}

// Post the trade ad
async function postAd(sending, receiving) {
  let allRTags = [], allRIds = [];
  for (const tag of receiving) {
    if (typeof tag === "string") {
      allRTags.push(tag);
    } else if (typeof tag === "number") {
      allRIds.push(tag);
    }
  }

  let seenStrings = new Set();
  const result = allRTags.filter(item => {
    if (typeof item === 'string' && seenStrings.has(item)) {
      return false;
    }
    seenStrings.add(item);
    return true;
  });

  let reqBody = {
    "player_id": parseFloat(robloxId),
    "offer_item_ids": sending,
    "request_item_ids": allRIds,
    "request_tags": result
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
