/* =========================================================
   NORTH CRESCENT — CLEANING CONCIERGE (page script)
   1. Configuration   2. Chat application   3. Phone keyboard
   Loaded once and cached by the browser (was inline in the page).
   ========================================================= */

window.NORTH_CRESCENT_CONCIERGE = {
  brand: {
    name: "North Crescent Facility Solutions Inc.",
    website: "https://northcrescentcleaning.com",
    email: "info@northcrescentcleaning.com"
  },
  page: {
    name: "Cleaning Services Concierge",
    url: "https://northcrescentcleaning.com/cleaning-concierge.html"
  },
  concierge: {
    name: "North Crescent Cleaning Concierge",
    emailRequired: true,
    phoneRequiredInitially: false,
    maxMessageLength: 2e3,
    maxConversationMessages: 50
  },
  api: {
    endpoint: "/.netlify/functions/concierge",
    method: "POST",
    timeout: 3e4
  },
  storage: {
    conversationId: "north_crescent_conversation_id",
    email: "north_crescent_concierge_email",
    messages: "north_crescent_concierge_messages",
    context: "north_crescent_concierge_context"
  },
  services: {
    commercial: "Commercial Cleaning",
    residential: "Residential Cleaning",
    deep: "Deep Cleaning",
    moveInOut: "Move-In / Move-Out Cleaning",
    airbnb: "Airbnb Cleaning",
    janitorial: "Janitorial Services",
    postConstruction: "Post-Construction Cleaning",
    office: "Office Cleaning",
    retail: "Retail Cleaning",
    warehouse: "Warehouse Cleaning",
    industrial: "Industrial Cleaning",
    medicalOffice: "Medical Office Cleaning",
    facility: "Facility Services"
  },
  serviceAreas: [
    "Moncton",
    "Dieppe",
    "Riverview",
    "Shediac",
    "Salisbury",
    "Memramcook",
    "Southeast New Brunswick"
  ],
  intent: {
    question: "QUESTION",
    quoteRequest: "QUOTE_REQUEST",
    hotLead: "HOT_LEAD",
    humanRequired: "HUMAN_REQUIRED",
    notAService: "NOT_A_SERVICE",
    spam: "SPAM"
  }
};

