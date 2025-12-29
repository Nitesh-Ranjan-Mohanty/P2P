const express = require('express')

const app = express()
app.use(express.json())

// roomId -> Map("ip:port" -> peer)
const rooms = new Map()

app.post('/join', (req, res) => {
    const { roomId, udpPort, lanIP, peerId } = req.body

    if (!roomId || !udpPort || !peerId) {
        return res.status(400).json({
            error: 'roomId, udpPort, and peerId required'
        })
    }

    const ip =
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.socket.remoteAddress

    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map())
    }

    const room = rooms.get(roomId)

    const peer = {
        peerId,
        ip,
        port: udpPort,
        lanIP,
        lastSeen: Date.now()
    }

    room.set(peerId, peer)

    res.json({
        you: peer,
        peers: [...room.values()].filter(p => p.peerId !== peerId)
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
