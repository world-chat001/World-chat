import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const userName =
  document.getElementById("userName");

const peopleList =
  document.getElementById("peopleList");

const notificationBtn =
  document.getElementById("notificationBtn");

const notificationDot =
  document.querySelector(".notification-dot");

// ==============================
// NOTIFICATION BUTTON
// ==============================

if (notificationBtn) {

  notificationBtn.addEventListener(
    "click",
    () => {

      window.location.href =
        "notifications.html";

    }
  );

}

// ==============================
// AUTH
// ==============================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }

    // ==============================
    // LOAD USER NAME
    // ==============================

    try {

      const userRef =
        doc(
          db,
          "Users",
          user.uid
        );

      const userSnapshot =
        await getDoc(userRef);

      if (
        userSnapshot.exists()
      ) {

        const userData =
          userSnapshot.data();

        userName.textContent =
          userData.name ||
          userData.fullName ||
          user.displayName ||
          "there";

      } else {

        userName.textContent =
          user.displayName ||
          "there";

      }

    } catch (error) {

      console.error(
        "COULD NOT LOAD USER:",
        error
      );

      userName.textContent =
        user.displayName ||
        "there";

    }

    // ==============================
    // LISTEN FOR NOTIFICATIONS
    // ==============================

    listenForNotifications(
      user.uid
    );

    // ==============================
    // HOME LOADING
    // ==============================

    if (peopleList) {

      peopleList.innerHTML = `
        <div class="loading">
          Your global community is waiting...
        </div>
      `;

    }

  }
);

// ==============================
// NOTIFICATION LISTENER
// ==============================

function listenForNotifications(
  userId
) {

  const notificationsRef =
    collection(
      db,
      "Notifications",
      userId,
      "items"
    );

  onSnapshot(

    notificationsRef,

    (snapshot) => {

      let hasUnread =
        false;

      snapshot.forEach(
        (notificationDoc) => {

          const data =
            notificationDoc.data();

          if (
            data.read !== true
          ) {

            hasUnread =
              true;

          }

        }
      );

      updateNotificationDot(
        hasUnread
      );

    },

    (error) => {

      console.error(
        "NOTIFICATION LISTENER ERROR:",
        error
      );

      updateNotificationDot(
        false
      );

    }

  );

}

// ==============================
// UPDATE RED DOT
// ==============================

function updateNotificationDot(
  hasUnread
) {

  if (!notificationDot) {
    return;
  }

  if (hasUnread) {

    notificationDot.style.display =
      "block";

  } else {

    notificationDot.style.display =
      "none";

  }

}