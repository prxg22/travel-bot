const fs = require('fs')

class PersistentMap {
  constructor(file) {
    this.json = ''
    this.file = fs.openSync(file, 'r+');

    if (!this.file) {
      throw 'Input file not found!'
    }

    this.json = fs.readFileSync(this.file, 'utf8')
  }

  get data() {
    return this.json ? new Map(JSON.parse(this.json)) : null
  }

  save(map) {
    if (!map || !this.file) return
    fs.writeFileSync(this.file, JSON.stringify([...map]))
  }
}

module.exports = PersistentMap
