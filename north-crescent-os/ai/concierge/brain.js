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

import BRAIN_RULES from "./rules.js";
import CONCIERGE_KNOWLEDGE from "./knowledge.js";


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
        .replace(/[\u0300-\u036f]/g, "");
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

/* =========================================================
   REQUIRED INFORMATION
   ========================================================= */

export function getMissingEssentialFields(leadProfile = {}) {

    const profile = normalizeLeadProfile(leadProfile);

    const missing = [];

    if (!profile.clientName) {
        missing.push("clientName");
    }

    if (!profile.emailAddress && !profile.phoneNumber) {
        missing.push("contact");
    }

    if (!profile.serviceAddress) {
        missing.push("serviceAddress");
    }

    if (!profile.city) {
        missing.push("city");
    }

    if (!profile.serviceType) {
        missing.push("serviceType");
    }

    if (!profile.operationalSummary) {
        missing.push("operationalSummary");
    }

    return missing;
}


export function hasEssentialInformation(leadProfile = {}) {

    return getMissingEssentialFields(leadProfile).length === 0;
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

        "en realidad",
        "correccion",
        "corrige",
        "cambia eso",
        "quise decir",
        "la direccion es",
        "mi direccion es"
    ];

    return correctionSignals.some(
        signal => text.includes(signal)
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
        "quote",
        "quotation",
        "estimate",

        "precio",
        "precios",
        "cuanto",
        "cuanto cuesta",
        "cotizacion",
        "cotizar",
        "estimado"
    ];

    return signals.some(
        signal => text.includes(signal)
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
        "disponibilidad",
        "cuando pueden",
        "que fecha",
        "horario",
        "cita",
        "reservar"
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

        "que servicios",
        "que ofrecen",
        "que incluye",
        "que incluye el servicio",
        "como funciona"
    ];

    return signals.some(
        signal => text.includes(signal)
    );
}


/* =========================================================
   NEW REQUEST DETECTION
   ========================================================= */

function isNewRequest(message = "", leadProfile = {}) {

    const text = normalizeText(message);
    const profile = normalizeLeadProfile(leadProfile);

    if (!text) {
        return false;
    }

    const requestSignals = [

        "i need another",
        "i also need",
        "another quote",
        "new quote",
        "different property",
        "another property",

        "necesito otra",
        "tambien necesito",
        "otra cotizacion",
        "nueva cotizacion",
        "otra propiedad"
    ];

    const hasRequestSignal = requestSignals.some(
        signal => text.includes(signal)
    );

    if (hasRequestSignal) {
        return true;
    }

    /*
     * If the customer already has a completed profile
     * and suddenly provides a clearly different service
     * context, the language layer should later verify
     * whether this is a new request.
     *
     * We intentionally do not automatically classify it here.
     */

    return Boolean(profile.serviceType && false);
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
   INTENT
   ========================================================= */

/**
 * Detect the customer's current intent using:
 *
 * - current customer message
 * - conversation history
 * - current lead profile
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

    const exactConfirmationPatterns = [

        /^yes$/,
        /^yes[,!. ]*everything is correct[.!]?$/,
        /^yes[,!. ]*thats right[.!]?$/,
        /^yes[,!. ]*looks good[.!]?$/,

        /^correct[.!]?$/,
        /^confirmed[.!]?$/,
        /^thats right[.!]?$/,
        /^looks good[.!]?$/,

        /^si$/,
        /^si confirmo$/,
        /^todo esta correcto$/,
        /^esta bien$/,
        /^confirmado$/

    ];

    return exactConfirmationPatterns.some(
        pattern => pattern.test(text)
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

        "todo esta correcto",
        "esta todo correcto",
        "puede confirmar",
        "confirme los detalles"

    ];

    return confirmationSignals.some(
        signal => text.includes(signal)
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

        "i need cleaning",
        "i need a cleaner",
        "i need cleaning service",
        "looking for cleaning",
        "looking for a cleaning company",
        "i want a quote",
        "i need a quote",
        "can you clean",
        "can you provide cleaning",

        "necesito limpieza",
        "necesito un servicio de limpieza",
        "busco limpieza",
        "busco una empresa de limpieza",
        "quiero una cotizacion",
        "necesito una cotizacion",
        "pueden limpiar"

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

   const intent = detectIntent(
    currentCustomerMessage,
    {
        conversationHistory: history,
        leadProfile: profile,
        serviceContext: serviceContext
    }
);

    const missingFields =
        getMissingEssentialFields(profile);

    const serviceArea =
        findServiceArea(profile.city);

    const quoteReady =
        missingFields.length === 0;

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
            profile,

        serviceContext:
            cleanValue(serviceContext),

        missingFields,

        quoteReady,

        postConfirmation,

        serviceArea,

        rules:
            BRAIN_RULES,

        knowledge:
            CONCIERGE_KNOWLEDGE
    });
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


    switch (intent) {

        case "PRICE_QUESTION":
            return "USE_PRICING_ENGINE";


        case "AVAILABILITY_QUESTION":
            return "CHECK_AVAILABILITY";


        case "GENERAL_QUESTION":
            return "ANSWER_FROM_KNOWLEDGE";


        case "SERVICE_INFORMATION":
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

    const nextAction =
        determineNextAction(analysis);

    return Object.freeze({

        ...analysis,

        nextAction
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
