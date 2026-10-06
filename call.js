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

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const muteBtn = document.getElementById("muteBtn");
const cameraBtn = document.getElementById("cameraBtn");
const endBtn = document.getElementById("endBtn");
const closeBtn = document.getElementById("closeBtn");
const callStatus = document.getElementById("callStatus");
const personName = document.getElementById("personName");
const callType = document.getElementById("callType");

const params = new URLSearchParams(window.location.search);

const type = params.get("type") || "video";
const otherUserId = params.get("uid") || "";
const name = params.get("name") || "WORLD CHAT USER";

let callId = params.get("callId") || "";

let currentUser = null;
let localStream = null;
let peerConnection = null;
let callRef = null;
let unsubscribeCall = null;

let isCaller = false;
let callEnded = false;
let isMuted = false;
let isCameraOff = false;

let callTimeout = null;

let callerCandidates = [];
let receiverCandidates = [];

let remoteDescriptionReady = false;

const rtcConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    },
    {
      urls: "stun:stun1.l.google.com:19302"
    }
  ]
};

personName.textContent = name;

if (type === "voice") {
  callType.textContent = "VOICE CALL";

  cameraBtn.classList.add("hidden");
  localVideo.classList.add("hidden");
  remoteVideo.classList.add("hidden");
} else {
  callType.textContent = "VIDEO CALL";
}

/* ==============================
LOCAL MEDIA
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
      await navigator.mediaDevices.getUserMedia(
        constraints
      );

    if (type === "video") {
      localVideo.srcObject = localStream;

      try {
        await localVideo.play();
      } catch (error) {
        console.log("LOCAL VIDEO PLAY:", error);
      }
    }

    return true;

  } catch (error) {

    console.error("MEDIA ERROR:", error);

    if (error.name === "NotAllowedError") {

      callStatus.textContent =
        "Camera or microphone permission was denied.";

    } else if (error.name === "NotFoundError") {

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

  if (peerConnection) {
    return peerConnection;
  }

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

  peerConnection.ontrack = (event) => {

    console.log("REMOTE TRACK RECEIVED");

    if (
      event.streams &&
      event.streams[0]
    ) {

      remoteVideo.srcObject =
        event.streams[0];

      remoteVideo
        .play()
        .catch(() => {});

      callStatus.textContent =
        "Connected";

    }

  };

  peerConnection.onicecandidate =
    async (event) => {

      if (
        !event.candidate ||
        !callRef
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
                arrayUnion(candidate)
            }
          );

        } else {

          await updateDoc(
            callRef,
            {
              receiverCandidates:
                arrayUnion(candidate)
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

  peerConnection.onconnectionstatechange =
    () => {

      const state =
        peerConnection.connectionState;

      console.log(
        "WEBRTC CONNECTION:",
        state
      );

      if (state === "connecting") {

        callStatus.textContent =
          "Connecting...";

      }

      if (state === "connected") {

        callStatus.textContent =
          "Connected";

        stopCallTimeout();

      }

      if (state === "disconnected") {

        callStatus.textContent =
          "Connection interrupted.";

      }

      if (state === "failed") {

        callStatus.textContent =
          "Call connection failed.";

      }

      if (state === "closed") {

        callStatus.textContent =
          "Call ended.";

      }

    };

  return peerConnection;
}

/* ==============================
ADD WAITING ICE CANDIDATES
============================== */

