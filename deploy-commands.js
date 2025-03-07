const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
  {
    name: 'manage-trade',
    description: 'Modify trade parameters',
    options: [
      {
        type: 1,
        name: 'request',
        description: 'Manage requested items',
        options: [
          {
            type: 3,
            name: 'action',
            description: 'Add/remove item',
            required: true,
            choices: [
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' }
            ]
          },
          {
            type: 3,
            name: 'item',
            description: 'Item ID or name',
            required: true,
            autocomplete: true
          }
        ]
      }
    ]
  }
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error('Error:', error);
  }
})();
