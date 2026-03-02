// Point this to your active n8n webhook URL
// const webhookUrl = "https://aeoworkflow.duckdns.org/webhook-test/e4bf883b-a430-4c5d-87e8-c1e3de456f92";
const webhookUrl = "https://aeoworkflow.duckdns.org/webhook/e4bf883b-a430-4c5d-87e8-c1e3de456f92";

let messageHistory = [];

document.addEventListener("DOMContentLoaded", () => {
  initializeDarkMode();
  showChatInterface();
});

function initializeDarkMode() {
  const savedDarkMode = localStorage.getItem("darkMode");
  const shouldBeDark = savedDarkMode !== null ? savedDarkMode === "true" : true;

  if (shouldBeDark) {
    document.documentElement.classList.add("dark-mode");
  }

  updateDarkModeIcon();

  document.getElementById("darkModeToggle").addEventListener("click", toggleDarkMode);
}

function toggleDarkMode() {
  const isDarkMode = document.documentElement.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", isDarkMode ? "true" : "false");
  updateDarkModeIcon();
}

function updateDarkModeIcon() {
  const btn = document.getElementById("darkModeToggle");
  const isDark = document.documentElement.classList.contains("dark-mode");

  btn.innerHTML = isDark
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function showChatInterface() {
  document.getElementById("inputGroup").style.display = "flex";
  document.getElementById("messageInput").focus();
}

function handleKeyPress(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

async function sendMessage() {
  const messageInput = document.getElementById("messageInput");
  const message = messageInput.value.trim();
  // GRAB THE CLIENT UUID FROM THE DROPDOWN
  const clientUuid = document.getElementById("clientSelector").value;

  if (!message) return;

  addMessage(message, "user");
  messageHistory.push({ role: "user", content: message });
  messageInput.value = "";

  showLoading(true);

  let sessionId = sessionStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("sessionId", sessionId);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      body: JSON.stringify({
        message: message,
        client_uuid: clientUuid, // SENT TO YOUR N8N WEBHOOK
        sessionId: sessionId,
        history: messageHistory,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    const botResponse =
      typeof data === "string"
        ? data
        : data.output || data.response || data.message || data.text || JSON.stringify(data);

    addMessage(botResponse, "bot");
    messageHistory.push({ role: "assistant", content: botResponse });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = `System Error: ${error.message}. Please check connection to the mainframe.`;
    addMessage(errorMessage, "bot");
  } finally {
    showLoading(false);
    document.getElementById("messageInput").focus();
  }
}

function formatMarkdown(text) {
  let formatted = text.trim();
  formatted = formatted.replace(/\\\[/g, "[").replace(/\\\]/g, "]");
  formatted = formatted.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  formatted = formatted.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  formatted = formatted.replace(/^# (.*$)/gim, "<h1>$1</h1>");
  formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
  formatted = formatted.replace(/^[ \t]*\* (.*$)/gim, "<li>$1</li>");
  formatted = formatted.replace(/(<li>[\s\S]*?<\/li>)/gim, "<ul>$1</ul>");
  formatted = formatted.replace(/<\/ul>\s*<ul>/g, "");
  formatted = formatted.replace(/\n{2,}/g, "</p><p>");
  formatted = formatted.replace(/\n/g, "<br>");
  formatted = "<p>" + formatted + "</p>";
  return formatted;
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById("messagesContainer");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;

  const now = new Date();
  const timeString = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  let formattedText = formatMarkdown(text);

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.innerHTML = formattedText;

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  timeSpan.textContent = timeString;

  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timeSpan);
  messagesContainer.appendChild(messageDiv);

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showLoading(show) {
  const loadingIndicator = document.getElementById("loadingIndicator");
  const sendButton = document.querySelector(".btn-send");

  if (show) {
    loadingIndicator.style.display = "flex";
    sendButton.disabled = true;
    document.getElementById("messageInput").disabled = true;
  } else {
    loadingIndicator.style.display = "none";
    sendButton.disabled = false;
    document.getElementById("messageInput").disabled = false;
  }
}

function clearChat() {
  if (confirm("Initiate system reboot and clear active memory?")) {
    document.getElementById("messagesContainer").innerHTML = `
    <div class="message bot-message">
        <div class="message-content">
            <p>Greetings. I am <strong>J.A.R.V.I.S.</strong></p>
            <p>I am online and successfully synced with the V3 Master Database.</p>
            <p>Please select your target client from the console below. Once selected, I will load their Brand Guidelines, Target Avatars, and Service Architecture into my active memory.</p>
            <p>How may I assist you today?</p>
        </div>
        <span class="message-time">System initialized</span>
    </div>
    `;

    messageHistory = [];
    document.getElementById("messageInput").value = "";
    document.getElementById("messageInput").focus();
    sessionStorage.removeItem("sessionId");
    sessionStorage.setItem("sessionId", crypto.randomUUID());
  }
}