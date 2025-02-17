import discord
from discord.ext import commands
import requests
import json
import os

intents = discord.Intents.default()
bot = commands.Bot(command_prefix='/', intents=intents)
tree = bot.tree

TOKEN = os.getenv('DISCORD_BOT_TOKEN')
ROLIMONS_TRADE_AD_URL = 'https://api.rolimons.com/tradeads/v1/createad'
ROLIMONS_API_KEY = os.getenv('ROLIMONS_API_KEY')
ROBLOX_ID = os.getenv('ROBLOX_USER_ID')

# Load configuration
with open('config.json') as f:
    config = json.load(f)

# Command to add items
@tree.command(name="add_item", description="Add an item to the trade ad list")
async def add_item(interaction: discord.Interaction, item_id: int):
    if item_id not in config['manualItems']:
        config['manualItems'].append(item_id)
        save_config()
        await interaction.response.send_message(f'Item {item_id} added successfully!')
    else:
        await interaction.response.send_message(f'Item {item_id} is already in the list.')

# Command to remove items
@tree.command(name="remove_item", description="Remove an item from the trade ad list")
async def remove_item(interaction: discord.Interaction, item_id: int):
    if item_id in config['manualItems']:
        config['manualItems'].remove(item_id)
        save_config()
        await interaction.response.send_message(f'Item {item_id} removed successfully!')
    else:
        await interaction.response.send_message(f'Item {item_id} not found!')

# Command to list current items
@tree.command(name="list_items", description="List current items in the trade ad list")
async def list_items(interaction: discord.Interaction):
    if config['manualItems']:
        await interaction.response.send_message(f'Current items: {", ".join(map(str, config["manualItems"]))}')
    else:
        await interaction.response.send_message('No items currently in the list.')

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
@tree.command(name="post_ad", description="Post the trade ad")
async def post_ad(interaction: discord.Interaction):
    try:
        result = post_trade_ad()
        await interaction.response.send_message(f'Trade ad posted successfully! Response: {result}')
    except requests.exceptions.RequestException as e:
        await interaction.response.send_message(f'Failed to post trade ad: {e}')

@bot.event
async def on_ready():
    await tree.sync(guild=None)  # Sync commands globally
    print(f'Logged in as {bot.user}')

bot.run(TOKEN)
