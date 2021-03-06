Example (edit the ip adresses and open index.html in your browser):

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src=https://Unpkg.com/p5></script>
<script src=https://Unpkg.com/p5/lib/addons/p5.sound.min.js></script>
<script src="wledcontroller.js"></script>
<script>
let wled

function setup() {
    console.log('go!')
    createCanvas(400, 400);
    wled = new MultiController([
        '192.168.1.200',
        '192.168.1.92'
    ])
    wled.on()
    wled.bind(led_color)
}

function draw() {
    background(220)
}

function led_color(i, n, c) {
    // i: led index
    // n: total number of leds for this controller
    // c: controller index
    // returns: either an array [r, g, b] or a p5js color
    let t = Math.floor(millis() / 500)
    return (t % 2 == c) == (Math.floor(i / (5+c)) % 2 == 0) ?
            'red' : 'blue'
}
</script>
```

*Known issues:*

 - Does not work inside the 'official' p5js editor
   because most browsers forbid connecting to an unsecure websocket
   from a https website
 - We seem to be running into some memory corruption issues when having
   more than two data lines connected to wled
 - When you run into problems (error 9 or wled resets) try decreasing
   `wled.max_update_size` or increasing the update interval in `wledcontroller.js`.
