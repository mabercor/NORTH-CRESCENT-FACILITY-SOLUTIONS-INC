/**
 * =========================================================
 * NORTH CRESCENT OS
 * CONCIERGE BRAIN
 *
 * SECTION 1 — FOUNDATION + MEMORY
 * =========================================================
 *
 * Purpose:
 * - Establish the Brain foundation.
 * - Normalize customer information.
 * - Preserve customer-provided information.
 * - Support explicit customer corrections.
 * - Preserve conversation continuity.
 * - Maintain a single normalized lead profile.
 *
 * This section does NOT:
 * - determine sales stages
 * - calculate pricing
 * - access Airtable
 * - create customers
 * - control Make
 * - generate final replies
 * - create a second operational state
 *
 * The customer remains the primary source of truth
 * for customer-specific information.
 * =========================================================
 */


/* =========================================================
   IMPORTS
   ========================================================= */

import BRAIN_RULES from "./rules.mjs";
import CONCIERGE_KNOWLEDGE from "./knowledge.mjs";


/* =========================================================
   CORE HELPERS
   ========================================================= */

/**
 * Determines whether a value is a plain object.
 */
function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}


/**
 * Converts an unknown value into a safe string.
 *
 * The Brain uses an empty string for missing values.
 * Null, undefined, and placeholder values are never
 * stored as customer data.
 */
function cleanValue(value) {

    if (value === null || value === undefined) {
        return "";
    }

    if (typeof value !== "string") {
        return String(value).trim();
    }

    return value.trim();
}


/**
 * Normalizes text for deterministic comparisons.
 *
 * This does NOT change the customer's stored information.
 * It is only used internally for comparison and detection.
 */
function normalizeText(value) {

    return cleanValue(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}


/* =========================================================
   LEAD PROFILE
   ========================================================= */

/**
 * Canonical customer profile.
 *
 * Every Brain response works from this normalized structure.
 *
 * Missing values remain empty strings.
 * No null values are used.
 */
function normalizeLeadProfile(profile = {}) {

    const source =
        isObject(profile)
            ? profile
            : {};

    return {

        clientName:
            cleanValue(source.clientName),

        companyName:
            cleanValue(source.companyName),

        mainContact:
            cleanValue(source.mainContact),

        phoneNumber:
            cleanValue(source.phoneNumber),

        emailAddress:
            cleanValue(source.emailAddress),

        serviceAddress:
            cleanValue(source.serviceAddress),

        city:
            cleanValue(source.city),

        province:
            cleanValue(source.province),

        postalCode:
            cleanValue(source.postalCode),

        serviceType:
            cleanValue(source.serviceType),

        squareFootage:
            cleanValue(source.squareFootage),

        visitsPerMonth:
            cleanValue(source.visitsPerMonth),

        recurringVisits:
    cleanValue(source.recurringVisits),

serviceDate:
    cleanValue(source.serviceDate),

timeSlot:
    cleanValue(source.timeSlot),

        estimatedDuration:
            cleanValue(source.estimatedDuration),

        complexityLevel:
            cleanValue(source.complexityLevel),

        operationalSummary:
            cleanValue(source.operationalSummary),

        accessInstructions:
            cleanValue(source.accessInstructions),

        sensitiveAreas:
            cleanValue(source.sensitiveAreas)
    };
}


/* =========================================================
   CONVERSATION HISTORY
   ========================================================= */

/**
 * Returns a safe conversation history array.
 */
function getMessages(conversationHistory = []) {

    if (!Array.isArray(conversationHistory)) {
        return [];
    }

    return conversationHistory;
}


/**
 * Returns the most recent customer message.
 */
function getMostRecentUserMessage(
    conversationHistory = []
) {

    const messages =
        getMessages(conversationHistory);

    for (
        let i = messages.length - 1;
        i >= 0;
        i--
    ) {

        const message =
            messages[i];

        if (
            isObject(message) &&
            normalizeText(message.role) === "user"
        ) {

            return cleanValue(
                message.content
            );
        }
    }

    return "";
}


/**
 * Returns the most recent assistant message.
 */
function getPreviousAssistantMessage(
    conversationHistory = []
) {

    const messages =
        getMessages(conversationHistory);

    for (
        let i = messages.length - 1;
        i >= 0;
        i--
    ) {

        const message =
            messages[i];

        if (
            isObject(message) &&
            normalizeText(message.role) === "assistant"
        ) {

            return cleanValue(
                message.content
            );
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
 * Priority:
 *
 * 1. Explicit customer correction.
 * 2. More precise customer-provided information.
 * 3. New customer-provided information.
 * 4. Existing known information.
 *
 * The Brain must never replace known customer data
 * with an assumption.
 */
export function mergeLeadProfile(
    existingProfile = {},
    incomingProfile = {},
    options = {}
) {

    const existing =
        normalizeLeadProfile(
            existingProfile
        );

    const incoming =
        normalizeLeadProfile(
            incomingProfile
        );

    const merged = {};

    const correctedFields =
        new Set(
            Array.isArray(
                options.correctedFields
            )
                ? options.correctedFields
                : []
        );

    const preciseFields =
        new Set(
            Array.isArray(
                options.morePreciseFields
            )
                ? options.morePreciseFields
                : []
        );


    for (
        const field of Object.keys(existing)
    ) {

        const oldValue =
            existing[field];

        const newValue =
            incoming[field];


        /*
         * -----------------------------------------------------
         * NO NEW INFORMATION
         * -----------------------------------------------------
         */

        if (!newValue) {

            merged[field] =
                oldValue;

            continue;
        }


        /*
         * -----------------------------------------------------
         * NEW CUSTOMER INFORMATION
         * -----------------------------------------------------
         */

        if (!oldValue) {

            merged[field] =
                newValue;

            continue;
        }


        /*
         * -----------------------------------------------------
         * EXPLICIT CUSTOMER CORRECTION
         * -----------------------------------------------------
         *
         * The customer's correction always wins.
         */

        if (
            correctedFields.has(field)
        ) {

            merged[field] =
                newValue;

            continue;
        }


        /*
         * -----------------------------------------------------
         * MORE PRECISE CUSTOMER INFORMATION
         * -----------------------------------------------------
         */

        if (
            preciseFields.has(field)
        ) {

            merged[field] =
                newValue;

            continue;
        }


        /*
         * -----------------------------------------------------
         * EXISTING INFORMATION REMAINS
         * -----------------------------------------------------
         *
         * The Brain does not replace known information
         * simply because another value exists.
         */

        merged[field] =
            oldValue;
    }


    return merged;
}


/* =========================================================
   CUSTOMER DATA RULES
   ========================================================= */

/**
 * Determines whether a profile field already contains
 * customer information.
 */
function hasKnownValue(
    profile = {},
    field = ""
) {

    return Boolean(
        cleanValue(
            profile[field]
        )
    );
}


/**
 * Returns fields that are already known.
 */
function getKnownFields(
    profile = {}
) {

    const normalizedProfile =
        normalizeLeadProfile(
            profile
        );

    return Object.keys(
        normalizedProfile
    ).filter(
        field =>
            hasKnownValue(
                normalizedProfile,
                field
            )
    );
}


/**
 * Returns fields that remain empty.
 *
 * Empty means genuinely unknown.
 * It does NOT mean that the Brain is allowed
 * to invent or assume the value.
 */
function getEmptyFields(
    profile = {}
) {

    const normalizedProfile =
        normalizeLeadProfile(
            profile
        );

    return Object.keys(
        normalizedProfile
    ).filter(
        field =>
            !hasKnownValue(
                normalizedProfile,
                field
            )
    );
}


/* =========================================================
   CUSTOMER CORRECTION SUPPORT
   ========================================================= */

/**
 * Applies an explicit customer correction.
 *
 * Only fields explicitly identified as corrected
 * are replaced.
 */
export function applyCustomerCorrection(
    profile = {},
    correctedFields = [],
    correctedValues = {}
) {

    const currentProfile =
        normalizeLeadProfile(
            profile
        );

    const incomingProfile =
        normalizeLeadProfile(
            correctedValues
        );

    return mergeLeadProfile(
        currentProfile,
        incomingProfile,
        {
            correctedFields
        }
    );
}


/* =========================================================
   CONVERSATION CONTINUITY
   ========================================================= */

/**
 * Builds a normalized conversation context.
 *
 * This section does not decide the next sales stage.
 * It only provides reliable context to later sections.
 */
export function getConversationContext(
    conversationHistory = []
) {

    const messages =
        getMessages(
            conversationHistory
        );

    return Object.freeze({

        messages,

        messageCount:
            messages.length,

        currentCustomerMessage:
            getMostRecentUserMessage(
                messages
            ),

        previousAssistantMessage:
            getPreviousAssistantMessage(
                messages
            )
    });
}


/* =========================================================
   FOUNDATION STATE
   ========================================================= */

/**
 * Creates the normalized foundation used by the
 * remaining Concierge Brain sections.
 */
export function buildFoundation(
    {
        conversationHistory = [],
        leadProfile = {}
    } = {}
) {

    const normalizedProfile =
        normalizeLeadProfile(
            leadProfile
        );

    const conversation =
        getConversationContext(
            conversationHistory
        );

    return Object.freeze({

        leadProfile:
            normalizedProfile,

        conversation,

        knownFields:
            getKnownFields(
                normalizedProfile
            ),

        emptyFields:
            getEmptyFields(
                normalizedProfile
            ),

        rules:
            BRAIN_RULES,

        knowledge:
            CONCIERGE_KNOWLEDGE
    });
}

/* =========================================================
   SECTION 2 — CONVERSATION UNDERSTANDING
   ========================================================= */

/**
 * Purpose:
 * - Understand the customer's current message.
 * - Respect conversation history.
 * - Detect corrections, questions, confirmations,
 *   new requests, and quote-related intent.
 *
 * This section does NOT:
 * - decide the sales stage
 * - decide the next question
 * - calculate pricing
 * - create a quote
 * - modify operational state
 *
 * Intent describes the customer's current communication.
 * Stage progression belongs to a later Brain section.
 */


/* =========================================================
   CORRECTION DETECTION
   ========================================================= */

function isCorrection(message = "") {

    const text =
        normalizeText(message);

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
        "mon adresse est",

        "en realidad",
        "corrección",
        "corrige eso",
        "quise decir",
        "me refería",
        "en vez de",
        "no es",
        "la dirección es",
        "mi dirección es"
    ];

    return correctionSignals.some(
        signal =>
            text.includes(
                normalizeText(signal)
            )
    );
}


/* =========================================================
   PRICE QUESTION DETECTION
   ========================================================= */

function isPriceQuestion(message = "") {

    const text =
        normalizeText(message);

    if (!text) {
        return false;
    }

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
        "combien ça coûte",

        "precio",
        "precios",
        "costo",
        "cuánto",
        "cuanto",
        "cuánto cuesta",
        "cuanto cuesta"
    ];

    return signals.some(
        signal =>
            text.includes(
                normalizeText(signal)
            )
    );
}


/* =========================================================
   AVAILABILITY QUESTION DETECTION
   ========================================================= */

function isAvailabilityQuestion(message = "") {

    const text =
        normalizeText(message);

    if (!text) {
        return false;
    }

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
        "réserver",

        "disponibilidad",
        "disponible",
        "cuándo pueden",
        "cuando pueden",
        "qué fecha",
        "que fecha",
        "horario",
        "cita",
        "reservar",
        "reserva"
    ];

    return signals.some(
        signal =>
            text.includes(
                normalizeText(signal)
            )
    );
}


/* =========================================================
   SERVICE INFORMATION DETECTION
   ========================================================= */

function isServiceInformationQuestion(
    message = ""
) {

    const text =
        normalizeText(message);

    if (!text) {
        return false;
    }

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
        "comment ça fonctionne",

        "qué servicios",
        "que servicios",
        "qué ofrecen",
        "que ofrecen",
        "qué incluye",
        "que incluye",
        "qué incluye el servicio",
        "cómo funciona",
        "como funciona"
    ];

    return signals.some(
        signal =>
            text.includes(
                normalizeText(signal)
            )
    );
}


/* =========================================================
   NEW REQUEST DETECTION
   ========================================================= */

function isNewRequest(message = "") {

    const text =
        normalizeText(message);

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

        "j'ai besoin d'un autre",
        "j'ai aussi besoin",
        "une autre soumission",
        "une nouvelle soumission",
        "une propriété différente",
        "une autre propriété",

        "necesito otra",
        "también necesito",
        "tambien necesito",
        "otra cotización",
        "otra cotizacion",
        "una nueva cotización",
        "una nueva cotizacion",
        "otra propiedad",
        "una propiedad diferente"
    ];

    return requestSignals.some(
        signal =>
            text.includes(
                normalizeText(signal)
            )
    );
}


/* =========================================================
   EXPLICIT CONFIRMATION DETECTION
   ========================================================= */

/**
 * Confirmation is intentionally conservative.
 *
 * A short "yes" is NOT enough by itself.
 * The previous assistant message must have requested
 * confirmation of the customer's current information.
 */

