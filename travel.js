class Travel {
  constructor(travel) {
    Object.assign(this, travel)
    if (this._step) {
      delete(this._step)
    }
    this.setDates()

  }

  setDates() {
    console.log(this.initial)
    console.log(this.final)
    console.log(this.period)
    console.log(this.days)
    console.log(this.months)
  }
}


module.exports = Travel 
