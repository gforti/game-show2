const socket = io()

const buzzList = document.querySelector('.buzz-in')
const clear = document.querySelector('.js-clear')
const question = document.querySelector('.js-question')
const pause = document.querySelector('.pause')
const timer = document.querySelector('.timer-host')

const currentQuestionNumber = document.querySelector('.current-question')

const choices = document.querySelector('.js-choices')
const lock = document.querySelector('.js-lock')
const reveal = document.querySelector('.js-reveal')
const viewquestion = document.querySelector('.view-question')
const theAnswer = document.querySelector('.the-answer')
const note = document.querySelector('.js-note')

lock.addEventListener('click', lockChoice)
reveal.addEventListener('click', revealAnswer)


let pauseTime = false

const Q_DELAY = 2500
let QTime = 0
let QTimer = null

socket.on('connected', (data) => {
  pauseTime = data.pauseTime

  if (data.questionReady ) {
       displayChoices(data)
    }

})

socket.on('buzzes', (buzzes) => {
    buzzList.innerHTML =  buzzes.length ? `Team ${buzzes[0]}` : ''
})

clear.addEventListener('click', () => {
  socket.emit('clear')
})


pause.addEventListener('click', pauseTimer)
question.addEventListener('click', showQuestion)


function pauseTimer() {
    pauseTime = !pauseTime
    socket.emit('pauseTime', pauseTime)
    setPauseTimerStatus()
}

function setPauseTimerStatus() {
    if (pauseTime) {
        pause.classList.add('is-paused')
    } else {
        pause.classList.remove('is-paused')
    }
}

function showQuestion() {

    socket.emit('showQuestion')
    socket.emit('questionClose')
}


socket.on('enableBuzzer', () => {
   enableChoice()
})

socket.on('disableBuzzer', () => {
   disableChoice()
})


socket.on('pauseQuestion', (pauseState) => {
   pauseTime = pauseState
   setPauseTimerStatus()
})

socket.on('question', (data) => {
    displayChoices(data)
})

socket.on('sayAnswerShown', (item) => {
    highlightAnswerShown(item)
})

function highlightAnswerShown(item) {
    const li = document.querySelector(`ul.host li:nth-child(${item})`)
    if (li) li.classList.remove('highlight')
}


 function displayChoices(data) {

    choices.innerHTML = ''
    viewquestion.innerHTML = ''
    note.innerHTML = ''
    if ( data.choices && data.choices.length ) {
        lock.disabled = false
        reveal.disabled = false
        viewquestion.innerHTML = `${data.question} <div class="es"> ${data.questionES || ''}</div>`
        note.innerHTML = data.note
        QTime = Math.ceil(data.question.split(" ").length/3)+2
        let html = '<ul class="view-answers host">';
        currentQuestionNumber.innerHTML = ~~data.currentQuestion+1

        data.choices.forEach( (answer, i) => {
            html += `<li ${!data.lock ? 'class="highlight"' : ''}>
                    <input  type="radio"
                            name="answer"
                            value="${answer}"
                            id="${answer}"
                    > <label for="${answer}" class="label">
                    ${answer}
                </label></li>`
         })
         html += `</ul>`
         theAnswer.innerHTML = `Answer: ${data.answer.trim()}`
         choices.innerHTML = html
         timer.innerHTML = QTime
         clearTimeout(QTimer)
         QTimer = setTimeout(countdown, Q_DELAY)
    }
}

function countdown() {
    if (QTime > 0) {
        QTime--
        timer.innerHTML = QTime
        QTimer = setTimeout(countdown, 1000)
    }
}

function lockChoice(){
    let answer = document.querySelector('input[name="answer"]:checked')

    if (answer) {
        answer = answer.value
        disableChoice()
        socket.emit('lock', answer)
    }

}

function revealAnswer(){
    disableChoice()
    socket.emit('lock', '')
}

function disableChoice() {
    lock.disabled = true
    reveal.disabled = true
    document.querySelectorAll('input[name="answer"]').forEach( (input) =>{
        input.disabled = true
    })
}

function enableChoice() {
    lock.disabled = false
    reveal.disabled = false
    document.querySelectorAll('input[name="answer"]').forEach( (input) =>{
        input.disabled = false
    })
}