function isExplicitConfirmation(
    message = ""
) {

    const text =
        normalizeText(message);

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
        "tout est correct",

        "sí",
        "si",
        "sí todo está correcto",
        "si todo esta correcto",
        "correcto",
        "es correcto",
        "está correcto",
        "esta correcto",
        "todo está correcto",
        "todo esta correcto",
        "confirmado"
    ];

    return validConfirmations.some(
        confirmation =>
            normalizeText(
                confirmation
            ) === text
    );
}


/* =========================================================
   PREVIOUS ASSISTANT CONFIRMATION REQUEST
   ========================================================= */

function assistantRequestedConfirmation(
    assistantMessage = ""
) {

    const text =
        normalizeText(
            assistantMessage
        );

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
        "confirmez tout",

        "está toda esta información correcta",
        "esta toda esta informacion correcta",
        "está todo correcto",
        "esta todo correcto",
        "por favor confirme",
        "puede confirmar",
        "puede confirmarme",
        "confirme los detalles",
        "confirme todo"
    ];

    return confirmationSignals.some(
        signal =>
            text.includes(
                normalizeText(signal)
            )
    );
}


/* =========================================================
   CURRENT CONFIRMATION VALIDATION
   ========================================================= */

/**
 * Determines whether the current customer message
 * is a valid contextual confirmation.
 *
 * A confirmation requires:
 *
 * 1. Explicit confirmation.
 * 2. Previous assistant message requested confirmation.
 *
 * Completeness of the quote request is evaluated later
 * by the progression layer.
 */

function isCurrentConfirmation(
    message = "",
    conversationHistory = []
) {

    if (
        !isExplicitConfirmation(
            message
        )
    ) {
        return false;
    }

    const previousAssistantMessage =
        getPreviousAssistantMessage(
            conversationHistory
        );

    return assistantRequestedConfirmation(
        previousAssistantMessage
    );
}


/* =========================================================
   QUOTE REQUEST DETECTION
   ========================================================= */

function isQuoteRequest(
    message = ""
) {

    const text =
        normalizeText(message);

    if (!text) {
        return false;
    }

    const quoteSignals = [

        "i want a quote",
        "i need a quote",
        "i need an estimate",
        "i want an estimate",
        "can i get a quote",
        "can i get an estimate",
        "can you give me a quote",
        "can you give me an estimate",

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
        "can you clean",
        "can you provide cleaning",

        "je veux une soumission",
        "j'ai besoin d'une soumission",
        "je voudrais une soumission",
        "j'ai besoin d'une estimation",
        "je veux une estimation",
        "puis-je avoir une soumission",
        "pouvez-vous me donner une soumission",
        "pouvez-vous faire le nettoyage",
        "pouvez-vous fournir un service de nettoyage",

        "quiero una cotización",
        "quiero una cotizacion",
        "necesito una cotización",
        "necesito una cotizacion",
        "quiero un presupuesto",
        "necesito un presupuesto",
        "necesito una estimación",
        "necesito una estimacion",
        "puedo obtener una cotización",
        "puedo obtener una cotizacion",
        "pueden darme una cotización",
        "pueden darme una cotizacion"
    ];

    return quoteSignals.some(
        signal =>
            text.includes(
                normalizeText(signal)
            )
    );
}


/* =========================================================
   CURRENT MESSAGE UNDERSTANDING
   ========================================================= */

/**
 * Understands what the customer is communicating now.
 *
 * Priority:
 *
 * CORRECTION
 * ↓
 * CONFIRMATION
 * ↓
 * NEW REQUEST
 * ↓
 * SERVICE INFORMATION
 * ↓
 * PRICE QUESTION
 * ↓
 * AVAILABILITY QUESTION
 * ↓
 * QUOTE
 * ↓
 * GENERAL QUESTION
 *
 * This priority describes the message itself.
 * It does not define the customer's sales stage.
 */

export function understandCurrentMessage(
    {
        currentMessage = "",
        conversationHistory = []
    } = {}
) {

    const history =
        getMessages(
            conversationHistory
        );

    const message =
        cleanValue(
            currentMessage
        ) ||
        getMostRecentUserMessage(
            history
        );


    if (!message) {

        return Object.freeze({

            intent:
                "GENERAL_QUESTION",

            currentMessage:
                "",

            isCorrection:
                false,

            isConfirmation:
                false,

            isNewRequest:
                false,

            isServiceInformation:
                false,

            isPriceQuestion:
                false,

            isAvailabilityQuestion:
                false,

            isQuoteRequest:
                false
        });
    }


    const correction =
        isCorrection(message);

    const confirmation =
        isCurrentConfirmation(
            message,
            history
        );

    const newRequest =
        isNewRequest(message);

    const serviceInformation =
        isServiceInformationQuestion(
            message
        );

    const priceQuestion =
        isPriceQuestion(message);

    const availabilityQuestion =
        isAvailabilityQuestion(
            message
        );

    const quoteRequest =
        isQuoteRequest(message);


    let intent =
        "GENERAL_QUESTION";


    if (correction) {

        intent =
            "CORRECTION";

    } else if (confirmation) {

        intent =
            "CONFIRMATION";

    } else if (newRequest) {

        intent =
            "NEW_REQUEST";

    } else if (serviceInformation) {

        intent =
            "SERVICE_INFORMATION";

    } else if (priceQuestion) {

        intent =
            "PRICE_QUESTION";

    } else if (availabilityQuestion) {

        intent =
            "AVAILABILITY_QUESTION";

    } else if (quoteRequest) {

        intent =
            "QUOTE";
    }


    return Object.freeze({

        intent,

        currentMessage:
            message,

        isCorrection:
            correction,

        isConfirmation:
            confirmation,

        isNewRequest:
            newRequest,

        isServiceInformation:
            serviceInformation,

        isPriceQuestion:
            priceQuestion,

        isAvailabilityQuestion:
            availabilityQuestion,

        isQuoteRequest:
            quoteRequest
    });
}


/* =========================================================
   CONVERSATION UNDERSTANDING
   ========================================================= */

/**
 * Combines the foundation context with current-message
 * understanding.
 *
* No sales progression happens here.
 */

export function buildConversationUnderstanding(
    {
        currentMessage = "",
        conversationHistory = [],
        leadProfile = {}
    } = {}
) {

    const foundation =
        buildFoundation({
            conversationHistory,
            leadProfile
        });

    const understanding =
        understandCurrentMessage({
            currentMessage:
                currentMessage ||
                foundation.conversation.currentCustomerMessage,

            conversationHistory:
                foundation.conversation.messages
        });

    return Object.freeze({

        ...foundation,

        understanding
    });
}
/* =========================================================
   SECTION 3 — SALES JOURNEY / STAGES
   ========================================================= */

/**
 * Purpose:
 *
 * Define the official North Crescent conversational journey.
 *
 * The Brain must understand:
 *
 * - where the customer currently is
 * - what has already been resolved
 * - what stage should come next
 * - when a stage is complete
 * - when the conversation must move forward
 *
 * Core ADN:
 *
 * RECOGNIZE
 * → ACKNOWLEDGE
 * → ANSWER
 * → VALUE
 * → EXPLAIN WHY
 * → ADVANCE
 * → ASK
 *
 * Core progression rule:
 *
 * ONE QUESTION
 * = ONE OBJECTIVE
 * = ONE RESULT
 * = ONE ADVANCE
 *
 * This section defines the journey only.
 *
 * It does NOT:
 * - generate customer-facing replies
 * - calculate prices
 * - create Airtable records
 * - control Make
 * - modify operational state
 */


/* =========================================================
   OFFICIAL SALES JOURNEY
   ========================================================= */

const SALES_STAGES = Object.freeze([

    "IDENTIFY",

    "UNDERSTAND_NEED",

    "RESOLVE_SERVICE",

    "UNDERSTAND_PROPERTY",

    "RELEVANT_DISCOVERY",

    "EMAIL",

    "PHONE",

    "SERVICE_DATE",

    "PRIORITIES",

    "FINAL_DETAIL_CHECK",

    "FINAL_QUESTION_CHECK",

    "FINAL_SUMMARY",

    "EXPLICIT_CONFIRMATION",

    "PROCESSING",

    "FINAL_SERVICE_CHECK",

    "CLOSE"
]);


/* =========================================================
   STAGE ORDER
   ========================================================= */

/**
 * The order is intentional.
 *
 * The Concierge should progress naturally through the journey
 * while still allowing customer interruptions.
 */
const STAGE_ORDER = Object.freeze({

    IDENTIFY: 0,

    UNDERSTAND_NEED: 1,

    RESOLVE_SERVICE: 2,

    UNDERSTAND_PROPERTY: 3,

    RELEVANT_DISCOVERY: 4,

    EMAIL: 5,

    PHONE: 6,

       SERVICE_DATE: 7,

    PRIORITIES: 8,

    FINAL_DETAIL_CHECK: 9,

    FINAL_QUESTION_CHECK: 10,

    FINAL_SUMMARY: 11,

    EXPLICIT_CONFIRMATION: 12,

    PROCESSING: 13,

    FINAL_SERVICE_CHECK: 14,

    CLOSE: 15
});

/* =========================================================
   STAGE DEFINITIONS
   ========================================================= */

/**
 * Each stage has:
 *
 * - objective
 * - completion condition
 * - customer result
 * - next stage
 *
 * The Brain uses these definitions to preserve
 * commercial progression without becoming a questionnaire.
 */