(function() {
  "use strict";
  const CONFIG = window.NORTH_CRESCENT_CONCIERGE;
  /* Pages under /fr/ use <html lang="fr">; the Concierge itself answers in the visitor's language */
  const FR = (document.documentElement.lang || "").toLowerCase().indexOf("fr") === 0;
  const tr = (en, fr) => FR ? fr : en;
  const SERVICES_FR = {
    commercial: "Nettoyage commercial",
    residential: "Nettoyage résidentiel",
    deep: "Nettoyage en profondeur",
    moveInOut: "Nettoyage d’emménagement / de déménagement",
    "move-in-out": "Nettoyage d’emménagement / de déménagement",
    airbnb: "Nettoyage Airbnb",
    janitorial: "Services d’entretien ménager",
    postConstruction: "Nettoyage après construction",
    "post-construction": "Nettoyage après construction",
    office: "Nettoyage de bureaux",
    retail: "Nettoyage de commerces de détail",
    warehouse: "Nettoyage d’entrepôts",
    industrial: "Nettoyage industriel",
    medicalOffice: "Nettoyage de bureaux médicaux",
    facility: "Services aux installations"
  };
  if (!CONFIG) {
    console.error(
      "North Crescent Concierge configuration is missing."
    );
    return;
  }
  const INACTIVITY_TIMEOUT = 3 * 60 * 1e3;
  let inactivityTimer = null;
  function resetInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(
        inactivityTimer
      );
    }
    inactivityTimer = setTimeout(
      function() {
        localStorage.removeItem(
          CONFIG.storage.conversationId
        );
        localStorage.removeItem(
          CONFIG.storage.messages
        );
        localStorage.removeItem(
          CONFIG.storage.email
        );
        localStorage.removeItem(
          "north_crescent_concierge_lead_profile"
        );
        window.location.reload();
      },
      INACTIVITY_TIMEOUT
    );
  }
  const emailForm = document.getElementById(
    "conciergeEmailForm"
  );
  const emailInput = document.getElementById(
    "conciergeEmail"
  );
  const emailError = document.getElementById(
    "conciergeEmailError"
  );
  const entryCard = document.getElementById(
    "conciergeEntryCard"
  );
  const chatSection = document.getElementById(
    "conciergeChatSection"
  );
  const messagesContainer = document.getElementById(
    "conciergeMessages"
  );
  const messageForm = document.getElementById(
    "conciergeMessageForm"
  );
  const messageInput = document.getElementById(
    "conciergeMessageInput"
  );
  const sendButton = document.getElementById(
    "conciergeSendButton"
  );
  const characterCount = document.getElementById(
    "conciergeCharacterCount"
  );
  const typingIndicator = document.getElementById(
    "conciergeTypingIndicator"
  );
  const chatError = document.getElementById(
    "conciergeChatError"
  );
  const chatErrorText = document.getElementById(
    "conciergeChatErrorText"
  );
  const retryButton = document.getElementById(
    "retryConciergeMessage"
  );
  const quickStart = document.getElementById(
    "conciergeQuickStart"
  );
  const contextBar = document.getElementById(
    "conciergeContextBar"
  );
  const activeServiceContext = document.getElementById(
    "activeServiceContext"
  );
  const clearServiceContext = document.getElementById(
    "clearServiceContext"
  );
  const serviceContextNotice = document.getElementById(
    "serviceContextNotice"
  );
  const serviceContextLabel = document.getElementById(
    "serviceContextLabel"
  );
  const newConversationButton = document.getElementById(
    "conciergeNewConversation"
  );
  const attachmentButton = document.getElementById(
    "conciergeAttachmentButton"
  );
  const fileInput = document.getElementById(
    "conciergeFileInput"
  );
  const attachmentPreview = document.getElementById(
    "conciergeAttachmentPreview"
  );
  const attachmentFileName = document.getElementById(
    "attachmentFileName"
  );
  const removeAttachment = document.getElementById(
    "removeAttachment"
  );
  const currentYear = document.getElementById(
    "currentYear"
  );
  const state = {
    email: localStorage.getItem(CONFIG.storage.email) || "",
    conversationId: localStorage.getItem(CONFIG.storage.conversationId) || null,
    messages: [],
    service: null,
    source: null,
    campaign: null,
    /* =====================================================
       LEAD PROFILE
       Structured memory collected during the conversation
       ===================================================== */
    leadProfile: {
      clientName: "",
      companyName: "",
      mainContact: "",
      phoneNumber: "",
      emailAddress: "",
      serviceAddress: "",
      city: "",
      province: "",
      postalCode: "",
      serviceType: "",
      squareFootage: "",
      visitsPerMonth: "",
      recurringVisits: "",
      timeSlot: "",
      estimatedDuration: "",
      complexityLevel: "",
      operationalSummary: "",
      accessInstructions: "",
      sensitiveAreas: ""
    },
    lastFailedMessage: null,
    isSending: false,
    attachment: null
  };
  if (currentYear) {
    currentYear.textContent = (/* @__PURE__ */ new Date()).getFullYear();
  }
  function generateConversationId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "nc-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 10);
  }
  function readUrlContext() {
    const params = new URLSearchParams(
      window.location.search
    );
    state.service = params.get("service") || null;
    state.source = params.get("source") || null;
    state.campaign = params.get("campaign") || null;
    if (!CONFIG.context) {
      CONFIG.context = {};
    }
    CONFIG.context.service = state.service;
    CONFIG.context.source = state.source;
    CONFIG.context.campaign = state.campaign;
    CONFIG.context.pageUrl = window.location.href;
    CONFIG.context.referrer = document.referrer || null;
  }
  function getServiceLabel(service) {
    if (!service) {
      return null;
    }
    if (FR && SERVICES_FR[service]) {
      return SERVICES_FR[service];
    }
    return CONFIG.services[service] || service;
  }
  function updateServiceContextUI() {
    const label = getServiceLabel(
      state.service
    );
    if (!label) {
      if (serviceContextNotice) {
        serviceContextNotice.hidden = true;
      }
      if (contextBar) {
        contextBar.hidden = true;
      }
      return;
    }
    if (serviceContextLabel) {
      serviceContextLabel.textContent = label;
    }
    if (activeServiceContext) {
      activeServiceContext.textContent = label;
    }
    if (serviceContextNotice) {
      serviceContextNotice.hidden = false;
    }
    if (contextBar) {
      contextBar.hidden = false;
    }
  }
  function isValidEmail(email) {
    const value = String(email || "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  }
  function showEmailError(message) {
    if (!emailError) {
      return;
    }
    emailError.textContent = message;
    emailError.hidden = false;
    emailInput.setAttribute(
      "aria-invalid",
      "true"
    );
  }
  function clearEmailError() {
    if (!emailError) {
      return;
    }
    emailError.textContent = "";
    emailError.hidden = true;
    emailInput.removeAttribute(
      "aria-invalid"
    );
  }
  if (emailForm) {
    emailForm.addEventListener(
      "submit",
      function(event) {
        event.preventDefault();
        clearEmailError();
        const email = emailInput.value.trim().toLowerCase();
        if (!email) {
          showEmailError(
            tr("Please enter your email address.", "Veuillez entrer votre adresse courriel.")
          );
          emailInput.focus();
          return;
        }
        if (!isValidEmail(email)) {
          showEmailError(
            tr("Please enter a valid email address.", "Veuillez entrer une adresse courriel valide.")
          );
          emailInput.focus();
          return;
        }
        state.email = email;
        state.leadProfile.emailAddress = email;
        saveLeadProfile();
        localStorage.setItem(
          CONFIG.storage.email,
          email
        );
        if (!state.conversationId) {
          state.conversationId = generateConversationId();
          localStorage.setItem(
            CONFIG.storage.conversationId,
            state.conversationId
          );
        }
        localStorage.setItem(
          CONFIG.storage.context,
          JSON.stringify(
            CONFIG.context
          )
        );
        startConversation();
      }
    );
  }
  function startConversation() {
    if (entryCard) {
      entryCard.classList.add(
        "concierge-entry-complete"
      );
    }
    if (chatSection) {
      chatSection.hidden = false;
      chatSection.classList.add(
        "concierge-chat-active"
      );
    }
    if (quickStart) {
      quickStart.hidden = false;
    }
    updateServiceContextUI();
    setTimeout(
      function() {
        if (chatSection) {
          chatSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
        if (messageInput) {
          messageInput.focus();
        }
      },
      150
    );
    trackEvent(
      "concierge_started",
      {
        service: state.service || "general",
        source: state.source || "direct"
      }
    );
    resetInactivityTimer();
  }
  function trackEvent(eventName, parameters = {}) {
    if (typeof window.gtag === "function") {
      window.gtag(
        "event",
        eventName,
        parameters
      );
    }
  }
  function formatMessageTime() {
    return new Intl.DateTimeFormat(
      FR ? "fr-CA" : "en-CA",
      {
        hour: "numeric",
        minute: "2-digit"
      }
    ).format(
      /* @__PURE__ */ new Date()
    );
  }
  function escapeHtml(value) {
    const div = document.createElement(
      "div"
    );
    div.textContent = String(value || "");
    return div.innerHTML;
  }
  function formatMessageText(text) {
    return escapeHtml(
      text
    ).replace(
      /\n/g,
      "<br>"
    );
  }
  function addUserMessage(text) {
    const wrapper = document.createElement(
      "div"
    );
    wrapper.className = "chat-message chat-message-user";
    wrapper.dataset.messageRole = "user";
    wrapper.innerHTML = `

                    <div class="chat-message-content">

                        <div class="chat-message-bubble">

                            <p>
                                ${formatMessageText(text)}
                            </p>

                        </div>

                        <span class="chat-message-time">
                            ${formatMessageTime()}
                        </span>

                    </div>

                `;
    messagesContainer.appendChild(
      wrapper
    );
    scrollMessagesToBottom();
  }
  function addConciergeMessage(text) {
    const wrapper = document.createElement(
      "div"
    );
    wrapper.className = "chat-message chat-message-concierge";
    wrapper.dataset.messageRole = "assistant";
    wrapper.innerHTML = `

                    <div
                        class="chat-message-avatar"
                        aria-hidden="true"
                    >
                        NC
                    </div>

                    <div class="chat-message-content">

                        <div class="chat-message-bubble">

                            <p>
                                ${formatMessageText(text)}
                            </p>

                        </div>

                        <span class="chat-message-time">
                            ${formatMessageTime()}
                        </span>

                    </div>

                `;
    messagesContainer.appendChild(
      wrapper
    );
    scrollMessagesToBottom();
  }
  function scrollMessagesToBottom(behavior = "smooth") {
    if (!messagesContainer) {
      return;
    }
    requestAnimationFrame(
      function() {
        requestAnimationFrame(
          function() {
            const bottom = messagesContainer.scrollHeight;
            messagesContainer.scrollTo({
              top: bottom,
              behavior
            });
          }
        );
      }
    );
  }
  function restoreChatScrollPosition() {
    if (!messagesContainer) {
      return;
    }
    requestAnimationFrame(
      function() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    );
  }
  function showTyping() {
    if (!typingIndicator) {
      return;
    }
    typingIndicator.hidden = false;
    scrollMessagesToBottom();
  }
  function hideTyping() {
    if (!typingIndicator) {
      return;
    }
    typingIndicator.hidden = true;
  }
  function showChatError(message) {
    if (!chatError) {
      return;
    }
    chatErrorText.textContent = message || tr("Please try again.", "Veuillez réessayer.");
    chatError.hidden = false;
    scrollMessagesToBottom();
  }
  function hideChatError() {
    if (!chatError) {
      return;
    }
    chatError.hidden = true;
  }
  function saveLeadProfile() {
    try {
      localStorage.setItem(
        "north_crescent_concierge_lead_profile",
        JSON.stringify(state.leadProfile)
      );
    } catch (error) {
      console.warn(
        "Unable to save Concierge lead profile.",
        error
      );
    }
  }
  function loadLeadProfile() {
    try {
      const stored = localStorage.getItem(
        "north_crescent_concierge_lead_profile"
      );
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!parsed || typeof parsed !== "object") return;
      state.leadProfile = {
        ...state.leadProfile,
        ...parsed
      };
    } catch (error) {
      console.warn(
        "Unable to restore Concierge lead profile.",
        error
      );
    }
  }
  function saveMessages() {
    try {
      localStorage.setItem(
        CONFIG.storage.messages,
        JSON.stringify(
          state.messages
        )
      );
    } catch (error) {
      console.warn(
        "Unable to save Concierge messages.",
        error
      );
    }
  }
  function loadMessages() {
    try {
      const stored = localStorage.getItem(
        CONFIG.storage.messages
      );
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return;
      }
      state.messages = parsed.slice(
        -CONFIG.concierge.maxConversationMessages
      );
      if (!messagesContainer) {
        return;
      }
      messagesContainer.innerHTML = "";
      state.messages.forEach(
        function(message) {
          if (!message || !message.role || !message.content) {
            return;
          }
          if (message.role === "user") {
            addUserMessage(
              message.content
            );
          }
          if (message.role === "assistant") {
            addConciergeMessage(
              message.content
            );
          }
        }
      );
      restoreChatScrollPosition();
    } catch (error) {
      console.warn(
        "Unable to restore Concierge messages.",
        error
      );
    }
  }
  function buildPayload() {
    return {
      conversationId: state.conversationId,
      emailAddress: state.email,
      serviceContext: state.service,
      source: state.source,
      campaign: state.campaign,
      pageUrl: window.location.href,
      referrer: document.referrer || null,
      messages: state.messages,
      leadProfile: state.leadProfile,
      context: {
        service: state.service,
        source: state.source,
        campaign: state.campaign,
        pageUrl: window.location.href
      }
    };
  }
  async function sendConversation() {
    const controller = new AbortController();
    const timeout = setTimeout(
      function() {
        controller.abort();
      },
      CONFIG.api.timeout
    );
    try {
      const response = await fetch(
        CONFIG.api.endpoint,
        {
          method: CONFIG.api.method,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            buildPayload()
          ),
          signal: controller.signal
        }
      );
      clearTimeout(
        timeout
      );
      let data = null;
      try {
        data = await response.json();
      } catch (jsonError) {
        data = null;
      }
      if (!response.ok) {
        throw new Error(
          data && data.error ? data.error : "Unable to connect with the Concierge."
        );
      }
      return data || {};
    } catch (error) {
      clearTimeout(
        timeout
      );
      throw error;
    }
  }
  async function processUserMessage(text) {
    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return;
    }
    if (cleanText.length > CONFIG.concierge.maxMessageLength) {
      showChatError(
        tr("Your message is too long. Please keep it under 2,000 characters.", "Votre message est trop long. Veuillez ne pas dépasser 2 000 caractères.")
      );
      return;
    }
    if (state.isSending) {
      return;
    }
    hideChatError();
    state.isSending = true;
    resetInactivityTimer();
    state.lastFailedMessage = cleanText;
    addUserMessage(
      cleanText
    );
    state.messages.push({
      role: "user",
      content: cleanText,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    state.messages = state.messages.slice(
      -CONFIG.concierge.maxConversationMessages
    );
    saveMessages();
    if (messageInput) {
      messageInput.value = "";
    }
    updateCharacterCount();
    if (sendButton) {
      sendButton.disabled = true;
    }
    showTyping();
    try {
      const data = await sendConversation();
      hideTyping();
      if (data.leadProfile && typeof data.leadProfile === "object") {
        state.leadProfile = {
          ...state.leadProfile,
          ...data.leadProfile
        };
        saveLeadProfile();
      }
      const reply = data.reply || data.message || data.response;
      if (reply) {
        addConciergeMessage(
          reply
        );
        state.messages.push({
          role: "assistant",
          content: reply,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        state.messages = state.messages.slice(
          -CONFIG.concierge.maxConversationMessages
        );
        saveMessages();
        trackEvent(
          "concierge_response_received",
          {
            service: state.service || "general"
          }
        );
      } else {
        addConciergeMessage(
          tr("Thank you. We've received your message. If additional information is needed, we'll help connect you with the North Crescent team.", "Merci. Nous avons bien reçu votre message. Si d’autres renseignements sont nécessaires, nous vous mettrons en contact avec l’équipe North Crescent.")
        );
      }
    } catch (error) {
      hideTyping();
      console.error(
        "Concierge request failed:",
        error
      );
      showChatError(
        tr("We couldn't connect with the Concierge right now. Please try again.", "Impossible de joindre le concierge pour le moment. Veuillez réessayer.")
      );
      trackEvent(
        "concierge_error",
        {
          service: state.service || "general"
        }
      );
    } finally {
      state.isSending = false;
      if (sendButton) {
        sendButton.disabled = false;
      }
      if (messageInput) {
        messageInput.focus();
      }
      restoreChatScrollPosition();
    }
  }
  if (messageForm) {
    messageForm.addEventListener(
      "submit",
      function(event) {
        event.preventDefault();
        if (state.isSending) {
          return;
        }
        processUserMessage(
          messageInput.value
        );
      }
    );
  }
  if (messageInput) {
    messageInput.addEventListener(
      "keydown",
      function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          if (!state.isSending) {
            messageForm.requestSubmit();
          }
        }
      }
    );
  }
  function updateCharacterCount() {
    if (!messageInput || !characterCount) {
      return;
    }
    const length = messageInput.value.length;
    characterCount.textContent = `${length} / ${CONFIG.concierge.maxMessageLength}`;
    characterCount.classList.toggle(
      "is-near",
      length > CONFIG.concierge.maxMessageLength - 300
    );
    if (length > CONFIG.concierge.maxMessageLength * 0.9) {
      characterCount.classList.add(
        "character-count-warning"
      );
    } else {
      characterCount.classList.remove(
        "character-count-warning"
      );
    }
  }
  if (messageInput) {
    messageInput.addEventListener(
      "input",
      function() {
        updateCharacterCount();
        resetInactivityTimer();
      }
    );
  }
  document.querySelectorAll(
    ".quick-action-button"
  ).forEach(
    function(button) {
      button.addEventListener(
        "click",
        function() {
          const message = button.dataset.message;
          const service = button.dataset.service;
          if (service) {
            state.service = service;
            CONFIG.context.service = service;
            updateServiceContextUI();
          }
          if (message) {
            processUserMessage(
              message
            );
          }
        }
      );
    }
  );
  document.querySelectorAll(
    ".concierge-service-card"
  ).forEach(
    function(card) {
      card.addEventListener(
        "click",
        function() {
          const service = card.dataset.service;
          if (!service) {
            return;
          }
          const serviceMessages = {
            commercial: tr("I need commercial cleaning services.", "J’ai besoin de services de nettoyage commercial."),
            residential: tr("I need residential cleaning services.", "J’ai besoin de services de nettoyage résidentiel."),
            airbnb: tr("I need Airbnb cleaning or turnover service.", "J’ai besoin d’un nettoyage Airbnb ou d’une remise en état entre séjours."),
            janitorial: tr("I need recurring janitorial or office cleaning.", "J’ai besoin d’entretien ménager récurrent ou de nettoyage de bureaux."),
            postConstruction: tr("I need post-construction cleaning.", "J’ai besoin d’un nettoyage après construction."),
            general: tr("I have a question about your cleaning services.", "J’ai une question sur vos services de nettoyage.")
          };
          const message = serviceMessages[service] || "";
          state.service = service;
          CONFIG.context.service = service;
          updateServiceContextUI();
          if (chatSection && chatSection.hidden) {
            if (!state.email) {
              if (emailInput) {
                emailInput.focus();
              }
              entryCard.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
              return;
            }
            startConversation();
          }
          if (message && !state.isSending) {
            processUserMessage(
              message
            );
          }
        }
      );
    }
  );
  if (clearServiceContext) {
    clearServiceContext.addEventListener(
      "click",
      function() {
        state.service = null;
        CONFIG.context.service = null;
        updateServiceContextUI();
      }
    );
  }
  if (retryButton) {
    retryButton.addEventListener(
      "click",
      function() {
        hideChatError();
        if (state.lastFailedMessage) {
          processUserMessage(
            state.lastFailedMessage
          );
        }
      }
    );
  }
  if (newConversationButton) {
    newConversationButton.addEventListener(
      "click",
      function() {
        const confirmed = window.confirm(
          tr("Start a new conversation? Your current conversation on this device will be cleared.", "Commencer une nouvelle conversation? La conversation en cours sur cet appareil sera effacée.")
        );
        if (!confirmed) {
          return;
        }
        localStorage.removeItem(
          CONFIG.storage.conversationId
        );
        localStorage.removeItem(
          CONFIG.storage.messages
        );
        state.conversationId = generateConversationId();
        state.messages = [];
        state.lastFailedMessage = null;
        localStorage.setItem(
          CONFIG.storage.conversationId,
          state.conversationId
        );
        location.reload();
      }
    );
  }
  if (attachmentButton) {
    attachmentButton.addEventListener(
      "click",
      function() {
        if (fileInput) {
          fileInput.click();
        }
      }
    );
  }
  if (fileInput) {
    fileInput.addEventListener(
      "change",
      function() {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
          return;
        }
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic"
        ];
        if (!allowedTypes.includes(
          file.type
        )) {
          fileInput.value = "";
          showChatError(
            tr("Please select a JPG, PNG, WEBP or HEIC image.", "Veuillez choisir une image JPG, PNG, WEBP ou HEIC.")
          );
          return;
        }
        state.attachment = file;
        if (attachmentFileName) {
          attachmentFileName.textContent = file.name;
        }
        if (attachmentPreview) {
          attachmentPreview.hidden = false;
        }
      }
    );
  }
  if (removeAttachment) {
    removeAttachment.addEventListener(
      "click",
      function() {
        state.attachment = null;
        if (fileInput) {
          fileInput.value = "";
        }
        if (attachmentPreview) {
          attachmentPreview.hidden = true;
        }
      }
    );
  }
  if (state.email && emailInput) {
    emailInput.value = state.email;
  }
  if (!state.conversationId) {
    state.conversationId = generateConversationId();
    localStorage.setItem(
      CONFIG.storage.conversationId,
      state.conversationId
    );
  }
  readUrlContext();
  loadLeadProfile();
  updateServiceContextUI();
  loadMessages();
  if (state.email && state.messages && state.messages.length > 0) {
    startConversation();
  }
  updateCharacterCount();
  document.addEventListener(
    "visibilitychange",
    function() {
      if (document.visibilityState === "visible") {
        trackEvent(
          "concierge_page_return"
        );
      }
    }
  );
  trackEvent(
    "concierge_page_view",
    {
      service: state.service || "general",
      source: state.source || "direct"
    }
  );
})();

/* Phones: the chat is exactly the size of the visible screen, keyboard open or not,
   so typing never pushes or zooms the page and the newest message stays in view. */
(function() {
  "use strict";
  const chat = document.getElementById("conciergeChatSection");
  if (!chat) return;
  const root = document.documentElement;
  const vv = window.visualViewport;
  let frame = null;
  function update() {
    root.style.setProperty("--cc-view-h", Math.round(vv ? vv.height : window.innerHeight) + "px");
    root.style.setProperty("--cc-view-top", Math.round(vv ? vv.offsetTop : 0) + "px");
    if (!chat.classList.contains("concierge-chat-active") || !window.matchMedia("(max-width: 760px)").matches) return;
    if (window.scrollY !== 0) window.scrollTo(0, 0);
    const list = document.getElementById("conciergeMessages");
    if (list) list.scrollTop = list.scrollHeight;
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(function() { frame = null; update(); });
  }
  window.addEventListener("resize", schedule, { passive: true });
  if (vv) {
    vv.addEventListener("resize", schedule, { passive: true });
    vv.addEventListener("scroll", schedule, { passive: true });
  }
  new MutationObserver(schedule).observe(chat, { attributes: true, attributeFilter: ["class", "hidden"] });
  update();
})();
