﻿var currentPage = 1;
var idCookieName = 'my-id';
var playerId;
var isAdmin; // todo чёто в game запихали, чёто тут, бардак!
var isJoin;
var spinWheelAnimationStop;
var game = {};
var state;
var selectLevel = null;

setInterval(function () {
    getStatus();
}, 1000);

function init() {
    refreshPage();
    game.level = 1;
    if (window.location.search.includes('admin')) {
        isAdmin = true;
        let btns = document.getElementById('AdminButtons');
        btns.classList.remove('hidden');
        document.getElementById('TeamBlock').classList.add('hidden');
        document.getElementById('GameStatus').classList.remove('hidden');
    }

    let id = getCookie(idCookieName);
    if (id == null) {
        id = uuidv4();
        setCookie(idCookieName, id, 1);
    }
    playerId = id;

    getStatus();
}


function getStatus() {
    SendRequest({
        method: 'POST',
        url: '/Home/GetState',
        body: {
            playerId,
            isAdmin,
        },
        success(data) {
            state = JSON.parse(data.responseText);
            drawState();
        },
    });
}

function drawState() {
    isJoin = !!state.player;

    let players;
    if (state.players) {
        players = [];
        for (var i = 0; i < state.players.length; i++) {
            let player = {
                id: state.players[i].id,
                placeNumber: state.players[i].placeNumber,
                teamNumber: state.players[i].teamNumber,
                name: state.players[i].name,
                descriptionn: state.players[i].descriptionn,
                image: state.players[i].image,
                isSingle: state.players[i].isSingle,
            };
            players.push(player);
        }
        game.players = players;
    }

    let status = {
        welcome: 0,
        whellrun: 1,
        started: 2,
        finish: 3,
    };

    if (isAdmin) {
        if (state.gameState === status.started) {
            let info = '';
            for (let i = 0; i < state.players.length; i++) {
                let color = '';
                if (state.players[i].answers.length === state.question.id + 1) {
                    color = "answered";
                }
                info += `<div class="player-answer-count  ${color}">#${state.players[i].teamNumber} (${state.players[i].name}): ${state.players[i].answers.length}</div>`;
            }

            let gameStatusDiv = document.getElementById('GameStatus');
            gameStatusDiv.innerHTML = info;

            toQuestionPage(state.question, state.answer);

        } else {
            if (state.gameState === status.finish) {
                toAdminStatPage(state.players);
            } else {
                // todo magic 2
                changePage(2);
            }
        }
    } else {
        let title = document.getElementById('TeamTitle');
        let teamNumber = document.getElementById('TeamNumber');

        if (state.player != null) {
            let text = "№" + state.player.teamNumber;

            if (teamNumber.innerHTML !== text) {
                teamNumber.innerHTML = text;
            }
        } else {
            if (teamNumber.innerHTML !== "") {
                teamNumber.innerHTML = "";
            }
        }

        const skinBlock = document.getElementById('SkinBlock');

        if (state.player != null && state.player.name && spinWheelAnimationStop) {
            let nameLabel = document.getElementById('TeamTitleName');

            if (state.player.name !== nameLabel.innerHTML) {
                title.classList.remove('hidden');
                nameLabel.innerHTML = state.player.name;
                let image = document.getElementById('TeamTitleImage');
                image.src = "/images/skins/" + state.player.image;
            }

            if (!skinBlock.querySelector('div')) {
                const card = document.createElement('div');
                card.className = 'player-card';

                const img = new Image();
                img.src = "/images/skins/" + state.player.image;
                img.className = 'player-image';
                img.alt = state.player.name;

                const name = document.createElement('div');
                name.className = 'player-name';
                name.textContent = state.player.name;

                const description = document.createElement('div');
                description.className = 'player-description';
                description.textContent = state.player.descriptionn;

                card.appendChild(img);
                card.appendChild(name);
                card.appendChild(description);

                card.style.opacity = 0;
                setTimeout(() => card.style.opacity = 1, 50);

                skinBlock.innerHTML = '';
                skinBlock.style.animation = 'slideDown 0.5s ease-out';
                skinBlock.classList.add('active');
                skinBlock.classList.remove('hidden');
                skinBlock.appendChild(card);
            }

            if (state.question) {
                toSelectLevelPage(state);
            } else {
                if (state.gameState === status.finish) {
                    toStatPage(state);
                }
            }
        } else {
            title.classList.add('hidden');
            skinBlock.classList.remove('active');
            skinBlock.classList.add('hidden');
            skinBlock.innerHTML = '';
            if (isJoin) {
                changePage(2);
            } else {
                changePage(1);
            }
        }
    }

    if (currentPage === 2) {
        if (game.sectorValue == null && state.sectorValue != null) {
            game.sectorValue = state.sectorValue;
            spinWheelAnimation(game.sectorValue);
        }

        if (game.players) {
            if (game.prevDrawPlayersLength !== game.players.length) {
                // todo ебучая этажерка
                game.prevDrawPlayersLength = game.players.length;

                // todo сделать, чтоб анимация не прерывалась
                const circleImages = document.querySelectorAll('.circle-img');
                circleImages.forEach(img => img.remove());

                const container = document.querySelector('#RuletkaHolder');
                const centerX = 125;
                const centerY = 125;
                const radius = 150;

                for (let i = 0; i < 12; i++) {
                    let isPlaceBusy = false;
                    let number;
                    for (let j = 0; j < game.players.length; j++) {
                        if (i === game.players[j].placeNumber) {
                            isPlaceBusy = true;
                            number = game.players[j].teamNumber;
                            break;
                        }
                    }

                    if (!isPlaceBusy) {
                        continue;
                    }

                    const angle = i * (2 * Math.PI / 12) - Math.PI / 2;

                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);

                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'circle-img';
                    imgDiv.style.left = `${x}px`;
                    imgDiv.style.top = `${y}px`;

                    imgDiv.innerHTML = '<img src="/images/teams/' + number + '.png" alt="img">';

                    container.appendChild(imgDiv);
                }
            }
        }
    } else {
        game.prevDrawPlayersLength = 0;
    }
}

