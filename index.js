const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const open = require("open")
const {title, subtitle, AUTH, PROTECT_GAME } = require('./config')

const app = express();
const server = http.Server(app);
const io = socketio(server);

var port = process.env.PORT || 3000
const host_ip = require('./host-ip')
var gameUrl = `http://${host_ip}:${port}`

let questions = require('./questions')
let testQuestions = require('./test')
let currentTestQuestion = -1

let data = {
  users: new Set(),
  buzzes: new Set(),
  first: '',
  currentQuestion: -1,
  totalQuestions:0,
  pauseTime: false,
  pauseMusic: true,
  pauseSoundFX: false,
  pauseIntroMusic: true,
  pauseShowdownMusic: true,
  questionReady: false,
  isTestQuestion: false,
  musicVol: 0.1,
  timerVol: 0.1
}

data.totalQuestions = questions.length
if ( data.currentQuestion > -1)
    Object.assign(data, questions[data.currentQuestion])

const getData = () => Object.keys(data).reduce((d, key) => {
  d[key] = data[key] instanceof Set ? [...data[key]] : data[key]
  return d
}, {})

app.use(express.static('public'))
app.set('view engine', 'pug')


function checkHost(req, res, next) {
  // authentication middleware
  //const auth = {login: 'host', password: '1220'}
  // parse login and password from headers

  if (PROTECT_GAME){
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = new Buffer(b64auth, 'base64').toString().split(':')

    // Verify login and password are set and correct
    if (!login || !password || login !== AUTH.login || password !== AUTH.password) {
      res.set('WWW-Authenticate', 'Basic realm="401"') // change this
      res.status(401).send('Authentication required.') // custom message
      return
    }
  }

  // Access granted...
  next()
}


app.get('/', checkHost, (req, res) => res.render('index', Object.assign({ title, subtitle, gameUrl }, getData()) ))
app.get('/view', checkHost, (req, res) => res.render('view', Object.assign({ title, subtitle, gameUrl }, getData()) ))
app.get('/host', checkHost, (req, res) => res.render('host', Object.assign({ title, subtitle, gameUrl }, getData()) ))
app.get('/tech', checkHost, (req, res) => res.render('tech', Object.assign({ title, subtitle, gameUrl }, getData()) ))

io.on('connection', (socket) => {

  socket.emit('connected', getData())


  socket.on('join', (user) => {
    data.users.add(socket.id)
    io.emit('active', [...data.users].length)
    if(data.first){
        socket.emit('first', Object.assign({}, getData()));
    }
    console.log(`${user.team} joined!`)
  })

  socket.on('buzz', (user) => {
    if (!data.questionReady) return
    if (!data.first) {
        data.first = user.team
        io.emit('first', Object.assign({}, getData()))
    }
    data.buzzes.add(`${user.team}`)
    io.emit('buzzes', [...data.buzzes])
    // console.log(`${user.team} buzzed in!`)
  })

  socket.on('clear', () => {
      clearBuzzers()
  })

  socket.on('logo', () => {
       io.emit('intro')
  })

    function clearBuzzers() {
        data.buzzes = new Set()
        data.first = ''
        io.emit('buzzes', [...data.buzzes])
        io.emit('clear')
    }

  socket.on('showQuestion', () => {
    data.pauseTime = false
    data.questionReady =  false
    data.isTestQuestion =  false
    clearBuzzers()
    data.currentQuestion = (data.currentQuestion + 1) % data.totalQuestions
    Object.assign(data, questions[data.currentQuestion])
    if (data.choices.length > 2)
        data.choices = shuffle(data.choices)
    io.sockets.emit('question', Object.assign({}, getData()))
  })

  socket.on('showTestQuestion', () => {
    data.pauseTime = false
    data.questionReady =  false
    data.isTestQuestion =  true
    clearBuzzers()
    currentTestQuestion = (currentTestQuestion + 1) % testQuestions.length
    // const rand = testQuestions[Math.floor(Math.random() * testQuestions.length)];
    Object.assign(data, testQuestions[currentTestQuestion])
    if (data.choices.length > 2)
        data.choices = shuffle(data.choices)
    io.sockets.emit('question', Object.assign({}, getData()))
  })

  socket.on('questionReady', () => {
    data.questionReady =  true
    io.sockets.emit('enableBuzzer', null)
  })

  socket.on('questionClose', () => {
    data.questionReady =  false
    io.sockets.emit('disableBuzzer')
  })

  socket.on('selection', (choice) => {
    io.sockets.emit('answerSelected', choice)
  })

  socket.on('lock', (answerChosen) => {
    io.sockets.emit('answerlock', answerChosen)
    io.sockets.emit('score', answerChosen, Object.assign({}, getData()) )

  })

  socket.on('pauseTime', (pauseTime) => {
    data.pauseTime = pauseTime
    io.sockets.emit('pauseQuestion', pauseTime)
  })

  socket.on('pauseMusic', (pauseMusic) => {
      data.pauseMusic = pauseMusic
    io.sockets.emit('musicToggle', pauseMusic)
  })

  socket.on('pauseIntroMusic', (pauseIntroMusic) => {
      data.pauseIntroMusic = pauseIntroMusic
    io.sockets.emit('introMusicToggle', pauseIntroMusic)
  })

  socket.on('introTrackEnded', () => {
     data.pauseIntroMusic = true
     io.sockets.emit('introTrackEnd')
  })

  socket.on('pauseShowdownMusic', (pauseShowdownMusic) => {
      data.pauseShowdownMusic = pauseShowdownMusic
    io.sockets.emit('showdownMusicToggle', pauseShowdownMusic)
  })

  socket.on('pauseSoundFX', (soundFX) => {
        data.pauseSoundFX = soundFX
        io.sockets.emit('soundFXToggle', soundFX)
  })

  socket.on('volMusic', (vol) => {
        data.musicVol = vol
        io.sockets.emit('musicVolume', data.musicVol)
  })

  socket.on('volTimer', (vol) => {
        data.timerVol = vol
        io.sockets.emit('timerVolume', data.timerVol)
  })

  socket.on('answerShown', (item) => {
        io.sockets.emit('sayAnswerShown', item)
  })

  socket.on('unLockLogo', () => {
        io.sockets.emit('unLockLogo')
  })

  socket.on('updateCurrentQuestion', (num) => {
    data.currentQuestion = num
  })

  socket.on('disconnect', () => {
    data.users.delete(socket.id)
    io.emit('active', [...data.users].length)
  });


})

server.listen(port, () => {
    console.log('Listening on ', gameUrl)
    console.log('Host URL: ', `${gameUrl}/host`)
    console.log(`Login: ${AUTH.login}/${AUTH.password}`)
    open(`${gameUrl}/view`)
   // open(`${gameUrl}/host`)
})



function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
