import { auth, db } from "./firebase.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
doc,
setDoc,
updateDoc,
onSnapshot,
addDoc,
collection,
arrayUnion,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const localVideo =
document.getElementById("localVideo");

const remoteVideo =
document.getElementById("remoteVideo");

const muteBtn =
document.getElementById("muteBtn");

const cameraBtn =
document.getElementById("cameraBtn");

const endBtn =
document.getElementById("endBtn");

const closeBtn =
document.getElementById("closeBtn");

const callStatus =
document.getElementById("callStatus");

const personName =
document.getElementById("personName");

const callType =
document.getElementById("callType");

const params =
new URLSearchParams(
window.location.search
);

const type =
params.get("type") || "video";

const otherUserId =
params.get("uid") || "";

const name =
params.get("name") ||
"WORLD CHAT USER";

let callId =
params.get("callId") || "";

let currentUser = null;

let localStream = null;

let peerConnection = null;

let callRef = null;

let unsubscribeCall = null;

let isMuted = false;

let isCameraOff = false;

let isCaller = false;

let callEnded = false;

let missedNotificationSent = false;

let callTimeout = null;

let processedCallerCandidates = [];

let processedReceiverCandidates = [];

const rtcConfiguration = {

iceServers: [
{
urls:
"stun:stun.l.google.com:19302"
}
]

};

personName.textContent =
name;

if (type === "voice") {

callType.textContent =
"VOICE CALL";

cameraBtn.classList.add(
"hidden"
);

localVideo.classList.add(
"hidden"
);

remoteVideo.classList.add(
"hidden"
);

} else {

callType.textContent =
"VIDEO CALL";

}

/* ==============================
LOCAL CAMERA / MICROPHONE
============================== */

async function startLocalMedia() {

const constraints =
type === "voice"
? {
audio: true,
video: false
}
: {
audio: true,
video: true
};

try {

localStream =
  await navigator.mediaDevices
    .getUserMedia(
      constraints
    );


if (type === "video") {

  localVideo.srcObject =
    localStream;

}


return true;

} catch (error) {

console.error(
  "MEDIA ERROR:",
  error
);


if (
  error.name ===
  "NotAllowedError"
) {

  callStatus.textContent =
    "Camera or microphone permission was denied.";

} else if (
  error.name ===
  "NotFoundError"
) {

  callStatus.textContent =
    "Camera or microphone was not found.";

} else {

  callStatus.textContent =
    "Unable to access camera or microphone.";

}


return false;

}
}

/* ==============================
PEER CONNECTION
============================== */

function createPeerConnection() {

peerConnection =
new RTCPeerConnection(
rtcConfiguration
);

if (localStream) {

localStream
  .getTracks()
  .forEach((track) => {

    peerConnection.addTrack(
      track,
      localStream
    );

  });

}

peerConnection.ontrack =
(event) => {

  if (
    event.streams &&
    event.streams[0]
  ) {

    remoteVideo.srcObject =
      event.streams[0];

    remoteVideo
      .play()
      .catch(() => {});

  }

};

peerConnection.onconnectionstatechange =
() => {

  console.log(
    "WEBRTC CONNECTION:",
    peerConnection.connectionState
  );


  if (
    peerConnection.connectionState ===
    "connected"
  ) {

    callStatus.textContent =
      "Connected";

    stopCallTimeout();

  }


  if (
    peerConnection.connectionState ===
    "connecting"
  ) {

    callStatus.textContent =
      "Connecting...";

  }


  if (
    peerConnection.connectionState ===
    "disconnected"
  ) {

    callStatus.textContent =
      "Connection interrupted.";

  }


  if (
    peerConnection.connectionState ===
    "failed"
  ) {

    callStatus.textContent =
      "Call connection failed.";

  }

};

peerConnection.onicecandidate =
async (event) => {

  if (
    !event.candidate ||
    !callRef ||
    !currentUser
  ) {
    return;
  }


  const candidate =
    event.candidate.toJSON();


  try {

    if (isCaller) {

      await updateDoc(
        callRef,
        {
          callerCandidates:
            arrayUnion(
              candidate
            )
        }
      );

    } else {

      await updateDoc(
        callRef,
        {
          receiverCandidates:
            arrayUnion(
              candidate
            )
        }
      );

    }

  } catch (error) {

    console.error(
      "ICE SAVE ERROR:",
      error
    );

  }

};

return peerConnection;
}

