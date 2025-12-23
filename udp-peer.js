const dgram = require('dgram')
const socket = dgram.createSocket('udp4')

const myPort = Number(process.argv[2])
const role = process.argv[3] // "rendezvous" or "peer"

let punched = false
let punchInterval = null


socket.bind(myPort, () => {
    console.log(`[${myPort}] UDP socket bound as ${role}`)

    if (role === 'peer') {
        const req = JSON.stringify({ type: 'introduce_request' })

        socket.send(
            req,
            6000,          // rendezvous port
            '127.0.0.1'    // rendezvous host
        )

        console.log(`[${myPort}] sent introduce_request`)
    }
})


function punch(peer) {
    const payload = JSON.stringify({ type: "punch", from: myPort })

    punchInterval = setInterval(() => {
        socket.send(payload, peer.port, peer.host)
    }, 300)

    setTimeout(() => {
        if (!punched) clearInterval(punchInterval)
    }, 5000)
}


const lastSeen = new Map()

socket.on('message', (msg, rinfo) => {
    let data
    try {
        data = JSON.parse(msg.toString())
    } catch {
        return
    }

    if (role === 'rendezvous') {
        lastSeen.set(`${rinfo.address}:${rinfo.port}`, {
            host: rinfo.address,
            port: rinfo.port
        })

        console.log(`[RENDEZVOUS] saw ${rinfo.address}:${rinfo.port}`)

        if (data.type === 'introduce_request') {
            for (const peer of lastSeen.values()) {
                if (peer.port !== rinfo.port) {
                    socket.send(
                        JSON.stringify({ type: 'introduce', peer }),
                        rinfo.port,
                        rinfo.address
                    )
                    break
                }
            }
        }
    }

    if (role === 'peer') {
        if (data.type === 'introduce') {
            console.log(
                `[${myPort}] introduced to ${data.peer.host}:${data.peer.port}`
            )
            punch(data.peer)
        }

        if (data.type === 'punch') {
            if (!punched) {
                punched = true
                clearInterval(punchInterval)

                console.log(
                    `[${myPort}] HOLE PUNCHED with ${rinfo.address}:${rinfo.port}`
                )
            }
        }

    }
})
