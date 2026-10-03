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
 * - pricing
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
    return value !== null && typeof value === "object" && !Array.isArray(value);
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
   MEMORY
   ========================================================= */

/**
 * Preserve known information while allowing explicit
 * customer corrections and more precise information.
 */
export function mergeLeadProfile(
    existingProfile = {},
    incomingProfile = {}
) {

    const existing = normalizeLeadProfile(existingProfile);
    const incoming = normalizeLeadProfile(incomingProfile);

    const merged = {};

    for (const field of Object.keys(existing)) {

        const oldValue = existing[field];
        const newValue = incoming[field];

        if (newValue !== "") {
            merged[field] = newValue;
        } else {
            merged[field] = oldValue;
        }
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

    const normalizedCity = cleanValue(city).toLowerCase();

    if (!normalizedCity) {
        return {
            known: false,
            city: "",
            region: CONCIERGE_KNOWLEDGE.serviceAreas.region
        };
    }

    const cities = CONCIERGE_KNOWLEDGE.serviceAreas.primary;

    const matchedCity = cities.find(
        item => item.toLowerCase() === normalizedCity
    );

    return {
        known: Boolean(matchedCity),
        city: matchedCity || city,
        region: CONCIERGE_KNOWLEDGE.serviceAreas.region
    };
}


/* =========================================================
   INTENT
   ========================================================= */

/**
 * Basic deterministic intent signals.
 *
 * This is intentionally lightweight.
 * Natural-language reasoning remains with the AI layer.
 */
export function detectIntent(message = "") {

    const text = cleanValue(message).toLowerCase();

    if (!text) {
        return "GENERAL_QUESTION";
    }

    if (
        /\b(correct|confirmed|confirm|yes|that's right|looks good|sí|si confirmo|todo está correcto|está bien)\b/i.test(text)
    ) {
        return "CONFIRMATION";
    }

    if (
        /\b(price|pricing|cost|costs|quote|quotation|estimate|how much|precio|precios|cuánto|cuanto|cotización|cotizacion)\b/i.test(text)
    ) {
        return "PRICE_QUESTION";
    }

    if (
        /\b(available|availability|available date|when can|schedule|appointment|disponible|disponibilidad|fecha|cuándo|cuando)\b/i.test(text)
    ) {
        return "AVAILABILITY_QUESTION";
    }

    if (
        /\b(book|booking|hire|need cleaning|i need|looking for|want cleaning|reservar|contratar|necesito limpieza|quiero limpieza)\b/i.test(text)
    ) {
        return "QUOTE";
    }

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
   BRAIN ANALYSIS
   ========================================================= */

/**
 * Creates a deterministic analysis object.
 *
 * The brain does not generate the final customer response.
 * It prepares the structured context that the language layer
 * can use safely.
 */
export function analyzeRequest({
    currentMessage = "",
    conversationHistory = [],
    leadProfile = {},
    serviceContext = ""
} = {}) {

    const profile = normalizeLeadProfile(leadProfile);

    const intent = detectIntent(currentMessage);

    const missingFields = getMissingEssentialFields(profile);

    const serviceArea = findServiceArea(profile.city);

    const quoteReady = missingFields.length === 0;

    return Object.freeze({

        intent,

        currentMessage: cleanValue(currentMessage),

        conversationHistory: Array.isArray(conversationHistory)
            ? conversationHistory
            : [],

        leadProfile: profile,

        serviceContext: cleanValue(serviceContext),

        missingFields,

        quoteReady,

        serviceArea,

        rules: BRAIN_RULES,

        knowledge: CONCIERGE_KNOWLEDGE
    });
}


/* =========================================================
   NEXT ACTION
   ========================================================= */

export function determineNextAction(analysis = {}) {

    const intent = analysis.intent;
    const quoteReady = Boolean(analysis.quoteReady);

    if (intent === "PRICE_QUESTION") {
        return "USE_PRICING_ENGINE";
    }

    if (intent === "AVAILABILITY_QUESTION") {
        return "CHECK_AVAILABILITY";
    }

    if (intent === "GENERAL_QUESTION") {
        return "ANSWER_FROM_KNOWLEDGE";
    }

    if (intent === "SERVICE_INFORMATION") {
        return "ANSWER_FROM_KNOWLEDGE";
    }

    if (intent === "CONFIRMATION" && quoteReady) {
        return "PROCESS_CONFIRMATION";
    }

    if (intent === "CORRECTION") {
        return "UPDATE_PROFILE_AND_RECONFIRM";
    }

    if (intent === "POST_CONFIRMATION") {
        return "ANSWER_FOLLOW_UP";
    }

    if (intent === "NEW_REQUEST") {
        return "START_NEW_REQUEST";
    }

    if (intent === "QUOTE") {

        if (quoteReady) {
            return "PREPARE_FINAL_CONFIRMATION";
        }

        return "CONTINUE_QUALIFICATION";
    }

    return "CONTINUE_CONVERSATION";
}


/* =========================================================
   MAIN BRAIN ENTRY
   ========================================================= */

/**
 * Main entry point for the Concierge Brain.
 *
 * External systems can later call:
 *
 *   processConciergeRequest(...)
 *
 * The function returns structured intelligence.
 *
 * It does not call OpenAI, Make, Airtable, or pricing-engine
 * yet. Those integrations will be connected later.
 */
export function processConciergeRequest(input = {}) {

    const analysis = analyzeRequest(input);

    const nextAction = determineNextAction(analysis);

    return Object.freeze({

        ...analysis,

        nextAction
    });
}


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
