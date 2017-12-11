const moment = require('moment-weekdaysin')
const Nightmare = require('nightmare')

const DAYS_EXT = {
  'mon': 1,
  'tue': 2,
  'wed': 3,
  'thu': 4,
  'fri': 5,
  'sat': 6,
  'sun': 0
}

const MONTHS_EXT = {
  'jan': 1,
  'feb': 2,
  'mar': 3,
  'apr': 4,
  'may': 5,
  'jun': 6,
  'jul': 7,
  'aug': 8,
  'sep': 9,
  'oct': 10,
  'nov': 11,
  'dec': 12
}

const url = "https://www.submarinoviagens.com.br/travel/resultado-passagens.aspx?searchtype=Air&Origem={{from}}&Destino={{to}}&Origem={{to}}&Destino={{from}}&Proximity=&ProximityId=0&Data={{date_going}}&RoundTrip=1&Data={{date_returning}}&SomenteDireto=false&ExecutiveFlight=false&NumADT=1&NumCHD=0&NumINF=0&Hora=&Hora=&Multi=false&DataConsulta={{now}}&Nav=Chrome%2062"

class Travel {
  constructor(travel) {
    Object.assign(this, travel)
    if (this._step) {
      delete(this._step)
    }


    this.tickets = this.tickets || []
    this.alive = true
    this.trigger = !!this.trigger
    if (this.lastUpdate)
      this.lastUpdate = moment(this.lastUpdate)
  }

  get departureDates() {
    let departureDates = []

    for (let year = this.initial; year <= this.final; year++) {
      this.months.map(month => {
        let monthDates = this.getWeekDaysOnMonth(month, year)
        departureDates = [ ...departureDates, ...monthDates ]
        return month
      })
    }

    return departureDates.sort((d1, d2) => +d1 - +d2)
  }

  getRoundTrip(departureDate) {
    let roundTrip = moment(departureDate).add(this.period, 'day')
    return roundTrip
  }

  getWeekDaysOnMonth(month, year) {
    return moment(`${year}-${MONTHS_EXT[month]}-01`, 'YYYY-MM-D')
        .weekdaysInMonth(this.days.map(day => DAYS_EXT[day]))
        .filter(day => day > moment())
  }

  update() {
    let promises = null
    this.tickets = []
    this.trigger = false

    let departureDates = this.departureDates
    for (let date of departureDates) {
      console.log(`iniciando pesquisa ${this.from.city} - ${this.to.city} - ${date.format('D-MM-YY')}`)
      if (!promises) { promises = this.searchTicket(date); continue }
      promises = promises
        .then((ticket) => {
          this.tickets.push(ticket)
          if(!ticket)
            console.log(`erro ticket ${this.tickets.length} - ${this.from.city} - ${this.to.city}`)
          else
            console.log(`chegou ticket ${this.tickets.length} - ${this.from.city} - ${this.to.city}`)
          return this.searchTicket(date)
        })
    }

    return promises.then((ticket) => {
      this.tickets.push(ticket)
      this.alive = !!this.tickets.find(t => !!t)

      // APAGAR
      if(!ticket)
        console.log(`erro ticket ${this.tickets.length} - ${this.from.city} - ${this.to.city}`)
      else
        console.log(`chegou ticket ${this.tickets.length} - ${this.from.city} - ${this.to.city}`)
      console.log(`${this.from.city} - ${this.to.city} esta vivo: ${this.alive}`)
      // APAGAR

      this.lastUpdate = moment()
      return this.alive
    })
  }