const STAGE_DEFINITIONS = Object.freeze({

   IDENTIFY: Object.freeze({

    objective:
        "Welcome the customer warmly to North Crescent Facility Solutions, " +
        "establish trust from the first interaction, and naturally identify " +
        "who they are before beginning the service conversation.",

    completion:
        "Customer name is known.",

    result:
        "The customer has been warmly welcomed, knows they are speaking with " +
        "North Crescent Facility Solutions, and their name is available for " +
        "a personalized conversation.",

    communication:
        "Welcome the customer to North Crescent Facility Solutions with warmth, " +
        "professionalism and confidence. The Concierge should communicate that " +
        "it will be a pleasure to assist them, then naturally ask who they have " +
        "the pleasure of speaking with. Avoid sounding transactional or like a form.",

    preferredOpening:
        "¡Bienvenido a North Crescent Facility Solutions! Será un placer ayudarle. " +
        "¿Con quién tengo el gusto de hablar?",

    nextStage:
        "UNDERSTAND_NEED"
}),


    UNDERSTAND_NEED: Object.freeze({

    objective:
        "Understand the customer's needs naturally and personally, while " +
        "creating a welcoming conversation that makes the customer feel heard " +
        "and supported by North Crescent.",

    completion:
        "The customer's requested service or primary need is clearly understood.",

    result:
        "The Concierge understands why the customer contacted North Crescent, " +
        "what they need help with, and the direction the conversation should take.",

    communication:
        "Acknowledge the customer warmly, connect naturally with their request, " +
        "and invite them to explain what they need in their own words. Avoid " +
        "sounding like a questionnaire or asking for information that has already " +
        "been provided.",

    nextStage:
        "RESOLVE_SERVICE"
}),

RESOLVE_SERVICE: Object.freeze({

    objective:
        "Confirm that North Crescent clearly understands the service the customer " +
        "needs and that the requested service matches the customer's actual goal.",

    completion:
        "The requested service is clearly identified, understood and confirmed, " +
        "with no correction or clarification required.",

    result:
        "The customer and Concierge share the same understanding of the service " +
        "being requested and the reason it is needed.",

    communication:
        "Acknowledge what the customer has requested, briefly reflect the service " +
        "in natural language, and ask one relevant question that helps understand " +
        "the customer's actual goal and provides useful information for the next " +
        "stage. If the request is unclear, ask one focused question to clarify it. " +
        "If the service is already clear, do not repeat the same question or ask " +
        "the customer to confirm information they have already provided.",

   preferredConfirmation:
    "Perfect, [NAME]. To better understand your request and avoid asking you " +
    "several questions separately, could you briefly describe your property " +
    "and what you need? You can include, for example, how many bedrooms and " +
    "bathrooms it has, the approximate size, how many levels it has, the type " +
    "of flooring, the type of cleaning you are looking for, and any other " +
    "details you consider important.",

    nextStage:
        "UNDERSTAND_PROPERTY"
}),

UNDERSTAND_PROPERTY: Object.freeze({

    objective:
        "Understand the property well enough to prepare a personalized quotation " +
        "that reflects the customer's actual space and service needs, while making " +
        "the customer feel that North Crescent is taking the time to understand " +
        "their property rather than providing a generic price.",

    completion:
        "The relevant property context required to guide the personalized quotation " +
        "has been obtained.",

    result:
        "The Concierge understands the property's type, location and relevant " +
        "characteristics needed to continue toward a personalized quotation.",

    communication:
        "Acknowledge the information the customer provides and explain naturally " +
        "why the next property detail matters to preparing the right service. Ask " +
        "only for information that can materially influence the scope, effort or " +
        "accuracy of the quotation. Never ask for information that the customer " +
        "has already provided and never turn the property discussion into a fixed " +
        "questionnaire.",

    commercialPurpose:
        "Build enough understanding of the property to move confidently toward " +
        "a personalized quotation based on the customer's actual needs.",

    nextStage:
        "RELEVANT_DISCOVERY"
}),


  RELEVANT_DISCOVERY: Object.freeze({

    objective:
        "Understand whether there is any specific detail, priority or condition " +
        "that North Crescent should consider in order to prepare the service " +
        "according to the customer's actual needs rather than providing a generic quote.",

    completion:
        "The customer has had a natural opportunity to share any relevant detail " +
        "that could improve the service or influence the quotation. If there is " +
        "nothing additional to consider, discovery is complete.",

    result:
        "The Concierge understands the customer's relevant priorities and any " +
        "specific detail that may affect how the service should be prepared or delivered.",

    communication:
        "Acknowledge what the customer has already shared and invite one final, " +
        "natural detail that would help North Crescent understand what matters most " +
        "to them. Do not turn discovery into a questionnaire. If the customer " +
        "has nothing additional to add, acknowledge it and confidently move forward " +
        "to the quotation process without asking another discovery question.",

    commercialPurpose:
        "Use the customer's final relevant detail to strengthen the personalized " +
        "quotation and demonstrate that North Crescent is preparing a service " +
        "around the customer's actual needs.",

    nextStage:
        "EMAIL"
}),


 EMAIL: Object.freeze({

    objective:
        "Confirm the customer's email specifically so North Crescent can prepare " +
        "and send the personalized quotation to the correct destination. The " +
        "customer should clearly understand that this email will be used to send " +
        "their personalized quotation within the following hour after final confirmation.",

    completion:
        "A valid customer email has been explicitly provided and confirmed.",

    result:
        "The customer understands that the confirmed email is the destination " +
        "for their personalized quotation, which will be sent within the following hour " +
        "after the request is fully confirmed.",

   communication:
    "When requesting the email, clearly explain that it is needed " +
    "to prepare and send the customer's personalized quotation. " +
    "The customer must personally type the email address again for " +
    "a second verification. Never display, repeat, reveal, suggest, " +
    "complete, infer, or expose the email address already stored in " +
    "the customer profile. A simple yes, no, OK, perfect, that's fine, " +
    "or any other verbal confirmation without an email address is NOT " +
    "a valid email confirmation and must NOT advance the conversation. " +
    "If the customer provides a valid email address, that address is " +
    "the confirmation and must become the current email address. If " +
    "the customer provides a different valid email address, replace " +
    "the previous email with the newly provided address. After a valid " +
    "email address is personally provided, acknowledge the verification " +
    "without revealing the full email unnecessarily and immediately " +
    "advance to the PHONE stage.",

    nextStage:
        "PHONE"
}),


   PHONE: Object.freeze({

    objective:
        "Obtain the customer's best phone number so North Crescent can have a " +
        "direct contact method when needed to coordinate the service, arrange a " +
        "property visit when applicable, and ensure the service can be organized " +
        "smoothly according to the customer's needs.",

    completion:
        "A customer phone number has been explicitly provided and confirmed.",

    result:
        "North Crescent has a confirmed phone contact for coordinating the service " +
        "and arranging the visit or other operational details when required.",

    communication:
        "Explain naturally that the phone number helps North Crescent coordinate " +
        "the service and, when applicable, arrange a property visit or clarify " +
        "important details directly with the customer. If a phone number has " +
        "already been provided, ask the customer to confirm it rather than asking " +
        "for it again. Never invent, assume, modify, or fabricate a phone number.",

    nextStage:
        "SERVICE_DATE"
}),


   SERVICE_DATE: Object.freeze({

    objective:
        "Understand when the customer would like the service to take place while " +
        "communicating North Crescent's commitment to responsive scheduling and " +
        "flexibility around each customer's availability and business needs.",

    completion:
        "The customer's preferred service date and, when relevant, preferred time " +
        "or time window are known or clearly understood.",

    result:
        "The request contains a clear service timing preference that can be used " +
        "to coordinate the service according to the customer's availability and needs.",

    communication:
        "Reassure the customer that North Crescent has trained and prepared " +
        "personnel with a strong availability capacity designed to respond to " +
        "different scheduling requirements, including the needs of businesses " +
        "that require flexible service coordination. Ask for the customer's " +
        "preferred date and, when relevant, preferred time or time window. " +
        "Never promise a specific appointment or availability until it has been confirmed.",

    commercialPurpose:
        "Show the customer that North Crescent is prepared to work around their " +
        "availability and business requirements while obtaining the timing needed " +
        "to prepare and coordinate the personalized service quotation.",

    preferredQuestion:
        "Perfecto, [NOMBRE]. Contamos con personal capacitado y una amplia capacidad " +
        "de disponibilidad para atender diferentes requerimientos de horario y las " +
        "necesidades de cada cliente y negocio. Para organizar su servicio de la " +
        "mejor manera, ¿para qué fecha le gustaría programarlo y, si tiene alguna " +
        "preferencia, en qué horario?",

      nextStage:
        "PRIORITIES"
}),

   PRIORITIES: Object.freeze({

    objective:
        "Understand what matters most to the customer before preparing the personalized quotation.",

    completion:
        "The customer's priorities have been provided, or the customer has indicated that there are no additional priorities to consider.",

    result:
        "The Concierge understands the customer's main priorities and can move forward without repeating discovery.",

    communication:
        "Acknowledge what the customer has shared and give them one natural opportunity to identify anything that matters most to them. If they indicate that there is nothing additional, acknowledge it and move forward. Do not repeat questions that have already been answered.",

    commercialPurpose:
        "Ensure the personalized quotation reflects the customer's priorities and that the customer feels heard before the request moves into the final quotation stages.",

    preferredQuestion:
        "Before we move forward with your personalized quotation, is there anything that is especially important to you or anything you would like our team to pay particular attention to?",

    nextStage:
        "FINAL_DETAIL_CHECK"
}),

   FINAL_DETAIL_CHECK: Object.freeze({

    objective:
        "Give the customer one final opportunity to share any priority, " +
        "special request, condition, concern, or other relevant detail that " +
        "North Crescent should consider before preparing the personalized quote.",

    completion:
        "The customer has provided any final relevant detail or has indicated " +
        "that there is nothing additional to consider.",

    result:
        "The Concierge has captured the customer's final priorities and relevant " +
        "details, and the request is ready to move toward final questions and quotation.",

    communication:
        "Ask one natural, open-ended question that allows the customer to share " +
        "anything they consider important without turning the conversation into " +
        "a questionnaire. If the customer provides a detail, acknowledge it and " +
        "incorporate it into the request. If the customer has nothing additional " +
        "to add, acknowledge that and move directly toward the final question check.",

    commercialPurpose:
        "Ensure the personalized quotation reflects what matters most to the " +
        "customer while creating confidence that North Crescent has listened to " +
        "and understood their needs before preparing the quote.",

    preferredQuestion:
        "Perfecto, [NOMBRE]. Antes de preparar su cotización personalizada, " +
        "¿hay algún detalle, prioridad, área o condición que le gustaría que " +
        "nuestro equipo tuviera especialmente en cuenta?",

    nextStage:
        "FINAL_QUESTION_CHECK"
}),

FINAL_SUMMARY: Object.freeze({

    objective:
        "Give the customer one final opportunity to clarify any remaining " +
        "question or add any relevant detail, then present a clear and accurate " +
        "summary of the requested professional cleaning and sanitization service " +
        "before preparing the personalized quotation.",

    completion:
        "The customer has had the opportunity to clarify questions or add relevant " +
        "details, the final summary has been presented using only confirmed " +
        "information, and the customer is ready to confirm the request.",

    result:
        "The customer feels heard, understood and confident that North Crescent " +
        "has correctly understood the cleaning and sanitization service required " +
        "and is ready to move forward with the personalized quotation.",

    communication:
        "Acknowledge the customer's request and provide a professional, reassuring " +
        "summary of the confirmed service, property, location, timing, contact " +
        "information and relevant priorities. Reinforce North Crescent's commitment " +
        "to professional cleaning and sanitization services delivered with care, " +
        "attention to detail and reliability. If the customer raises a remaining " +
        "question, answer it clearly and accurately before continuing. If the " +
        "customer provides an additional relevant detail, incorporate it into the " +
        "request without inventing or assuming information. Do not reopen discovery " +
        "or repeat information that has already been confirmed.",

    preferredQuestion:
        "Perfecto, [NOMBRE]. Antes de generar su cotización personalizada, " +
        "¿hay algún otro detalle que le gustaría agregar, o desea que continuemos " +
        "con su cotización?",

    nextStage:
        "EXPLICIT_CONFIRMATION"
}),

    EXPLICIT_CONFIRMATION: Object.freeze({

        objective:
            "Obtain explicit confirmation that the summarized request is correct.",

        completion:
            "The customer explicitly confirms the complete current request.",

        result:
            "The current request becomes a confirmed quote-processing event.",

        nextStage:
            "PROCESSING"
    }),


    PROCESSING: Object.freeze({

    objective:
        "Communicate with confidence that the confirmed request is moving forward " +
        "for quotation while reinforcing North Crescent's commitment to competitive " +
        "pricing, professional service quality and trained personnel.",

    completion:
        "The customer has been informed that the personalized quotation is being " +
        "prepared and has been given confidence in the value of North Crescent's service.",

    result:
        "The customer understands that the quotation is moving forward and feels " +
        "confident that North Crescent combines competitive pricing, quality service " +
        "and trained professionals.",

    communication:
        "Thank the customer for confirming the details and naturally reinforce " +
        "North Crescent's value: competitive pricing, professional cleaning and " +
        "sanitization services, quality workmanship and trained personnel. Do not " +
        "make unsupported guarantees or claim to be the absolute lowest-priced " +
        "provider. The message should create confidence that the customer is " +
        "receiving strong value without sounding like a sales pitch.",

    mandatoryMessage:
        "A continuación, nuestro equipo ya está trabajando para enviarle su " +
        "cotización en el transcurso de la siguiente hora.",

    preferredQuestion:
        "Y antes de continuar, [NOMBRE], ¿desea que sigamos adelante con su " +
        "presupuesto o tiene alguna duda acerca del servicio que le gustaría que " +
        "aclaremos?",

    nextStage:
        "FINAL_SERVICE_CHECK"
}),

FINAL_SERVICE_CHECK: Object.freeze({

    objective:
        "After confirming that the personalized quotation is already being prepared, " +
        "give the customer one final opportunity to request additional assistance " +
        "before closing the conversation.",

    completion:
        "The customer indicates whether any additional assistance is needed after " +
        "being informed that the quotation is being prepared.",

    result:
        "The customer understands that North Crescent is already working on the " +
        "personalized quotation and the conversation is ready to close unless the " +
        "customer requests additional assistance.",

    communication:
        "After the customer has explicitly confirmed the request, communicate the " +
        "mandatory message: \"A continuación, nuestro equipo ya está trabajando " +
        "para enviarle su cotización en el transcurso de la siguiente hora.\" " +
        "Then warmly ask whether there is anything else North Crescent can help " +
        "with before closing. Do not reopen the quotation process, repeat discovery, " +
        "or request information that has already been confirmed.",

    preferredQuestion:
        "Y antes de dejarlo por ahora, [NOMBRE], ¿hay algo más en lo cual le pueda ayudar?",

    nextStage:
        "CLOSE"
}),


    CLOSE: Object.freeze({

    objective:
        "Close the conversation with warmth, confidence and professionalism, " +
        "leaving the customer with a clear sense of trust, reassurance and confidence " +
        "in North Crescent Facility Solutions.",

    completion:
        "The customer has no additional request and the conversation can be " +
        "closed with a positive and reassuring final impression.",

    result:
        "The customer leaves the conversation feeling heard, supported and confident " +
        "that North Crescent Facility Solutions is handling their request with care, " +
        "professionalism and attention to detail.",

    communication:
        "Close warmly and professionally. Thank the customer for choosing or " +
        "considering North Crescent Facility Solutions and reinforce confidence " +
        "that their request is being handled with care, reliability and professional " +
        "attention. End by clearly mentioning North Crescent Facility Solutions " +
        "and leave the customer with a reassuring message that strengthens trust " +
        "in the company and its service.",

    preferredClosing:
        "Perfecto, [NOMBRE]. Ha sido un placer ayudarle. Gracias por confiar en " +
        "North Crescent Facility Solutions. Puede tener la tranquilidad de que " +
        "su solicitud está siendo atendida con el profesionalismo, cuidado y " +
        "atención que merece. Será un placer ayudarle nuevamente.",

    nextStage:
        null
})
});


/* =========================================================
   STAGE UTILITIES
   ========================================================= */

/**
 * Returns whether a stage exists.
 */
function isValidStage(
    stage = ""
) {

    return SALES_STAGES.includes(
        stage
    );
}


/**
 * Returns the numerical position of a stage.
 */
function getStageIndex(
    stage = ""
) {

    if (!isValidStage(stage)) {
        return -1;
    }

    return STAGE_ORDER[stage];
}


/**
 * Returns the next stage in the official journey.
 */
function getNextStage(
    stage = ""
) {

    if (!isValidStage(stage)) {
        return "IDENTIFY";
    }

    return (
        STAGE_DEFINITIONS[stage]
            ?.nextStage || null
    );
}


