/**
 * NORTH CRESCENT OS
 * Concierge Brain
 *
 * Central coordinator for the Concierge intelligence layer.
 *
 * brain.js coordinates:
 * - rules.js
 * - knowledge.js
 * - existing North Crescent OS systems
 *
 * It does NOT contain:
 * - pricing calculations
 * - Airtable logic
 * - customer database logic
 * - duplicate operational state
 * - Make/OpenAI connection logic
 *
 * Pricing remains in pricing-engine.js.
 * Operational truth remains in operationalState.
 */

import BRAIN_RULES from "./rules.mjs";
import CONCIERGE_KNOWLEDGE from "./knowledge.mjs";


/* =========================================================
   INTERNAL HELPERS
   ========================================================= */

function isObject(value) {
    return value !== null &&
        typeof value === "object" &&
        !Array.isArray(value);
}


function cleanValue(value) {

    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value !== "string") {
        return String(value);
    }

    return value.trim();
}

function normalizeText(value) {

    return cleanValue(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}


function normalizeLeadProfile(profile = {}) {

    const source = isObject(profile) ? profile : {};

    return {
        clientName: cleanValue(source.clientName),
        companyName: cleanValue(source.companyName),
        mainContact: cleanValue(source.mainContact),
        phoneNumber: cleanValue(source.phoneNumber),
        emailAddress: cleanValue(source.emailAddress),
        serviceAddress: cleanValue(source.serviceAddress),
        city: cleanValue(source.city),
        province: cleanValue(source.province),
        postalCode: cleanValue(source.postalCode),
        serviceType: cleanValue(source.serviceType),
        squareFootage: cleanValue(source.squareFootage),
        visitsPerMonth: cleanValue(source.visitsPerMonth),
        recurringVisits: cleanValue(source.recurringVisits),
        timeSlot: cleanValue(source.timeSlot),
        estimatedDuration: cleanValue(source.estimatedDuration),
        complexityLevel: cleanValue(source.complexityLevel),
        operationalSummary: cleanValue(source.operationalSummary),
        accessInstructions: cleanValue(source.accessInstructions),
        sensitiveAreas: cleanValue(source.sensitiveAreas)
    };
}


/* =========================================================
   CONVERSATION HELPERS
   ========================================================= */

function getMessages(conversationHistory = []) {

    if (!Array.isArray(conversationHistory)) {
        return [];
    }

    return conversationHistory;
}


function getMostRecentUserMessage(conversationHistory = []) {

    const messages = getMessages(conversationHistory);

    for (let i = messages.length - 1; i >= 0; i--) {

        const message = messages[i];

        if (
            isObject(message) &&
            normalizeText(message.role) === "user"
        ) {
            return cleanValue(message.content);
        }
    }

    return "";
}


function getPreviousAssistantMessage(conversationHistory = []) {

    const messages = getMessages(conversationHistory);

    for (let i = messages.length - 1; i >= 0; i--) {

        const message = messages[i];

        if (
            isObject(message) &&
            normalizeText(message.role) === "assistant"
        ) {
            return cleanValue(message.content);
        }
    }

    return "";
}


/* =========================================================
   MEMORY
   ========================================================= */

/**
 * Merge customer memory safely.
 *
 * Rules:
 * - Preserve known information.
 * - Add new customer-provided information.
 * - Allow explicit customer corrections to replace previous data.
 * - Allow more precise customer-provided information to replace
 *   less precise information.
 * - Never overwrite known information with an assumption.
 * - Never use null, undefined, or placeholder values.
 *
 * The customer remains the primary source for customer-specific data.
 */

export function mergeLeadProfile(
    existingProfile = {},
    incomingProfile = {},
    options = {}
) {

    const existing = normalizeLeadProfile(existingProfile);
    const incoming = normalizeLeadProfile(incomingProfile);

    const merged = {};

    const correctedFields = new Set(
        Array.isArray(options.correctedFields)
            ? options.correctedFields
            : []
    );

    const preciseFields = new Set(
        Array.isArray(options.morePreciseFields)
            ? options.morePreciseFields
            : []
    );

    for (const field of Object.keys(existing)) {

        const oldValue = existing[field];
        const newValue = incoming[field];

        /*
         * No new information.
         * Preserve the existing value.
         */
        if (!newValue) {

            merged[field] = oldValue;

            continue;
        }

        /*
         * No previous information.
         * Add the new customer-provided value.
         */
        if (!oldValue) {

            merged[field] = newValue;

            continue;
        }

        /*
         * Explicit customer correction.
         * Customer-provided correction wins.
         */
        if (correctedFields.has(field)) {

            merged[field] = newValue;

            continue;
        }

        /*
         * More precise customer-provided information.
         * More precise information replaces the previous value.
         */
        if (preciseFields.has(field)) {

            merged[field] = newValue;

            continue;
        }

        /*
         * Existing information remains authoritative
         * when the incoming value is not explicitly identified
         * as a correction or more precise information.
         *
         * This prevents assumptions from overwriting known data.
         */
        merged[field] = oldValue;
    }

    return merged;
}
function extractOperationalInformation(
    conversationHistory = []
) {

    const messages =
        getMessages(conversationHistory);

    const customerMessages =
        messages
            .filter(
                message =>
                    isObject(message) &&
                    normalizeText(message.role) === "user"
            )
            .map(
                message =>
                    cleanValue(message.content)
            )
            .filter(Boolean);

    if (!customerMessages.length) {
        return {
            propertySize: "",
            rooms: "",
            bathrooms: "",
            flooring: "",
            priorityAreas: "",
            customerConcerns: ""
        };
    }

    const sourceText =
        customerMessages.join(" ");

    const normalized =
        normalizeText(sourceText);

    const propertySizeMatch =
        sourceText.match(
            /\b(\d[\d,.\s]*)\s*(sq\.?\s*ft|sq\s*ft|square\s*feet|square\s*foot|ft2|ft²)\b/i
        );

    const roomsMatch =
        sourceText.match(
            /\b(\d+)\s*(bedrooms?|rooms?|habitaciones?)\b/i
        );

    const bathroomsMatch =
        sourceText.match(
            /\b(\d+)\s*(bathrooms?|baths?|banos?)\b/i
        );

    const flooringSignals = [
        "hardwood",
        "laminate",
        "vinyl",
        "tile",
        "carpet",
        "concrete",
        "wood floor",
        "flooring",
        "piso",
        "pisos",
        "alfombra",
        "baldosa"
    ];

    const prioritySignals = [
        "kitchen",
        "bathroom",
        "bedroom",
        "basement",
        "garage",
        "windows",
        "floors",
        "cocina",
        "bano",
        "banos",
        "habitacion",
        "sotano",
        "garaje",
        "ventanas",
        "pisos"
    ];

    const concernSignals = [
        "concern",
        "concerns",
        "important",
        "priority",
        "priorities",
        "focus",
        "attention",
        "worried",
        "problem",
        "problems",
        "preocup",
        "importante",
        "prioridad",
        "atencion",
        "problema"
    ];

    const flooring =
        flooringSignals.find(
            signal =>
                normalized.includes(
                    normalizeText(signal)
                )
        ) || "";

    const priorityAreas =
        prioritySignals.filter(
            signal =>
                normalized.includes(
                    normalizeText(signal)
                )
        );

    const customerConcerns =
        concernSignals.some(
            signal =>
                normalized.includes(
                    normalizeText(signal)
                )
        );

    return {
        propertySize:
            propertySizeMatch
                ? propertySizeMatch[0].trim()
                : "",

        rooms:
            roomsMatch
                ? roomsMatch[0].trim()
                : "",

        bathrooms:
            bathroomsMatch
                ? bathroomsMatch[0].trim()
                : "",

        flooring,

        priorityAreas:
            priorityAreas.join(", "),

        customerConcerns:
            customerConcerns
                ? sourceText
                : ""
    };
}
function buildOperationalSummary(
    operationalInformation = {},
    existingSummary = ""
) {

    const existing =
        cleanValue(existingSummary);

    const parts = [];

    if (
        operationalInformation.propertySize
    ) {
        parts.push(
            `Property size: ${operationalInformation.propertySize}`
        );
    }

    if (
        operationalInformation.rooms
    ) {
        parts.push(
            `Rooms: ${operationalInformation.rooms}`
        );
    }

    if (
        operationalInformation.bathrooms
    ) {
        parts.push(
            `Bathrooms: ${operationalInformation.bathrooms}`
        );
    }

    if (
        operationalInformation.flooring
    ) {
        parts.push(
            `Flooring: ${operationalInformation.flooring}`
        );
    }

    if (
        operationalInformation.priorityAreas
    ) {
        parts.push(
            `Priority areas: ${operationalInformation.priorityAreas}`
        );
    }

    if (
        operationalInformation.customerConcerns
    ) {
        parts.push(
            `Customer concerns: ${operationalInformation.customerConcerns}`
        );
    }

    if (!parts.length) {
        return existing;
    }

    if (!existing) {
        return parts.join("; ");
    }

    return `${existing}; ${parts.join("; ")}`;
}
   

function getMissingEssentialFields(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(leadProfile);

    const missingFields = [];

    if (!profile.clientName) {
        missingFields.push("clientName");
    }

    if (!profile.emailAddress && !profile.phoneNumber) {
        missingFields.push("contact");
    }

    if (!profile.serviceAddress) {
        missingFields.push("serviceAddress");
    }

    if (!profile.city) {
        missingFields.push("city");
    }

    if (!profile.serviceType) {
        missingFields.push("serviceType");
    }

    if (!profile.operationalSummary) {
        missingFields.push("operationalSummary");
    }

    return missingFields;
}

function hasEssentialInformation(
    leadProfile = {}
) {

    const missingFields =
        getMissingEssentialFields(leadProfile);

    return missingFields.length === 0;
}
function getOperationalDiscoveryState(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(leadProfile);

    const summary =
        cleanValue(profile.operationalSummary);

    const normalizedSummary =
        normalizeText(summary);

    return {
        hasSummary: Boolean(summary),

        hasPropertySize:
            Boolean(
                profile.squareFootage ||
                normalizedSummary.includes("sq ft") ||
                normalizedSummary.includes("square feet") ||
                normalizedSummary.includes("square foot")
            ),

        hasBedroomsOrRooms:
            Boolean(
                normalizedSummary.match(
                    /\b\d+\s*(bedrooms?|rooms?)\b/i
                )
            ),

        hasBathrooms:
            Boolean(
                normalizedSummary.match(
                    /\b\d+\s*(bathrooms?|baths?)\b/i
                )
            ),

        hasFlooring:
            Boolean(
                normalizedSummary.match(
                    /\b(hardwood|laminate|vinyl|tile|carpet|concrete|flooring)\b/i
                )
            ),

        hasPriorityAreas:
            Boolean(
                normalizedSummary.match(
                    /\b(kitchen|bathroom|bedroom|basement|garage|windows|floors)\b/i
                )
            ),

        hasCustomerConcern:
            Boolean(
                normalizedSummary.match(
                    /\b(concern|concerns|important|priority|priorities|focus|attention|worried|problem|problems)\b/i
                )
            )
    };
}
function hasSufficientOperationalSummary(
    leadProfile = {}
) {

    const state =
        getOperationalDiscoveryState(leadProfile);

    if (!state.hasSummary) {
        return false;
    }

    const meaningfulSignals = [
        state.hasPropertySize,
        state.hasBedroomsOrRooms,
        state.hasBathrooms,
        state.hasFlooring,
        state.hasPriorityAreas,
        state.hasCustomerConcern
    ];

    const informationCount =
        meaningfulSignals.filter(Boolean).length;

    return informationCount >= 2;
}


function getNextOperationalDiscoveryTarget(
    leadProfile = {},
    operationalInformation = {}
) {

    const state =
        getOperationalDiscoveryState(leadProfile);

    const conversationSignals = [
        operationalInformation.propertySize,
        operationalInformation.rooms,
        operationalInformation.bathrooms,
        operationalInformation.flooring,
        operationalInformation.priorityAreas,
        operationalInformation.customerConcerns
    ].filter(Boolean);

    const hasConversationOperationalInformation =
        conversationSignals.length >= 2;

    if (
        !state.hasSummary &&
        !hasConversationOperationalInformation
    ) {
        return "PROPERTY_OVERVIEW";
    }

    if (
        !state.hasPropertySize &&
        !operationalInformation.propertySize
    ) {
        return "PROPERTY_SIZE";
    }

    if (
        !state.hasBedroomsOrRooms &&
        !operationalInformation.rooms
    ) {
        return "ROOMS";
    }

    if (
        !state.hasBathrooms &&
        !operationalInformation.bathrooms
    ) {
        return "BATHROOMS";
    }

    if (
        !state.hasFlooring &&
        !operationalInformation.flooring
    ) {
        return "FLOORING";
    }

    if (
        !state.hasPriorityAreas &&
        !operationalInformation.priorityAreas
    ) {
        return "PRIORITY_AREAS";
    }

    if (
        !state.hasCustomerConcern &&
        !operationalInformation.customerConcerns
    ) {
        return "CUSTOMER_CONCERNS";
    }

    return "SUFFICIENT";
}


function getOperationalDiscoveryQuestionTarget(
    leadProfile = {},
    operationalInformation = {}
) {

    const target =
        getNextOperationalDiscoveryTarget(
            leadProfile,
            operationalInformation
        );

    switch (target) {

        case "PROPERTY_OVERVIEW":
            return "Invite the customer to describe the property and what they need from the cleaning service in their own words.";

        case "PROPERTY_SIZE":
            return "Ask the customer approximately how large the property is.";

        case "ROOMS":
            return "Ask the customer approximately how many bedrooms or rooms the property has.";

        case "BATHROOMS":
            return "Ask the customer approximately how many bathrooms the property has.";

        case "FLOORING":
            return "Ask the customer what types of flooring or surfaces are present in the property.";

        case "PRIORITY_AREAS":
            return "Ask the customer which areas of the property they would like the cleaning team to prioritize.";

        case "CUSTOMER_CONCERNS":
            return "Ask the customer if there is anything specific they are concerned about or want the cleaning team to pay special attention to.";

        case "SUFFICIENT":
            return "";

        default:
            return "";
    }
}


/* =========================================================
   SERVICE AREA
   ========================================================= */

export function findServiceArea(city = "") {

    const normalizedCity = normalizeText(city);

    if (!normalizedCity) {

        return {
            known: false,
            city: "",
            region: CONCIERGE_KNOWLEDGE.companyInfo.serviceAreas.region
        };
    }

    const cities = CONCIERGE_KNOWLEDGE.companyInfo.serviceAreas.primaryCities;

    const matchedCity = cities.find(
        item => normalizeText(item) === normalizedCity
    );

    return {
        known: Boolean(matchedCity),
        city: matchedCity || city,
        region: CONCIERGE_KNOWLEDGE.companyInfo.serviceAreas.region
    };
}



/* =========================================================
   CORRECTION DETECTION
   ========================================================= */
function isCorrection(message = "") {

    const text = normalizeText(message);

    if (!text) {
        return false;
    }

    const correctionSignals = [
        "actually",
        "correction",
        "correct that",
        "change that",
        "i meant",
        "instead",
        "not that",
        "the address is",
        "my address is",

        "en fait",
        "correction",
        "corrigez cela",
        "corrige ça",
        "changez cela",
        "change ça",
        "je voulais dire",
        "plutôt",
        "pas ça",
        "l'adresse est",
        "mon adresse est"
    ];

    return correctionSignals.some(
        signal => text.includes(normalizeText(signal))
    );
}

/* =========================================================
   PRICE DETECTION
   ========================================================= */

function isPriceQuestion(message = "") {

    const text = normalizeText(message);

    const signals = [

        "price",
        "pricing",
        "cost",
        "costs",
        "how much",

        "prix",
        "tarif",
        "tarifs",
        "coût",
        "coûts",
        "combien",
        "combien ça coûte"
    ];

    return signals.some(
      signal => text.includes(normalizeText(signal))
    );
}

/* =========================================================
   AVAILABILITY DETECTION
   ========================================================= */

function isAvailabilityQuestion(message = "") {

    const text = normalizeText(message);

    const signals = [

        "available",
        "availability",
        "when can",
        "what date",
        "schedule",
        "appointment",
        "booking",
        "book",

        "disponible",
        "disponibilité",
        "quand pouvez-vous",
        "quelle date",
        "horaire",
        "rendez-vous",
        "réservation",
        "réserver"
    ];

    return signals.some(
        signal => text.includes(signal)
    );
}

/* =========================================================
   SERVICE INFORMATION DETECTION
   ========================================================= */

function isServiceInformationQuestion(message = "") {

    const text = normalizeText(message);

    const signals = [

        "what services",
        "what do you offer",
        "do you offer",
        "what is included",
        "what does the service include",
        "tell me about your service",
        "how does it work",

        "quels services",
        "quels services offrez-vous",
        "qu'est-ce que vous offrez",
        "qu'offrez-vous",
        "qu'est-ce qui est inclus",
        "que comprend le service",
        "parlez-moi de vos services",
        "comment ça fonctionne"
    ];

    return signals.some(
        signal => text.includes(signal)
    );
}

const requestSignals = [

    "i need another",
    "i also need",
    "another quote",
    "new quote",
    "different property",
    "another property",

    "j'ai besoin d'un autre",
    "j'ai aussi besoin",
    "une autre soumission",
    "une nouvelle soumission",
    "une propriété différente",
    "une autre propriété"
];
function isNewRequest(message = "") {
    const text = normalizeText(message);

    if (!text) {
        return false;
    }

    return requestSignals.some(
        signal => text.includes(normalizeText(signal))
    );
}
/* =========================================================
   POST-CONFIRMATION DETECTION
   ========================================================= */

function isPostConfirmation(
    conversationHistory = [],
    leadProfile = {}
) {

    const messages = getMessages(conversationHistory);
    const profile = normalizeLeadProfile(leadProfile);

    if (!profile.clientName) {
        return false;
    }

    if (messages.length < 2) {
        return false;
    }

    /*
     * The Brain does not persist quoteConfirmed as state.
     *
     * This function only recognizes that the conversation
     * contains a previous explicit confirmation event.
     *
     * The current message must still be evaluated separately.
     */

    let confirmationFound = false;

    for (let i = 0; i < messages.length; i++) {

        const message = messages[i];

        if (
            isObject(message) &&
            normalizeText(message.role) === "user"
        ) {

            const content = cleanValue(message.content);

            if (isExplicitConfirmation(content)) {

                const previousAssistant =
                    i > 0
                        ? messages[i - 1]
                        : null;

                if (
                    previousAssistant &&
                    normalizeText(previousAssistant.role) === "assistant" &&
                    assistantRequestedConfirmation(
                        previousAssistant.content
                    )
                ) {
                    confirmationFound = true;
                }
            }
        }
    }

    return confirmationFound;
}

 /* =========================================================
   CONFIRMATION DETECTION
   ========================================================= */

/**
 * Confirmation must be explicit and contextual.
 *
 * A confirmation is valid only when:
 *
 * 1. The customer explicitly confirms.
 * 2. The previous assistant response requested confirmation.
 * 3. The current request contains all essential information.
 *
 * Previous confirmations do not persist as confirmation
 * for the current response.
 */

/**
 * Determines whether the customer's message contains
 * an explicit confirmation.
 */
function isExplicitConfirmation(message = "") {

    const text = normalizeText(message);

    if (!text) {
        return false;
    }

    const validConfirmations = [
    "yes",
    "yes everything is correct",
    "correct",
    "that's right",
    "looks good",
    "confirmed",

    "oui",
    "oui tout est correct",
    "c'est exact",
    "tout est correct"
];

 return validConfirmations.some(
        confirmation =>
            normalizeText(confirmation) === normalizeText(message)
    );
}

/**
 * Determines whether the previous assistant response
 * requested confirmation of the current request.
 *
 * This remains intentionally conservative.
 */
function assistantRequestedConfirmation(
    assistantMessage = ""
) {

    const text = normalizeText(assistantMessage);

    if (!text) {
        return false;
    }

   const confirmationSignals = [
    "is everything correct",
    "is all of this correct",
    "does everything look correct",
    "please confirm",
    "can you confirm",
    "confirm the details",
    "confirm everything",

    "est-ce que tout est correct",
    "tout est-il correct",
    "est-ce que tout semble correct",
    "veuillez confirmer",
    "pouvez-vous confirmer",
    "confirmez les détails",
    "confirmez tout"
];
    return confirmationSignals.some(
       signal => text.includes(normalizeText(signal))
    );
}


/**
 * Determines whether the current customer message
 * can be treated as a valid quote confirmation.
 *
 * This function does NOT persist confirmation state.
 */
function isValidCurrentConfirmation(
    message = "",
    conversationHistory = [],
    leadProfile = {}
) {

    const text = cleanValue(message);

    if (!isExplicitConfirmation(text)) {
        return false;
    }

    const previousAssistantMessage =
        getPreviousAssistantMessage(
            conversationHistory
        );

    if (
        !assistantRequestedConfirmation(
            previousAssistantMessage
        )
    ) {
        return false;
    }

    /*
     * A confirmation cannot process an incomplete request.
     */
    if (!hasEssentialInformation(leadProfile)) {
        return false;
    }

    return true;
}

/* =========================================================
   INTENT
   ========================================================= */

/**
 * Detect the customer's current intent using:
 *
 * - current customer message
 * - conversation history
 * - current lead profile
 * - service context
 *
 * Rules:
 * - Current customer request has priority.
 * - Explicit corrections have priority over other intents.
 * - Explicit confirmation only counts when confirmation was requested.
 * - Conversation history must be considered.
 * - Service context must never override the customer's actual request.
 * - Intent must not be inferred from service context alone.
 *
 * The Brain performs deterministic routing.
 * Complex language interpretation remains with the language layer.
 */

export function detectIntent(
    message = "",
    {
        conversationHistory = [],
        leadProfile = {},
        serviceContext = ""
    } = {}
) {

    const text = cleanValue(message);

    const normalizedText = normalizeText(text);

    const history = getMessages(conversationHistory);

    const profile = normalizeLeadProfile(leadProfile);

    const normalizedServiceContext =
        normalizeText(serviceContext);

    /*
     * Empty customer message.
     *
     * Do not infer intent from leadProfile or serviceContext.
     */
    if (!normalizedText) {
        return "GENERAL_QUESTION";
    }

    /*
     * ---------------------------------------------------------
     * 1. CORRECTION
     * ---------------------------------------------------------
     *
     * A customer's explicit correction has priority because
     * it modifies previously known customer information.
     */
    if (isCorrection(text)) {
        return "CORRECTION";
    }

    /*
     * ---------------------------------------------------------
     * 2. CONFIRMATION
     * ---------------------------------------------------------
     *
     * Confirmation is valid only when:
     *
     * - the customer explicitly confirms,
     * - the previous assistant response requested confirmation,
     * - the current lead profile contains all essential information.
     *
     * Previous confirmations do not persist as confirmation
     * for the current response.
     */
    if (
        isValidCurrentConfirmation(
            text,
            history,
            profile
        )
    ) {
        return "CONFIRMATION";
    }

    /*
     * ---------------------------------------------------------
     * 3. NEW REQUEST
     * ---------------------------------------------------------
     *
     * A clearly stated new request takes priority over
     * the previous service context.
     */
    if (isNewRequest(text, profile)) {
        return "NEW_REQUEST";
    }

    /*
     * ---------------------------------------------------------
     * 4. SERVICE INFORMATION
     * ---------------------------------------------------------
     *
     * Questions about what North Crescent offers or includes
     * should remain informational and should not automatically
     * become quote qualification.
     */
    if (isServiceInformationQuestion(text)) {
        return "SERVICE_INFORMATION";
    }

    /*
     * ---------------------------------------------------------
     * 5. PRICE QUESTION
     * ---------------------------------------------------------
     *
     * A price question is routed to the pricing/value workflow.
     *
     * The Brain does NOT calculate or invent the price here.
     */
    if (isPriceQuestion(text)) {
        return "PRICE_QUESTION";
    }

    /*
     * ---------------------------------------------------------
     * 6. AVAILABILITY QUESTION
     * ---------------------------------------------------------
     *
     * Availability questions are kept separate from pricing
     * and quote confirmation.
     */
    if (isAvailabilityQuestion(text)) {
        return "AVAILABILITY_QUESTION";
    }

    /*
     * ---------------------------------------------------------
     * 7. QUOTE INTENT
     * ---------------------------------------------------------
     *
     * Quote intent is based on an explicit customer request.
     *
     * Service context alone can NEVER create quote intent.
     */
   const quoteSignals = [

      "post-construction cleaning",
"commercial cleaning",
"residential cleaning",
"deep cleaning",
"move-in cleaning",
"move-out cleaning",
"move in cleaning",
"move out cleaning",
"airbnb cleaning",
"janitorial cleaning",
"office cleaning",
"retail cleaning",
"warehouse cleaning",
"industrial cleaning",
"medical office cleaning",
"facility cleaning",
      
 // Specific service requests
    "i need residential cleaning",
    "i need commercial cleaning",
    "i need deep cleaning",
    "i need move-in cleaning",
    "i need move-out cleaning",
    "i need move in cleaning",
    "i need move out cleaning",
    "i need airbnb cleaning",
    "i need janitorial service",
    "i need post-construction cleaning",
    "i need post construction cleaning",
    "i need office cleaning",
    "i need retail cleaning",
    "i need warehouse cleaning",
    "i need industrial cleaning",
    "i need facility services",
    "i need cleaning",
    "i need a cleaner",
    "i need cleaning service",
    "looking for cleaning",
    "looking for a cleaning company",
    "i want a quote",
    "i need a quote",
    "i need an estimate",
    "i want an estimate",
    "can i get a quote",
    "can i get an estimate",
    "can you give me a quote",
    "can you give me an estimate",
    "can you clean",
    "can you provide cleaning",

    "j'ai besoin de nettoyage",
    "j'ai besoin d'un service de nettoyage",
    "je cherche un service de nettoyage",
    "je cherche une entreprise de nettoyage",
    "je veux une soumission",
    "j'ai besoin d'une soumission",
    "je voudrais une soumission",
    "j'ai besoin d'une estimation",
    "je veux une estimation",
    "puis-je avoir une soumission",
    "pouvez-vous me donner une soumission",
    "pouvez-vous faire le nettoyage",
    "pouvez-vous fournir un service de nettoyage"
];

    if (
        quoteSignals.some(
            signal => normalizedText.includes(signal)
        )
    ) {
        return "QUOTE";
    }

    /*
     * ---------------------------------------------------------
     * 8. GENERAL QUESTION
     * ---------------------------------------------------------
     *
     * If no explicit supported intent is detected, remain
     * informational rather than forcing the customer into
     * qualification.
     *
     * Service context and existing leadProfile do not override
     * the customer's current request.
     */
    return "GENERAL_QUESTION";
}

/* =========================================================
   KNOWLEDGE ACCESS
   ========================================================= */

export function getKnowledge() {

    return CONCIERGE_KNOWLEDGE;
}


export function getRules() {

    return BRAIN_RULES;
}


/* =========================================================
   ANALYSIS
   ========================================================= */

export function analyzeRequest({

    currentMessage = "",
    conversationHistory = [],
    leadProfile = {},
    serviceContext = ""

} = {}) {

    const history = getMessages(conversationHistory);

    /*
     * The current request should normally be supplied
     * explicitly by the integration layer.
     *
     * If it is missing, recover the most recent user
     * message from the conversation history.
     */
    const currentCustomerMessage =
        cleanValue(currentMessage) ||
        getMostRecentUserMessage(history);

   const profile =
    normalizeLeadProfile(leadProfile);

const operationalInformation =
    extractOperationalInformation(history);

const derivedOperationalSummary =
    buildOperationalSummary(
        operationalInformation,
        profile.operationalSummary
    ); 

   const resolvedProfile = {
    ...profile,
    operationalSummary:
        derivedOperationalSummary
};
   const operationalDiscoveryComplete =
    [
        operationalInformation.propertySize,
        operationalInformation.rooms,
        operationalInformation.bathrooms,
        operationalInformation.flooring,
        operationalInformation.priorityAreas,
        operationalInformation.customerConcerns
    ].filter(Boolean).length >= 2;

   const intent = detectIntent(
    currentCustomerMessage,
    {
        conversationHistory: history,
        leadProfile: resolvedProfile,
        serviceContext: serviceContext
    }
);
const missingFields =
    getMissingEssentialFields(resolvedProfile);

    const operationalSummaryReady =
    hasSufficientOperationalSummary(resolvedProfile) ||
        [
            operationalInformation.propertySize,
            operationalInformation.rooms,
            operationalInformation.bathrooms,
            operationalInformation.flooring,
            operationalInformation.priorityAreas,
            operationalInformation.customerConcerns
        ].filter(Boolean).length >= 2;

    if (
    !operationalDiscoveryComplete &&
    !missingFields.includes("operationalSummary")
) {
    missingFields.push("operationalSummary");
}

    const serviceArea =
        findServiceArea(profile.city);

 const quoteReady =
    missingFields.length === 0 &&
    operationalSummaryReady &&
    operationalDiscoveryComplete;

    const postConfirmation =
        isPostConfirmation(
            history,
            profile
        );

    return Object.freeze({

        intent,

        currentMessage:
            currentCustomerMessage,

        conversationHistory:
            history,
       leadProfile:
    resolvedProfile,

        operationalInformation,

        serviceContext:
            cleanValue(serviceContext),

        missingFields,

quoteReady,

operationalDiscoveryComplete,

postConfirmation,

        serviceArea,

        rules:
            BRAIN_RULES,

        knowledge:
            CONCIERGE_KNOWLEDGE
    });
}

/* =========================================================
   QUOTE CONVERSION CHECK
   ========================================================= */

function shouldReconnectToQuote(
    conversationHistory = [],
    leadProfile = {}
) {

    const history =
        getMessages(conversationHistory);

    const profile =
        normalizeLeadProfile(leadProfile);

    /*
     * If the customer already has all essential
     * information, do not continue selling or
     * qualification. The conversation must move
     * toward final confirmation.
     */
    if (hasEssentialInformation(profile)) {
        return false;
    }

    /*
     * Count recent customer informational exchanges.
     *
     * The goal is not to force a quote after every
     * message. The Concierge should naturally
     * reconnect the conversation to the quote after
     * approximately 1–2 informational exchanges.
     */
    let informationalExchanges = 0;

    for (let i = history.length - 1; i >= 0; i--) {

        const message = history[i];

        if (
            !isObject(message) ||
            normalizeText(message.role) !== "user"
        ) {
            continue;
        }

        const content =
            cleanValue(message.content);

        if (!content) {
            continue;
        }

        if (
            isCorrection(content) ||
            isExplicitConfirmation(content) ||
            isNewRequest(content)
        ) {
            break;
        }

      if (
    isServiceInformationQuestion(content) ||
    isPriceQuestion(content) ||
    isAvailabilityQuestion(content) ||
    detectIntent(
        content,
        {
            conversationHistory: history,
            leadProfile: profile
        }
    ) === "GENERAL_QUESTION"
) {
    informationalExchanges += 1;
    continue;
}

        /*
         * Stop when the conversation reaches a message
         * that is clearly not part of the informational
         * exchange sequence.
         */
        break;
    }

    return informationalExchanges >= 2;
}
function hasActiveQuoteContext(analysis = {}) {

    const profile =
        normalizeLeadProfile(analysis.leadProfile);

    const history =
        getMessages(analysis.conversationHistory);

    if (
        analysis.intent === "QUOTE"
    ) {
        return true;
    }

    if (
        profile.serviceType &&
        history.some(message =>
            isObject(message) &&
            normalizeText(message.role) === "user" &&
            detectIntent(
                cleanValue(message.content),
                {
                    conversationHistory: history,
                    leadProfile: profile
                }
            ) === "QUOTE"
        )
    ) {
        return true;
    }

    return false;
}
/* =========================================================
   NEXT ACTION
   ========================================================= */

export function determineNextAction(
    analysis = {}
) {

    const intent =
        analysis.intent || "GENERAL_QUESTION";

    const quoteReady =
        Boolean(analysis.quoteReady);

    const postConfirmation =
        Boolean(analysis.postConfirmation);
   const hasQuoteContext =
    hasActiveQuoteContext(analysis);

const operationalDiscoveryComplete =
    Boolean(analysis.operationalDiscoveryComplete);
   

const operationalInformation =
    analysis.operationalInformation || {};

const operationalDiscoveryTarget =
    getNextOperationalDiscoveryTarget(
        analysis.leadProfile,
        operationalInformation
    );

const operationalDiscoveryQuestion =
    getOperationalDiscoveryQuestionTarget(
        analysis.leadProfile,
        operationalInformation
    );

    /*
     * Post-confirmation follow-up.
     *
     * The previous confirmation is not reused as
     * quoteConfirmed for the current response.
     */
    if (
        postConfirmation &&
        intent !== "NEW_REQUEST" &&
        intent !== "CORRECTION"
    ) {
        return "ANSWER_FOLLOW_UP";
    }
/*
 * ACTIVE QUOTE PROGRESSION
 *
 * Once a customer has entered a quote process,
 * operationalSummary must be developed before
 * the conversation can progress toward quote completion.
 *
 * The customer may still ask questions, but the
 * conversation must remain commercially progressive.
 */
if (
    hasQuoteContext &&
    !operationalDiscoveryComplete &&
    intent !== "CORRECTION" &&
    intent !== "NEW_REQUEST"
) {
    return "START_PROPERTY_DISCOVERY";
}

    switch (intent) {

        case "PRICE_QUESTION":
            return "USE_PRICING_ENGINE";


        case "AVAILABILITY_QUESTION":
            return "CHECK_AVAILABILITY";


       case "GENERAL_QUESTION":

    if (
        shouldReconnectToQuote(
            analysis.conversationHistory,
            analysis.leadProfile
        )
    ) {
        return "RECONNECT_TO_QUOTE";
    }

    return "ANSWER_FROM_KNOWLEDGE";


case "SERVICE_INFORMATION":

    if (
        shouldReconnectToQuote(
            analysis.conversationHistory,
            analysis.leadProfile
        )
    ) {
        return "RECONNECT_TO_QUOTE";
    }

    return "ANSWER_FROM_KNOWLEDGE";


        case "CORRECTION":
            return "UPDATE_PROFILE_AND_RECONFIRM";


        case "NEW_REQUEST":
            return "START_NEW_REQUEST";


        case "CONFIRMATION":

            if (quoteReady) {
                return "PROCESS_CONFIRMATION";
            }

            return "CONTINUE_QUALIFICATION";


        case "QUOTE":

    if (quoteReady) {
        return "PREPARE_FINAL_CONFIRMATION";
    }

    if (
        analysis.leadProfile &&
        !analysis.leadProfile.operationalSummary
    ) {
        return "START_PROPERTY_DISCOVERY";
    }

    return "CONTINUE_QUALIFICATION";


        case "POST_CONFIRMATION":
            return "ANSWER_FOLLOW_UP";


        default:
            return "CONTINUE_CONVERSATION";
    }
}


/* =========================================================
   MAIN BRAIN ENTRY
   ========================================================= */

export function processConciergeRequest(
    input = {}
) {

    const analysis =
        analyzeRequest(input);

  const operationalInformation =
    analysis.operationalInformation || {};

const operationalDiscoveryTarget =
    getNextOperationalDiscoveryTarget(
        analysis.leadProfile,
        operationalInformation
    );

const operationalDiscoveryQuestion =
    getOperationalDiscoveryQuestionTarget(
        analysis.leadProfile,
        operationalInformation
    );

    const nextAction =
        determineNextAction(analysis);

    return Object.freeze({

        ...analysis,

        nextAction,
       
operationalDiscoveryTarget,

operationalDiscoveryQuestion
    });
}


/* =========================================================
   PUBLIC API
   ========================================================= */

export default Object.freeze({

    analyzeRequest,

    determineNextAction,

    processConciergeRequest,

    detectIntent,

    mergeLeadProfile,

    getMissingEssentialFields,

    hasEssentialInformation,

    findServiceArea,

    getKnowledge,

    getRules
});
