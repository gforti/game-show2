const socket = io()

const question = document.querySelector('h4.storyTitle1.en')
const questionES = document.querySelector('h4.storyTitle1.es')
const img = document.querySelector('.image')
const story = document.querySelector('.story')

const info = document.querySelector('.js-info')
const card = document.querySelector('.js-card')
const cardBack = document.querySelector('.js-back')

let correctAnswer = ''
let chosenAnswer = null
let clockTimer = null
let timeLeft = 0
let pauseTime = false
let pauseMusic = true
let showBuzzTeam = false
let questionReady = false
let pauseSoundFX = false

let s_correct = new Audio(`fx/correct.mp3`)
let s_wrong = new Audio(`fx/wrong.mp3`)
let s_lock = new Audio(`fx/lock.wav`)
let s_buzz = new Audio(`fx/buzz.wav`)

let s_10sec = new Audio(`timer/10sec.mp3`)
let s_30sec = new Audio(`timer/30sec.mp3`)
let s_60sec = new Audio(`timer/60sec.mp3`)


let introTrack = new Audio(`tracks/intro.mp3`)
let showdownTrack = new Audio(`tracks/showdown.mp3`)
let pauseShowdownMusic = true
introTrack.volume = 0.1
introTrack.addEventListener('ended',()=>{
    socket.emit('introTrackEnded')
})
showdownTrack.volume = 0.1
showdownTrack.addEventListener('ended',()=>{
    showdownTrack.currentTime = 0
    showdownTrack.play()
})
let tracks = [];
for (let i = 4; i <= 4; i++)
tracks.push(new Audio(`tracks/track${i}.mp3`))

// tracks.sort(function() {return 0.5 - Math.random()})

let currentTrack = 0
let allTracks = x = tracks.length

while (x--) {
    tracks[x].addEventListener('ended',playNextTrack)
    tracks[x].volume = 0.1
}


let QuestionSeconds = 0

let startTimerTimer =
    cardBackTimer =
    cardTimer = null
let answer1Timer, answer2Timer, answer3Timer,
    answer4Timer, questionReadyTimer, showCorrectAnswerTimer

let words = ''

socket.on('connected', (data) => {
    pauseTime = data.pauseTime
    pauseMusic = data.pauseMusic
    pauseSoundFX = data.pauseSoundFX
    pauseShowdownMusic = data.pauseShowdownMusic

    setMusicVolume(data.musicVol)
    setTimerVolume(data.timerVol)
    playMusic()

    if (data.questionReady ) {
        socket.emit('clear')
        prepareQuestion(data)
    }



})


socket.on('buzzes', (buzzes) => {
    if (isQuestionClosed()) return
    if (showBuzzTeam && buzzes.length) {
      showBuzzTeam = false
      info.innerHTML = `Team ${buzzes[0]}`
      info.classList.add('info-display')
      if (!pauseSoundFX) s_buzz.play()
    }

})

socket.on('clear', () => {
    if (chosenAnswer === null) {
        const choice = document.querySelector('li.highlight')
        //info.classList.remove('info-display')
        if (choice) choice.classList.remove('highlight')
        showBuzzTeam = true
        info.innerHTML = ''
    }
})

socket.on('intro', () => {
    info.classList.remove('stamp', 'wrong', 'correct')
    cardBack.classList.add('hide')
    card.classList.remove('flipped')
    questionClose(false)

})

socket.on('question', (data) => {

    prepareQuestion(data)
})


function prepareQuestion(data) {
    clearTimeout(startTimerTimer)
    clearTimeout(cardBackTimer)
    clearTimeout(cardTimer)
    clearTimeout(answer1Timer)
    clearTimeout(answer2Timer)
    clearTimeout(answer3Timer)
    clearTimeout(answer4Timer)
    clearTimeout(questionReadyTimer)
    clearTimeout(showCorrectAnswerTimer)

    introTrack.pause()
    pauseTimerMusic()
    showBuzzTeam = true
    info.classList.remove('stamp', 'wrong', 'correct')
    cardBack.classList.add('hide')
    card.classList.remove('flipped')

    displayChoices(data)
    setTimer()
    startTimerTimer = setTimeout(startTimer, 3000)

  
    cardTimer = setTimeout(()=>{
        card.classList.add('flipped')
        cardBack.classList.remove('hide')
    }, 2000)
}

socket.on('answerSelected', (choice) => {
    if (isQuestionClosed()) return
    highlightChoice(choice)
})

function highlightChoice(choice) {
 
}

socket.on('answerlock', (answerChosen) => {
    if (isQuestionClosed()) return
    highlightChoice(answerChosen)
    const choice = document.querySelector('li.highlight')
    if (choice) choice.classList.add('locked')
    pauseTime = true
    chosenAnswer = answerChosen
    questionClose()
    if(!pauseSoundFX) s_lock.play()
})

function isQuestionClosed() {
    return !!(chosenAnswer !== null || !questionReady)
}