async function addPendingCandidates() {

  if (
    !peerConnection ||
    !remoteDescriptionReady
  ) {
    return;
  }

  if (isCaller) {

    while (receiverCandidates.length) {

      const candidate =
        receiverCandidates.shift();

      try {

        await peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );

      } catch (error) {

        console.error(
          "RECEIVER ICE ERROR:",
          error
        );

      }

    }

  } else {

    while (callerCandidates.length) {

      const candidate =
        callerCandidates.shift();

      try {

        await peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
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

/* ==============================
CALLER
============================== */

async function startCallerCall() {

  callRef =
    doc(
      db,
      "Calls",
      callId
    );

  createPeerConnection();

  try {

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    await updateDoc(
      callRef,
      {
        offer: {
          type: offer.type,
          sdp: offer.sdp
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

          if (!snapshot.exists()) {
            return;
          }

          const data =
            snapshot.data();

          /* ANSWER */

          if (
            data.answer &&
            !remoteDescriptionReady
          ) {

            try {

              await peerConnection.setRemoteDescription(
                new RTCSessionDescription(
                  data.answer
                )
              );

              remoteDescriptionReady =
                true;

              callStatus.textContent =
                "Connecting...";

              await addPendingCandidates();

            } catch (error) {

              console.error(
                "REMOTE ANSWER ERROR:",
                error
              );

            }

          }

          /* RECEIVER ICE */

          if (
            Array.isArray(
              data.receiverCandidates
            )
          ) {

            for (
              const candidate
              of data.receiverCandidates
            ) {

              const alreadyQueued =
                receiverCandidates.some(
                  (item) =>
                    JSON.stringify(item) ===
                    JSON.stringify(candidate)
                );

              if (
                alreadyQueued
              ) {
                continue;
              }

              if (
                remoteDescriptionReady
              ) {

                try {

                  await peerConnection.addIceCandidate(
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

              } else {

                receiverCandidates.push(
                  candidate
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
            "ended"
          ) {

            stopCallTimeout();

            callStatus.textContent =
              "Call ended.";

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

  } catch (error) {

    console.error(
      "CALLER ERROR:",
      error
    );

    callStatus.textContent =
      "Unable to start call.";

  }
}

/* ==============================
RECEIVER
============================== */

async function startReceiverCall() {

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

        if (!snapshot.exists()) {

          callStatus.textContent =
            "Call no longer exists.";

          return;
        }

        const data =
          snapshot.data();

        /* OFFER */

        if (
          data.offer &&
          !remoteDescriptionReady
        ) {

          try {

            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(
                data.offer
              )
            );

            remoteDescriptionReady =
              true;

            const answer =
              await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
              answer
            );

            await updateDoc(
              callRef,
              {
                answer: {
                  type: answer.type,
                  sdp: answer.sdp
                },

                status:
                  "accepted"
              }
            );

            callStatus.textContent =
              "Connecting...";

            await addPendingCandidates();

          } catch (error) {

            console.error(
              "ANSWER ERROR:",
              error
            );

            callStatus.textContent =
              "Unable to answer call.";

          }

        }

        /* CALLER ICE */

        if (
          Array.isArray(
            data.callerCandidates
          )
        ) {

          for (
            const candidate
            of data.callerCandidates
          ) {

            const alreadyQueued =
              callerCandidates.some(
                (item) =>
                  JSON.stringify(item) ===
                  JSON.stringify(candidate)
              );

            if (
              alreadyQueued
            ) {
              continue;
            }

            if (
              remoteDescriptionReady
            ) {

              try {

                await peerConnection.addIceCandidate(
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

            } else {

              callerCandidates.push(
                candidate
              );

            }

          }

        }

        if (
          data.status ===
          "ended"
        ) {

          callStatus.textContent =
            "Call ended.";

        }

      }
    );
}

/* ==============================
CALL TIMEOUT
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

          await addDoc(
            collection(
              db,
              "Notifications",
              otherUserId,
              "items"
            ),
            {
              type:
                "missed_call",

              callType:
                type,

              callerId:
                currentUser.uid,

              callerName:
                currentUser.displayName ||
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
      "END CALL ERROR:",
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
AUTH + START CALL
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
      CALL RECEIVER
    */

    if (callId) {

      isCaller =
        false;

      await startReceiverCall();

      return;
    }

    /*
      CALLER
    */

    if (!otherUserId) {

      callStatus.textContent =
        "No user selected.";

      return;
    }

    isCaller =
      true;

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

      /*
        CREATE INCOMING CALL
        NOTIFICATION
      */

      await addDoc(
        collection(
          db,
          "Notifications",
          otherUserId,
          "items"
        ),
        {
          type:
            "incoming_call",

          callType:
            type,

          callerId:
            currentUser.uid,

          callerName:
            currentUser.displayName ||
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
