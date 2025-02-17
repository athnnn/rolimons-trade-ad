import discord
from discord.ext import commands
import requests
import json
import os

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='/', intents=intents)
tree = bot.tree

TOKEN = os.getenv('DISCORD_BOT_TOKEN')
ROLIMONS_TRADE_AD_URL = 'https://api.rolimons.com/tradeads/v1/createad'
ROLIMONS_API_KEY = os.getenv('ROLIMONS_API_KEY')
ROBLOX_ID = os.getenv('ROBLOX_USER_ID')

# Load configuration
with open('config.json') as f:
    config = json.load(f)

# Check if the item is valid and owned by the user
def is_valid_item(item_id):
    response = requests.get('https://api.rolimons.com/items/v1/itemdetails')
    response.raise_for_status()
    items = response.json().get('items', {})
    return str(item_id) in items and items[str(item_id)][0]

def get_item_name(item_id):
    response = requests.get('https://api.rolimons.com/items/v1/itemdetails')
    response.raise_for_status()
    items = response.json().get('items', {})
    return items[str(item_id)][0] if str(item_id) in items else None

# Command to add items
@tree.command(name="add_item", description="Add an item to the trade ad list")
async def add_item(interaction: discord.Interaction, item_id: int):
    if len(config['manualItems']) >= 4:
        await interaction.response.send_message('You can only add up to 4 items.')
        return
    if not is_valid_item(item_id):
        await interaction.response.send_message('Invalid item ID or you do not own this item.')
        return
    if item_id not in config['manualItems']:
        config['manualItems'].append(item_id)
        save_config()
        item_name = get_item_name(item_id)
        await interaction.response.send_message(f'Item {item_name} (ID: {item_id}) added successfully!')
    else:
        await interaction.response.send_message(f'Item (ID: {item_id}) is already in the list.')

# Command to remove items
@tree.command(name="remove_item", description="Remove an item from the trade ad list")
async def remove_item(interaction: discord.Interaction, item_id: int):
    if item_id in config['manualItems']:
        config['manualItems'].remove(item_id)
        save_config()
        item_name = get_item_name(item_id)
        await interaction.response.send_message(f'Item {item_name} (ID: {item_id}) removed successfully!')
    else:
        await interaction.response.send_message(f'Item (ID: {item_id}) not found!')

# Command to list current items
@tree.command(name="list_items", description="List current items in the trade ad list")
async def list_items(interaction: discord.Interaction):
    if config['manualItems']:
        item_names = [get_item_name(item_id) for item_id in config['manualItems']]
        await interaction.response.send_message(f'Current items: {", ".join(item_names)}')
    else:
        await interaction.response.send_message('No items currently in the list.')

# Command to remove all items
@tree.command(name="remove_all_items", description="Remove all items from the trade ad list")
async def remove_all_items(interaction: discord.Interaction):
    config['manualItems'].clear()
    save_config()
    await interaction.response.send_message('All items removed from the trade ad list.')

# Command to overwrite the current trade list with a new list
@tree.command(name="overwrite_items", description="Overwrite the current trade list with a new list of items")
async def overwrite_items(interaction: discord.Interaction, item_ids: str):
    new_items = [int(item_id) for item_id in item_ids.split(',')]
    if len(new_items) > 4:
        await interaction.response.send_message('You can only add up to 4 items.')
        return
    for item_id in new_items:
        if not is_valid_item(item_id):
            await interaction.response.send_message(f'Invalid item ID: {item_id}')
            return
    config['manualItems'] = new_items
    save_config()
    item_names = [get_item_name(item_id) for item_id in config['manualItems']]
    await interaction.response.send_message(f'Trade list overwritten with items: {", ".join(item_names)}')

# Command to update request tags
@tree.command(name="update_request_tags", description="Update the request tags in the config")
async def update_request_tags(interaction: discord.Interaction, tags: str):
    new_tags = tags.split(',')
    config['requestTags'] = new_tags
    save_config()
    await interaction.response.send_message(f'Request tags updated to: {", ".join(new_tags)}')

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
    await tree.sync()
    print(f'Logged in as {bot.user}')

bot.run(TOKEN)