function changePage(page) {
    if (currentPage === page) {
        // отключить мерцание
        return;
    }
    currentPage = page;
    refreshPage();
}

function refreshPage() {
    document.querySelectorAll(".game-page").forEach(element => element.classList.add('hidden'));
    document.getElementById('page-' + currentPage).classList.remove('hidden');

    if (currentPage === 1) {
        document.body.classList.add('page-1-background');
    } else {
        document.body.classList.remove('page-1-background');
    }
}

function setMode(val) {
    SendRequest({
        method: 'POST',
        url: '/Home/Join',
        body: {
            playerId,
            isAdmin,
            isSingle: val,
        },
        success(data) {
            spinWheelAnimationStop = false;
            var ruletkaDiv = document.getElementById('ruletka');
            ruletkaDiv.style.transition = "";
            ruletkaDiv.style.transform = "";
            isJoin = true;
            game.sectorValue = null;
            selectLevel = null;
            document.getElementById('LevelBtn1').disabled = false;
            document.getElementById('LevelBtn2').disabled = true;
            changePage(2);
        },
    });
}

function setLevel(elem, val) {
    game.level = val;
    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
    elem.classList.add('active');
}

function initGame() {
    SendRequest({
        method: 'POST',
        url: '/Home/InitGame',
        body: {},
        success(data) {
            spinWheelAnimationStop = false;
            var ruletkaDiv = document.getElementById('ruletka');
            ruletkaDiv.style.transition = "";
            ruletkaDiv.style.transform = "";
            game.sectorValue = null;
        },
    });
}

function startGame() {
    SendRequest({
        method: 'POST',
        url: '/Home/StartGame',
        body: {
            level: game.level,
        },
        success(data) {
        },
    });
}

function nextQuestion() {
    const confirmBtn = document.querySelector('.confirm-btn');
    if (confirmBtn) {
        confirmBtn.remove();
    }

    loadQuestion();
}

function loadQuestion() {
    SendRequest({
        method: 'POST',
        url: '/Home/GetNextQuestion',
        body: {
            level: game.level,
        },
        success(data) {
            const question = JSON.parse(data.responseText);
            if (question) {
                toQuestionPage(question);
            }
        },
    });
}

var selectValueQuestion;

function toSelectLevelPage(state) {
    prevStatText = null;
    selectValueQuestion = state.question;
    if (state.level === 2) {
        document.getElementById('LevelBtn1').disabled = true;
        document.getElementById('LevelBtn2').disabled = false;
    }
    if (selectLevel === state.level || state.player.answers.length > 0) {
        selectLevel = state.level;
        toQuestionPage(state.question, state.answer);
    } else if (selectLevel == null) {
        changePage(3);
    } else if (state.player.answers1 != null && selectLevel === 1) {
        changePage(3);
    }
}

function fakeLevel(elem, level) {
    selectLevel = level;
    toQuestionPage(selectValueQuestion);
    document.getElementById('LevelBtn1').disabled = true;
    document.getElementById('LevelBtn2').disabled = false;
}