/**
 * Returns the complete definition of a stage.
 */
function getStageDefinition(
    stage = ""
) {

    if (!isValidStage(stage)) {
        return null;
    }

    return STAGE_DEFINITIONS[stage];
}


/* =========================================================
   STAGE COMPLETION HELPERS
   ========================================================= */

/**
 * Determines whether customer identity has been established.
 */
function isIdentifyComplete(
    leadProfile = {}
) {

    return Boolean(
        cleanValue(
            leadProfile.clientName
        )
    );
}


/**
 * Determines whether the customer need is understood.
 *
 * A service type is the strongest deterministic signal,
 * while operational context may also support understanding.
 */
function isNeedUnderstandingComplete(
    leadProfile = {},
    understanding = {}
) {

    return Boolean(
        cleanValue(
            leadProfile.serviceType
        ) ||
        understanding.isQuoteRequest ||
        understanding.isServiceInformation
    );
}


/**
 * Determines whether the requested service is sufficiently
 * understood.
 */
function isServiceResolved(
    leadProfile = {}
) {

    return Boolean(
        cleanValue(
            leadProfile.serviceType
        )
    );
}


/**
 * Determines whether basic property understanding exists.
 *
 * The Brain does not require every optional property field.
 */
function isPropertyUnderstandingComplete(leadProfile = {}) {
    const profile = normalizeLeadProfile(leadProfile);

    return Boolean(
        profile.serviceAddress &&
        profile.city &&
        (
            profile.squareFootage ||
            profile.bedrooms ||
            profile.bathrooms ||
            profile.propertyType
        )
    );
}


/**
 * Determines whether relevant operational discovery
 * is sufficient.
 *
 * This deliberately uses the operational summary as the
 * primary source rather than forcing a fixed questionnaire.
 */
function isRelevantDiscoveryComplete(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    return Boolean(
        cleanValue(
            profile.operationalSummary
        )
    );
}

/**
 * Determines whether an email exists.
 *
 * Explicit confirmation of the email is handled by
 * the confirmation/progression layer.
 */
function hasEmail(leadProfile = {}, conversationHistory = []) {
    const profile = normalizeLeadProfile(leadProfile);

    if (!cleanValue(profile.emailAddress)) {
        return false;
    }

       const emailState = getEmailState(
        profile,
        conversationHistory
    );

    return Boolean(
        emailState.confirmed
    );
}

/**
 * Determines whether a phone number exists.
 */
function hasPhone(
    leadProfile = {}
) {

    return Boolean(
        cleanValue(
            leadProfile.phoneNumber
        )
    );
}


/**
 * Determines whether a service date exists.
 *
 * Current leadProfile supports timeSlot but not yet
 * a dedicated serviceDate field.
 *
 * We therefore use timeSlot only when it actually
 * represents customer timing information.
 */
function hasServiceDate(leadProfile = {}) {
    const profile = normalizeLeadProfile(leadProfile);

    return Boolean(
        cleanValue(profile.serviceDate) ||
        cleanValue(profile.timeSlot)
    );
}

/**
/**
 * Determines whether customer priorities exist or the customer
 * has indicated that there are no additional priorities.
 */
function hasCustomerPriorities(
    leadProfile = {}
) {
    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    const priorities =
        cleanValue(
            profile.sensitiveAreas
        );

    if (priorities) {
        return true;
    }

    const summary =
        cleanValue(
            profile.operationalSummary
        );

    if (
        summary &&
        /\b(no|none|nothing|nothing else|no additional|no priorities|no concerns|no special requests)\b/i.test(
            summary
        )
    ) {
        return true;
    }

    return false;
}

/* =========================================================
   STAGE RESOLUTION
   ========================================================= */
/**
 * Resolves progression through the final conversational stages
 * using the current customer response and recent conversation history.
 *
 * This function does not create persistent state.
 *
 * It only determines which final stage is currently active
 * based on what the customer and Concierge have already completed.
 */
function resolveFinalStage(
    {
        currentMessage = "",
        conversationHistory = []
    } = {}
) {

    const history =
        getMessages(
            conversationHistory
        );

    const message =
        cleanValue(
            currentMessage
        ) ||
        getMostRecentUserMessage(
            history
        );

    if (!message) {
        return "";
    }


    const lastAssistantMessage =
        [...history]
            .reverse()
            .find(
                entry =>
                    isObject(entry) &&
                    normalizeText(entry.role) ===
                        "assistant"
            );


    const assistantText =
        normalizeText(
            lastAssistantMessage?.content || ""
        );


    const customerHasNoMoreDetails =
        customerIndicatedNoAdditionalDetails(
            message
        );


      const assistantAskedForFinalDetails =
        Boolean(
            assistantText &&
            (
                assistantText.includes(
                    "detalle"
                ) ||
                assistantText.includes(
                    "details"
                ) ||
                assistantText.includes(
                    "anything else"
                )
            )
        );

const assistantAskedForFinalQuestions =
    Boolean(
        assistantText &&
        (
            assistantText.includes("remaining question") ||
            assistantText.includes("remaining questions") ||
            assistantText.includes("final question") ||
            assistantText.includes("final questions") ||
            assistantText.includes("any remaining question") ||
            assistantText.includes("any remaining questions")
        )
    );
    /*
     * -----------------------------------------------------
     * EXPLICIT CONFIRMATION
     * -----------------------------------------------------
     *
     * The customer has confirmed the final summary.
     */
    if (
        isCurrentConfirmation(
            message,
            history
        )
    ) {

        return "PROCESSING";
    }


    /*
     * -----------------------------------------------------
     * FINAL SUMMARY
     * -----------------------------------------------------
     *
     * The Concierge has already presented the final
     * summary and requested explicit confirmation.
     */
    if (
        assistantRequestedConfirmation(
            assistantText
        )
    ) {

        return "EXPLICIT_CONFIRMATION";
    }


    /*
     * -----------------------------------------------------
     * FINAL QUESTION CHECK
     * -----------------------------------------------------
     *
     * The customer has indicated that there are no more
     * questions after the Concierge asked for final questions.
     */
    if (
        customerHasNoMoreDetails &&
        assistantAskedForFinalQuestions
    ) {

        return "FINAL_SUMMARY";
    }


    /*
     * -----------------------------------------------------
     * FINAL DETAIL CHECK
     * -----------------------------------------------------
     *
     * The customer has indicated that there are no more
     * relevant details after the Concierge asked for them.
     */
    if (
        customerHasNoMoreDetails &&
        assistantAskedForFinalDetails
    ) {

        return "FINAL_QUESTION_CHECK";
    }


    return "";
}
/**
 * Determines the highest confirmed point of progression
 * from the information currently available.
 *
 * IMPORTANT:
 *
 * This function does not decide what to ask next.
 *
 * It only determines what has already been achieved.
 */
export function resolveCompletedStage(
    {
        leadProfile = {},
        understanding = {},
        conversationHistory = []
    } = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );


    if (
        !isIdentifyComplete(
            profile
        )
    ) {

        return "IDENTIFY";
    }


    if (
        !isNeedUnderstandingComplete(
            profile,
            understanding
        )
    ) {

        return "UNDERSTAND_NEED";
    }


    if (
        !isServiceResolved(
            profile
        )
    ) {

        return "RESOLVE_SERVICE";
    }


    if (
        !isPropertyUnderstandingComplete(
            profile
        )
    ) {

        return "UNDERSTAND_PROPERTY";
    }


    if (
        !isRelevantDiscoveryComplete(
            profile
        )
    ) {

        return "RELEVANT_DISCOVERY";
    }


    if (
        !hasEmail(
            profile,
            conversationHistory
        )
    ) {

        return "EMAIL";
    }


    if (
        !hasPhone(
            profile
        )
    ) {

        return "PHONE";
    }


    /*
     * Once the customer's email and phone are both confirmed,
     * discovery is complete.
     *
     * Do not continue into service date, priorities,
     * final detail checks, or additional discovery questions.
     *
     * The conversation should move directly to the
     * final summary / confirmation stage.
     */
    if (
        hasEmail(
            profile,
            conversationHistory
        ) &&
        hasPhone(
            profile
        )
    ) {

        return "FINAL_SUMMARY";
    }


    if (
        !hasServiceDate(
            profile
        )
    ) {

        return "SERVICE_DATE";
    }


    if (
        !hasCustomerPriorities(
            profile
        )
    ) {

        return "PRIORITIES";
    }


    const finalStage =
        resolveFinalStage({
            currentMessage:
                understanding.currentMessage,

            conversationHistory
        });


    if (finalStage) {
        return finalStage;
    }


    return "FINAL_DETAIL_CHECK";
}

/* =========================================================
   STAGE CONTEXT
   ========================================================= */

/**
 * Builds a deterministic stage context.
 *
 * Later sections will use this context to decide:
 *
 * - what has been resolved
 * - what remains
 * - what the next appropriate action is
 *
 * The actual conversational response remains outside
 * this section.
 */

export function buildSalesJourney(
    {
        leadProfile = {},
        understanding = {},
        conversationHistory = []
    } = {}
) {

   const completedStage =
    resolveCompletedStage({
        leadProfile,
        understanding,
        conversationHistory
    });

    const nextStage =
        getNextStage(
            completedStage
        );

    return Object.freeze({

        currentStage:
            completedStage,

        nextStage,

        currentStageIndex:
            getStageIndex(
                completedStage
            ),

        nextStageIndex:
            getStageIndex(
                nextStage
            ),

        stageDefinition:
            getStageDefinition(
                completedStage
            ),

        nextStageDefinition:
            getStageDefinition(
                nextStage
            )
    });
}
/* =========================================================
   SECTION 4 — PROGRESSION ENGINE
   ========================================================= */

/**
 * Purpose:
 *
 * Convert conversation understanding + sales journey
 * into one deterministic next conversational action.
 *
 * Core ADN:
 *
 * RECOGNIZE
 * → ACKNOWLEDGE
 * → ANSWER
 * → VALUE
 * → EXPLAIN WHY
 * → ADVANCE
 * → ASK
 *
 * Core progression rule:
 *
 * ONE QUESTION
 * = ONE OBJECTIVE
 * = ONE RESULT
 * = ONE ADVANCE
 *
 * This section controls progression.
 *
 * It does NOT:
 * - generate the final customer-facing wording
 * - calculate pricing
 * - access Airtable
 * - control Make
 * - create operational records
 */


/* =========================================================
   ACTION TYPES
   ========================================================= */

const PROGRESSION_ACTIONS = Object.freeze([

    "IDENTIFY_CUSTOMER",

    "UNDERSTAND_NEED",

    "RESOLVE_SERVICE",

    "UNDERSTAND_PROPERTY",

    "RELEVANT_DISCOVERY",

    "CONFIRM_EMAIL",

    "REQUEST_PHONE",

    "REQUEST_SERVICE_DATE",

    "IDENTIFY_PRIORITIES",

    "FINAL_DETAIL_CHECK",

    "FINAL_QUESTION_CHECK",

    "PREPARE_FINAL_SUMMARY",

    "REQUEST_EXPLICIT_CONFIRMATION",

    "PROCESS_CONFIRMED_REQUEST",

    "FINAL_SERVICE_CHECK",

    "CLOSE_CONVERSATION",

    "ANSWER_CUSTOMER_QUESTION",

    "ANSWER_PRICE_QUESTION",

    "ANSWER_AVAILABILITY_QUESTION",

    "HANDLE_CORRECTION",

    "START_NEW_REQUEST"
]);


/* =========================================================
   ACTION VALIDATION
   ========================================================= */

function isValidProgressionAction(
    action = ""
) {

    return PROGRESSION_ACTIONS.includes(
        action
    );
}

/**
 * Extracts a valid email address from the customer's message.
 *
 * This does not modify customer memory.
 * It only identifies an email explicitly provided
 * by the customer.
 */
function extractEmailAddress(
    message = ""
) {

    const text =
        cleanValue(message);

    if (!text) {
        return "";
    }

    const match =
        text.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        );

    return cleanValue(
        match?.[0] || ""
    );
}
/* =========================================================
   CONTACT STATE
   ========================================================= */

/**
 * Email confirmation requires more than simply
 * having an email value.
 *
 * Section 4 therefore separates:
 *
 * - email available
 * - email explicitly confirmed
 *
 * This prevents the Brain from assuming that an email
 * arriving from the frontend is automatically confirmed.
 */