/* ==============================
CALLER
============================== */

async function startCallerCall() {

if (!callId) {

callStatus.textContent =
  "Call ID is missing.";

return;

}

callRef =
doc(
db,
"Calls",
callId
);

createPeerConnection();

const offer =
await peerConnection
.createOffer();

await peerConnection
.setLocalDescription(
offer
);

await updateDoc(
callRef,
{
offer: {
type:
offer.type,
sdp:
offer.sdp
}
}
);

callStatus.textContent =
"Ringing...";

startCallTimeout();

unsubscribeCall =
onSnapshot(
callRef,
async (snapshot) => {

    if (
      !snapshot.exists()
    ) {
      return;
    }


    const data =
      snapshot.data();


    if (
      data.answer &&
      !peerConnection
        .currentRemoteDescription
    ) {

      try {

        await peerConnection
          .setRemoteDescription(
            new RTCSessionDescription(
              data.answer
            )
          );


        callStatus.textContent =
          "Connecting...";

      } catch (error) {

        console.error(
          "ANSWER ERROR:",
          error
        );

      }

    }


    if (
      Array.isArray(
        data.receiverCandidates
      )
    ) {

      for (
        const candidate
        of data.receiverCandidates
      ) {

        const key =
          JSON.stringify(
            candidate
          );


        if (
          processedReceiverCandidates
            .includes(key)
        ) {
          continue;
        }


        processedReceiverCandidates
          .push(key);


        try {

          await peerConnection
            .addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );

        } catch (error) {

          console.error(
            "RECEIVER ICE ERROR:",
            error
          );

        }

      }

    }


    if (
      data.status ===
      "declined"
    ) {

      stopCallTimeout();

      callStatus.textContent =
        "Call declined.";

    }


    if (
      data.status ===
      "missed"
    ) {

      stopCallTimeout();

      callStatus.textContent =
        "No answer.";

    }

  }
);

}

/* ==============================
RECEIVER
============================== */

async function startReceiverCall() {

if (!callId) {

callStatus.textContent =
  "Call ID is missing.";

return;

}

callRef =
doc(
db,
"Calls",
callId
);

createPeerConnection();

callStatus.textContent =
"Connecting...";

unsubscribeCall =
onSnapshot(
callRef,
async (snapshot) => {

    if (
      !snapshot.exists()
    ) {
      return;
    }


    const data =
      snapshot.data();


    if (
      data.offer &&
      !peerConnection
        .currentRemoteDescription
    ) {

      try {

        await peerConnection
          .setRemoteDescription(
            new RTCSessionDescription(
              data.offer
            )
          );


        const answer =
          await peerConnection
            .createAnswer();


        await peerConnection
          .setLocalDescription(
            answer
          );


        await updateDoc(
          callRef,
          {
            answer: {
              type:
                answer.type,
              sdp:
                answer.sdp
            },

            status:
              "accepted"
          }
        );


        callStatus.textContent =
          "Connecting...";

      } catch (error) {

        console.error(
          "ANSWER CREATION ERROR:",
          error
        );

      }

    }


    if (
      Array.isArray(
        data.callerCandidates
      )
    ) {

      for (
        const candidate
        of data.callerCandidates
      ) {

        const key =
          JSON.stringify(
            candidate
          );


        if (
          processedCallerCandidates
            .includes(key)
        ) {
          continue;
        }


        processedCallerCandidates
          .push(key);


        try {

          await peerConnection
            .addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );

        } catch (error) {

          console.error(
            "CALLER ICE ERROR:",
            error
          );

        }

      }

    }

  }
);

}

/* ==============================
MISSED CALL TIMER
============================== */

