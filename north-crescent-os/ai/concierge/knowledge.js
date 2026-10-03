/**
 * NORTH CRESCENT OS
 * Concierge Knowledge
 *
 * Controlled company knowledge.
 *
 * This file contains company facts, service information,
 * brand positioning, trust information, and official links.
 *
 * Pricing does NOT belong here.
 * Pricing remains exclusively in pricing-engine.js.
 */

export const CONCIERGE_KNOWLEDGE = Object.freeze({

    company: Object.freeze({
        name: "North Crescent Facility Solutions Inc.",
        website: "https://northcrescentcleaning.com",
        phone: "+1 (428) 888-0542",
        email: "info@northcrescentcleaning.com"
    }),

    brand: Object.freeze({
        positioning: "LESS MONEY. BETTER QUALITY. PROFESSIONAL SERVICE.",
        philosophy: [
            "Professional service",
            "Reliable service",
            "Attention to detail",
            "Responsibility",
            "Trust",
            "Professionalism",
            "Commitment"
        ],
        valueMessage:
            "North Crescent focuses on strong value, professional standards, and reliable service without compromising quality."
    }),

    professionalStandards: Object.freeze({
        insured: true,

        certificationsAndStandards: Object.freeze([
            "WHMIS",
            "IPAC",
            "Bloodborne Certified"
        ]),

        staff: "Trained & Qualified Staff",

        equipment: "Professional Equipment",

        commitment: "Genuine Care & Commitment"
    }),

    servicePhilosophy: Object.freeze({
        approach:
            "Services are tailored to the customer's property, cleaning requirements, and operational needs.",

        customerExperience:
            "The goal is to provide a professional, reliable, and straightforward service experience.",

        salesApproach:
            "Explain relevant value and service benefits naturally without pressure."
    }),

    services: Object.freeze({

        residential: Object.freeze({
            name: "Residential Cleaning",
            description:
                "Professional cleaning services for residential properties."
        }),

        commercial: Object.freeze({
            name: "Commercial Cleaning",
            description:
                "Professional cleaning services for commercial spaces and businesses."
        }),

        office: Object.freeze({
            name: "Office Cleaning",
            description:
                "Professional cleaning services for office environments."
        }),

        deepCleaning: Object.freeze({
            name: "Deep Cleaning",
            description:
                "Detailed cleaning focused on areas requiring additional attention."
        }),

        postConstruction: Object.freeze({
            name: "Post-Construction Cleaning",
            description:
                "Cleaning support for properties following construction or renovation work."
        }),

        janitorial: Object.freeze({
            name: "Janitorial Cleaning",
            description:
                "Ongoing professional cleaning and janitorial support."
        }),

        airbnb: Object.freeze({
            name: "Airbnb Cleaning",
            description:
                "Professional turnover cleaning and property preparation for short-term rental properties."
        }),

        moveInMoveOut: Object.freeze({
            name: "Move-In / Move-Out Cleaning",
            description:
                "Detailed cleaning support for properties during move-in or move-out."
        })
    }),

    serviceAreas: Object.freeze({

        primary: Object.freeze([
            "Moncton",
            "Dieppe",
            "Riverview",
            "Shediac",
            "Salisbury",
            "Memramcook"
        ]),

        region:
            "Greater Moncton and Southeast New Brunswick",

        nearbyCommunities:
            "Nearby communities may also be considered depending on the service request."
    }),

    insurance: Object.freeze({
        insured: true,

        customerMessage:
            "North Crescent Facility Solutions Inc. is insured and takes professionalism and responsibility seriously.",

        limitations:
            "Do not provide policy numbers, insurance providers, coverage limits, coverage types, or expiry dates unless explicitly available in verified company information."
    }),

    trust: Object.freeze({
        message:
            "North Crescent combines trained and qualified staff, professional equipment, insurance, and professional service standards.",

        principles: Object.freeze([
            "Professionalism",
            "Responsibility",
            "Reliability",
            "Attention to detail",
            "Genuine care"
        ])
    }),

    contact: Object.freeze({
        website: "https://northcrescentcleaning.com",
        email: "info@northcrescentcleaning.com",
        phone: "+1 (428) 888-0542"
    }),

    social: Object.freeze({
        linkedin:
            "https://www.linkedin.com/company/north-crescent-facility-solutions-inc/",

        instagram:
            "https://www.instagram.com/northcrescentcleaning/",

        facebook:
            "https://www.facebook.com/profile.php?id=61590535282882"
    }),

    officialWebsite: Object.freeze({

        english: Object.freeze({
            home: "https://northcrescentcleaning.com/",
            services: "https://northcrescentcleaning.com/services.html",
            process: "https://northcrescentcleaning.com/process.html",
            reviews: "https://northcrescentcleaning.com/reviews.html",
            work: "https://northcrescentcleaning.com/work.html",
            gallery: "https://northcrescentcleaning.com/gallery.html",
            contact: "https://northcrescentcleaning.com/contact.html",

            commercialCleaning:
                "https://northcrescentcleaning.com/commercial-cleaning-moncton.html",

            residentialCleaning:
                "https://northcrescentcleaning.com/residential-cleaning-moncton.html",

            officeCleaning:
                "https://northcrescentcleaning.com/office-cleaning-moncton.html",

            deepCleaning:
                "https://northcrescentcleaning.com/deep-cleaning-moncton.html",

            postConstructionCleaning:
                "https://northcrescentcleaning.com/post-construction-cleaning-moncton.html",

            janitorialCleaning:
                "https://northcrescentcleaning.com/janitorial-cleaning-moncton.html",

            airbnbCleaning:
                "https://northcrescentcleaning.com/airbnb-cleaning-moncton.html",

            privacy:
                "https://northcrescentcleaning.com/privacy.html",

            terms:
                "https://northcrescentcleaning.com/terms.html"
        }),

        french: Object.freeze({
            home: "https://northcrescentcleaning.com/fr/",
            services: "https://northcrescentcleaning.com/fr/services.html",
            process: "https://northcrescentcleaning.com/fr/process.html",
            reviews: "https://northcrescentcleaning.com/fr/reviews.html",
            work: "https://northcrescentcleaning.com/fr/work.html",
            gallery: "https://northcrescentcleaning.com/fr/gallery.html",
            contact: "https://northcrescentcleaning.com/fr/contact.html",

            commercialCleaning:
                "https://northcrescentcleaning.com/fr/commercial-cleaning-moncton.html",

            residentialCleaning:
                "https://northcrescentcleaning.com/fr/residential-cleaning-moncton.html",

            officeCleaning:
                "https://northcrescentcleaning.com/fr/office-cleaning-moncton.html",

            deepCleaning:
                "https://northcrescentcleaning.com/fr/deep-cleaning-moncton.html",

            postConstructionCleaning:
                "https://northcrescentcleaning.com/fr/post-construction-cleaning-moncton.html",

            janitorialCleaning:
                "https://northcrescentcleaning.com/fr/janitorial-cleaning-moncton.html",

            airbnbCleaning:
                "https://northcrescentcleaning.com/fr/airbnb-cleaning-moncton.html"
        })
    })

});

export default CONCIERGE_KNOWLEDGE;
