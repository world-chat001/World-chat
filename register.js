import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const registerForm =
  document.getElementById("registerForm");

const nameInput =
  document.getElementById("name");

const emailInput =
  document.getElementById("email");

const passwordInput =
  document.getElementById("password");

const confirmPasswordInput =
  document.getElementById("confirmPassword");

const termsInput =
  document.getElementById("terms");

const message =
  document.getElementById("message");


registerForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const name =
      nameInput.value.trim();

    const email =
      emailInput.value.trim();

    const password =
      passwordInput.value;

    const confirmPassword =
      confirmPasswordInput.value;


    message.textContent = "";


    // =========================
    // CHECK NAME
    // =========================

    if (!name) {

      message.textContent =
        "Please enter your full name.";

      return;
    }


    // =========================
    // CHECK EMAIL
    // =========================

    if (!email) {

      message.textContent =
        "Please enter your email.";

      return;
    }


    // =========================
    // CHECK PASSWORD
    // =========================

    if (!password) {

      message.textContent =
        "Please enter a password.";

      return;
    }


    if (password.length < 6) {

      message.textContent =
        "Password must be at least 6 characters.";

      return;
    }


    // =========================
    // CONFIRM PASSWORD
    // =========================

    if (
      password !==
      confirmPassword
    ) {

      message.textContent =
        "Passwords do not match.";

      return;
    }


    // =========================
    // TERMS
    // =========================

    if (
      termsInput &&
      !termsInput.checked
    ) {

      message.textContent =
        "Please accept the terms.";

      return;
    }


    try {

      message.textContent =
        "Creating your WORLD CHAT account...";


      // =========================
      // CREATE FIREBASE ACCOUNT
      // =========================

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );


      const user =
        userCredential.user;


      // =========================
      // ADD NAME TO AUTH PROFILE
      // =========================

      await updateProfile(
        user,
        {
          displayName: name
        }
      );


      // =========================
      // CREATE GLOBAL USER PROFILE
      // =========================

      await setDoc(

        doc(
          db,
          "Users",
          user.uid
        ),

        {

          uid:
            user.uid,

          name:
            name,

          email:
            email,

          photoURL:
            "",

          bio:
            "",

          status:
            "Hey! I'm new to WORLD CHAT.",

          // EVERY NEW ACCOUNT IS A MEMBER
          // OWNER WILL BE MARKED SEPARATELY
          isOwner:
            false,

          createdAt:
            serverTimestamp()

        }

      );


      // =========================
      // SUCCESS
      // =========================

      message.textContent =
        "Registration successful!";


      setTimeout(
        () => {

          window.location.href =
            "home.html";

        },
        800
      );


    } catch (error) {

      console.error(
        "Registration error:",
        error
      );


      if (
        error.code ===
        "auth/email-already-in-use"
      ) {

        message.textContent =
          "This email is already registered.";

      } else if (
        error.code ===
        "auth/invalid-email"
      ) {

        message.textContent =
          "Please enter a valid email.";

      } else if (
        error.code ===
        "auth/weak-password"
      ) {

        message.textContent =
          "Password is too weak.";

      } else if (
        error.code ===
        "permission-denied"
      ) {

        message.textContent =
          "Account created, but profile could not be saved. Check Firestore permissions.";

      } else {

        message.textContent =
          error.message ||
          "Registration failed. Please try again.";

      }

    }

  }
);