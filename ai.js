const form = document.getElementById("aiForm");
const input = document.getElementById("aiInput");
const chatArea = document.getElementById("chatArea");
const sendBtn = document.getElementById("sendBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = input.value.trim();

  if (!message) return;

  // Show user's message
  addMessage(message, "user");

  input.value = "";
  input.disabled = true;
  sendBtn.disabled = true;

  // Show thinking message
  const thinking = addMessage("Thinking...", "ai");

  try {
    /*
      The website will send the message to your secure backend.

      IMPORTANT:
      Never put an AI API key directly inside this file.
    */

    const response = await fetch("/api/ai", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        message: message
      })
    });

    if (!response.ok) {
      throw new Error("AI server error");
    }

    const data = await response.json();

    thinking.remove();

    addMessage(
      data.reply || "Sorry, I couldn't generate a response.",
      "ai"
    );

  } catch (error) {

    console.error(error);

    thinking.remove();

    addMessage(
      "I'm having trouble connecting right now. Please try again.",
      "ai"
    );

  } finally {

    input.disabled = false;
    sendBtn.disabled = false;

    input.focus();
  }
});


function addMessage(text, sender) {

  const message = document.createElement("div");

  message.className =
    sender === "user"
      ? "message user-message"
      : "message ai-message";


  if (sender === "user") {

    message.innerHTML = `
      <div class="bubble">
        <p>${escapeHTML(text)}</p>
      </div>
    `;

  } else {

    message.innerHTML = `
      <div class="avatar">🤖</div>

      <div class="bubble">
        <strong>WORLD CHAT AI</strong>
        <p>${escapeHTML(text)}</p>
      </div>
    `;
  }


  chatArea.appendChild(message);

  chatArea.scrollTop = chatArea.scrollHeight;

  return message;
}


function escapeHTML(text) {

  const div = document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


// Enter key sends the message
input.addEventListener("keydown", (e) => {

  if (e.key === "Enter" && !e.shiftKey) {

    e.preventDefault();

    form.dispatchEvent(new Event("submit"));
  }
});