function getEmailState(
    leadProfile = {},
    conversationHistory = []
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    const email =
        cleanValue(
            profile.emailAddress
        );

    const history =
        getMessages(
            conversationHistory
        );

    const lastAssistantMessage =
        [...history]
            .reverse()
            .find(
                message =>
                    isObject(message) &&
                    normalizeText(message.role) === "assistant"
            );

    const lastUserMessage =
        [...history]
            .reverse()
            .find(
                message =>
                    isObject(message) &&
                    normalizeText(message.role) === "user"
            );

    const assistantText =
        normalizeText(
            lastAssistantMessage?.content || ""
        );

    const userText =
        cleanValue(
            lastUserMessage?.content || ""
        );

    const assistantRequestedEmail =
        Boolean(
            assistantText &&
            (
                assistantText.includes("email") ||
                assistantText.includes("correo") ||
                assistantText.includes("e-mail") ||
                assistantText.includes("courriel")
            )
        );

    const customerProvidedEmail =
        Boolean(
            extractEmailAddress(
                userText
            )
        );

    const emailConfirmed =
    Boolean(
        email &&
        history.some(
            (message, index) => {

                if (
                    !isObject(message) ||
                    normalizeText(message.role) !== "user"
                ) {
                    return false;
                }

                const customerEmail =
                    extractEmailAddress(
                        message.content || ""
                    );

                if (
                    !customerEmail ||
                    normalizeText(customerEmail) !==
                        normalizeText(email)
                ) {
                    return false;
                }

                const previousAssistant =
                    [...history]
                        .slice(0, index)
                        .reverse()
                        .find(
                            previousMessage =>
                                isObject(previousMessage) &&
                                normalizeText(
                                    previousMessage.role
                                ) === "assistant"
                        );

                const previousAssistantText =
                    normalizeText(
                        previousAssistant?.content || ""
                    );

                return (
                    previousAssistantText.includes("email") ||
                    previousAssistantText.includes("correo") ||
                    previousAssistantText.includes("e-mail") ||
                    previousAssistantText.includes("courriel")
                );
            }
        )
    );

    return Object.freeze({

        available:
            Boolean(email),

        confirmed:
            emailConfirmed
    });
}
/**
 * Phone state.
 *
 * A phone number supplied by the customer is considered
 * known. Explicit confirmation can be handled later when
 * the customer corrects or validates contact information.
 */
function getPhoneState(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    return Object.freeze({

        available:
            Boolean(
                cleanValue(
                    profile.phoneNumber
                )
            )
    });
}


/* =========================================================
   CUSTOMER RESPONSE STATE
   ========================================================= */

/**
 * Determines whether the customer has indicated
 * that there are no additional details.
 *
 * This is intentionally conservative.
 */
function customerIndicatedNoAdditionalDetails(
    message = ""
) {

    const text =
        normalizeText(
            message
        );

    if (!text) {
        return false;
    }

    if (
        text.includes("?")
    ) {
        return false;
    }

    const hasContinuationSignal =
        /\b(and|also|plus|but|however|ademas|además|tambien|también|pero|y)\b/i.test(
            text
        );

    if (
        hasContinuationSignal
    ) {
        return false;
    }

    const hasAdditionalInformationSignal =
        /\b(detail|details|information|info|question|questions|concern|concerns|priority|priorities|detalle|detalles|informacion|información|pregunta|preguntas|duda|dudas|prioridad|prioridades|problema|problemas)\b/i.test(
            text
        );

    if (
        hasAdditionalInformationSignal
    ) {
        return false;
    }

    return (
        text.length <= 80
    );
}

/**
 * Determines whether the customer has indicated
 * that there are no additional questions.
 */
function customerHasNoMoreQuestions(
    message = ""
) {

    return customerIndicatedNoAdditionalDetails(
        message
    );
}


/* =========================================================
   OPERATIONAL DISCOVERY
   ========================================================= */

/**
 * Determines whether the customer has provided enough
 * relevant operational information.
 *
 * The Brain does NOT require a fixed questionnaire.
 *
 * It uses:
 *
 * - operationalSummary
 * - property information
 * - service-specific context
 * - customer priorities
 *
 * to decide whether discovery can move forward.
 */
function hasRelevantDiscovery(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    if (
        cleanValue(
            profile.operationalSummary
        )
    ) {
        return true;
    }

    const signals = [

        profile.squareFootage,

        profile.accessInstructions,

        profile.sensitiveAreas
    ];

    return signals.filter(
        Boolean
    ).length >= 2;
}


/* =========================================================
   ESSENTIAL QUOTE INFORMATION
   ========================================================= */

/**
 * Quote essentials:
 *
 * - clientName
 * - email OR phone
 * - serviceAddress
 * - city
 * - serviceType
 * - operationalSummary
 *
 * This section does not calculate pricing.
 */
function getQuoteReadiness(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    const missingFields = [];


    if (!profile.clientName) {

        missingFields.push(
            "clientName"
        );
    }


    if (
        !profile.emailAddress &&
        !profile.phoneNumber
    ) {

        missingFields.push(
            "contact"
        );
    }


    if (!profile.serviceAddress) {

        missingFields.push(
            "serviceAddress"
        );
    }


    if (!profile.city) {

        missingFields.push(
            "city"
        );
    }


    if (!profile.serviceType) {

        missingFields.push(
            "serviceType"
        );
    }


    if (!profile.operationalSummary) {

        missingFields.push(
            "operationalSummary"
        );
    }


    return Object.freeze({

        ready:
            missingFields.length === 0,

        missingFields
    });
}


/* =========================================================
   CUSTOMER QUESTION OVERRIDE
   ========================================================= */

/**
 * Customer questions interrupt progression.
 *
 * They must be answered before the Concierge advances.
 *
 * After answering, the Brain returns to the current
 * commercial stage.
 */
function getCustomerQuestionAction(
    understanding = {}
) {
    if (understanding.isPriceQuestion) {
        return "ANSWER_PRICE_QUESTION";
    }

    if (understanding.isAvailabilityQuestion) {
        return "ANSWER_AVAILABILITY_QUESTION";
    }

    if (understanding.isServiceInformation) {
        return "ANSWER_CUSTOMER_QUESTION";
    }

    return "";
}


/* =========================================================
   STAGE → ACTION
   ========================================================= */

/**
 * Maps a sales stage to the action required to progress.
 */
function getActionForStage(
    stage
) {

    switch (stage) {

        case "IDENTIFY":

            return "IDENTIFY_CUSTOMER";


        case "UNDERSTAND_NEED":

            return "UNDERSTAND_NEED";


        case "RESOLVE_SERVICE":

            return "RESOLVE_SERVICE";


        case "UNDERSTAND_PROPERTY":

            return "UNDERSTAND_PROPERTY";


        case "RELEVANT_DISCOVERY":

            return "RELEVANT_DISCOVERY";


        case "EMAIL":

            return "CONFIRM_EMAIL";


        case "PHONE":

            return "REQUEST_PHONE";


                case "SERVICE_DATE":

            return "REQUEST_SERVICE_DATE";


        case "PRIORITIES":

            return "IDENTIFY_PRIORITIES";


               case "FINAL_DETAIL_CHECK":

            return "FINAL_DETAIL_CHECK";


        case "FINAL_QUESTION_CHECK":

            return "FINAL_QUESTION_CHECK";


        case "FINAL_SUMMARY":

            return "PREPARE_FINAL_SUMMARY";


        case "EXPLICIT_CONFIRMATION":

            return "REQUEST_EXPLICIT_CONFIRMATION";


        case "PROCESSING":

            return "PROCESS_CONFIRMED_REQUEST";


        case "FINAL_SERVICE_CHECK":

            return "FINAL_SERVICE_CHECK";


        case "CLOSE":

            return "CLOSE";


        default:

            return "IDENTIFY_CUSTOMER";
    }
}


/* =========================================================
   CORRECTION ROUTING
   ========================================================= */

/**
 * Corrections temporarily override normal progression.
 *
 * After the correction is applied, the journey must be
 * recalculated from the corrected customer information.
 */
function getCorrectionAction(
    understanding = {}
) {

    if (
        understanding.isCorrection
    ) {

        return "HANDLE_CORRECTION";
    }

    return "";
}


/* =========================================================
   NEW REQUEST ROUTING
   ========================================================= */

function getNewRequestAction(
    understanding = {}
) {

    if (
        understanding.isNewRequest
    ) {

        return "START_NEW_REQUEST";
    }

    return "";
}


/* =========================================================
   CONFIRMATION ROUTING
   ========================================================= */

/**
 * Confirmation is valid only when:
 *
 * - current message is an explicit confirmation
 * - previous assistant message requested confirmation
 * - the current request is complete enough to process
 */
function getConfirmationAction(
    {
        understanding = {},
        leadProfile = {},
        conversationHistory = []
    } = {}
) {

    if (
        !understanding.isConfirmation
    ) {
        return "";
    }

    const quoteReadiness =
        getQuoteReadiness(
            leadProfile
        );

    if (
        !quoteReadiness.ready
    ) {
        return "";
    }

    const lastAssistantMessage =
        [...conversationHistory]
            .reverse()
            .find(
                message =>
                    message?.role === "assistant"
            );

    const assistantText =
        cleanValue(
            lastAssistantMessage?.content
        );

    if (
        !assistantText
    ) {
        return "";
    }

      const requestedExplicitConfirmation =
    /¿Está toda esta información correcta\?/i.test(
        assistantText
    );

if (
    !requestedExplicitConfirmation
) {
    return "";
}

    return "PROCESS_CONFIRMED_REQUEST";
}


/* =========================================================
   MAIN PROGRESSION DECISION
   ========================================================= */

/**
 * Determines exactly one next action.
 *
 * Priority:
 *
 * 1. New request
 * 2. Correction
 * 3. Customer question
 * 4. Explicit confirmation
 * 5. Commercial progression
 *
 * This prevents informational questions from destroying
 * the customer's current position in the sales journey.
 */
export function determineProgressionAction(
    {
        leadProfile = {},
        understanding = {},
        journey = {},
        conversationHistory = []
    } = {}
) {

    /*
     * -----------------------------------------------------
     * 1. NEW REQUEST
     * -----------------------------------------------------
     */

    const newRequestAction =
        getNewRequestAction(
            understanding
        );

    if (newRequestAction) {

        return newRequestAction;
    }


    /*
     * -----------------------------------------------------
     * 2. CUSTOMER CORRECTION
     * -----------------------------------------------------
     */

    const correctionAction =
        getCorrectionAction(
            understanding
        );

    if (correctionAction) {

        return correctionAction;
    }


    /*
     * -----------------------------------------------------
     * 3. CUSTOMER QUESTION
     * -----------------------------------------------------
     *
     * The customer must receive an answer before
     * the Concierge advances.
     */

    const questionAction =
        getCustomerQuestionAction(
            understanding
        );

    if (questionAction) {

        return questionAction;
    }


    /*
     * -----------------------------------------------------
     * 4. EXPLICIT CONFIRMATION
     * -----------------------------------------------------
     */

    const confirmationAction =
        getConfirmationAction({
            understanding,
            leadProfile,
            conversationHistory
        });

    if (confirmationAction) {

        return confirmationAction;
    }
   /*
 * -----------------------------------------------------
 * 4.5. POST-CONFIRMATION PROGRESSION
 * -----------------------------------------------------
 *
 * If the customer already confirmed the request and
 * the Concierge has already communicated that the
 * request is being processed, do not restart the
 * final summary.
 */
const history =
    getMessages(
        conversationHistory
    );

const hasAlreadyProcessedConfirmedRequest =
    history.some(
        message =>
            isObject(message) &&
            normalizeText(message.role) ===
                "assistant" &&
            (
                normalizeText(message.content).includes(
                    "nuestro equipo está procesando"
                ) ||
                normalizeText(message.content).includes(
                    "nuestro equipo ya está trabajando"
                ) ||
                normalizeText(message.content).includes(
                    "your quotation is being prepared"
                ) ||
                normalizeText(message.content).includes(
                    "our team is now working"
                )
            )
    );

if (
    hasAlreadyProcessedConfirmedRequest
) {

    return "FINAL_SERVICE_CHECK";
}


    /*
     * -----------------------------------------------------
     * 5. COMMERCIAL PROGRESSION
     * -----------------------------------------------------
     */

    const currentStage =
        journey.currentStage ||
        "IDENTIFY";


    /*
     * -----------------------------------------------------
     * FINAL QUOTE READINESS
     * -----------------------------------------------------
     */

    


    /*
     * -----------------------------------------------------
     * NORMAL STAGE PROGRESSION
     * -----------------------------------------------------
     */

    return getActionForStage(
        currentStage
    );
}


/* =========================================================
   PROGRESSION CONTEXT
   ========================================================= */

/**
 * Builds the complete progression decision.
 */
export function buildProgressionContext(
    {
        leadProfile = {},
        understanding = {},
        journey = {},
        conversationHistory = []
    } = {}
) {

    const action =
        determineProgressionAction({
            leadProfile,
            understanding,
            journey,
            conversationHistory
        });


    const quoteReadiness =
        getQuoteReadiness(
            leadProfile
        );


    return Object.freeze({

        action,

        actionIsValid:
            isValidProgressionAction(
                action
            ),

        currentStage:
            journey.currentStage ||
            "IDENTIFY",

        nextStage:
            journey.nextStage ||
            null,

        quoteReady:
            quoteReadiness.ready,

        missingFields:
            quoteReadiness.missingFields,

        requiresCustomerQuestion:
            [
                "IDENTIFY_CUSTOMER",
                "UNDERSTAND_NEED",
                "RESOLVE_SERVICE",
                "UNDERSTAND_PROPERTY",
                "RELEVANT_DISCOVERY",
                "CONFIRM_EMAIL",
                "REQUEST_PHONE",
                "REQUEST_SERVICE_DATE",
                "IDENTIFY_PRIORITIES",
                "FINAL_DETAIL_CHECK",
                "FINAL_QUESTION_CHECK",
                "REQUEST_EXPLICIT_CONFIRMATION"
            ].includes(action)
    });
}
/* =========================================================
   SECTION 5 — COMMERCIAL / VALUE ENGINE
   ========================================================= */

