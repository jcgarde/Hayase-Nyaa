export default new class Nyaa {
  base = 'https://nyaa.si/?f=0&c=1_2&q='

  /** @type {import('./').SearchFunction} */
  async single({ titles, episode }) {
    if (!titles?.length) return []

    const query = this.buildQuery(titles[0], episode)
    const url = `${this.base}${encodeURIComponent(query)}&rss=1`

    let res
    try {
      res = await fetch(url)
    } catch {
      return []
    }

    if (!res.ok) return []

    const xml = await res.text()
    const items = this.parseRss(xml)

    return items.map(item => this.mapItem(item)).filter(Boolean)
  }

  /** @type {import('./').SearchFunction} */
  batch = this.single
  movie = this.single

  buildQuery(title, episode) {
    let query = title.replace(/[^\w\s-]/g, ' ').trim()
    if (episode) query += ` ${episode.toString().padStart(2, '0')}`
    return query
  }

  parseRss(xml) {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(xml, 'application/xml')
      const items = Array.from(doc.querySelectorAll('item'))
      return items
    } catch {
      return []
    }
  }

  mapItem(node) {
    try {
      const title = node.querySelector('title')?.textContent || ''
      const link = node.querySelector('link')?.textContent || ''
      const description = node.querySelector('description')?.textContent || ''
      const pubDate = node.querySelector('pubDate')?.textContent || ''

      const magnetMatch = description.match(/href="(magnet:[^"]+)"/)
      const magnet = magnetMatch ? magnetMatch[1] : ''

      const sizeMatch = description.match(/Size:\s*([^<]+)/i)
      const sizeStr = sizeMatch ? sizeMatch[1].trim() : ''

      const seedMatch = description.match(/Seeders:\s*(\d+)/i)
      const leechMatch = description.match(/Leechers:\s*(\d+)/i)
      const downMatch = description.match(/Downloads:\s*(\d+)/i)

      const hash = magnet.match(/btih:([a-fA-F0-9]+)/)?.[1] || ''

      return {
        title,
        link: magnet || link,
        hash,
        seeders: parseInt(seedMatch?.[1] || '0'),
        leechers: parseInt(leechMatch?.[1] || '0'),
        downloads: parseInt(downMatch?.[1] || '0'),
        size: this.parseSize(sizeStr),
        date: pubDate ? new Date(pubDate) : new Date(),
        verified: false,
        type: 'alt',
        accuracy: 'high'
      }
    } catch {
      return null
    }
  }

  parseSize(sizeStr) {
    const match = sizeStr.match(/([\d.]+)\s*(KiB|MiB|GiB|KB|MB|GB)/i)
    if (!match) return 0

    const value = parseFloat(match[1])
    const unit = match[2].toUpperCase()

    switch (unit) {
      case 'KIB':
      case 'KB': return value * 1024
      case 'MIB':
      case 'MB': return value * 1024 * 1024
      case 'GIB':
      case 'GB': return value * 1024 * 1024 * 1024
      default: return 0
    }
  }

  async test() {
    try {
      const res = await fetch(this.base + 'one piece&rss=1')
      return res.ok
    } catch {
      return false
    }
  }
}()
