const socket = io()
const form = document.querySelector('.js-join')
const joined = document.querySelector('.js-joined')

const buzzer = document.querySelector('.js-buzzer')
const joinedInfo = document.querySelector('.js-joined-info')
const answers = document.querySelector('.js-answers')
const viewquestion = document.querySelector('.js-question')

let user = {}

const getUserInfo = () => {
  user = JSON.parse(localStorage.getItem('user')) || {}
  if (user.team) {
    form.querySelector('[name=team]').value = user.team
  }
}
const saveUserInfo = () => {
  localStorage.setItem('user', JSON.stringify(user))
}

window.addEventListener('DOMContentLoaded', getUserInfo)
// buzzer.disabled = true

form.addEventListener('submit', (e) => {
  e.preventDefault()
  user.team = form.querySelector('[name=team]').value
  socket.emit('join', user)
  saveUserInfo()
  joinedInfo.innerText = `Team ${user.team}`
  form.classList.add('hidden')
  joined.classList.remove('hidden')
})

buzzer.addEventListener('click', (e) => {
  socket.emit('buzz', user)
  window.navigator.vibrate(300)
})


socket.on('connected', (data) => {
  if (data.questionReady)
      enableBuzzer()
  else
      disableBuzzer()
  first(data)
})

socket.on('first', (data) => {
    first(data)
})

socket.on('clear', () => {
    buzzer.classList.remove('first')
    closeChoice()
})

socket.on('enableBuzzer', () => {
   enableBuzzer()
})

socket.on('disableBuzzer', () => {
    disableBuzzer()
})


function first(data) {
    if ( user.team === data.first) {
        buzzer.classList.add('first')
        displayChoices(data)
    } else if ( data.first.length ) {
       buzzer.classList.add('hidden-fly')
    }
}

 function displayChoices(data) {
    answers.innerHTML = ''
    viewquestion.innerHTML = ''
    if ( data.choices && data.choices.length && user.team === data.first ) {
        answers.classList.remove('hidden')
        viewquestion.classList.remove('hidden')
        buzzer.classList.add('hidden-fly')
        viewquestion.innerHTML = data.question
        if (!data.lock) {
            let html = '<ul class="view-answers buzz">';
            data.choices.forEach( (answer, i) => {
                html += `<li>
                        <label for="${answer}" class="label">
                        ${answer}
                    </label></li>`
            })
            html += '</ul>'
            answers.innerHTML = html
        }
    }
}

function disableBuzzer() {
    buzzer.disabled = true
}

function enableBuzzer() {
    buzzer.classList.remove('hidden-fly')
    buzzer.disabled = false
}

 function closeChoice() {
    answers.classList.add('hidden')
    viewquestion.classList.add('hidden')
    buzzer.classList.remove('hidden-fly')
    answers.innerHTML = ''
    viewquestion.innerHTML = ''
}