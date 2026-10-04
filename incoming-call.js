import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const callerName =
  document.getElementById("callerName");

const callerAvatar =
  document.getElementById("callerAvatar");

const callType =
  document.getElementById("callType");

const acceptBtn =
  document.getElementById("acceptBtn");

const declineBtn =
  document.getElementById("declineBtn");


let currentCallId = null;
let currentCall = null;


/* =========================
   AUTH
========================= */

onAuthStateChanged(
  auth,
  (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }

    console.log(
      "INCOMING CALL USER:",
      user.uid
    );

    listenForIncomingCalls(
      user.uid
    );

  }
);


/* =========================
   LISTEN FOR INCOMING CALLS
========================= */

function listenForIncomingCalls(
  userId
) {

  const callsRef =
    collection(
      db,
      "Calls"
    );

  const incomingQuery =
    query(
      callsRef,
      where(
        "receiverId",
        "==",
        userId
      ),
      where(
        "status",
        "==",
        "ringing"
      )
    );

  onSnapshot(
    incomingQuery,
    (snapshot) => {

      if (snapshot.empty) {
        return;
      }

      const callDoc =
        snapshot.docs[0];

      currentCallId =
        callDoc.id;

      currentCall =
        callDoc.data();

      showIncomingCall(
        currentCall
      );

    },
    (error) => {

      console.error(
        "INCOMING CALL ERROR:",
        error
      );

    }
  );
}


/* =========================
   SHOW CALLER
========================= */

function showIncomingCall(
  call
) {

  const name =
    call.callerName ||
    "WORLD CHAT USER";

  const type =
    call.type ||
    "video";

  callerName.textContent =
    name;

  callerAvatar.textContent =
    name
      .charAt(0)
      .toUpperCase();

  callType.textContent =
    type === "voice"
      ? "Voice call"
      : "Video call";

}


/* =========================
   ACCEPT CALL
========================= */

acceptBtn.addEventListener(
  "click",
  async () => {

    if (
      !currentCallId ||
      !currentCall
    ) {

      alert(
        "No incoming call found."
      );

      return;
    }


    try {

      await updateDoc(
        doc(
          db,
          "Calls",
          currentCallId
        ),
        {
          status:
            "accepted"
        }
      );


      const name =
        encodeURIComponent(
          currentCall.callerName ||
          "WORLD CHAT USER"
        );

      const type =
        encodeURIComponent(
          currentCall.type ||
          "video"
        );

      const uid =
        encodeURIComponent(
          currentCall.callerId ||
          ""
        );

      const callId =
        encodeURIComponent(
          currentCallId
        );


      /*
        IMPORTANT:
        The callId connects the
        receiver to the same
        Firebase call document.
      */

      window.location.href =
        "call.html?type="
        + type
        + "&uid="
        + uid
        + "&name="
        + name
        + "&callId="
        + callId;


    } catch (error) {

      console.error(
        "ACCEPT CALL ERROR:",
        error
      );

      alert(
        "Unable to accept call."
      );

    }

  }
);


/* =========================
   DECLINE CALL
========================= */

declineBtn.addEventListener(
  "click",
  async () => {

    if (!currentCallId) {

      window.history.back();

      return;
    }


    try {

      await updateDoc(
        doc(
          db,
          "Calls",
          currentCallId
        ),
        {
          status:
            "declined"
        }
      );

    } catch (error) {

      console.error(
        "DECLINE CALL ERROR:",
        error
      );

    }


    window.history.back();

  }
);