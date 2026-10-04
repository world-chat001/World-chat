import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  auth,
  db
} from "./firebase.js";

// ===============================
// GET OTHER USER
// ===============================

const params =
  new URLSearchParams(window.location.search);

const otherUserId =
  params.get("uid");

// ===============================
// PAGE ELEMENTS
// ===============================

const userName =
  document.getElementById("userName");

const userAvatar =
  document.getElementById("userAvatar");

const messagesContainer =
  document.getElementById("messagesContainer");

const messageInput =
  document.getElementById("messageInput");

const sendBtn =
  document.getElementById("sendBtn");

// ===============================
// CHECK LOGIN
// ===============================

auth.onAuthStateChanged(async (currentUser) => {

  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  if (!otherUserId) {

    userName.textContent =
      "No user selected";

    messageInput.disabled =
      true;

    sendBtn.disabled =
      true;

    return;
  }

  console.log(
    "CURRENT USER:",
    currentUser.uid
  );

  console.log(
    "OTHER USER:",
    otherUserId
  );

  await loadOtherUser();

  listenForMessages(
    currentUser.uid
  );

});

// ===============================
// LOAD OTHER USER
// ===============================

async function loadOtherUser() {

  try {

    const userRef =
      doc(
        db,
        "Users",
        otherUserId
      );

    const userSnap =
      await getDoc(userRef);

    if (!userSnap.exists()) {

      userName.textContent =
        "Unknown user";

      return;
    }

    const data =
      userSnap.data();

    const name =
      data.name ||
      data.fullName ||
      data.displayName ||
      "WORLD CHAT USER";

    userName.textContent =
      name;

    if (data.photoURL) {

      userAvatar.innerHTML =
        "";

      const image =
        document.createElement("img");

      image.src =
        data.photoURL;

      image.alt =
        name;

      userAvatar.appendChild(
        image
      );

    } else {

      userAvatar.textContent =
        name
          .charAt(0)
          .toUpperCase();

    }

  } catch (error) {

    console.error(
      "USER LOAD ERROR:",
      error
    );

    userName.textContent =
      "WORLD CHAT USER";

  }

}

// ===============================
// CREATE SAME CHAT ID
// ===============================

function getChatId(uid1, uid2) {

  return [
    uid1,
    uid2
  ]
  .sort()
  .join("_");

}

// ===============================
// LISTEN FOR MESSAGES
// ===============================

function listenForMessages(
  currentUserId
) {

  const chatId =
    getChatId(
      currentUserId,
      otherUserId
    );

  console.log(
    "CHAT ID:",
    chatId
  );

  const messagesRef =
    collection(
      db,
      "Chats",
      chatId,
      "messages"
    );

  onSnapshot(

    messagesRef,

    (snapshot) => {

      console.log(
        "MESSAGES FOUND:",
        snapshot.size
      );

      const messages = [];

      snapshot.forEach(
        (messageDoc) => {

          messages.push({

            id:
              messageDoc.id,

            ...messageDoc.data()

          });

        }
      );

      messages.sort(
        (a, b) => {

          return (
            getMessageTime(a.createdAt) -
            getMessageTime(b.createdAt)
          );

        }
      );

      messagesContainer.innerHTML =
        "";

      if (
        messages.length === 0
      ) {

        messagesContainer.innerHTML = `

          <div class="welcome-message">

            <div class="welcome-icon">
              🌍
            </div>

            <h3>
              Start a conversation
            </h3>

            <p>
              Connect with someone from
              another part of the world.
            </p>

          </div>

        `;

        return;
      }

      messages.forEach(
        (message) => {

          displayMessage(
            message,
            currentUserId
          );

        }
      );

      scrollToBottom();

    },

    (error) => {

      console.error(
        "MESSAGE LISTENER ERROR:",
        error
      );

      messagesContainer.innerHTML = `

        <div class="welcome-message">

          <div class="welcome-icon">
            ⚠️
          </div>

          <h3>
            Unable to load chat
          </h3>

          <p>
            ${escapeHTML(
              error.message ||
              "Unable to load messages."
            )}
          </p>

        </div>

      `;

    }

  );

}

// ===============================
// DISPLAY MESSAGE
// ===============================

function displayMessage(
  message,
  currentUserId
) {

  const messageDiv =
    document.createElement("div");

  const isSent =
    message.senderId ===
    currentUserId;

  messageDiv.className =
    isSent
      ? "message sent"
      : "message received";

  const text =
    document.createElement("div");

  text.textContent =
    message.text || "";

  const time =
    document.createElement("span");

  time.className =
    "message-time";

  const messageTime =
    getMessageTime(
      message.createdAt
    );

  if (messageTime) {

    const date =
      new Date(messageTime);

    time.textContent =
      date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

  } else {

    time.textContent =
      "Sending...";

  }

  messageDiv.appendChild(
    text
  );

  messageDiv.appendChild(
    time
  );

  messagesContainer.appendChild(
    messageDiv
  );

}