socket.on('pauseQuestion', (timeState) => {
    if (timeLeft > 0 && clockTimer) {
        pauseTime = timeState
     }
})

socket.on('musicToggle', (musicStop) => {
    pauseMusic = musicStop
    playMusic()
})

function playMusic() {
    if (pauseMusic) {
        stopTrack()
    } else {
        playTrack()
    }
}

socket.on('introMusicToggle', (musicStop) => {
    if (musicStop) {
        introTrack.pause()
        introTrack.currentTime = 0
    } else {
        introTrack.play()
    }
})

socket.on('showdownMusicToggle', (musicStop) => {
    pauseShowdownMusic = musicStop
    playMusic()
})

socket.on('musicVolume', (musicVol) => {
    setMusicVolume(musicVol)
})

socket.on('timerVolume', (musicVol) => {
    setTimerVolume(musicVol)
})

socket.on('soundFXToggle', (soundFX) => {
    pauseSoundFX = soundFX
})


socket.on('selectionToggle', (data) => {
    if ( !data.allowSelection )
        highlightChoice(null)
})



function displayChoices(data) {
    //console.log('what is going on?', data)
    info.innerHTML = ''
    info.classList.remove('stamp')
    question.innerHTML = ''
    chosenAnswer = null
    if ( data.choices && data.choices.length ) {
        correctAnswer = data.answer
        timeLeft = data.time
        QuestionSeconds = data.time
        resetTimerMusic()
        question.innerHTML = data.question
        img.src = data.img
        story.innerHTML = data.note
        questionES.innerHTML = data.questionES || ''
        words = data.question.split(" ")
        question.classList.remove('question-swoop')
        questionES.classList.remove('question-swoop')
        question.classList.add('hide')
        questionES.classList.add('hide')

       

    }
}

function setTimer() {
    clearInterval(clockTimer)
    pauseTime = false
    socket.emit('pauseTime', pauseTime)
}



function startTimer() {

    question.classList.add('question-swoop')
    question.classList.remove('hide')
    questionES.classList.add('question-swoop')
    questionES.classList.remove('hide')

    let delay = Math.ceil(words.length/3) * 1000
    const DELAY_BY = 1500
    const DELAY_BY_EXTRA = 1000

    delay += DELAY_BY
    questionReadyTimer = setTimeout(()=>{
        socket.emit('questionReady')
        questionReady = true
        clockTimer = setInterval(countdown, 1000)
        playTimerMusic()
    }, delay)
}

function countdown() {
    if (timeLeft <= 0) {
        clearInterval(clockTimer)
        return
    }
    if (!pauseTime) {
        playTimerMusic()
        timeLeft--
    } else {
        pauseTimerMusic()
    }

}

function questionClose(show = true) {
    pauseTimerMusic()
    clearInterval(clockTimer)
    questionReady = false
    socket.emit('questionClose')
    if (show)
        showCorrectAnswerTimer = setTimeout(showCorrectAnswer, 3000)
}

function showCorrectAnswer() {

    info.innerHTML = correctAnswer

    if(correctAnswer.trim().toLowerCase() === 'real') {
        info.classList.add('correct')
    } else {
        info.classList.add('wrong')
    }
    
    if ( correctAnswer.length &&  chosenAnswer !== null && chosenAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
        
        if(!pauseSoundFX) s_correct.play()
    } else {
        
        if(!pauseSoundFX) s_wrong.play()
    }
    info.classList.add('stamp')
    socket.emit('unLockLogo')
}


function playTimerMusic() {
    if(pauseSoundFX) {
        pauseTimerMusic()
        return
    }
    stopTrack()
    if (QuestionSeconds == 10) {
        s_10sec.play()
    }
    if (QuestionSeconds == 30) {
        s_30sec.play()
    }
    if (QuestionSeconds == 60) {
        s_60sec.play()
    }
}

 function pauseTimerMusic() {
      s_10sec.pause()
      s_30sec.pause()
      s_60sec.pause()
      playMusic()
 }

 function resetTimerMusic() {
    s_10sec.currentTime = 0
    s_30sec.currentTime = 0
    s_60sec.currentTime = 0
 }

  function setTimerVolume(vol) {
    s_10sec.volume = vol
    s_30sec.volume = vol
    s_60sec.volume = vol
 }

setTimerVolume(0.1)




function stopTrack() {
    tracks[currentTrack].pause()
    showdownTrack.pause()
}

function playTrack() {
    if ( pauseShowdownMusic ) {
        showdownTrack.pause()
        tracks[currentTrack].play()
    } else {
        tracks[currentTrack].pause()
        showdownTrack.play()
    }
}

function playNextTrack() {
     currentTrack = (currentTrack + 1) % allTracks
     playTrack()
}

function setMusicVolume(musicVol) {
    introTrack.volume = musicVol
    showdownTrack.volume = musicVol
    tracks.forEach((track) => {
        track.volume = musicVol
    })
}


// window.addEventListener('DOMContentLoaded', ()=>{introTrack.play()})
