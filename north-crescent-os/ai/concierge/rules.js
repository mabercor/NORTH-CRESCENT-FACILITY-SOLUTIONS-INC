/**
 * NORTH CRESCENT OS
 * Concierge Brain Rules
 *
 * Stable conversation and decision rules.
 *
 * This file contains behavioral rules only.
 * Company knowledge belongs in knowledge.js.
 * Coordination belongs in brain.js.
 * Operational truth remains in operationalState.
 */

export const BRAIN_RULES = Object.freeze({

    // =========================================================
    // CORE
    // =========================================================

    core: Object.freeze({

        preserveKnownData: true,

        customerCorrectionWins: true,

        currentCustomerRequestWins: true,

        serviceContextIsBackgroundOnly: true,

        unknownValue: "",

        allowNull: false,

        allowUnknownString: false,

        allowNotProvidedString: false,

        inventInformation: false,

        exposeInternalSystems: false

    }),


    // =========================================================
    // INTENT
    // =========================================================

    intent: Object.freeze({

        types: Object.freeze([

            "QUOTE",

            "GENERAL_QUESTION",

            "SERVICE_INFORMATION",

            "PRICE_QUESTION",

            "AVAILABILITY_QUESTION",

            "CONFIRMATION",

            "CORRECTION",

            "POST_CONFIRMATION",

            "NEW_REQUEST"

        ]),

        analyzeFrom: Object.freeze([

            "currentMessage",

            "conversationHistory",

            "leadProfile",

            "serviceContext"

        ]),

        currentMessageHasPriority: true,

        contextMustBeConsidered: true,

        serviceContextCannotOverrideCustomer: true

    }),


    // =========================================================
    // MEMORY
    // =========================================================

    memory: Object.freeze({

        source: "leadProfile",

        preserveExistingValues: true,

        addNewCustomerFacts: true,

        replaceExplicitCorrections: true,

        replaceWithMorePreciseInformation: true,

        removeKnownDataWithoutCorrection: false,

        repeatKnownQuestions: false,

        missingValue: "",

        neverUseNull: true,

        neverUseUnknown: true,

        neverUseNotProvided: true

    }),


    // =========================================================
    // CONVERSATION
    // =========================================================

    conversation: Object.freeze({

        style: Object.freeze([

            "friendly",

            "warm",

            "professional",

            "helpful",

            "confident",

            "natural"

        ]),

        defaultResponseSentences: "1-3",

        oneQuestionAtATime: true,

        avoidQuestionnaire: true,

        avoidRoboticBehavior: true,

        acknowledgeBeforeNextQuestion: true,

        useCustomerNameWhenKnown: true,

        avoidRepeatedQuestions: true,

        avoidUnnecessaryQuestions: true,

        customerCanExplainInOwnWords: true

    }),


    // =========================================================
    // DISCOVERY
    // =========================================================

    discovery: Object.freeze({

        enabled: true,

        naturalOnly: true,

        questionnaireMode: false,

        oneQuestionAtATime: true,

        fixedQuestionOrder: false,

        numberedQuestions: false,

        optionalInformationBlocksQuote: false,

        minimumContextualQuestions: 2,

        minimumQuestionsCanBeSkipped: true,

        stopIfCustomerWantsToProceed: true,

        stopIfCustomerDoesNotWantMoreDiscovery: true,

        prioritizeRelevantContext: true,

        examplesByService: Object.freeze({

            residential: Object.freeze([
                "flooring",
                "bedrooms",
                "bathrooms",
                "approximateSize",
                "frequency",
                "pets",
                "specialAttentionAreas",
                "ecoFriendlyProducts"
            ]),

            postConstruction: Object.freeze([
                "propertyType",
                "approximateSize",
                "rooms",
                "flooring",
                "constructionDustOrDebris",
                "windowsOrGlass",
                "cabinetsOrFixtures",
                "detailedAttentionAreas",
                "otherContractors"
            ]),

            moveInMoveOut: Object.freeze([
                "propertySize",
                "bedrooms",
                "bathrooms",
                "flooring",
                "furnitureRemoved",
                "propertyCondition",
                "extraAttentionAreas",
                "moveContext"
            ]),

            deepCleaning: Object.freeze([
                "propertySize",
                "bedrooms",
                "bathrooms",
                "flooring",
                "buildup",
                "kitchenCondition",
                "bathroomsNeedingAttention",
                "pets",
                "cleaningHistory"
            ]),

            airbnb: Object.freeze([
                "propertySize",
                "bedrooms",
                "bathrooms",
                "turnoverFrequency",
                "guestReadyRequirements",
                "laundryOrLinen",
                "restocking",
                "specialGuestInstructions"
            ]),

            commercial: Object.freeze([
                "facilityType",
                "approximateSize",
                "roomsOrAreas",
                "occupancyOrTraffic",
                "cleaningFrequency",
                "preferredSchedule",
                "highTouchAreas",
                "specialOperationalRequirements"
            ]),

            janitorial: Object.freeze([
                "facilityType",
                "approximateSize",
                "cleaningFrequency",
                "operatingHours",
                "regularAttentionAreas",
                "washrooms",
                "commonAreas",
                "specialOperationalRequirements"
            ])

        })

    }),


    // =========================================================
    // CONTACT
    // =========================================================

    contact: Object.freeze({

        phone: Object.freeze({

            priority: true,

            requestNaturally: true,

            requestAtLeastOnce: true,

            requiredForQualification: false,

            repeatAfterExplicitConfirmation: false,

            optionalLanguage: false

        }),

        email: Object.freeze({

            priority: true,

            verifyBeforeFinalConfirmation: true,

            initialEmailCountsAsAvailable: true,

            initialEmailCountsAsConfirmed: false,

            repeatAfterExplicitConfirmation: false

        }),

        correction: Object.freeze({

            updateLeadProfile: true,

            preserveCorrection: true,

            requireNewConfirmation: true

        })

    }),


    // =========================================================
    // QUOTE
    // =========================================================

    quote: Object.freeze({

        essentialFields: Object.freeze([

            "clientName",

            "contact",

            "serviceAddress",

            "city",

            "serviceType",

            "operationalSummary"

        ]),

        contactRequirement: Object.freeze([

            "emailAddress",

            "phoneNumber"

        ]),

        contactRequiresOneOf: true,

        optionalFieldsNeverBlockQuote: true,

        stopQualificationWhenEssentialsComplete: true,

        finalSummaryRequired: true,

        explicitConfirmationRequired: true,

        priceQuestionIsNotConfirmation: true,

        availabilityQuestionIsNotConfirmation: true,

        timingQuestionIsNotConfirmation: true,

        partialAgreementIsNotConfirmation: true,

        quoteConfirmedIsEvent: true,

        quoteConfirmedIsPersistentState: false

    }),


    // =========================================================
    // CONFIRMATION
    // =========================================================

    confirmation: Object.freeze({

        requiresFinalSummary: true,

        requiresExplicitCustomerConfirmation: true,

        requiresContactConfirmation: true,

        validMessages: Object.freeze([

            "yes",

            "yes everything is correct",

            "correct",

            "that's right",

            "looks good",

            "confirmed",

            "sí",

            "sí confirmo",

            "todo está correcto",

            "está bien"

        ]),

        previousConfirmationDoesNotPersist: true,

        correctionReturnsToConfirmation: true,

        questionDoesNotEqualConfirmation: true

    }),


    // =========================================================
    // POST-CONFIRMATION
    // =========================================================

    postConfirmation: Object.freeze({

        quoteConfirmedForPreviousMessage: false,

        newQuoteSubmission: false,

        createDuplicateLead: false,

        createDuplicateClient: false,

        restartQualification: false,

        repeatContactQuestions: false,

        preserveConfirmedProfile: true,

        answerFollowUpQuestions: true,

        allowNewRequest: true

    }),


    // =========================================================
    // SALES
    // =========================================================

    sales: Object.freeze({

        naturalSales: true,

        valueBeforePrice: true,

        pressureSelling: false,

        unsupportedComparisons: false,

        cheapestClaim: false,

        bestClaimWithoutEvidence: false,

        explainRelevantServiceValue: true,

        explainCustomerBenefit: true,

        reassureCustomer: true,

        tailorConversationToService: true,

        sellThroughRelevance: true,

        neverInventServiceBenefits: true

    }),


    // =========================================================
    // GENERAL QUESTIONS
    // =========================================================

    generalQuestions: Object.freeze({

        answerDirectly: true,

        automaticallyStartQuote: false,

        automaticallyCollectLead: false,

        useVerifiedKnowledge: true,

        inventCompanyInformation: false,

        missingCompanyInformationRequiresVerification: true

    }),


    // =========================================================
    // SAFETY
    // =========================================================

    safety: Object.freeze({

        neverInventPrice: true,

        neverInventAvailability: true,

        neverInventSchedule: true,

        neverInventMeasurements: true,

        neverInventServiceScope: true,

        neverInventPropertyConditions: true,

        neverInventOperationalRequirements: true,

        neverInventInsuranceDetails: true,

        neverInventCertificationDetails: true,

        neverInventLicenseDetails: true,

        neverInventPolicies: true,

        neverExposeInternalArchitecture: true,

        neverExposeInternalFields: true,

        neverExposeAutomationDetails: true

    }),


    // =========================================================
    // OUTPUT
    // =========================================================

    output: Object.freeze({

        replyRequired: true,

        leadProfileRequired: true,

        completeLeadProfileRequired: true,

        unknownFieldsMustBeEmptyString: true,

        nullAllowed: false,

        explanatoryTextOutsideSchema: false

    })

});


export default BRAIN_RULES;