/**
 * Purpose:
 *
 * Apply the North Crescent commercial ADN to the
 * progression selected by the Brain.
 *
 * Core ADN:
 *
 * RECOGNIZE
 * → ACKNOWLEDGE
 * → ANSWER
 * → VALUE
 * → EXPLAIN WHY
 * → ADVANCE
 * → ASK
 *
 * Commercial principle:
 *
 * The Concierge is not a passive FAQ.
 * It should help the customer move naturally toward
 * the appropriate service and quote process.
 *
 * This section does NOT:
 * - invent prices
 * - invent availability
 * - invent service scope
 * - generate unsupported claims
 * - replace the progression engine
 * - calculate pricing
 */


/* =========================================================
   COMMERCIAL ACTIONS
   ========================================================= */

const COMMERCIAL_ACTIONS = Object.freeze({

    ANSWER:
        "ANSWER",

    ANSWER_AND_ADVANCE:
        "ANSWER_AND_ADVANCE",

    VALUE_AND_ADVANCE:
        "VALUE_AND_ADVANCE",

    ASK_PROGRESSIVE_QUESTION:
        "ASK_PROGRESSIVE_QUESTION",

    ANSWER_PRICE:
        "ANSWER_PRICE",

    ANSWER_AVAILABILITY:
        "ANSWER_AVAILABILITY",

    ANSWER_SERVICE_INFORMATION:
        "ANSWER_SERVICE_INFORMATION",

    HANDLE_CORRECTION:
        "HANDLE_CORRECTION",

    HANDLE_NEW_REQUEST:
        "HANDLE_NEW_REQUEST",

    PREPARE_SUMMARY:
        "PREPARE_SUMMARY",

    REQUEST_CONFIRMATION:
        "REQUEST_CONFIRMATION",

    PROCESS_CONFIRMED_REQUEST:
        "PROCESS_CONFIRMED_REQUEST",

    CLOSE:
        "CLOSE"
});


/* =========================================================
   CUSTOMER-FACING PURPOSE
   ========================================================= */

/**
 * Determines the commercial purpose of the current action.
 *
 * The Brain does not produce the final wording here.
 * It provides a clear communication objective for the
 * language layer.
 */
function getCommercialPurpose(
    action = ""
) {

    switch (action) {

        case "ANSWER_CUSTOMER_QUESTION":

            return (
                "Answer the customer's current question clearly, " +
                "then return naturally to the current sales progression."
            );


        case "ANSWER_PRICE_QUESTION":

            return (
                "Address the customer's price question directly, " +
                "protect accuracy, explain the value of a personalized " +
                "quote, and continue the appropriate progression."
            );


        case "ANSWER_AVAILABILITY_QUESTION":

            return (
                "Address the customer's availability question without " +
                "inventing schedule information, then continue the " +
                "appropriate progression."
            );


        case "ANSWER_SERVICE_INFORMATION":

            return (
                "Explain the relevant service clearly, connect the " +
                "service to the customer's need, and advance naturally."
            );


        case "IDENTIFY_CUSTOMER":

    return (
        "Welcome the customer warmly and, once their name is known, " +
        "immediately invite them to describe their space in their own words. " +
        "Encourage them to include useful property details such as the number " +
        "of bedrooms, bathrooms, approximate square footage, number of floors, " +
        "flooring type, and any other relevant characteristics. Do not ask " +
        "these details as separate questions. Treat the examples as guidance, " +
        "not as a checklist. Capture all information the customer provides " +
        "and do not ask for information they have already given."
    );


        case "UNDERSTAND_NEED":

            return (
                "Understand what the customer needs and how North Crescent " +
                "can help."
            );


        case "RESOLVE_SERVICE":

            return (
                "Confirm the requested service when clarification is useful, " +
                "without asking the customer to repeat information already known."
            );


        case "UNDERSTAND_PROPERTY":

            return (
                "Understand the property sufficiently to avoid a generic " +
                "service recommendation or quote."
            );


       case "RELEVANT_DISCOVERY":

    return (
        "Guide the customer through a natural, open-ended discovery. " +
        "First invite the customer to describe their space and what " +
        "they would like the team to consider. Then allow one relevant " +
        "follow-up about any specific details they want addressed during " +
        "the cleaning. Do not turn discovery into a questionnaire. " +
        "After relevant discovery is captured, direct the customer toward " +
        "continuing with their personalized quote."
    );

case "CONFIRM_EMAIL":

    return (
        "Ask the customer to provide their email address again " +
        "because it will be used to prepare and send the personalized " +
        "quotation. Do not display, repeat, reveal, suggest, or " +
        "complete the email address already stored. The customer must " +
        "type the email address themselves. A valid email address " +
        "provided by the customer is the confirmation and second " +
        "verification. If the customer provides a different email, " +
        "use the newly provided email as the current contact email. " +
        "If the customer only says yes, do not treat that as email " +
        "confirmation; remain in the EMAIL stage and ask them to type " +
        "the email address. After a valid email is provided, immediately " +
        "advance to the next commercial stage."
    );


        case "REQUEST_PHONE":

    return (
        "Request the best phone number for customer communication and follow-up. " +
        "If a phone number has already been provided, ask the customer to " +
        "confirm that it is correct before continuing. Never assume a phone " +
        "number is confirmed simply because it exists. After the customer " +
        "confirms it, acknowledge the confirmation and continue toward the next " +
        "commercial stage."
    );


       
       case "REQUEST_SERVICE_DATE":

    return (
        "Request the customer's preferred service date and, when relevant, " +
        "their preferred time or time window. If a service date has already " +
        "been provided, ask the customer to confirm that it is correct before " +
        "continuing. Never assume a date is confirmed simply because it exists. " +
        "After the customer confirms the date, acknowledge the confirmation and " +
        "continue toward the next commercial stage."
    );


        case "IDENTIFY_PRIORITIES":

            return (
                "Understand what matters most to the customer so the service " +
                "can be aligned with their priorities."
            );


       case "FINAL_DETAIL_CHECK":

    return (
        "Make one final, natural check for any relevant detail the customer " +
        "would like to add before preparing the personalized quote. Ask whether " +
        "there is anything else they would like the team to know or address. " +
        "If the customer has nothing else to add, acknowledge that and guide " +
        "the conversation toward the final question check and quotation."
    );


       case "FINAL_QUESTION_CHECK":

    return (
        "Ask the customer if there is any remaining question about the service " +
        "that they would like clarified before the final summary. Answer any " +
        "question they raise clearly and accurately. If there are no remaining " +
        "questions, acknowledge that and proceed directly to the final summary " +
        "and confirmation for the personalized quote."
    );


        case "PREPARE_FINAL_SUMMARY":

    return (
        "Present a clear, personalized and reassuring summary of the customer's " +
        "request. Begin by acknowledging the information the customer has shared " +
        "and the needs they have communicated. Summarize only confirmed details, " +
        "including the service, property, location, contact information, requested " +
        "date, and relevant priorities or special details. Do not invent, assume, " +
        "or add information that the customer has not provided. The summary should " +
        "make the customer feel understood and confident that North Crescent has " +
        "correctly understood what they need. End by asking: \"¿Está toda esta " +
        "información correcta?\""
    );

          case "REQUEST_EXPLICIT_CONFIRMATION":

    return Object.freeze({

        action,

        type:
            "EXPLICIT_CONFIRMATION",

        communication:
            {
                question:
                    "¿Está toda esta información correcta?"
            },

        commercial,

        nextAction:
            "PROCESS_CONFIRMED_REQUEST"
    });


     case "FINAL_DETAIL_CHECK":

    return (
        "Make one final, natural check for any relevant detail the customer " +
        "would like to add before preparing the personalized quote. Ask whether " +
        "there is anything else they would like the team to know or address. " +
        "If the customer has nothing else to add, acknowledge that and guide " +
        "the conversation toward the final question check and quotation."
    );
          


        case "PROCESS_CONFIRMED_REQUEST":

    return (
        "Thank the customer warmly for providing and confirming all the details. " +
        "Acknowledge that their request has been fully understood and confirmed. " +
        "Clearly communicate that the request is now moving forward and that the " +
        "team is already working on preparing the quotation. The following message " +
        "is mandatory and must be communicated exactly as written: " +
        "\"A continuación, nuestro equipo ya está trabajando para enviarle su " +
        "cotización en el transcurso de la siguiente hora.\" " +
        "After communicating this, ask: \"Y antes de dejarlo por ahora, [NOMBRE], " +
        "¿hay algo más en lo cual le pueda ayudar?\""
    );

        case "CLOSE":

    return (
        "Close the conversation warmly and professionally. Thank the customer " +
        "for choosing North Crescent Facility Solutions and leave them with a " +
        "clear sense of confidence, reliability and professional care. End with " +
        "the company name and a reassuring message that reinforces North Crescent " +
        "Facility Solutions as a trusted professional partner."
    );


        default:

            return (
                "Continue the conversation naturally while preserving " +
                "commercial progression."
            );
    }
}


/* =========================================================
   VALUE PRINCIPLES
   ========================================================= */

/**
 * These principles define how the Concierge should
 * communicate commercial value.
 */
const VALUE_PRINCIPLES = Object.freeze({

    answerBeforeAdvancing:
        true,

    valueBeforePrice:
        true,

    relevanceBeforeQualification:
        true,

    customerBenefitBeforeCompanyPromotion:
        true,

    personalizedValue:
        true,

    professionalReassurance:
        true,

    noPressureSelling:
        true,

    noUnsupportedComparison:
        true,

    noCheapestClaim:
        true,

    noLowestPriceClaim:
        true,

    noBestClaimWithoutEvidence:
        true,

    noInventedBenefits:
        true,

    noInventedScope:
        true,

    noInventedPrice:
        true,

    noInventedAvailability:
        true,

    naturalCommercialProgression:
        true
});


/* =========================================================
   VALUE FRAME
   ========================================================= */

/**
 * Provides a structured commercial frame for the language
 * layer.
 *
 * It tells the language layer HOW to communicate value
 * without inventing facts.
 */
function buildValueFrame(
    {
        leadProfile = {},
        understanding = {},
        action = ""
    } = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    const service =
        cleanValue(
            profile.serviceType
        );

    const currentMessage =
        cleanValue(
            understanding.currentMessage
        );


    return Object.freeze({

        service,

        customerMessage:
            currentMessage,

        principles:
            VALUE_PRINCIPLES,

        purpose:
            getCommercialPurpose(
                action
            ),

        valueSequence: Object.freeze([

            "ANSWER_CUSTOMER_NEED",

            "CONNECT_RESPONSE_TO_CUSTOMER_CONTEXT",

            "EXPLAIN_RELEVANT_VALUE",

            "ADVANCE_CONVERSATION",

            "ASK_ONE_USEFUL_QUESTION"
        ])
    });
}


/* =========================================================
   PRICE HANDLING
   ========================================================= */

/**
 * Price questions must be answered directly.
 *
 * The Brain never calculates or invents a price here.
 */
function buildPriceResponseStrategy(
    {
        leadProfile = {}
    } = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    return Object.freeze({

        action:
            COMMERCIAL_ACTIONS.ANSWER_PRICE,

        directAnswerRequired:
            true,

        valueBeforePrice:
            true,

        personalizedQuotePreferred:
            true,

        neverInventPrice:
            true,

        neverInventRange:
            true,

        neverClaimCheapest:
            true,

        neverClaimLowest:
            true,

        explainPersonalization:
            true,

        service:
            profile.serviceType
    });
}


/* =========================================================
   AVAILABILITY HANDLING
   ========================================================= */

/**
 * Availability must never be invented.
 *
 * If real availability is available through the appropriate
 * system, the integration layer can provide it.
 *
 * Otherwise the Concierge must communicate that verification
 * is required.
 */
function buildAvailabilityResponseStrategy(
    {
        leadProfile = {}
    } = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    return Object.freeze({

        action:
            COMMERCIAL_ACTIONS.ANSWER_AVAILABILITY,

        directAnswerRequired:
            true,

        neverInventAvailability:
            true,

        neverInventSchedule:
            true,

        verificationRequiredWhenUnknown:
            true,

        service:
            profile.serviceType
    });
}


/* =========================================================
   SERVICE INFORMATION HANDLING
   ========================================================= */

/**
 * Service questions should be answered from verified
 * company knowledge.
 */
function buildServiceInformationStrategy(
    {
        leadProfile = {}
    } = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    return Object.freeze({

        action:
            COMMERCIAL_ACTIONS.ANSWER_SERVICE_INFORMATION,

        answerDirectly:
            true,

        useVerifiedKnowledge:
            true,

        connectToCustomerNeed:
            true,

        explainRelevantValue:
            true,

        avoidGenericCompanyPitch:
            true,

        service:
            profile.serviceType
    });
}


/* =========================================================
   QUESTION PURPOSE
   ========================================================= */