function toQuestionPage(question, answer = null) {
    if (currentQuestion !== question.text) {
        currentAnswer = null;
        currentQuestion = question.text;
        renderQuestion(question);

        const explanationContainer = document.getElementById('Explanation');

        explanationContainer.classList.remove('visible');
        explanationContainer.innerHTML = '';

        document.querySelectorAll('.text-input').forEach(input => {
            input.value = '';
            input.removeAttribute('readonly');
            input.classList.remove('correct-answer', 'wrong-answer');
        });

        document.querySelectorAll('.option-btn')
            .forEach(btn => btn.classList.remove('active', 'correct-answer', 'disabled'));
    }

    if (answer) {
        if (currentAnswer !== answer.value) {
            currentAnswer = answer.value;
            const explanationContainer = document.getElementById('Explanation');

            const isCorrect = answer.isCorrect;

            const inputs = document.querySelectorAll('.text-input');
            const optionBtns = document.querySelectorAll('.option-btn');

            if (inputs.length > 0) {
                inputs.forEach(input => input.classList.add(isCorrect ? 'correct-answer' : 'wrong-answer'));
            } else {
                optionBtns.forEach(btn => {
                    if (btn.innerText === state.correctAnswer) {
                        btn.classList.add('correct-answer');
                    }
                    if (btn.innerText === answer.value) {
                        btn.classList.add('active');
                    }
                });
            }

            const confirmBtn = document.querySelector('.confirm-btn');
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Ответ принят';

            if (inputs.length > 0) {
                inputs.forEach(input => input.setAttribute('readonly', true));
            } else if (optionBtns.length > 0) {
                optionBtns.forEach(btn => btn.classList.add('disabled'));
            }

            explanationContainer.classList.add('visible');

            const explanationImage = document.createElement('img');
            if (selectLevel === 1) {
                explanationImage.src = `/images/explanations-1/q${question.id + 1}.png`;
            } else {
                explanationImage.src = `/images/explanations-2/q${question.id + 1}.png`;
            }
            explanationImage.className = 'explanation-image';
            explanationContainer.appendChild(explanationImage);

            setTimeout(() => {
                explanationContainer.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'center',
                });
            }, 500);
        }
    }

    changePage(4);
}

function toStatPage(state) {
    renderStat(state);
    changePage(5);
}

var prevStatText = null;

function renderStat(state) {
    let correct = 0;
    for (let i = 0; i < state.player.answers.length; i++) {
        correct += state.player.answers[i].isCorrect;
    }

    const total = state.player.answers.length;
    const stars = '★'.repeat(correct) + '☆'.repeat(total - correct); // Генерация строки со звездами

    let text;

    if (state.level === 1) {
        let result;

        if (correct < 3) {
            result = "«Пу - пу - пу», – вздохнул бы Дмитрий Иванович. – «На кого страну оставил... Ничего, слушайте выступающих внимательно, стало быть и преисполнитесь знаниями»";
        } else if (correct < 5) {
            result = "Хорошо! Несколько ошибок – нестрашно, потому что впереди вас ждут увлекательные доклады. Внимательно их слушайте :)";
        } else {
            result = "Великолепно! Кажется, у вас личное знакомство с Менделеевым и компанией... Либо внимательно слушали лекции в течение четырёх лет учёбы!";
        }

        text = `<div class="result-container">
            <label class="stat-stars">${stars}</label>
            <label class="stat-label">${correct}/${state.player.answers.length}</label>
            <label class="stat-desc">${result}</label>
        </div>`;

    } else {
        let src;
        if (correct < 3) {
            src = `/images/results-2/1.png`;
        } else if (correct < 5) {
            src = `/images/results-2/2.png`;
        } else {
            src = `/images/results-2/3.png`;
        }

        text = `<div class="result-container">
            <label class="stat-stars">${stars}</label>
            <label class="stat-label">${correct}/${state.player.answers.length}</label> 
            <img src="${src}" class="explanation-image" />
        </div>`;
    }

    if (prevStatText !== text) {
        document.getElementById('StatBlock').innerHTML = text;
        prevStatText = text;
    }
}

