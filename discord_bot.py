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
ROLIMONS_API_KEY = os.getenv('ROLIMONS_API_KEY')
ROBLOX_ID = os.getenv('ROBLOX_USER_ID')
ROLIMONS_TRADE_AD_URL = 'http://localhost:8080/create-ad'

# Load configuration
with open('config.json') as f:
    config = json.load(f)

# Ensure all necessary keys are in the config
if 'manualItems' not in config:
    config['manualItems'] = []
if 'requestItems' not in config:
    config['requestItems'] = []
if 'requestTags' not in config:
    config['requestTags'] = []
if 'offerRobux' not in config:
    config['offerRobux'] = 10000

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

# Get user inventory from Rolimons
def get_user_inventory():
    response = requests.get(f'https://api.rolimons.com/players/v1/playerassets/{ROBLOX_ID}')
    response.raise_for_status()
    return response.json().get('playerAssets', {})

# Command to add items to the offer side
@tree.command(name="add_item", description="Add an item to the offer side of the trade ad list")
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
        await interaction.response.send_message(f'Item {item_name} (ID: {item_id}) added successfully to the offer side!')
    else:
        await interaction.response.send_message(f'Item {item_name} (ID: {item_id}) is already in the list.')

# Command to add items to the request side
@tree.command(name="add_request_item", description="Add an item to the request side of the trade ad list")
async def add_request_item(interaction: discord.Interaction, item_id: int):
    if len(config['requestItems']) >= 4:
        await interaction.response.send_message('You can only request up to 4 items.')
        return
    if not is_valid_item(item_id):
        await interaction.response.send_message('Invalid item ID.')
        return
    if item_id not in config['requestItems']:
        config['requestItems'].append(item_id)
        save_config()
        item_name = get_item_name(item_id)
        await interaction.response.send_message(f'Item {item_name} (ID: {item_id}) added successfully to the request side!')
    else:
        await interaction.response.send_message(f'Item {item_name} (ID: {item_id}) is already in the list.')

# Command to remove items
@tree.command(name="remove_item", description="Remove an item from the trade ad list")
async def remove_item(interaction: discord.Interaction, item_id: int):
    if item_id in config['manualItems']:
        config['manualItems'].remove(item_id)
        save_config()
        item_name = get_item_name(item_id)
        await interaction.response.send_message(f'Item {item_name} (ID: {item_id}) removed successfully!')
    else:
        await interaction.response.send_message(f'Item {item_id} not found!')

# Command to remove all items
@tree.command(name="remove_all_items", description="Remove all items from the trade ad list")
async def remove_all_items(interaction: discord.Interaction):
    config['manualItems'].clear()
    config['requestItems'].clear()
    save_config()
    await interaction.response.send_message('All items removed from both the offer and request sides of the trade ad list.')

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

# Command to list current items in both offer and request sides
@tree.command(name="list_items", description="List current items in the trade ad list")
async def list_items(interaction: discord.Interaction):
    if config['manualItems']:
        offer_item_names = [get_item_name(item_id) for item_id in config['manualItems']]
        await interaction.response.send_message(f'Offer items: {", ".join(offer_item_names)}')
    else:
        await interaction.response.send_message('No offer items currently in the list.')
    
    if config['requestItems']:
        request_item_names = [get_item_name(item_id) for item_id in config['requestItems']]
        await interaction.response.send_message(f'Request items: {", ".join(request_item_names)}')
    else:
        await interaction.response.send_message('No request items currently in the list.')

# Command to update the offered Robux amount
@tree.command(name="update_offered_robux", description="Update the amount of Robux offered in the trade ad")
async def update_offered_robux(interaction: discord.Interaction, robux_amount: int):
    config['offerRobux'] = robux_amount
    save_config()
    await interaction.response.send_message(f'Offered Robux amount updated to: {robux_amount}')

# Command to suggest items to be added to the offer side
@tree.command(name="suggest_items", description="Suggest items from your inventory to add to the offer side")
async def suggest_items(interaction: discord.Interaction):
    inventory = get_user_inventory()
    suggested_items = [(item_id, get_item_name(item_id)) for item_id in inventory.keys() if is_valid_item(item_id)]
    suggested_list = ', '.join([f'{name} (ID: {item_id})' for item_id, name in suggested_items])
    await interaction.response.send_message(f'Suggested items to add: {suggested_list}')

# Save configuration to file
def save_config():
    with open('config.json', 'w') as f:
        json.dump(config, f, indent=4)

# Function to post the trade ad
def post_trade_ad():
    offer_item_ids = config['manualItems']
    request_item_ids = config['requestItems']
    offer_robux = config.get('offerRobux', 10000)  # Use the updated Robux amount or default to 10000
    
    reqBody = {
        "player_id": int(ROBLOX_ID),
        "offer_item_ids": offer_item_ids,
        "request_item_ids": request_item_ids,
        "request_tags": config['requestTags'],
        "offer_robux": offer_robux
    }

    # Call the ad posting endpoint
    response = requests.post(ROLIMONS_TRADE_AD_URL, json=reqBody)
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
