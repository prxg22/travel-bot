const fs = require('fs')
const Travel = require('./travel')

let map = new Map()

module.exports = class TravelMap {
  constructor() {
    this.read()
  }

  get(user) {
    if (!map.has(user)) map.set(user, [])
    return map.get(user)
  }

  write() {
    map.forEach(
      (travels, index) => map.set(index, travels.filter(t => t.alive))
    )
    fs.writeFileSync(`data/travels.json`, JSON.stringify([...map]))
  }

  forEach(fn) {
    return map.forEach((v, k, m) => fn(v, k, m))
  }

  read() {
    const file = fs.readFileSync(`data/travels.json`, 'utf8')
    map = file ? new Map(JSON.parse(file)) : new Map()
    map.forEach( (travels, user) =>
      map.set(user, travels.map(t => new Travel(t)))
    )
  }

  update() {
    let resultPromise = new Promise ((resolve, reject) => (true) ? resolve() : reject())

    for (let user of map.keys()) {
      resultPromise = resultPromise.then(() => this.updateUser(user))
    }

    return resultPromise.then(() => this.write())
  }

  updateUser(user) {
    let resultPromise = new Promise ((resolve, reject) => (true) ? resolve() : reject())

    for(let travel of map.get(user)) {
      resultPromise =resultPromise
        .then(() => travel.update())      
    }

    return resultPromise
  }
}