/**
 * Every question must have a reason.
 *
 * This structure allows later stages to generate the
 * appropriate natural-language question without creating
 * a questionnaire.
 */
function buildQuestionPurpose(
    {
        action = "",
        leadProfile = {}
    } = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );


    switch (action) {

        case "IDENTIFY_CUSTOMER":

            return Object.freeze({

                objective:
                    "Identify the customer.",

                expectedResult:
                    "clientName",

                whyItMatters:
                    "Allows personalized communication and correct request identification.",

                oneQuestionOnly:
                    true
            });


        case "UNDERSTAND_NEED":

            return Object.freeze({

                objective:
                    "Understand the customer's primary need.",

                expectedResult:
                    "serviceNeed",

                whyItMatters:
                    "Ensures North Crescent addresses the actual reason for contact.",

                oneQuestionOnly:
                    true
            });


        case "RESOLVE_SERVICE":

            return Object.freeze({

                objective:
                    "Clarify or confirm the requested service.",

                expectedResult:
                    "serviceType",

                whyItMatters:
                    "Prevents the Concierge from qualifying the customer for the wrong service.",

                oneQuestionOnly:
                    true
            });


      case "UNDERSTAND_PROPERTY":

    return Object.freeze({

        objective:
            "Understand the property at a useful level using information " +
            "already provided by the customer.",

        expectedResult:
            "propertyContext",

        whyItMatters:
            "Prevents a generic service recommendation or quote.",

        rules:
            [
                "Use all property information already provided before asking anything.",
                "Do not ask the customer to confirm information that is already clear from the conversation.",
                "Do not ask whether the service covers the entire property when the customer has clearly requested service for the property as a whole.",
                "Only ask about partial or specific areas when the customer indicates that the service may not cover the entire property.",
                "Do not ask scope-confirmation questions simply because the property address has been provided.",
                "If the property type, service type, size and relevant characteristics are already sufficiently understood, move forward without another property question."
            ],

        oneQuestionOnly:
            true
    });

case "RELEVANT_DISCOVERY":

    return Object.freeze({

        objective:
            "Collect one final relevant operational detail that can help " +
            "North Crescent align the service with the property's actual needs, " +
            "then guide the customer toward continuing with the personalized quote.",

        expectedResult:
            "serviceRelevantDetail",

        whyItMatters:
            "Allows the service to be aligned with the property's actual needs " +
            "without turning the conversation into a questionnaire.",

        service:
            profile.serviceType,

        nextStep:
            "PERSONALIZED_QUOTE",

        oneQuestionOnly:
            true
    });


     case "CONFIRM_EMAIL":

    return Object.freeze({

        objective:
            "Ask the customer to provide their email address again " +
            "for a second verification before the personalized quotation " +
            "is prepared and sent. Never display, repeat, reveal, suggest, " +
            "or complete the email address already stored. The customer " +
            "must type the email address themselves.",

        expectedResult:
            "confirmedEmailAddress",

        whyItMatters:
            "Ensures the customer personally provides the exact email " +
            "address that should receive the quotation. A simple yes, " +
            "no, or other confirmation without an email address does not " +
            "confirm the email.",

        oneQuestionOnly:
            true
    });


        case "REQUEST_PHONE":

            return Object.freeze({

                objective:
                    "Obtain the customer's preferred phone number.",

                expectedResult:
                    "phoneNumber",

                whyItMatters:
                    "Provides an additional reliable communication path for follow-up.",

                oneQuestionOnly:
                    true
            });


        case "REQUEST_SERVICE_DATE":

            return Object.freeze({

                objective:
                    "Understand when the customer wants the service.",

                expectedResult:
                    "serviceDate",

                whyItMatters:
                    "Allows the request to reflect the customer's timing needs.",

                oneQuestionOnly:
                    true
            });


        case "IDENTIFY_PRIORITIES":

            return Object.freeze({

                objective:
                    "Identify what matters most to the customer.",

                expectedResult:
                    "customerPriorities",

                whyItMatters:
                    "Allows the team to focus attention where the customer values it most.",

                oneQuestionOnly:
                    true
            });


        case "FINAL_DETAIL_CHECK":

            return Object.freeze({

                objective:
                    "Determine whether any relevant detail remains.",

                expectedResult:
                    "finalDetailStatus",

                whyItMatters:
                    "Prevents important information from being missed before finalization.",

                oneQuestionOnly:
                    true
            });


        case "FINAL_QUESTION_CHECK":

            return Object.freeze({

                objective:
                    "Resolve remaining customer questions.",

                expectedResult:
                    "questionStatus",

                whyItMatters:
                    "Ensures the customer can confirm the request with clarity.",

                oneQuestionOnly:
                    true
            });


        case "REQUEST_EXPLICIT_CONFIRMATION":

            return Object.freeze({

                objective:
                    "Obtain explicit confirmation of the complete summary.",

                expectedResult:
                    "explicitConfirmation",

                whyItMatters:
                    "Prevents the quote request from being processed on assumptions.",

                oneQuestionOnly:
                    true
            });


        case "FINAL_SERVICE_CHECK":

            return Object.freeze({

                objective:
                    "Determine whether the customer needs additional assistance.",

                expectedResult:
                    "additionalHelpStatus",

                whyItMatters:
                    "Provides a final service-oriented opportunity before closing.",

                oneQuestionOnly:
                    true
            });


        default:

            return Object.freeze({

                objective:
                    "",

                expectedResult:
                    "",

                whyItMatters:
                    "",

                oneQuestionOnly:
                    true
            });
    }
}


/* =========================================================
   ANSWER → VALUE → ADVANCE
   ========================================================= */

/**
 * Defines the communication sequence after the customer
 * asks a question.
 */
function buildAnswerAdvanceStrategy(
    {
        action = "",
        leadProfile = {},
        understanding = {}
    } = {}
) {

    const valueFrame =
        buildValueFrame({
            leadProfile,
            understanding,
            action
        });


    return Object.freeze({

        action,

        sequence: Object.freeze([

            "RECOGNIZE",

            "ACKNOWLEDGE",

            "ANSWER",

            "VALUE",

            "EXPLAIN_WHY",

            "ADVANCE",

            "ASK"
        ]),

        valueFrame,

        oneQuestionOnly:
            true,

        returnToCurrentStage:
            true
    });
}


/* =========================================================
   COMMERCIAL DECISION
   ========================================================= */

/**
 * Converts a progression action into a commercial
 * communication strategy.
 */
export function buildCommercialStrategy(
    {
        action = "",
        leadProfile = {},
        understanding = {},
        journey = {}
    } = {}
) {

    if (
        action ===
        "ANSWER_PRICE_QUESTION"
    ) {

        return Object.freeze({

            type:
                "ANSWER_AND_ADVANCE",

            strategy:
                buildPriceResponseStrategy({
                    leadProfile
                }),

            communication:
                buildAnswerAdvanceStrategy({
                    action,
                    leadProfile,
                    understanding
                })
        });
    }


    if (
        action ===
        "ANSWER_AVAILABILITY_QUESTION"
    ) {

        return Object.freeze({

            type:
                "ANSWER_AND_ADVANCE",

            strategy:
                buildAvailabilityResponseStrategy({
                    leadProfile
                }),

            communication:
                buildAnswerAdvanceStrategy({
                    action,
                    leadProfile,
                    understanding
                })
        });
    }


    if (
        action ===
        "ANSWER_CUSTOMER_QUESTION"
    ) {

        return Object.freeze({

            type:
                "ANSWER_AND_ADVANCE",

            strategy:
                buildValueFrame({
                    leadProfile,
                    understanding,
                    action
                }),

            communication:
                buildAnswerAdvanceStrategy({
                    action,
                    leadProfile,
                    understanding
                })
        });
    }


    if (
        action ===
        "ANSWER_SERVICE_INFORMATION"
    ) {

        return Object.freeze({

            type:
                "ANSWER_AND_ADVANCE",

            strategy:
                buildServiceInformationStrategy({
                    leadProfile
                }),

            communication:
                buildAnswerAdvanceStrategy({
                    action,
                    leadProfile,
                    understanding
                })
        });
    }


    if (
        action ===
        "HANDLE_CORRECTION"
    ) {

        return Object.freeze({

            type:
                "HANDLE_CORRECTION",

            strategy: Object.freeze({

                acknowledgeCorrection:
                    true,

                updateCustomerInformation:
                    true,

                preserveCorrectedValue:
                    true,

                rebuildConversationContext:
                    true,

                recalculateProgression:
                    true,

                doNotRepeatResolvedInformation:
                    true
            })
        });
    }


    if (
        action ===
        "START_NEW_REQUEST"
    ) {

        return Object.freeze({

            type:
                "HANDLE_NEW_REQUEST",

            strategy: Object.freeze({

                acknowledgeNewRequest:
                    true,

                preserveCustomerIdentity:
                    true,

                separateNewRequestFromPreviousRequest:
                    true,

                restartOnlyRelevantQualification:
                    true,

                doNotDuplicateCustomerContactQuestions:
                    true
            })
        });
    }


    if (
        action ===
        "PREPARE_FINAL_SUMMARY"
    ) {

        return Object.freeze({

            type:
                "PREPARE_SUMMARY",

            strategy: Object.freeze({

                useCurrentCustomerInformation:
                    true,

                includeRelevantServiceDetails:
                    true,

                includeConfirmedContact:
                    true,

                includeServiceDateWhenKnown:
                    true,

                includeCustomerPrioritiesWhenKnown:
                    true,

                doNotInventMissingInformation:
                    true,

                requestExplicitConfirmation:
                    true
            })
        });
    }


    if (
        action ===
        "PROCESS_CONFIRMED_REQUEST"
    ) {

        return Object.freeze({

            type:
                "PROCESS_CONFIRMED_REQUEST",

            strategy: Object.freeze({

                acknowledgeConfirmation:
                    true,

                thankCustomer:
                    true,

                communicateProcessing:
                    true,

                doNotRestartQualification:
                    true,

                doNotRepeatContactQuestions:
                    true,

                proceedToFinalServiceCheck:
                    true
            })
        });
    }


    if (
        action ===
        "CLOSE_CONVERSATION"
    ) {

        return Object.freeze({

            type:
                "CLOSE",

            strategy: Object.freeze({

                warmClosing:
                    true,

                professionalClosing:
                    true,

                noAdditionalQualification:
                    true
            })
        });
    }


    /*
     * Normal progression.
     *
     * Every question must have:
     *
     * - one objective
     * - one expected result
     * - one reason
     */

    return Object.freeze({

        type:
            "ASK_PROGRESSIVE_QUESTION",

        strategy:
            buildQuestionPurpose({
                action,
                leadProfile
            }),

        journey,

        communication: Object.freeze({

            acknowledgeBeforeQuestion:
                true,

            oneQuestionOnly:
                true,

            explainRelevantPurpose:
                true,

            avoidQuestionnaire:
                true,

            avoidRepeatedQuestions:
                true,

            preserveCustomerContext:
                true
        })
    });
}


/* =========================================================
   COMMERCIAL ADN
   ========================================================= */

/**
 * Public ADN definition for the language layer.
 */
export const COMMERCIAL_ADN =
    Object.freeze({

        sequence: Object.freeze([

            "RECOGNIZE",

            "ACKNOWLEDGE",

            "ANSWER",

            "VALUE",

            "EXPLAIN_WHY",

            "ADVANCE",

            "ASK"
        ]),

        rules: Object.freeze({

            oneQuestionAtATime:
                true,

            oneQuestionOneObjective:
                true,

            answerBeforeAdvancing:
                true,

            valueBeforePrice:
                true,

            acknowledgeBeforeQuestion:
                true,

            explainRelevantPurpose:
                true,

            useCustomerContext:
                true,

            preserveKnownInformation:
                true,

            neverRepeatResolvedQuestions:
                true,

            noQuestionnaire:
                true,

            noPressure:
                true,

            noInventedInformation:
                true,

            naturalCommercialProgression:
                true,

            answerCustomerNeedFirst:
                true
        })
    });
/* =========================================================
   SECTION 6 — FINALIZATION + OUTPUT
   ========================================================= */

/**
 * Purpose:
 *
 * Finalize the complete Concierge Brain.
 *
 * This section:
 *
 * - combines all Brain sections
 * - prepares the final conversational state
 * - handles final summary
 * - handles explicit confirmation
 * - handles post-confirmation processing
 * - handles final service check
 * - handles closing
 * - exposes the final Brain API
 *
 * Core ADN:
 *
 * RECOGNIZE
 * → ACKNOWLEDGE
 * → ANSWER
 * → VALUE
 * → EXPLAIN WHY
 * → ADVANCE
 * → ASK
 *
 * No second routing system is created here.
 *
 * The Brain remains the single conversational coordinator.
 */


/* =========================================================
   FINAL SUMMARY
   ========================================================= */

/**
 * Builds the factual information that the language layer
 * may use when preparing the final customer summary.
 *
 * No customer information is invented here.
 */
