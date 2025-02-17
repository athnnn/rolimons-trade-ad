import discord
from discord.ext import commands
import requests
import json
import os

intents = discord.Intents.default()
bot = commands.Bot(command_prefix='/', intents=intents)

TOKEN = os.getenv('DISCORD_BOT_TOKEN')
ROLIMONS_TRADE_AD_URL = 'https://api.rolimons.com/tradeads/v1/createad'
ROLIMONS_API_KEY = os.getenv('ROLIMONS_API_KEY')
ROBLOX_ID = os.getenv('ROBLOX_USER_ID')

# Load configuration
with open('config.json') as f:
    config = json.load(f)

# Command to add items
@bot.slash_command(name="add_item", description="Add an item to the trade ad list")
async def add_item(ctx, item_id: int):
    if item_id not in config['manualItems']:
        config['manualItems'].append(item_id)
        save_config()
        await ctx.respond(f'Item {item_id} added successfully!')
    else:
        await ctx.respond(f'Item {item_id} is already in the list.')

# Command to remove items
@bot.slash_command(name="remove_item", description="Remove an item from the trade ad list")
async def remove_item(ctx, item_id: int):
    if item_id in config['manualItems']:
        config['manualItems'].remove(item_id)
        save_config()
        await ctx.respond(f'Item {item_id} removed successfully!')
    else:
        await ctx.respond(f'Item {item_id} not found!')

# Command to list current items
@bot.slash_command(name="list_items", description="List current items in the trade ad list")
async def list_items(ctx):
    if config['manualItems']:
        await ctx.respond(f'Current items: {", ".join(map(str, config["manualItems"]))}')
    else:
        await ctx.respond('No items currently in the list.')

# Save configuration to file
def save_config():
    with open('config.json', 'w') as f:
        json.dump(config, f, indent=4)

# Function to get item values
def get_item_values():
    response = requests.get('https://api.rolimons.com/items/v1/itemdetails')
    response.raise_for_status()
    items = response.json().get('items', {})
    return {item_id: details[4] for item_id, details in items.items()}

# Function to post the trade ad
def post_trade_ad():
    item_values = get_item_values()
    offer_item_ids = config['manualItems']
    offer_robux = 10000  # Set the amount of Robux you want to offer
    
    reqBody = {
        "player_id": int(ROBLOX_ID),
        "offer_item_ids": offer_item_ids,
        "request_item_ids": [],
        "request_tags": config['requestTags'],
        "offer_robux": offer_robux
    }

    response = requests.post(ROLIMONS_TRADE_AD_URL, json=reqBody, headers={"Content-Type": "application/json", "cookie": ROLIMONS_API_KEY})
    response.raise_for_status()
    return response.json()

# Command to post trade ad
@bot.slash_command(name="post_ad", description="Post the trade ad")
async def post_ad(ctx):
    try:
        result = post_trade_ad()
        await ctx.respond(f'Trade ad posted successfully! Response: {result}')
    except requests.exceptions.RequestException as e:
        await ctx.respond(f'Failed to post trade ad: {e}')

bot.run(TOKEN)
