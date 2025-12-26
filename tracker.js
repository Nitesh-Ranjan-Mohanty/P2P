const express = require('express')

const app = express()
app.use(express.json())

// roomId -> Map("ip:port" -> peer)
const rooms = new Map()

app.post('/join', (req, res) => {
    const { roomId, udpPort } = req.body

    if (!roomId || !udpPort) {
        return res.status(400).json({ error: 'roomId and udpPort required' })
    }

    const ip =
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress

    const publicPort = req.socket.remotePort

    const peer = {
        ip,
        port: publicPort,
        lastSeen: Date.now()
    }

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map())
    }

    const room = rooms.get(roomId)
    room.set(`${ip}:${publicPort}`, peer)

    // collect other peers
    const peers = [...room.values()].filter(p => p !== peer)

    res.json({
        you: peer,
        peers
    })
})

// cleanup dead peers
setInterval(() => {
    const now = Date.now()
    for (const room of rooms.values()) {
        for (const [key, peer] of room.entries()) {
            if (now - peer.lastSeen > 60_000) {
                room.delete(key)
            }
        }
    }
}, 30_000)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log('STUN+Tracker running on port', PORT)
})