function buildFinalSummaryData(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    return Object.freeze({

        clientName:
            profile.clientName,

        companyName:
            profile.companyName,

        serviceType:
            profile.serviceType,

        serviceAddress:
            profile.serviceAddress,

        city:
            profile.city,

        phoneNumber:
            profile.phoneNumber,

        emailAddress:
            profile.emailAddress,

        squareFootage:
            profile.squareFootage,

        operationalSummary:
            profile.operationalSummary,

        visitsPerMonth:
            profile.visitsPerMonth,

        recurringVisits:
            profile.recurringVisits,

        timeSlot:
            profile.timeSlot,

        accessInstructions:
            profile.accessInstructions,

        sensitiveAreas:
            profile.sensitiveAreas
    });
}


/* =========================================================
   FINAL CONFIRMATION
   ========================================================= */

/**
 * Final confirmation is an event, not persistent state.
 *
 * It becomes true only for the current customer response
 * when:
 *
 * - the customer explicitly confirms
 * - the previous assistant response requested confirmation
 * - essential information is complete
 */
function evaluateCurrentConfirmation(
    {
        understanding = {},
        leadProfile = {},
        conversationHistory = []
    } = {}
) {

    if (
        !understanding.isConfirmation
    ) {
        return false;
    }

    const quoteReadiness =
        getQuoteReadiness(
            leadProfile
        );

    if (
        !quoteReadiness.ready
    ) {
        return false;
    }

    const lastAssistantMessage =
        [...conversationHistory]
            .reverse()
            .find(
                message =>
                    message?.role === "assistant"
            );

    const assistantText =
        cleanValue(
            lastAssistantMessage?.content
        );

    if (
        !assistantText
    ) {
        return false;
    }

    return Boolean(
        /¿Está toda esta información correcta\?/i.test(
            assistantText
        )
    );
}


/* =========================================================
   PROCESSING MESSAGE
   ========================================================= */

/**
 * The language layer must use this exact communication
 * purpose after explicit confirmation.
 *
 * The actual final wording is intentionally provided here
 * as the official North Crescent protocol.
 */
function getProcessingMessageContext(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    const name =
        profile.clientName ||
        "there";

    return Object.freeze({

        clientName:
            name,

        message:
    `Perfect, ${name}. Thank you very much for the information and for confirming all the details. Our team is now working on your personalized quotation, and we will send it to your email within the next hour.`,
        nextStep:
            "FINAL_SERVICE_CHECK"
    });
}


/* =========================================================
   FINAL SERVICE CHECK
   ========================================================= */

/**
 * After processing, the Concierge gives the customer
 * one final opportunity to request additional assistance.
 */
function getFinalServiceCheckContext(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    const name =
        profile.clientName ||
        "there";

    return Object.freeze({

        clientName:
            name,

        question:
            `Y antes de dejarlo por ahora, ${name}, ¿hay algo más en lo cual le pueda ayudar?`,

        nextStage:
            "CLOSE"
    });
}


/* =========================================================
   CLOSING
   ========================================================= */

/**
 * Official North Crescent closing protocol.
 */
function getClosingContext(
    leadProfile = {}
) {

    const profile =
        normalizeLeadProfile(
            leadProfile
        );

    const name =
        profile.clientName ||
        "there";

    return Object.freeze({

        clientName:
            name,

        message:
            `Perfecto, ${name}. Ha sido un placer ayudarle. Gracias por considerar a North Crescent Facility Solutions. Nos encargaremos de acompañar su solicitud con el profesionalismo, cuidado y atención que buscamos brindar en cada servicio. Que tenga un excelente día.`
    });
}


/* =========================================================
   FINAL ACTION CONTEXT
   ========================================================= */

/**
 * Converts the progression action into the final
 * communication context available to the language layer.
 */
function buildFinalActionContext(
    {
        action = "",
        leadProfile = {},
        understanding = {},
        journey = {},
        progression = {},
        conversationHistory = []
    } = {}
) {

    const commercial =
        buildCommercialStrategy({
            action,
            leadProfile,
            understanding,
            journey
        });


    switch (action) {
case "PREPARE_FINAL_SUMMARY":

    return Object.freeze({

        action,

        type:
            "FINAL_SUMMARY",

        summary:
            buildFinalSummaryData(
                leadProfile
            ),

        communication:
            {
                instruction:
                    "Present the complete factual summary and ask for explicit confirmation.",

                confirmationQuestion:
                    "¿Está toda esta información correcta?"
            },

        commercial,

        nextAction:
            "REQUEST_EXPLICIT_CONFIRMATION"
    });
          case "REQUEST_EXPLICIT_CONFIRMATION":

    return Object.freeze({

        action,

        type:
            "EXPLICIT_CONFIRMATION",

        communication:
            {
                question:
                    "¿Está toda esta información correcta?"
            },

        commercial,

        nextAction:
            "PROCESS_CONFIRMED_REQUEST"
    });


        case "PROCESS_CONFIRMED_REQUEST":

            return Object.freeze({

                action,

                type:
                    "PROCESSING",

                confirmation:
                    evaluateCurrentConfirmation({
                        currentMessage:
                            understanding.currentMessage,

                        conversationHistory,

                        leadProfile
                    }),

                communication:
                    getProcessingMessageContext(
                        leadProfile
                    ),

                commercial,

                nextAction:
                    "FINAL_SERVICE_CHECK"
            });


        case "FINAL_SERVICE_CHECK":

            return Object.freeze({

                action,

                type:
                    "FINAL_SERVICE_CHECK",

                communication:
                    getFinalServiceCheckContext(
                        leadProfile
                    ),

                commercial,

                nextAction:
                    "CLOSE_CONVERSATION"
            });


        case "CLOSE_CONVERSATION":

            return Object.freeze({

                action,

                type:
                    "CLOSE",

      communication:
    {
        message:
            "Thank you for trusting North Crescent Facility Solutions. " +
            "We sincerely appreciate the opportunity to assist you. " +
            "Our team will stay in contact and take care of the next steps " +
            "with professionalism, care, and attention to detail. " +
            "If you need anything else, please do not hesitate to contact us. " +
            "We are here to support you and make the process simple and stress-free. " +
            "Thank you again for choosing North Crescent Facility Solutions. " +
            "We take care of your spaces, so you can focus on your success."
    },

                commercial,

                nextAction:
                    null
            });


        default:

            return Object.freeze({

                action,

                type:
                    "CONVERSATIONAL_PROGRESS",

                commercial,

                progression
            });
    }
}


/* =========================================================
   COMPLETE BRAIN ANALYSIS
   ========================================================= */

/**
 * Combines:
 *
 * Section 1 — Foundation
 * Section 2 — Understanding
 * Section 3 — Sales Journey
 * Section 4 — Progression
 * Section 5 — Commercial ADN
 * Section 6 — Finalization
 */
export function analyzeConciergeConversation(
    {
        currentMessage = "",
        conversationHistory = [],
        leadProfile = {},
        serviceContext = ""
    } = {}
) {

    /*
     * -----------------------------------------------------
     * FOUNDATION
     * -----------------------------------------------------
     */
const currentCustomerMessage =
    cleanValue(
        currentMessage
    );

const history =
    getMessages(
        conversationHistory
    );

const lastMessage =
    history.length > 0
        ? history[history.length - 1]
        : null;

const historyAlreadyContainsCurrentMessage =
    Boolean(
        currentCustomerMessage &&
        isObject(lastMessage) &&
        normalizeText(lastMessage.role) === "user" &&
        cleanValue(lastMessage.content) ===
            currentCustomerMessage
    );

const effectiveConversationHistory =
    historyAlreadyContainsCurrentMessage
        ? history
        : (
            currentCustomerMessage
                ? [
                    ...history,
                    {
                        role: "user",
                        content:
                            currentCustomerMessage
                    }
                ]
                : history
        );

const previousAssistantMessage =
    [...effectiveConversationHistory]
        .reverse()
        .find(
            message =>
                isObject(message) &&
                normalizeText(message.role) === "assistant"
        );

const extractedEmail =
    extractEmailAddress(
        currentCustomerMessage
    );

const assistantRequestedEmail =
    Boolean(
        previousAssistantMessage &&
        (
            normalizeText(
                previousAssistantMessage.content
            ).includes("email") ||
            normalizeText(
                previousAssistantMessage.content
            ).includes("correo") ||
            normalizeText(
                previousAssistantMessage.content
            ).includes("e-mail") ||
            normalizeText(
                previousAssistantMessage.content
            ).includes("courriel")
        )
    );

const correctedLeadProfile =
    (
        extractedEmail &&
        assistantRequestedEmail
    )
        ? applyCustomerCorrection(
            leadProfile,
            ["emailAddress"],
            {
                emailAddress:
                    extractedEmail
            }
        )
        : normalizeLeadProfile(
            leadProfile
        );

const foundation =
    buildFoundation({
        conversationHistory:
            effectiveConversationHistory,
        leadProfile:
            correctedLeadProfile
    });


    /*
     * -----------------------------------------------------
     * CONVERSATION UNDERSTANDING
     * -----------------------------------------------------
     */

    const understanding =
        understandCurrentMessage({

            currentMessage:
                currentMessage ||
                foundation.conversation.currentCustomerMessage,

            conversationHistory:
                foundation.conversation.messages
        });


    /*
     * -----------------------------------------------------
     * SALES JOURNEY
     * -----------------------------------------------------
     */

   const journey =
    buildSalesJourney({

        leadProfile:
            foundation.leadProfile,

        understanding,

        conversationHistory:
            foundation.conversation.messages
    });


    /*
     * -----------------------------------------------------
     * PROGRESSION
     * -----------------------------------------------------
 */

    const progression =
        buildProgressionContext({

            leadProfile:
                foundation.leadProfile,

            understanding,

            journey,

            conversationHistory:
                foundation.conversation.messages
        });


    /*
     * -----------------------------------------------------
     * COMMERCIAL STRATEGY
     * -----------------------------------------------------
 */

    const commercial =
        buildCommercialStrategy({

            action:
                progression.action,

            leadProfile:
                foundation.leadProfile,

            understanding,

            journey
        });


    /*
     * -----------------------------------------------------
     * FINAL ACTION
     * -----------------------------------------------------
 */

    const finalAction =
        buildFinalActionContext({

            action:
                progression.action,

            leadProfile:
                foundation.leadProfile,

            understanding,

            journey,

            progression,

            conversationHistory:
                foundation.conversation.messages
        });


    return Object.freeze({

        leadProfile:
            foundation.leadProfile,

        conversation:
            foundation.conversation,

        understanding,

        journey,

        progression,

        commercial,

        finalAction,

        serviceContext:
            cleanValue(
                serviceContext
            )
    });
}


/* =========================================================
   PUBLIC BRAIN ENTRY
   ========================================================= */

/**
 * Main Brain entry point.
 *
 * This replaces the old architecture where analysis,
 * discovery, and nextAction were fragmented across
 * multiple independent decisions.
 */
export function processConciergeRequest(
    input = {}
) {

    const analysis =
        analyzeConciergeConversation(
            input
        );


    const profile =
        normalizeLeadProfile(
            analysis.leadProfile
        );


    const quoteReadiness =
        getQuoteReadiness(
            profile
        );


    const quoteConfirmed =
    Boolean(
        analysis.finalAction
            ?.confirmation
    );


    return Object.freeze({

        /*
         * Customer memory
         */
        leadProfile:
            profile,


        /*
         * Current customer intent
         */
        intent:
            analysis.understanding.intent,


        /*
         * Current conversational stage
         */
        currentStage:
            analysis.journey.currentStage,


        /*
         * Next commercial action
         */
        nextAction:
            analysis.progression.action,


        /*
         * Missing quote information
         */
        missingFields:
            quoteReadiness.missingFields,


        /*
         * Quote readiness
         */
        quoteReady:
            quoteReadiness.ready,


        /*
         * Current confirmation event
         */
        quoteConfirmed,


        /*
         * Post-confirmation status.
         *
         * This is intentionally derived from the current
         * conversation context and does not create a
         * permanent confirmation state.
         */
      postConfirmation:
    quoteConfirmed,


        /*
         * Service area remains available to the integration
         * layer without creating another routing system.
         */
       serviceArea:
    profile.city || "",


        /*
         * Complete conversational context
         */
        conversation:
            analysis.conversation,


        understanding:
            analysis.understanding,


        journey:
            analysis.journey,


        progression:
            analysis.progression,


        commercial:
            analysis.commercial,


        finalAction:
            analysis.finalAction
    });
}


/* =========================================================
   FINAL PUBLIC API
   ========================================================= */

export default Object.freeze({

    /*
     * Foundation
     */
    normalizeLeadProfile,
    mergeLeadProfile,
    applyCustomerCorrection,
    getConversationContext,
    buildFoundation,


    /*
     * Conversation understanding
     */
    understandCurrentMessage,
    buildConversationUnderstanding,


    /*
     * Sales journey
     */
    resolveCompletedStage,
    buildSalesJourney,


    /*
     * Progression
     */
    determineProgressionAction,
    buildProgressionContext,


    /*
     * Commercial ADN
     */
    buildCommercialStrategy,
    COMMERCIAL_ADN,


    /*
     * Finalization
     */
    analyzeConciergeConversation,
    processConciergeRequest
});
