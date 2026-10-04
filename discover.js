import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const peopleList =
  document.getElementById("peopleList");

const peopleSearch =
  document.getElementById("peopleSearch");

const filterButtons =
  document.querySelectorAll(".filter");


let allPeople = [];

let currentFilter =
  "everyone";


// ================================
// CHECK LOGIN
// ================================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }


    console.log(
      "DISCOVER CURRENT USER:",
      user.uid
    );


    await loadPeople(
      user.uid
    );

  }
);


// ================================
// LOAD ALL USERS
// ================================

async function loadPeople(
  currentUserId
) {

  try {

    peopleList.innerHTML = `

      <div class="loading">

        <span>🌍</span>

        <p>
          Discovering people...
        </p>

      </div>

    `;


    const usersSnapshot =
      await getDocs(
        collection(
          db,
          "Users"
        )
      );


    console.log(
      "USERS FOUND:",
      usersSnapshot.size
    );


    allPeople = [];


    usersSnapshot.forEach(
      (userDoc) => {

        const data =
          userDoc.data();


        console.log(
          "USER DOCUMENT:",
          userDoc.id,
          data
        );


        // Don't show yourself
        if (
          userDoc.id ===
          currentUserId
        ) {

          return;
        }


        allPeople.push({

          id:
            userDoc.id,

          ...data

        });

      }
    );


    console.log(
      "PEOPLE AVAILABLE:",
      allPeople.length
    );


    renderPeople();


  } catch (error) {

    console.error(
      "DISCOVER ERROR:",
      error
    );


    peopleList.innerHTML = `

      <div class="loading">

        <span>⚠️</span>

        <p>
          Unable to discover people.
        </p>

      </div>

    `;

  }

}


// ================================
// RENDER PEOPLE
// ================================

function renderPeople() {

  let people =
    [...allPeople];


  const searchText =
    peopleSearch.value
      .trim()
      .toLowerCase();


  // ==============================
  // SEARCH
  // ==============================

  if (searchText) {

    people =
      people.filter(
        (person) => {

          const name =
            getPersonName(
              person
            ).toLowerCase();


          return name.includes(
            searchText
          );

        }
      );

  }


  // ==============================
  // ONLINE FILTER
  // ==============================

  if (
    currentFilter ===
    "online"
  ) {

    people =
      people.filter(
        (person) => {

          return (
            person.online === true ||
            person.isOnline === true
          );

        }
      );

  }


  // ==============================
  // NEW PEOPLE FILTER
  // ==============================

  if (
    currentFilter ===
    "new"
  ) {

    people.sort(
      (a, b) => {

        return (
          getTime(
            b.createdAt
          ) -
          getTime(
            a.createdAt
          )
        );

      }
    );

  }


  // ==============================
  // NOTHING FOUND
  // ==============================

  if (
    people.length === 0
  ) {

    peopleList.innerHTML = `

      <div class="loading">

        <span>🌎</span>

        <p>
          No people found.
        </p>

      </div>

    `;

    return;

  }


  // ==============================
  // DISPLAY PEOPLE
  // ==============================

  peopleList.innerHTML =
    "";


  people.forEach(
    (person) => {

      peopleList.appendChild(
        createPersonCard(
          person
        )
      );

    }
  );

}


// ================================
// CREATE PERSON CARD
// ================================

function createPersonCard(
  person
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "person-card";


  const name =
    getPersonName(
      person
    );


  const location =
    person.country ||
    person.location ||
    person.city ||
    "WORLDWIDE";


  const isOnline =
    person.online === true ||
    person.isOnline === true;


  card.innerHTML = `

    <div class="person-avatar">

      👤

    </div>


    <div class="person-info">

      <strong></strong>

      <small>
        ${
          isOnline
            ? "🟢 Online"
            : "🌍 " +
              escapeHTML(
                location
              )
        }
      </small>

    </div>


    <button
      class="chat-button"
      type="button"
    >
      CHAT
    </button>

  `;


  // ==============================
  // NAME
  // ==============================

  card
    .querySelector(
      "strong"
    )
    .textContent =
      name;


  // ==============================
  // PROFILE PHOTO
  // ==============================

  const avatar =
    card.querySelector(
      ".person-avatar"
    );


  if (
    person.photoURL
  ) {

    avatar.innerHTML =
      "";


    const image =
      document.createElement(
        "img"
      );


    image.src =
      person.photoURL;


    image.alt =
      "";


    image.style.width =
      "100%";


    image.style.height =
      "100%";


    image.style.objectFit =
      "cover";


    image.style.borderRadius =
      "50%";


    avatar.appendChild(
      image
    );

  }


  // ==============================
  // CHAT BUTTON
  // ==============================

  card
    .querySelector(
      ".chat-button"
    )
    .addEventListener(
      "click",
      () => {

        window.location.href =
          `chat.html?uid=${encodeURIComponent(
            person.id
          )}`;

      }
    );


  return card;

}


// ================================
// SEARCH
// ================================

peopleSearch.addEventListener(
  "input",
  renderPeople
);


// ================================
// FILTER BUTTONS
// ================================

filterButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        filterButtons.forEach(
          (item) => {

            item.classList.remove(
              "active"
            );

          }
        );


        button.classList.add(
          "active"
        );


        const text =
          button.textContent
            .trim()
            .toLowerCase();


        if (
          text.includes(
            "online"
          )
        ) {

          currentFilter =
            "online";

        } else if (
          text.includes(
            "new"
          )
        ) {

          currentFilter =
            "new";

        } else {

          currentFilter =
            "everyone";

        }


        renderPeople();

      }
    );

  }
);


// ================================
// GET NAME
// ================================

function getPersonName(
  person
) {

  return (
    person.name ||
    person.fullName ||
    person.displayName ||
    "WORLD CHAT USER"
  );

}


// ================================
// GET TIME
// ================================

function getTime(
  value
) {

  if (!value) {

    return 0;

  }


  if (
    typeof value.toMillis ===
    "function"
  ) {

    return value.toMillis();

  }


  if (
    value.seconds
  ) {

    return (
      value.seconds *
      1000
    );

  }


  if (
    value instanceof Date
  ) {

    return value.getTime();

  }


  return 0;

}


// ================================
// HTML SAFETY
// ================================

function escapeHTML(
  value
) {

  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}