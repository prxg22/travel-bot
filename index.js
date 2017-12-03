// libs
const TelegramBot = require('telegram-bot-api')
const request = require('request-promise')
const PersistentMap = require('./persistent-map')

// constants
const telegramToken = process.env.BOT_TOKEN
const AIRPORTS_URL = 'https://gist.githubusercontent.com/prxg22/2eafc8b75a1de6155439ecc4496e82db/raw/7b3ec037ea412c7e90c57174a8004a0fd5d45821/airports.json'

// globals
const travels = new PersistentMap('data/travels.json')
const waitingMessages = new Map()
// bot
const bot = new TelegramBot({
        token: process.env.BOT_TOKEN,
        updates: {
            enabled: true
    }
})

const botMessage = (msg, chat) => {
    if (!msg || !chat) console.error('Insert msg and chat')
    bot.sendMessage({chat_id: chat, text: msg})
}

bot.on('update', (update) => {
    if (!update|| !update.message || update.message.chat.type !== 'private') return

    const message = update.message
    const chat = update.message.chat.id
    const user = {
        id: message.from.id,
        name: message.from.first_name
    }

    // get user travel object
    let travel = waitingMessages.get(user.id);
    if (travel && !travel.to) {
      setOriginCity(travel, 'to', message.text, chat);
    }
    // command actions
    switch (message.text) {
        case '/healthcheck':
          botMessage('I\'m alive!', chat)
          break
        case '/save':
          botMessage('Where are you going?', chat)
          waitingMessages.set(user.id, {});
          break
    }

    file.save(waitingMessages)
})

// Travel logic
const setOriginCity = (travel, property, txt, chat) => {
  if (!txt)
  botMessage('Repeat, please.', chat)

  // format txt
  txt = formatText(txt);

  // airport option
  let selected = parseInt(txt)

  // confirm airport
  if (travel[`_${property}`] && selected > -1) {
    travel[property] = travel[`_${property}`][txt]
    delete(travel[`_${property}`])
    botMessage(`Well done, let\'s go to ${travel[property]['city']}!`, chat)
    return
  } else if (travel[`_${property}`]) {
    botMessage('I don\'t understand you! Repeat, please', chat)
    return
  }

  // search airport
  findAirport(txt)
    .then((airpots) => {
      if (!airpots || airpots.length < 1) {
        throw 'not found'
      }

      let msg = `I found this airpots to city: ${txt}\n`
      msg += `${selections(airpots, 'code')}?`
      msg += `Which one is your airport?`

      botMessage(msg, chat)
      travel[`_${property}`] = airpots
    })
    .catch((error) => {
      botMessage(`I couldn\'t find ${txt}. Would you repeat, please?`, chat)
      console.error(error);
    })
}

// Airpot logic
const findAirport = (txt) => {
  return request(AIRPORTS_URL)
    .then((airpots) => {
      let regex = RegExp(txt)
      airpots = JSON.parse(airpots)

      return airpots
        .filter((airport) =>
          airport.city && regex.test(formatText(airport.city)))
    })
}

// helpers
const formatText = (txt) => txt
  .trim()
  .toLowerCase()
  .replace(new RegExp('[ÁÀÃÂ]','gi'), 'a')
  .replace(new RegExp('[ÉÈÊ]','gi'), 'e')
  .replace(new RegExp('[ÍÌÎ]','gi'), 'i')
  .replace(new RegExp('[ÓÒÔÕ]','gi'), 'o')
  .replace(new RegExp('[ÚÙÛ]','gi'), 'u')
  .replace(new RegExp('[Ç]','gi'), 'c')
  .replace(/[^aA-zZ0-9\s]/g, '')

const confirm = (txt) => !!(['yes', 'y', 'sim', 's', 'yeah']
  .find(confirmation => txt === confirmation))
const negative = (txt) => !!(['no', 'n', 'nao', '', 'nope']
  .find(no => txt === no))

const selections = (selections, property) => {
  return selections
    .reduce((res, selction, index) => res += `${index} - ${selction[property]}\n`, '')
}
