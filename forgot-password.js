import { auth } from "./firebase.js";

import {
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


const forgotForm = document.getElementById("forgotForm");
const emailInput = document.getElementById("email");
const message = document.getElementById("message");
const resetBtn = document.getElementById("resetBtn");


forgotForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const email = emailInput.value.trim();

  if (!email) {
    message.textContent = "Please enter your email.";
    message.className = "error";
    return;
  }

  resetBtn.disabled = true;
  resetBtn.textContent = "Sending...";

  try {

    await sendPasswordResetEmail(auth, email);

    message.textContent =
      "Password reset email sent! Check your inbox and spam folder.";

    message.className = "success";

    emailInput.value = "";

  } catch (error) {

    console.error("Firebase error:", error);

    message.textContent =
      "Firebase error: " + error.code;

    message.className = "error";
  }

  resetBtn.disabled = false;
  resetBtn.textContent = "Send Reset Link";

});