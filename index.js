// libs
const TelegramBot = require('telegram-bot-api')
const request = require('request-promise')

const PersistentMap = require('./persistent-map')
const Travel = require('./travel')
const TravelMap = require('./travel-map')

// constants
const telegramToken = process.env.BOT_TOKEN
const AIRPORTS_URL = 'https://gist.githubusercontent.com/prxg22/2eafc8b75a1de6155439ecc4496e82db/raw/795aa439434e845231f870a40d809ff87b6c20ca/airports.json'
const DAYS = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun'
]
const DAYS_FORMAT = `\t✅ Fri Sat Sun\n`
+ `\t✅ mon\n`
+ `\t✅ tue fri sun thu wed\n`
+ `\t✅ fri sat sun\n\n`
+ `\t❌ Fri, Sat, Sun \n`
+ `\t❌ Tuesday Thursday Monday \n`

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec'
]
const MONTHS_FORMAT = `\t✅ Jan mar Feb\n`
+ `\t✅ Apr\n`
+ `\t✅ apr\n`
+ `\t✅ Oct Dec Nov Sep Jul\n`
+ `\t❌ Oct, nov - December \n`
+ `\t❌ Nov October December \n`

// globals
const travels = new PersistentMap('data/travels.json')
const updatingTravels = new Map()
const travelMap = new TravelMap(travels.data)
const actualYear = new Date().getFullYear()

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

  // command actions
  switch (message.text) {
      case '/healthcheck':
        botMessage('I\'m alive!', chat)
        if (updatingTravels.get(user.id)) updatingTravels.delete(user.id)
        return
      case '/save':
        botMessage('Where are you from?', chat)
        // init travel object
        updatingTravels.set(user.id, { _step: 0 })
        return
      case '/check_travel':
        if (updatingTravels.get(user.id)) updatingTravels.delete(user.id)
        checkTravel(user, chat)
        return
  }

  // get user travel object
  let travel = updatingTravels.get(user.id);
  if (travel) {
    saveAction(travel, message.text, user, chat)
    return
  }
})

// Travel object setting
const saveAction = (travel, txt, user, chat) => {
  switch(travel._step) {
    case 0:
      findCities(travel, 'from', txt, chat)
      break
    case 1:
      setCity(travel, 'from', txt, chat)
      break
    case 3:
      findCities(travel, 'to', txt, chat, travel.from)
      break
    case 4:
      setCity(travel, 'to', txt, chat)
      break
    case 6:
      setPeriod(travel, txt, chat)
      break
    case 8:
      setDays(travel, txt, chat)
      break
    case 10:
      setMonths(travel, txt, chat)
      break
    case 12:
      setYear(travel, 'initial', txt, chat)
      break
    case 14:
      setYear(travel, 'final', txt, chat, travel.initial)
      break
    case 16:
        setThreshold(travel, txt, chat)
        break
    default: break
  }

  let msg = ''
  switch (travel._step) {
    case 2:
      botMessage('Where are you going?', chat)
      travel._step++
      break
    case 5:
      msg = `So you are going `
      msg += `from ${travel.from.city} to ${travel.to.city}!\n`
      msg += `How many days are you gonna stay there?`
      botMessage(msg, chat)
      travel._step++
      break
    case 7:
      msg = `Nice!! ${travel.period} days in ${travel.to.city}!\n\n`
      msg += `In which days could you go? Send this message `
      msg += `on the following format\n\n`
      msg += DAYS_FORMAT
      botMessage(msg, chat)
      travel._step++
      break
    case 9:
      msg = `Ok!! ${travel.days} will be!\n\n`
      msg += `Now, which are the best months in ${travel.to.city}? \n`
      msg += `Tell me on the following format\n\n`
      msg += MONTHS_FORMAT
      botMessage(msg, chat)
      travel._step++
      break
    case 11:
      msg = `Cool!! Nice choice!!\n`
      msg += `In which year do you want to go??`
      botMessage(msg, chat)
      travel._step++
      break
    case 13:
      msg = `I'll search from ${travel.initial} unitl when?!!\n`
      botMessage(msg, chat)
      travel._step++
      break
    case 15:
      msg = `I'll search from ${travel.initial} unitl ${travel.final}!\n`
      msg += `How much do you want to pay?\n`
      botMessage(msg, chat)
      travel._step++
      break
    case 17:
      msg = `Wait until I create your travel search. Check the details: !\n\n`
      msg += `Origin: ${travel.from.city} - ${travel.from.name} (${travel.from.code}) \n`
      msg += `Destiny: ${travel.to.city} - ${travel.to.name} (${travel.to.code}) \n`
      msg += `Days: ${travel.days}) \n`
      msg += `Months: ${travel.months}) \n`
      msg += `From: ${travel.initial}) - To: ${travel.final} \n`
      msg += `threshold: ${travel.threshold} \n`

      travelMap.addTravel(user.id, travel)

      console.log(travelMap)

      travels.save(travelMap)

      botMessage(msg, chat)
      break

  }
}

