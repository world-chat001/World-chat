import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const notificationsList =
  document.getElementById(
    "notificationsList"
  );

const backBtn =
  document.getElementById(
    "backBtn"
  );

backBtn.addEventListener(
  "click",
  () => {
    window.history.back();
  }
);

onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }

    listenForNotifications(
      user.uid
    );

  }
);

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

  const notificationsQuery =
    query(
      notificationsRef
    );

  onSnapshot(
    notificationsQuery,
    (snapshot) => {

      if (snapshot.empty) {

        showEmptyState();

        return;
      }

      const notifications =
        snapshot.docs.map(
          (notificationDoc) => {

            return {
              id:
                notificationDoc.id,

              ...notificationDoc.data()
            };

          }
        );

      notifications.sort(
        (a, b) => {

          const aTime =
            a.createdAt &&
            typeof a.createdAt.toMillis ===
              "function"
              ? a.createdAt.toMillis()
              : 0;

          const bTime =
            b.createdAt &&
            typeof b.createdAt.toMillis ===
              "function"
              ? b.createdAt.toMillis()
              : 0;

          return bTime - aTime;

        }
      );

      displayNotifications(
        notifications,
        userId
      );

    },
    (error) => {

      console.error(
        "NOTIFICATION ERROR:",
        error
      );

      notificationsList.innerHTML = `
        <div class="empty-state">

          <div class="empty-icon">
            ⚠️
          </div>

          <h2>
            Unable to load notifications
          </h2>

          <p>
            Please try again.
          </p>

        </div>
      `;

    }
  );
}

function displayNotifications(
  notifications,
  userId
) {

  notificationsList.innerHTML =
    "";

  notifications.forEach(
    (notification) => {

      const card =
        document.createElement(
          "div"
        );

      const isUnread =
        notification.read !== true;

      card.className =
        "notification-card" +
        (
          isUnread
            ? " unread"
            : ""
        );

      const icon =
        getNotificationIcon(
          notification
        );

      const title =
        getNotificationTitle(
          notification
        );

      const time =
        formatNotificationTime(
          notification.createdAt
        );

      card.innerHTML = `

        <div class="notification-icon">
          ${icon}
        </div>

        <div class="notification-info">

          <div class="notification-title">
            ${escapeHTML(title)}
          </div>

          <div class="notification-time">
            ${time}
          </div>

        </div>

        ${
          isUnread
            ? `<div class="notification-dot"></div>`
            : ""
        }

      `;

      card.addEventListener(
        "click",
        async () => {

          await markAsRead(
            userId,
            notification.id
          );

          handleNotificationClick(
            notification
          );

        }
      );

      notificationsList.appendChild(
        card
      );

    }
  );
}

function getNotificationIcon(
  notification
) {

  if (
    notification.type ===
    "incoming_call"
  ) {

    return notification.callType ===
      "voice"
      ? "📞"
      : "📹";

  }

  if (
    notification.type ===
    "missed_call"
  ) {

    return notification.callType ===
      "voice"
      ? "📞"
      : "📹";

  }

  return "🔔";
}

function getNotificationTitle(
  notification
) {

  const name =
    notification.callerName ||
    "WORLD CHAT USER";

  if (
    notification.type ===
    "incoming_call"
  ) {

    return (
      name +
      " • Incoming " +
      (
        notification.callType ===
        "voice"
          ? "voice"
          : "video"
      ) +
      " call"
    );

  }

  if (
    notification.type ===
    "missed_call"
  ) {

    return (
      name +
      " • Missed " +
      (
        notification.callType ===
        "voice"
          ? "voice"
          : "video"
      ) +
      " call"
    );

  }

  return (
    notification.title ||
    "New notification"
  );
}

async function markAsRead(
  userId,
  notificationId
) {

  try {

    const notificationRef =
      doc(
        db,
        "Notifications",
        userId,
        "items",
        notificationId
      );

    await updateDoc(
      notificationRef,
      {
        read: true
      }
    );

  } catch (error) {

    console.error(
      "MARK NOTIFICATION READ ERROR:",
      error
    );

  }
}

function handleNotificationClick(
  notification
) {

  /*
    INCOMING CALL
  */

  if (
    notification.type ===
    "incoming_call"
  ) {

    const callerId =
      notification.callerId || "";

    const callId =
      notification.callId || "";

    if (
      callerId &&
      callId
    ) {

      const callURL =
        "call.html?type=" +
        encodeURIComponent(
          notification.callType ||
          "video"
        ) +
        "&uid=" +
        encodeURIComponent(
          callerId
        ) +
        "&name=" +
        encodeURIComponent(
          notification.callerName ||
          "WORLD CHAT USER"
        ) +
        "&callId=" +
        encodeURIComponent(
          callId
        );

      window.location.href =
        callURL;

    }

    return;
  }

  /*
    MISSED CALL
  */

  if (
    notification.type ===
    "missed_call"
  ) {

    const callerId =
      notification.callerId || "";

    if (callerId) {

      window.location.href =
        "chat.html?uid=" +
        encodeURIComponent(
          callerId
        );

    }

    return;
  }

  /*
    NORMAL NOTIFICATION
  */

  if (
    notification.chatId &&
    notification.senderId
  ) {

    window.location.href =
      "chat.html?uid=" +
      encodeURIComponent(
        notification.senderId
      );

  }

}

function showEmptyState() {

  notificationsList.innerHTML = `

    <div class="empty-state">

      <div class="empty-icon">
        🔔
      </div>

      <h2>
        No notifications
      </h2>

      <p>
        You're all caught up.
      </p>

    </div>

  `;
}

function formatNotificationTime(
  timestamp
) {

  if (
    !timestamp ||
    typeof timestamp.toDate !==
      "function"
  ) {

    return "Just now";
  }

  const date =
    timestamp.toDate();

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const seconds =
    Math.floor(
      difference / 1000
    );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {

    return (
      minutes +
      (
        minutes === 1
          ? " minute ago"
          : " minutes ago"
      )
    );

  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {

    return (
      hours +
      (
        hours === 1
          ? " hour ago"
          : " hours ago"
      )
    );

  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {

    return (
      days +
      (
        days === 1
          ? " day ago"
          : " days ago"
      )
    );

  }

  return date.toLocaleDateString();
}

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
