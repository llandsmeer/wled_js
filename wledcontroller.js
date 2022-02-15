class Controller {
    constructor(ip) {
        this.ip = ip
        this.send_queue = []
        this.kernel = () => [0, 0, 0]
        this._idx = 0
        this.info = {}
        this.state = {}
        this.nleds = 0
        setInterval(this._update.bind(this), 15)
        this.connect()
        this._cache = []
        this.max_update_size = 20
    }

    connect() {
        this.socket = new WebSocket(`ws://${this.ip}/ws`)
        this.socket.onopen = this.socket_onopen.bind(this)
        this.socket.onmessage = this.socket_onmessage.bind(this)
        this.socket.onclose = this.socket_onclose.bind(this)
        this.socket.onerror = this.socket_onerror.bind(this)
        this.connected = false
    }

    send(data) {
        if (this.connected) {
            let message = JSON.stringify(data)
            this._last_message = message
            this.socket.send(message)
        } else {
            this.send_queue.push(JSON.stringify(data))
        }
    }

    on() { this.send({"on":true,"bri":255}) }
    off() { this.send({"on":false}) }
    bind(f) { this.kernel = f }

    parse_color(res) {
        function clip(x, a, b) {
            if (x <= a) return a;
            if (x >= b) return b;
            return x
        }
        if (!res) return
        if (Array.isArray(res)) {
            if (res.length != 3) return
            let [r, g, b] = res
            r = clip(r | 0, 0, 255)
            g = clip(g | 0, 0, 255)
            b = clip(b | 0, 0, 255)
            return [r, g, b]
        } else {
            let c = color(res)
            return [red(c), green(c), blue(c)]
        }
    }

    _update() {
        let update_size = 0
        let message = []
        for (let _ignoreme = 0; _ignoreme < this.nleds; _ignoreme++) {
            let i = this._idx
            let res = this.kernel(i, this.nleds)
            let rgb = this.parse_color(res)
            if (!rgb) continue
            let [r, g, b] = rgb
            let prev = this._cache[i]
            if (prev && prev[0] == r && prev[1] == g && prev[2] == b) continue
            message.push(i)
            message.push(rgb)
            this._cache[i] = rgb
            update_size += 1
            this._idx = (i+1) % this.nleds
            if (update_size >= this.max_update_size) {
                break
            }
        }
        if (update_size == 0) return
        this.send({ seg : { i : message } })
    }

    socket_onopen(event) {
        this.connected = true
        this.send_queue.forEach(message => {
            this._last_message = message
            this.socket.send(message)
        })
    }

    socket_onmessage(event) {
        let data = JSON.parse(event.data)
        if (data.info) {
            this.info = data.info
        }
        if (data.state) {
            this.state = data.state
            this.nleds = data.state.seg[0].len // we only support one segment
        }
        if (data.error) {
            console.error(data)
            console.log(this._last_message)
        }
    }

    socket_onclose(event) {
        this.connected = false
        if (event.wasClean) {
            console.warn(event)
        } else {
            console.error(event)
            setTimeout(this.connect.bind(this), 1000)
        }
    }

    socket_onerror(event) {
        this.connected = false
        console.error(event)
    }
}

class MultiController {
    constructor(ips) {
        this.ips = ips
        this.controllers = this.ips.map(ip => new Controller(ip))
    }

    on() { this.controllers.forEach(c => c.on()) }
    off() { this.controllers.forEach(c => c.off()) }

    bind(f) {
        this.kernel = f
        this.controllers.forEach((c, c_idx) => {
            c.bind((led_idx, nled) => f(led_idx, nled, c_idx))
        })
    }
}

