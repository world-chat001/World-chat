import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


// ================================
// ELEMENTS
// ================================

const profileAvatar =
  document.getElementById("profileAvatar");

const avatarLetter =
  document.getElementById("avatarLetter");

const profileName =
  document.getElementById("profileName");

const profileEmail =
  document.getElementById("profileEmail");

const profileStatus =
  document.getElementById("profileStatus");

const profileLocation =
  document.getElementById("profileLocation");

const memberSince =
  document.getElementById("memberSince");

const profileBio =
  document.getElementById("profileBio");


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
      "PROFILE USER:",
      user.uid
    );


    await loadProfile(
      user.uid
    );

  }
);


// ================================
// LOAD PROFILE
// ================================

async function loadProfile(
  userId
) {

  try {

    const userRef =
      doc(
        db,
        "Users",
        userId
      );


    const userSnap =
      await getDoc(
        userRef
      );


    if (!userSnap.exists()) {

      console.error(
        "User profile does not exist."
      );

      profileName.textContent =
        "WORLD CHAT USER";

      profileEmail.textContent =
        "";

      profileStatus.textContent =
        "Welcome to WORLD CHAT.";

      profileBio.textContent =
        "No bio yet.";

      return;

    }


    const data =
      userSnap.data();


    console.log(
      "PROFILE DATA:",
      data
    );


    // ==========================
    // NAME
    // ==========================

    const name =
      data.name ||
      data.fullName ||
      user.displayName ||
      "WORLD CHAT USER";


    profileName.textContent =
      name;


    // ==========================
    // EMAIL
    // ==========================

    profileEmail.textContent =
      data.email ||
      user.email ||
      "";


    // ==========================
    // STATUS
    // ==========================

    profileStatus.textContent =
      data.status ||
      "Hey! I'm new to WORLD CHAT.";


    // ==========================
    // BIO
    // ==========================

    profileBio.textContent =
      data.bio ||
      "No bio yet.";


    // ==========================
    // LOCATION
    // ==========================

    profileLocation.textContent =
      data.country ||
      data.location ||
      data.city ||
      "Worldwide";


    // ==========================
    // PROFILE PHOTO
    // ==========================

    if (
      data.photoURL
    ) {

      profileAvatar.innerHTML = "";


      const image =
        document.createElement(
          "img"
        );


      image.src =
        data.photoURL;


      image.alt =
        "Profile photo";


      image.className =
        "profile-photo";


      profileAvatar.appendChild(
        image
      );

    } else {

      avatarLetter.textContent =
        name
          .charAt(0)
          .toUpperCase();

    }


    // ==========================
    // MEMBER SINCE
    // ==========================

    if (
      data.createdAt
    ) {

      let date;


      if (
        typeof data.createdAt.toDate ===
        "function"
      ) {

        date =
          data.createdAt.toDate();

      } else if (
        data.createdAt.seconds
      ) {

        date =
          new Date(
            data.createdAt.seconds *
            1000
          );

      }


      if (date) {

        memberSince.textContent =
          date.toLocaleDateString(
            [],
            {
              month: "long",
              year: "numeric"
            }
          );

      }

    }

  } catch (error) {

    console.error(
      "Profile loading error:",
      error
    );


    profileName.textContent =
      "Unable to load profile";

    profileStatus.textContent =
      "Please refresh and try again.";

  }

}