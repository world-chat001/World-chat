import { auth, db, storage } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";


const profileAvatar = document.getElementById("profileAvatar");
const photoInput = document.getElementById("photoInput");

const nameInput = document.getElementById("nameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const statusInput = document.getElementById("statusInput");

const bioCount = document.getElementById("bioCount");

const saveBtn = document.getElementById("saveBtn");
const message = document.getElementById("message");


let currentUser = null;
let selectedPhoto = null;
let currentPhotoURL = "";


/* =========================
   MESSAGE
========================= */

function showMessage(text, type = "") {

  if (!message) return;

  message.textContent = text;
  message.className = type;

}


/* =========================
   BIO COUNTER
========================= */

function updateBioCount() {

  if (!bioCount || !bioInput) return;

  bioCount.textContent =
    `${bioInput.value.length} / 160`;

}


/* =========================
   SHOW PHOTO
========================= */

function showPhoto(url) {

  if (!profileAvatar) return;

  profileAvatar.innerHTML = "";

  const image =
    document.createElement("img");

  image.src = url;

  image.alt = "Profile photo";

  image.className = "profile-photo";

  profileAvatar.appendChild(image);

}


/* =========================
   SHOW LETTER
========================= */

function showLetter(name) {

  if (!profileAvatar) return;

  profileAvatar.innerHTML = "";

  const letter =
    document.createElement("span");

  letter.textContent =
    name
      ? name.charAt(0).toUpperCase()
      : "?";

  profileAvatar.appendChild(letter);

}


/* =========================
   LOAD PROFILE
========================= */

async function loadUserProfile() {

  try {

    const userRef =
      doc(
        db,
        "Users",
        currentUser.uid
      );

    const userSnap =
      await getDoc(userRef);


    /* =========================
       PROFILE EXISTS
    ========================= */

    if (userSnap.exists()) {

      const data =
        userSnap.data();

      console.log(
        "WORLD CHAT PROFILE:",
        data
      );


      nameInput.value =
        data.name ||
        data.fullName ||
        currentUser.displayName ||
        "";

      bioInput.value =
        data.bio ||
        "";

      locationInput.value =
        data.location ||
        "";

      statusInput.value =
        data.status ||
        "Hey! I'm new to WORLD CHAT.";

      currentPhotoURL =
        data.photoURL ||
        "";


      if (currentPhotoURL) {

        showPhoto(
          currentPhotoURL
        );

      } else {

        showLetter(
          nameInput.value
        );

      }

      updateBioCount();

      return;
    }


    /* =========================
       PROFILE DOES NOT EXIST
       USE FIREBASE AUTH DATA
    ========================= */

    console.log(
      "No WORLD CHAT profile found. Preparing a new profile."
    );


    nameInput.value =
      currentUser.displayName ||
      "";

    bioInput.value =
      "";

    locationInput.value =
      "";

    statusInput.value =
      "Hey! I'm new to WORLD CHAT.";

    currentPhotoURL =
      "";

    showLetter(
      nameInput.value
    );

    updateBioCount();


    showMessage(
      "Complete your profile and tap Save Changes.",
      "success"
    );


  } catch (error) {

    console.error(
      "EDIT PROFILE LOAD ERROR:",
      error
    );

    showMessage(
      error.message ||
      "Unable to load your profile.",
      "error"
    );

  }

}


/* =========================
   AUTH CHECK
========================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      window.location.href =
        "login.html";

      return;
    }


    currentUser = user;


    console.log(
      "WORLD CHAT EDIT PROFILE USER:",
      user.uid
    );


    await loadUserProfile();

  }
);


/* =========================
   PHOTO SELECT
========================= */

photoInput.addEventListener(
  "change",
  (event) => {

    const file =
      event.target.files[0];

    if (!file) return;


    if (!file.type.startsWith("image/")) {

      showMessage(
        "Please select an image.",
        "error"
      );

      photoInput.value = "";

      return;
    }


    if (file.size > 5 * 1024 * 1024) {

      showMessage(
        "Photo must be less than 5MB.",
        "error"
      );

      photoInput.value = "";

      return;
    }


    selectedPhoto =
      file;


    const previewURL =
      URL.createObjectURL(file);


    showPhoto(
      previewURL
    );

  }
);


/* =========================
   NAME PREVIEW
========================= */

nameInput.addEventListener(
  "input",
  () => {

    if (
      !currentPhotoURL &&
      !selectedPhoto
    ) {

      showLetter(
        nameInput.value.trim()
      );

    }

  }
);


/* =========================
   BIO
========================= */

bioInput.addEventListener(
  "input",
  updateBioCount
);


/* =========================
   SAVE
========================= */

saveBtn.addEventListener(
  "click",
  saveProfile
);


/* =========================
   SAVE PROFILE
========================= */

async function saveProfile() {

  if (!currentUser) {

    showMessage(
      "Please wait for your account to load.",
      "error"
    );

    return;
  }


  const name =
    nameInput.value.trim();

  const bio =
    bioInput.value.trim();

  const location =
    locationInput.value.trim();

  const status =
    statusInput.value.trim();


  if (!name) {

    showMessage(
      "Please enter your name.",
      "error"
    );

    nameInput.focus();

    return;
  }


  saveBtn.disabled = true;

  saveBtn.textContent =
    "Saving...";


  try {

    let photoURL =
      currentPhotoURL;


    /* =========================
       UPLOAD NEW PHOTO
    ========================= */

    if (selectedPhoto) {

      saveBtn.textContent =
        "Uploading photo...";


      const photoRef =
        ref(
          storage,
          `profilePhotos/${currentUser.uid}/profile.jpg`
        );


      await uploadBytes(
        photoRef,
        selectedPhoto
      );


      photoURL =
        await getDownloadURL(
          photoRef
        );

    }


    /* =========================
       CREATE OR UPDATE PROFILE
    ========================= */

    saveBtn.textContent =
      "Saving profile...";


    const userRef =
      doc(
        db,
        "Users",
        currentUser.uid
      );


    await setDoc(
      userRef,
      {

        uid:
          currentUser.uid,

        name:
          name,

        email:
          currentUser.email || "",

        bio:
          bio,

        location:
          location,

        status:
          status ||
          "Hey! I'm new to WORLD CHAT.",

        photoURL:
          photoURL,

        updatedAt:
          new Date().toISOString()

      },
      {
        merge: true
      }
    );


    console.log(
      "WORLD CHAT PROFILE SAVED"
    );


    showMessage(
      "Profile updated successfully!",
      "success"
    );


    saveBtn.textContent =
      "Saved ✓";


    setTimeout(
      () => {

        window.location.href =
          "profile.html";

      },
      900
    );


  } catch (error) {

    console.error(
      "PROFILE SAVE ERROR:",
      error
    );


    showMessage(
      error.message ||
      "Unable to save your profile.",
      "error"
    );


    saveBtn.disabled =
      false;

    saveBtn.textContent =
      "Save Changes";

  }

}