  searchTicket(date) {
    const url = this.formatUrl(date)
    const nightmare = new Nightmare({ waitTimeout: 750, executionTimeout: 30000})
    return nightmare
    .goto(url)
    .wait('.priceGroupContainer')
    .evaluate(() => {
      let ticket = {
        price: 0,
        airline: '',
        departure: {departs: [], arrives: []},
        arrival: {departs: [], arrives: []}
      }

      let priceGroupContainer = document.querySelectorAll('.priceGroupContainer')
      let priceDiv = priceGroupContainer[0].querySelector('.airsearch.amount')
      priceDiv.removeChild(priceDiv.querySelector('.money'))

      ticket.price = parseFloat(
        priceDiv.innerHTML
          .trim()
          .replace(/\./g, '')
          .replace(/,/g, '.')
      )

      ticket.airline = priceGroupContainer[0].querySelector('.cia-name').innerHTML
      ticket.departure.departs = []
      ticket.departure.arrives = []

      let departureDeparts = priceGroupContainer[0]
      .querySelector('ul.departure')
      .querySelectorAll('p.depart span.time')

      let departureArrives = priceGroupContainer[0]
      .querySelector('ul.departure')
      .querySelectorAll('p.arrive span.time')

      let arrivalDeparts = priceGroupContainer[0]
      .querySelector('ul.arrival')
      .querySelectorAll('p.depart span.time')

      let arrivalArrives = priceGroupContainer[0]
      .querySelector('ul.arrival')
      .querySelectorAll('p.arrive span.time')

      departureDeparts.forEach(depart => {
        ticket.departure.departs.push(depart.innerHTML.trim())
      })

      departureArrives.forEach(arrive => {
        ticket.departure.arrives.push(arrive.innerHTML.trim())
      })

      arrivalDeparts.forEach(depart => {
        ticket.arrival.departs.push(depart.innerHTML.trim())
      })

      arrivalArrives.forEach(arrive => {
        ticket.arrival.arrives.push(arrive.innerHTML.trim())
      })

      return ticket
    })
    .end()
    .then(ticket => {
      console.log(ticket)
      ticket.url = url
      ticket.date = moment(date)
      this.trigger = this.trigger || ticket.price < this.threshold

      return ticket
    })
    .catch((e) => {
      console.log(e)
      return false
    })
  }

  formatUrl(departureDate) {
    let date = moment(departureDate)
    return url
      .replace(/{{to}}/g, this.to.code)
      .replace(/{{from}}/g, this.from.code)
      .replace(/{{date_going}}/g, date.format('D-MM-YYYY'))
      .replace(/{{date_returning}}/g, this.getRoundTrip(date).format('D-MM-YYYY'))
      .replace(/{{now}}/g, moment().format('D-MM-YYYY'))
  }

  toString() {
    let dates = this.departureDates
    let travel = `${this.from.city} (${this.from.code}) - `
    + `${this.to.city} (${this.to.code})\n`

    if (this.tickets.length < 1 || !this.alive) return travel

    this.tickets.forEach((ticket, index) => {
      if (!ticket) return
      let arriveDate = this.getRoundTrip(ticket.date)
      console.log(ticket)
      travel += `${dates[index].format('DD-MM-YYYY')}\t`
        + `${this.getRoundTrip(dates[index]).format('DD-MM-YYYY')}\t`
        + `R$${ticket.price}\t`
        + `${ticket.airline}\t\n`

        travel += `Departure time:\n`
        for (let index in ticket.departure.departs) {
          ticket.departure.departs[index] = moment(ticket.departure.departs[index], 'HH:mm')
          ticket.departure.arrives[index] = moment(ticket.departure.arrives[index], 'HH:mm')
          travel += `\t${ticket.departure.departs[index].format('HH:mm')} >\t`
          travel += `${ticket.departure.arrives[index].format('HH:mm')}\t\n`
        }

        travel += `Return time:\n`
        for (let index in ticket.arrival.departs) {
          ticket.arrival.departs[index] = moment(ticket.arrival.departs[index], 'HH:mm')
          ticket.arrival.arrives[index] = moment(ticket.arrival.arrives[index], 'HH:mm')
          travel += `\t${ticket.arrival.departs[index].format('HH:mm')} >\t`
          travel  += `${ticket.arrival.arrives[index].format('HH:mm')}\t\n`
        }

        travel += '\n'
    })

    travel += `last update: ${this.lastUpdate.format('DD/MM HH:mm')}\n\n`
    return travel
  }
}


module.exports = Travel
