class Travel {
  constructor(travel) {
    Object.assign(this, travel)
    if (this._step) {
      delete(this._step)
    }
    this.setDates()

  }

  setDates() {
  }
}


module.exports = Travel