function startCallTimeout() {

stopCallTimeout();

callTimeout =
setTimeout(
async () => {

    if (
      callEnded ||
      !callRef ||
      !isCaller
    ) {
      return;
    }


    try {

      const notificationRef =
        collection(
          db,
          "Notifications",
          otherUserId,
          "items"
        );


      await addDoc(
        notificationRef,
        {
          type:
            "missed_call",

          callType:
            type,

          callerId:
            currentUser.uid,

          callerName:
            currentUser.displayName ||
            name ||
            "WORLD CHAT USER",

          receiverId:
            otherUserId,

          callId:
            callId,

          read:
            false,

          createdAt:
            serverTimestamp()
        }
      );


      missedNotificationSent =
        true;


      await updateDoc(
        callRef,
        {
          status:
            "missed"
        }
      );


      callStatus.textContent =
        "No answer.";

    } catch (error) {

      console.error(
        "MISSED CALL ERROR:",
        error
      );

    }

  },
  30000
);

}

function stopCallTimeout() {

if (callTimeout) {

clearTimeout(
  callTimeout
);

callTimeout = null;

}

}

/* ==============================
MUTE
============================== */

muteBtn.addEventListener(
"click",
() => {

if (!localStream) {
  return;
}


localStream
  .getAudioTracks()
  .forEach((track) => {

    track.enabled =
      !track.enabled;

    isMuted =
      !track.enabled;

  });


muteBtn.textContent =
  isMuted
    ? "🔇"
    : "🎙️";

}
);

/* ==============================
CAMERA
============================== */

cameraBtn.addEventListener(
"click",
() => {

if (!localStream) {
  return;
}


localStream
  .getVideoTracks()
  .forEach((track) => {

    track.enabled =
      !track.enabled;

    isCameraOff =
      !track.enabled;

  });


cameraBtn.textContent =
  isCameraOff
    ? "🚫"
    : "📹";

}
);

/* ==============================
END CALL
============================== */

async function endCall() {

if (callEnded) {
return;
}

callEnded = true;

stopCallTimeout();

try {

if (
  callRef &&
  currentUser
) {

  await updateDoc(
    callRef,
    {
      status:
        "ended"
    }
  );

}

} catch (error) {

console.error(
  "END CALL UPDATE ERROR:",
  error
);

}

if (unsubscribeCall) {

unsubscribeCall();

unsubscribeCall =
  null;

}

if (peerConnection) {

peerConnection.close();

peerConnection =
  null;

}

if (localStream) {

localStream
  .getTracks()
  .forEach(
    (track) =>
      track.stop()
  );

localStream =
  null;

}

window.history.back();

}

endBtn.addEventListener(
"click",
endCall
);

closeBtn.addEventListener(
"click",
endCall
);

/* ==============================
AUTH
============================== */

onAuthStateChanged(
auth,
async (user) => {

if (!user) {

  window.location.href =
    "login.html";

  return;

}


currentUser =
  user;


console.log(
  "WORLD CHAT CALL USER:",
  user.uid
);


const mediaReady =
  await startLocalMedia();


if (!mediaReady) {
  return;
}


/*
  If callId already exists,
  this user is receiving
  an existing call.
*/

if (callId) {

  isCaller = false;

  await startReceiverCall();

  return;

}


/*
  No callId means this
  user is starting a call.
*/

if (!otherUserId) {

  callStatus.textContent =
    "No user selected.";

  return;

}


isCaller = true;


callId =
  currentUser.uid +
  "_" +
  otherUserId +
  "_" +
  Date.now();


callRef =
  doc(
    db,
    "Calls",
    callId
  );


try {

  await setDoc(
    callRef,
    {
      callerId:
        currentUser.uid,

      receiverId:
        otherUserId,

      callerName:
        currentUser.displayName ||
        name ||
        "WORLD CHAT USER",

      type:
        type,

      status:
        "ringing",

      callerCandidates:
        [],

      receiverCandidates:
        [],

      createdAt:
        serverTimestamp()
    }
  );


  const newURL =
    "call.html?type=" +
    encodeURIComponent(type) +
    "&uid=" +
    encodeURIComponent(otherUserId) +
    "&name=" +
    encodeURIComponent(name) +
    "&callId=" +
    encodeURIComponent(callId);


  window.history.replaceState(
    {},
    "",
    newURL
  );


  await startCallerCall();

} catch (error) {

  console.error(
    "START CALL ERROR:",
    error
  );

  callStatus.textContent =
    "Unable to start call.";

}

}
);