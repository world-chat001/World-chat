const questions = [
{
question: "What would you choose for a perfect weekend?",
answers: ["Movies", "Gaming", "Travelling", "Staying home"]
},
{
question: "What kind of food would you choose?",
answers: ["Pizza", "Rice", "Burger", "Pasta"]
},
{
question: "What sounds more fun?",
answers: ["Beach", "Concert", "Road trip", "Game night"]
},
{
question: "Which describes you best?",
answers: ["Funny", "Calm", "Adventurous", "Competitive"]
},
{
question: "What would you rather receive?",
answers: ["A gift", "A handwritten note", "A surprise trip", "Food"]
},
{
question: "What do you enjoy most?",
answers: ["Music", "Movies", "Games", "Sports"]
},
{
question: "Pick a dream destination.",
answers: ["Paris", "Dubai", "London", "New York"]
},
{
question: "What would you do on a free day?",
answers: ["Sleep", "Go out", "Play games", "Watch movies"]
},
{
question: "Which matters most in a friendship?",
answers: ["Trust", "Honesty", "Humour", "Loyalty"]
},
{
question: "Pick your ideal evening.",
answers: ["Movie night", "Dinner", "Gaming", "Music"]
}
];

let currentQuestion = 0;
let answersGiven = [];

const questionNumber =
document.getElementById("questionNumber");

const question =
document.getElementById("question");

const answers =
document.getElementById("answers");

const nextBtn =
document.getElementById("nextBtn");

const progressBar =
document.getElementById("progressBar");

const questionArea =
document.getElementById("questionArea");

const resultArea =
document.getElementById("resultArea");

const scoreText =
document.getElementById("scoreText");

const scoreNumber =
document.getElementById("scoreNumber");

const resultMessage =
document.getElementById("resultMessage");

const playAgainBtn =
document.getElementById("playAgainBtn");

const backBtn =
document.getElementById("backBtn");

// ==============================
// BACK BUTTON
// ==============================

backBtn.addEventListener(
"click",
() => {

window.history.back();

}
);

// ==============================
// LOAD QUESTION
// ==============================

function loadQuestion() {

const current =
questions[currentQuestion];

questionNumber.textContent =
"Question ${currentQuestion + 1} of ${questions.length}";

question.textContent =
current.question;

progressBar.style.width =
"${((currentQuestion + 1) / questions.length) * 100}%";

answers.innerHTML = "";

nextBtn.disabled = true;

current.answers.forEach(
(answer) => {

  const button =
    document.createElement("button");

  button.className =
    "answer-button";

  button.type =
    "button";

  button.textContent =
    answer;

  button.addEventListener(
    "click",
    () => {

      selectAnswer(
        button,
        answer
      );

    }
  );

  answers.appendChild(
    button
  );

}

);

}

// ==============================
// SELECT ANSWER
// ==============================

function selectAnswer(
selectedButton,
answer
) {

const buttons =
document.querySelectorAll(
".answer-button"
);

buttons.forEach(
(button) => {

  button.classList.remove(
    "selected"
  );

}

);

selectedButton.classList.add(
"selected"
);

answersGiven[currentQuestion] =
answer;

nextBtn.disabled =
false;

}

// ==============================
// NEXT QUESTION
// ==============================

nextBtn.addEventListener(
"click",
() => {

if (
  !answersGiven[currentQuestion]
) {
  return;
}

if (
  currentQuestion <
  questions.length - 1
) {

  currentQuestion++;

  loadQuestion();

} else {

  showResult();

}

}
);

// ==============================
// SHOW RESULT
// ==============================

function showResult() {

questionArea.style.display =
"none";

nextBtn.style.display =
"none";

resultArea.style.display =
"block";

/*
For now this is a solo game,
so the result is based on
how many questions were answered.

Later we'll connect this to
another WORLD CHAT user so
both answers can be compared.

*/

const answered =
answersGiven.filter(
(answer) =>
answer !== undefined
).length;

const percentage =
Math.round(
(answered / questions.length) * 100
);

scoreNumber.textContent =
"${percentage}%";

if (percentage === 100) {

scoreText.textContent =
  "Perfect Match! 💕";

resultMessage.textContent =
  "You completed every question. Ready to compare with someone?";

} else if (percentage >= 70) {

scoreText.textContent =
  "Great Connection! ❤️";

resultMessage.textContent =
  "You made a strong connection. Try it with a friend!";

} else {

scoreText.textContent =
  "Nice Try! 🌍";

resultMessage.textContent =
  "Play again or challenge another WORLD CHAT user.";

}

}

// ==============================
// PLAY AGAIN
// ==============================

playAgainBtn.addEventListener(
"click",
() => {

currentQuestion = 0;

answersGiven = [];

questionArea.style.display =
  "block";

nextBtn.style.display =
  "block";

resultArea.style.display =
  "none";

loadQuestion();

}
);

// ==============================
// START GAME
// ==============================

loadQuestion();