const findCities = (travel, property, txt, chat, threshold) => {
  // search airport
  findAirport(txt)
    .then((airpots) => {
      if (threshold) {
        let index = airpots.indexOf(threshold)
        if (index > -1) {
          airpots.splice(index, 1)
        }
      }

      if (!airpots || airpots.length < 1) {
        throw 'not found'
      }

      let msg = `I found these airpots to city: ${txt}\n\n`
      msg += `${selections(airpots, 'code')}\n`
      msg += `Which one is your airport?`

      botMessage(msg, chat)
      travel[`_${property}`] = airpots
      travel._step++
    })
    .catch((error) => {
      botMessage(`I couldn\'t find ${txt}. Would you repeat, please?`, chat)
      console.error(error);
    })
}

const findAirport = (txt) => {
  return request(AIRPORTS_URL)
  .then((airpots) => {
    let regex = RegExp(formatText(txt))
    airpots = JSON.parse(airpots)

    return airpots
    .map(airport => {
      return {
        name: airport.name,
        code: airport.code,
        city: airport.city,
        icao: airport.icao
      }

    })
    .filter((airport) =>
    airport.city && regex.test(formatText(airport.city))
  )
})
}

const setCity = (travel, property, txt, chat) => {
  // airport option
  let option = parseInt(txt)

  if (!txt || isNaN(option)) {
    botMessage('Please select a valid option.', chat)
    return
  }

  // confirm airport
  if (travel[`_${property}`] &&
    option >= 0 &&
    option < travel[`_${property}`].length ) {

    travel[property] = travel[`_${property}`][option]
    delete(travel[`_${property}`])
    travel._step++;
    return
  } else if (travel[`_${property}`]) {
    botMessage('I don\'t understand you! Repeat, please', chat)
    return
  }
}

const setPeriod = (travel, txt, chat) => {
  let period = parseInt(txt)

  if (!txt || isNaN(period) || (!isNaN(period) && period < 1)) {
    let msg = `I can't set ${txt} as number of period!\n`
    msg += `How many period will you stay there?`
    botMessage(msg, chat)
    return
  }

  travel.period = period
  travel._step++
}

const setDays = (travel, txt, chat) => {
  let str = formatText(txt)
  let regex = /^([a-z]{3}\s)*[a-z]{3}$/g
  let err = !str || !regex.test(str) // check if format is ok

  let aux = !err ? str.split(' ') : []
  let days = aux
    .map(day => DAYS.find(wday => wday === day))
    .filter(day => !!day)
  err = err || days.length !== aux.length // check if days  exist

  if (err) {
    let msg = `I can't set ${txt} as days you can go!\n`
    msg += `Send days on this format\n\n`
    msg += DAYS_FORMAT

    botMessage(msg, chat)
    return
  }
  travel.days = days
  travel._step++
}

const setMonths = (travel, txt, chat) => {
  let str = formatText(txt)
  let regex = /^([a-z]{3}\s)*[a-z]{3}$/g
  let err = !str || !regex.test(str) // check if format is ok
  let aux = !err ? str.split(' ') : []
  let months = aux
    .map(month => MONTHS.find(wday => wday === month))
    .filter(month => !!month)
  err = err || months.length !== aux.length // check if months  exist

  if (err) {
    let msg = `I can't set ${txt} as months you can go!\n`
    msg += `Send months on this format\n\n`
    msg += MONTHS_FORMAT

    botMessage(msg, chat)
    return
  }

  travel.months = months
  travel._step++
}

const setYear = (travel, property, txt, chat, threshold) => {
  let year = parseInt(txt)
  if (!txt || isNaN(year) ) {
    let msg = `I can't set ${txt} as ${property} year\n`
    msg += `Which would be your ${property} year?`
    botMessage(msg, chat)
    return
  }

  if (year < actualYear) {
    let msg = `Hey, man on the moon, we're already in ${actualYear}\n`
    msg += `Which would be your ${property} year?`
    botMessage(msg, chat)
    return
  }

  if (year < threshold) {
    let msg = `The year must be after ${threshold}\n`
    msg += `Which would be your ${property} year?`
    botMessage(msg, chat)
    return
  }

  travel[property] = year
  travel._step++
}

const setThreshold = (travel, txt, chat) => {
  let threshold = parseFloat(txt)
  if (!txt || isNaN(threshold) ) {
    let msg = `I can't set ${txt} as a value\n`
    msg += `Which would be maximum payment?`
    botMessage(msg, chat)
    return
  }

  travel.threshold = threshold
  travel._step++
}

// Ticket logic
const checkTravel = (user, chat) => {
  let msg = `Ok, ${user.name}! I'll search your tickets,`
  msg +=  `this process can take a while, please wait`
  botMessage(msg, chat)

  let travels = travelMap.get(user.id)
  travels[2].searchTickets()
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
