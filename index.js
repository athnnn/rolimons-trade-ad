const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const fetch = require("node-fetch");

const app = express();
app.use(bodyParser.json());
dotenv.config();

const rolimonsToken = process.env.token;
const robloxId = process.env.robloxId;
const config = require("./config.json");

let itemValues = {};
let playerInv = {};
let onHold = {};

async function getValues() {
    await fetch(`https://api.rolimons.com/items/v1/itemdetails`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    })
    .then(res => res.json())
    .then(json => {
        for (const item in json.items) {
            let type = json.items[item][5] >= 0 ? json.items[item][5] : 0;
            itemValues[item] = { value: Math.abs(json.items[item][4]), type: type };
        }
        getInv();
    })
    .catch(err => console.log(err));
}

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
        playerInv = json.playerAssets;
        onHold = json.holds;
        generateAd();
    })
    .catch(err => console.log(err));
}

function generateAd() {
    let availableItems = [];
    for (const asset in playerInv) {
        for (const uaid of playerInv[asset]) {
            if (!onHold.includes(uaid) && itemValues[asset] && itemValues[asset].value >= config.minItemValue && config.maxItemValue >= itemValues[asset].value && !config.sendBlacklist.includes(`${asset}`)) {
                availableItems.push(asset);
            }
        }
    }

    let sendingSide = config.manualItems;
    postAd(sendingSide);
}

async function postAd(sending) {
    let allRTags = config.requestTags || [];

    let reqBody = {
        "player_id": parseFloat(robloxId),
        "offer_item_ids": sending,
        "request_item_ids": config.requestItems,
        "request_tags": allRTags,
        "offer_robux": config.offerRobux
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

getValues();

app.get("/", (req, res) => {
    res.json({ message: 'Trade ad bot is up and running!' });
});

app.post("/create-ad", (req, res) => {
    const { manualItems, requestItems, requestTags, offerRobux } = req.body;
    config.manualItems = manualItems;
    config.requestItems = requestItems;
    config.requestTags = requestTags;
    config.offerRobux = offerRobux;

    generateAd();
    res.status(200).json({ message: "Trade ad creation initiated" });
});

app.listen(8080);