function toAdminStatPage(players) {
    let html = "";
    for (const player of players) {
        let correct = 0;
        const wrongAnswers = [];
        for (const [i, answer] of player.answers.entries()) {
            if (answer.isCorrect) {
                correct++;
            } else {
                wrongAnswers.push(i + 1);
            }
        }

        let additionalInfo = "";
        if (player.answers1 && player.answers1.length > 0) {
            let correct1 = 0;
            const wrongAnswers1 = [];
            for (const [i, answer] of player.answers1.entries()) {
                if (answer.isCorrect) {
                    correct1++;
                } else {
                    wrongAnswers1.push(i + 1);
                }
            }

            additionalInfo = `
                <div class="answer-group additional-answers">                 
                    <span class="stats">Б: ${correct1}/${player.answers1.length}</span>
                    ${wrongAnswers1.length ? `
                    <span class="errors">
                        Ошибки: <span class="error-numbers">${wrongAnswers1.join(', ')}</span>
                    </span>` : ''}
                </div>
            `;
        }

        let char = player.answers1 && player.answers1.length > 0 ? 'П:' : 'Б:';
        html += `
            <div class="player-stats">
                <div class="team-info">
                    <span class="team-number">#${player.teamNumber}</span>
                    <span class="player-name2">${player.name}</span>
                </div>
                
                ${additionalInfo}                
              
                <div class="answer-group main-answers">
                    <span class="stats">${char} ${correct}/${player.answers.length}</span>
                    ${wrongAnswers.length ? `
                    <span class="errors">
                        Ошибки: <span class="error-numbers">${wrongAnswers.join(', ')}</span>
                    </span>` : ''}
                </div>                
            </div>
        `;
    }

    const stateBlock = document.getElementById('StatBlock');
    if (stateBlock.innerHTML !== html) {
        stateBlock.innerHTML = html;
    }

    changePage(5);
}

var currentQuestion = null;
var currentAnswer = null;

function renderQuestion(question) {
    const block = document.getElementById('QuestionBlock');
    let questionShow = '';
    let qtype = "question-type-" + question.type;
    if (question.type === 'text') {
        questionShow = `<div class="text-inputs-container">
            ${Array.from({ length: 4 }, (_, i) => `
            <input type="text" class="text-input" maxlength="1" data-index="${i}">
        `).join('')}
        </div>`;
    } else if (question.type === 'multiple') {
        questionShow = `<div class="options-table">${question.options.map(o => `
                <div class="option-btn">${o}</div>
            `).join('')}</div>`;
    } else if (question.type === 'link') {
        let abc = "ABC";
        questionShow = `<div class="options-table-link ${qtype}">`;

        let divs = [];
        question.options.forEach((option, index) =>
            divs.push(`
            <div class="option-item" data-index="${index}">
              <span class="option-label">${abc[index]}</span>
              <span class="option-text">${option}</span>
            </div>
          `));

        divs.push('<div></div>');

        let divs2 = [];
        if (question.targetOptions) {
            question.targetOptions.forEach((target, index) =>
                divs2.push(`
                  <div class="target-option" data-index="${index}">
                    <span class="target-number">${index + 1}</span>
                    <span class="target-text">${target}</span>
                  </div>
                `));
        }

        const result = divs.map((element, index) => [
            element,
            divs2[index],
        ]);

        result.forEach(div => {
            questionShow += div[0];
            questionShow += div[1];
        });
        questionShow += '</div>';

        questionShow += `
          <div class="text-inputs-container">
            ${Array.from({ length: 3 }, (_, i) => `
              <input type="number" placeholder="${abc[i]}" class="text-input" maxlength="1" data-index="${i}">
            `).join('')}
          </div>
        `;
    } else {
        alert('всё сломалось');
    }

    block.innerHTML = `
        <h3>Вопрос ${question.id + 1}</h3>
        <div class="question-text">${question.text}</div>
        ${questionShow}`;

    const answerContainer = document.getElementById('AnswerBlock');
    answerContainer.innerHTML = "";
    if (isAdmin) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Следующий вопрос';
        nextBtn.onclick = nextQuestion;
        nextBtn.disabled = false;
        answerContainer.appendChild(nextBtn);
        return;
    }

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-info confirm-btn';
    confirmBtn.textContent = 'Подтвердить ответ';
    confirmBtn.disabled = true;
    confirmBtn.onclick = submitAnswer;
    answerContainer.appendChild(confirmBtn);

    const inputs = document.querySelectorAll('.text-input');
    const optionBtns = document.querySelectorAll('.option-btn');

    if (question.type === 'text' || question.type === 'link') {
        inputs.forEach((input, index) => {
            input.addEventListener('input', e => {
                if (e.target.value.length === 1) {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                }
                const allFilled = Array.from(inputs).every(i => i.value.trim() !== '');
                confirmBtn.disabled = !allFilled;
            });

            input.addEventListener('keydown', e => {
                if (e.key === 'Backspace' && !e.target.value) {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    }
                }
            });
        });
    } else if (question.type === 'multiple') {
        optionBtns.forEach(btn =>
            btn.addEventListener('click', function () {
                if (!this.classList.contains('disabled')) {
                    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                }
                confirmBtn.disabled = false;
            }));
    }
}


