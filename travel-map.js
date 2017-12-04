const Travel = require('./travel')

class TravelMap extends Map {
  constructor(obj) {
      super(obj)
      this.forEach((travels, key) => {
        this.set(key, travels.map((travel) => new Travel(travel)))
      })
  }

  addTravel(user, travel) {
    let travels = this.get(user)

    if (!travels) {
      travels = []
      super.set(user, travels)
    }

    travels.push(new Travel(travel))
  }
}

module.exports = TravelMap
