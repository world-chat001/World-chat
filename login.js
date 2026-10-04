import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { auth } from "./firebase.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("message");
const button = document.querySelector(".login-button");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  message.textContent = "";

  try {
    button.disabled = true;
    button.textContent = "LOGGING IN...";

    await signInWithEmailAndPassword(auth, email, password);

    message.textContent = "LOGIN SUCCESSFUL!";

    button.textContent = "OPENING WORLD CHAT...";

    setTimeout(() => {
      window.location.replace("home.html");
    }, 800);

  } catch (error) {
    console.error("WORLD CHAT LOGIN ERROR:", error);

    button.disabled = false;
    button.textContent = "LOG IN";

    if (
      error.code === "auth/invalid-credential" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/user-not-found"
    ) {
      message.textContent = "Incorrect email or password.";
    } else if (error.code === "auth/invalid-email") {
      message.textContent = "Please enter a valid email address.";
    } else if (error.code === "auth/network-request-failed") {
      message.textContent = "Network error. Check your internet connection.";
    } else {
      message.textContent = "Login failed: " + error.message;
    }
  }
});