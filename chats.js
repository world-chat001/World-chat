import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const conversationList =
  document.getElementById("conversationList");

const chatSearch =
  document.getElementById("chatSearch");

let allChats = [];


// ================================
// CHECK LOGIN
// ================================

onAuthStateChanged(auth, (user) => {

  if (!user) {

    window.location.href =
      "login.html";

    return;
  }

  listenForChats(user.uid);

});


// ================================
// LOAD CHATS
// ================================

function listenForChats(currentUserId) {

  const chatsRef =
    collection(db, "Chats");


  const chatsQuery =
    query(
      chatsRef,
      where(
        "participants",
        "array-contains",
        currentUserId
      )
    );


  onSnapshot(
    chatsQuery,

    async (snapshot) => {

      allChats = [];


      for (const chatDoc of snapshot.docs) {

        const chatData =
          chatDoc.data();


        const participants =
          chatData.participants || [];


        const otherUserId =
          participants.find(
            id => id !== currentUserId
          );


        if (!otherUserId) {
          continue;
        }


        try {

          const userSnap =
            await getDoc(
              doc(
                db,
                "Users",
                otherUserId
              )
            );


          if (!userSnap.exists()) {
            continue;
          }


          allChats.push({

            id:
              chatDoc.id,

            ...chatData,

            userId:
              otherUserId,

            user:
              userSnap.data(),

            currentUserId:
              currentUserId

          });


        } catch (error) {

          console.error(
            "Unable to load user:",
            error
          );

        }

      }


      // =========================
      // SORT NEWEST FIRST
      // =========================

      allChats.sort(
        (a, b) => {

          return (
            getTime(b.updatedAt) -
            getTime(a.updatedAt)
          );

        }
      );


      renderChats();

    },


    (error) => {

      console.error(
        "Chat list error:",
        error
      );


      conversationList.innerHTML = `

        <div class="loading">

          <span>⚠️</span>

          <p>
            Unable to load chats.
          </p>

        </div>

      `;

    }

  );

}


// ================================
// RENDER CHATS
// ================================

function renderChats() {

  const search =
    chatSearch.value
      .trim()
      .toLowerCase();


  const chats =
    allChats.filter(chat => {

      const name =
        getName(chat.user)
          .toLowerCase();


      return name.includes(search);

    });


  // =========================
  // NO RESULTS
  // =========================

  if (chats.length === 0) {

    conversationList.innerHTML = `

      <div class="loading">

        <span>💬</span>

        <p>
          ${
            search
              ? "No conversations found."
              : "No conversations yet."
          }
        </p>

      </div>

    `;

    return;

  }


  conversationList.innerHTML = "";


  chats.forEach(chat => {

    conversationList.appendChild(
      createConversation(chat)
    );

  });

}


// ================================
// CREATE CHAT ITEM
// ================================

function createConversation(chat) {

  const user =
    chat.user;


  const name =
    getName(user);


  const conversation =
    document.createElement("div");


  conversation.className =
    "conversation";


  // =========================
  // AVATAR
  // =========================

  const avatar =
    document.createElement("div");


  avatar.className =
    "avatar";


  if (user.photoURL) {

    const image =
      document.createElement("img");


    image.src =
      user.photoURL;


    image.alt =
      name;


    avatar.appendChild(
      image
    );

  } else {

    avatar.textContent =
      name
        .charAt(0)
        .toUpperCase();

  }


  // =========================
  // MAIN
  // =========================

  const main =
    document.createElement("div");


  main.className =
    "conversation-main";


  // =========================
  // TOP
  // =========================

  const top =
    document.createElement("div");


  top.className =
    "conversation-top";


  const nameElement =
    document.createElement("strong");


  nameElement.className =
    "conversation-name";


  nameElement.textContent =
    name;


  const time =
    document.createElement("span");


  time.className =
    "conversation-time";


  time.textContent =
    formatTime(
      chat.updatedAt
    );


  top.appendChild(
    nameElement
  );


  top.appendChild(
    time
  );


  // =========================
  // BOTTOM
  // =========================

  const bottom =
    document.createElement("div");


  bottom.className =
    "conversation-bottom";


  const lastMessage =
    document.createElement("span");


  lastMessage.className =
    "last-message";


  lastMessage.textContent =
    chat.lastMessage ||
    "Start chatting";


  bottom.appendChild(
    lastMessage
  );


  // =========================
  // RED NOTIFICATION DOT
  // =========================

  const unreadField =
    `unread_${chat.currentUserId}`;


  const hasUnread =
    chat[unreadField] === true;


  if (hasUnread) {

    const redDot =
      document.createElement("span");


    redDot.className =
      "notification-dot";


    redDot.title =
      "New message";


    bottom.appendChild(
      redDot
    );

  }


  // =========================
  // BUILD
  // =========================

  main.appendChild(
    top
  );


  main.appendChild(
    bottom
  );


  conversation.appendChild(
    avatar
  );


  conversation.appendChild(
    main
  );


  // =========================
  // OPEN CHAT
  // =========================

  conversation.addEventListener(
    "click",
    async () => {

      // Remove notification
      // when conversation is opened

      try {

        const chatRef =
          doc(
            db,
            "Chats",
            chat.id
          );


        await setDoc(
          chatRef,
          {

            [unreadField]:
              false,

            updatedAt:
              chat.updatedAt ||
              serverTimestamp()

          },

          {
            merge: true
          }

        );

      } catch (error) {

        console.error(
          "Unable to clear notification:",
          error
        );

      }


      window.location.href =
        `chat.html?uid=${encodeURIComponent(
          chat.userId
        )}`;

    }
  );


  return conversation;

}


// ================================
// SEARCH
// ================================

chatSearch.addEventListener(
  "input",
  () => {

    renderChats();

  }
);


// ================================
// GET NAME
// ================================

function getName(user) {

  return (

    user.name ||

    user.fullName ||

    user.displayName ||

    "WORLD CHAT USER"

  );

}


// ================================
// GET FIRESTORE TIME
// ================================

function getTime(value) {

  if (!value) {
    return 0;
  }


  if (
    typeof value.toMillis ===
    "function"
  ) {

    return value.toMillis();

  }


  if (value.seconds) {

    return value.seconds * 1000;

  }


  if (value instanceof Date) {

    return value.getTime();

  }


  return 0;

}


// ================================
// FORMAT TIME
// ================================

function formatTime(value) {

  const time =
    getTime(value);


  if (!time) {
    return "";
  }


  const date =
    new Date(time);


  const now =
    new Date();


  const sameDay =
    date.toDateString() ===
    now.toDateString();


  if (sameDay) {

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  }


  return date.toLocaleDateString(
    [],
    {
      day: "numeric",
      month: "short"
    }
  );
}