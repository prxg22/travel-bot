const Travel = require('./travel')

class TravelMap extends Map {
  constructor(obj) {
      super(obj)
      console.log(this)
      this.forEach(travels => console.log(travels))
  }

  set(key, val) {
    let travel = this.get(key)

    if (travel) {
      travel.push(val)
      return
    }

    super.set(key, [val])
  }
}

module.exports = TravelMap
