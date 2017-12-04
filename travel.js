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
  }

  get depatureDates() {
    let depatureDates = []

    for (let year = this.initial; year <= this.final; year++) {
      this.months.map(month => {
        let monthDates = this.getDates(month, year)
        depatureDates = [ ...depatureDates, ...monthDates ]
        return month
      })
    }

    return depatureDates
  }

  getRoundTrip(depatureDate) {
    return depatureDate.add(this.period, 'day')
  }

  getDates(month, year) {
    return moment(`${year}-${MONTHS_EXT[month]}-01`, 'YYYY-MM-D')
        .weekdaysInMonth(this.days.map(day => DAYS_EXT[day]))
        .filter(day => day > moment())
  }

  searchTickets() {
    console.log('iniciando pesquisa...')
    let nightmare = new Nightmare()
    nightmare
      .goto(this.formatUrl(this.depatureDates[0]))
      .evaluate(() => {
        let ticket = {}
        let priceGroupContainer = document.querySelectorAll('.priceGroupContainer')
        let priceDiv = priceGroupContainer[0].querySelector('.airsearch.amount')
        priceDiv.removeChild(priceDiv.querySelector('.money'))
        ticket.price = parseFloat(priceDiv
          .innerHTML
          .trim()
          .replace(/\./g, '')
          .replace(/,/g, '.'))

        ticket.airline = priceGroupContainer[0].querySelector('.cia-name').innerHTML



        return ticket
      })
      .end()
      .then(data => console.log(data))
      .catch(error => console.error(error))
  }

  formatUrl(depatureDate) {
    return url
      .replace(/{{to}}/g, this.to.code)
      .replace(/{{from}}/g, this.from.code)
      .replace(/{{date_going}}/g, depatureDate.format('D-MM-YYYY'))
      .replace(/{{date_returning}}/g, depatureDate.add(this.period, 'day').format('D-MM-YYYY'))
      .replace(/{{now}}/g, moment().format('D-MM-YYYY'))
  }
}


module.exports = Travel