// ===============================
// SEND MESSAGE
// ===============================

window.sendMessage =
async function () {

  const currentUser =
    auth.currentUser;

  if (!currentUser) {
    return;
  }

  const text =
    messageInput.value.trim();

  if (!text) {
    return;
  }

  if (!otherUserId) {

    alert(
      "No user selected."
    );

    return;
  }

  const chatId =
    getChatId(
      currentUser.uid,
      otherUserId
    );

  try {

    sendBtn.disabled =
      true;

    // ===============================
    // GET CURRENT USER NAME
    // ===============================

    let senderName =
      "WORLD CHAT USER";

    try {

      const currentUserRef =
        doc(
          db,
          "Users",
          currentUser.uid
        );

      const currentUserSnap =
        await getDoc(
          currentUserRef
        );

      if (
        currentUserSnap.exists()
      ) {

        const currentUserData =
          currentUserSnap.data();

        senderName =
          currentUserData.name ||
          currentUserData.fullName ||
          currentUserData.displayName ||
          "WORLD CHAT USER";

      }

    } catch (nameError) {

      console.error(
        "SENDER NAME ERROR:",
        nameError
      );

    }

    // ===============================
    // SAVE MESSAGE
    // ===============================

    await addDoc(

      collection(
        db,
        "Chats",
        chatId,
        "messages"
      ),

      {

        text:
          text,

        senderId:
          currentUser.uid,

        receiverId:
          otherUserId,

        createdAt:
          serverTimestamp()

      }

    );

    // ===============================
    // UPDATE CHAT
    // ===============================

    await setDoc(

      doc(
        db,
        "Chats",
        chatId
      ),

      {

        participants: [

          currentUser.uid,

          otherUserId

        ],

        lastMessage:
          text,

        updatedAt:
          serverTimestamp(),

        [`unread_${otherUserId}`]:
          true

      },

      {
        merge: true
      }

    );

    // ===============================
    // CREATE NOTIFICATION
    // ===============================

    await addDoc(

      collection(
        db,
        "Notifications",
        otherUserId,
        "items"
      ),

      {

        type:
          "message",

        title:
          senderName +
          " sent you a message",

        message:
          text,

        senderId:
          currentUser.uid,

        senderName:
          senderName,

        chatId:
          chatId,

        read:
          false,

        createdAt:
          serverTimestamp()

      }

    );

    // ===============================
    // CLEAR INPUT
    // ===============================

    messageInput.value =
      "";

    messageInput.focus();

  } catch (error) {

    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    alert(
      "Message could not be sent."
    );

  } finally {

    sendBtn.disabled =
      false;

  }

};

// ===============================
// ENTER TO SEND
// ===============================

messageInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      window.sendMessage();

    }

  }
);

// ===============================
// GET MESSAGE TIME
// ===============================

function getMessageTime(value) {

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
    typeof value.seconds ===
    "number"
  ) {

    return value.seconds * 1000;

  }

  if (
    value instanceof Date
  ) {

    return value.getTime();

  }

  return 0;

}

// ===============================
// SCROLL DOWN
// ===============================

function scrollToBottom() {

  setTimeout(
    () => {

      messagesContainer.scrollTop =
        messagesContainer.scrollHeight;

    },
    50
  );

}

// ===============================
// BACK BUTTON
// ===============================

window.goBack =
function () {

  window.history.back();

};

// ===============================
// VOICE CALL
// ===============================

window.startVoiceCall =
function () {

  if (!otherUserId) {

    alert(
      "No user selected."
    );

    return;
  }

  const name =
    userName.textContent ||
    "WORLD CHAT USER";

  const callURL =
    "call.html?type=voice" +
    "&uid=" +
    encodeURIComponent(
      otherUserId
    ) +
    "&name=" +
    encodeURIComponent(
      name
    );

  window.location.href =
    callURL;

};

// ===============================
// VIDEO CALL
// ===============================

window.startVideoCall =
function () {

  if (!otherUserId) {

    alert(
      "No user selected."
    );

    return;
  }

  const name =
    userName.textContent ||
    "WORLD CHAT USER";

  const callURL =
    "call.html?type=video" +
    "&uid=" +
    encodeURIComponent(
      otherUserId
    ) +
    "&name=" +
    encodeURIComponent(
      name
    );

  window.location.href =
    callURL;

};

// ===============================
// BASIC HTML SAFETY
// ===============================

function escapeHTML(value) {

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