function submitAnswer() {
    const inputs = document.querySelectorAll('.text-input');
    const selectedOption = document.querySelector('.option-btn.active');
    const confirmBtn = document.querySelector('.confirm-btn');

    let answer;

    if (inputs.length > 0) {
        answer = Array.from(inputs).map(input => input.value.trim()).join('').toUpperCase();
        inputs.forEach(input => input.setAttribute('readonly', true));
    } else if (selectedOption) {
        answer = selectedOption.innerText;
        document.querySelectorAll('.option-btn').forEach(btn => btn.classList.add('disabled'));
    }

    SendRequest({
        method: 'POST',
        url: '/Home/SetAnswer',
        body: {
            value: answer,
            playerId,
        },
        success(data) {
            if (isAdmin) {
                confirmBtn.textContent = 'Следующий вопрос';
                confirmBtn.onclick = nextQuestion;
                confirmBtn.disabled = false;
            }
        },
    });
}

document.addEventListener('DOMContentLoaded', init);

function spinWheel() {
    SendRequest({
        method: 'POST',
        url: '/Home/SpinWhell',
        body: {},
        success(data) {
            //const result = JSON.parse(data.responseText);
            //spinWheelAnimation(result.sectorValue);
        },
    });
}

function spinWheelAnimation(sectorValue) {
    //const sectorValue = getRandomInt(1, 12);
    // 360 градусов это 12 сектаров, значит 1 сектор это 360 / 12 = 30 градусов
    const sector = 30;

    let ruletkaDiv = document.getElementById('ruletka');

    let rounds = getRandomInt(2, 5);
    const time = getRandomInt(3, 8);
    let angle = rounds * 360 + sectorValue * sector;
    ruletkaDiv.style.transition = `transform ${time}s cubic-bezier(0.1, 0.7, 0.1, 1)`;
    ruletkaDiv.style.transform = `rotate(${angle}deg)`;
    setTimeout(function () {
        spinWheelAnimationStop = true;
        drawState();
    }, (time + 1) * 1000);
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function SendRequest(options) {
    let _this = {};
    let defaultOptions = {
        method: 'POST',
    };

    _this.options = Object.assign({}, defaultOptions, options);

    _this.Send = function () {
        let xhr = new XMLHttpRequest();
        xhr.open(_this.options.method, _this.options.url, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.onreadystatechange = function () {
            if (this.readyState != 4) {
                return;
            }
            if (this.status == 200) {
                if (_this.options.success) {
                    _this.options.success(this);
                }
            } else if (this.status == 400) {
                showAlert('Внимание', this.responseText, 5);
            } else {
                if (_this.options.error) {
                    _this.options.error(this);
                } else {
                    showAlert('Ошибка', 'чтото пошло не так', 2);
                }
            }
            if (_this.options.always) {
                _this.options.always(this);
            }
        };
        xhr.send(JSON.stringify(_this.options.body));
    };
    _this.Send();
}

var globalAlertId = 0;

function showAlert(title, message, timeoutSeconds) {
    globalAlertId++;
    let alertId = globalAlertId;
    if (!document.getElementById('userAlertsBody')) {
        let alertsBody = document.createElement('div');
        alertsBody.id = 'userAlertsBody';
        alertsBody.classList.add('alerts-body');
        document.body.append(alertsBody);
    }

    let alert = document.createElement('div');
    alert.id = 'alert-' + alertId;
    alert.classList.add('alert');
    alert.classList.add('alert-warning');
    document.getElementById('userAlertsBody').append(alert);
    alert.innerHTML =
        "    <a class='close' href='#' onclick='hideAlert(this)'>X</a>"
        + "    <h4></span>" + title + "</h4>"
        + "    <label>" + message + "</label>";

    if (timeoutSeconds) {
        setTimeout(function () {
            hideAlertById(alert.id);
        }, timeoutSeconds * 1000);
    }
}

function hideAlertById(alertId) {
    document.getElementById(alertId).remove();
}

function hideAlert(elem) {
    let alertBlock = elem.closest('.alert');
    alertBlock.remove();
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16),
    );
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function deleteCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
