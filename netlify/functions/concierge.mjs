import { processConciergeRequest } from "../../north-crescent-os/ai/concierge/brain.mjs";
export const handler = async (event) => {
  
  /* =====================================================
     RESPONSE HEADERS
     ===================================================== */

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };


  /* =====================================================
     CORS PREFLIGHT
     ===================================================== */

  if (event.httpMethod === "OPTIONS") {

    return {
      statusCode: 204,
      headers,
      body: ""
    };

  }


  /* =====================================================
     METHOD CHECK
     ===================================================== */

  if (event.httpMethod !== "POST") {

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method Not Allowed"
      })
    };

  }


  try {

    /* ===================================================
       REQUEST RECEIVED
       =================================================== */

    console.log(
      "Concierge request received."
    );


    /* ===================================================
       PARSE REQUEST
       =================================================== */

    const data =
      JSON.parse(
        event.body || "{}"
      );


    /* ===================================================
       BASIC VALIDATION
       =================================================== */

    if (
      !data ||
      typeof data !== "object"
    ) {

      console.error(
        "Invalid Concierge request."
      );

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid request."
        })
      };

    }


    /* ===================================================
       EXTRACT CONCIERGE DATA
       =================================================== */

    const payload = {

      conversationId:
        data.conversationId || null,

      emailAddress:
        data.emailAddress || null,

      serviceContext:
        data.serviceContext || null,

      source:
        data.source || null,

      campaign:
        data.campaign || null,

      pageUrl:
        data.pageUrl || null,

      referrer:
        data.referrer || null,

      messages:
        Array.isArray(data.messages)
          ? data.messages
          : [],

      leadProfile:
        data.leadProfile &&
        typeof data.leadProfile === "object"
          ? data.leadProfile
          : {},

      context:
        data.context &&
        typeof data.context === "object"
          ? data.context
          : {}

    };

        /* ===================================================
       NORTH CRESCENT OS — CONCIERGE BRAIN
       ==================================================
==== */


    const brainAnalysis =
      processConciergeRequest({

       currentMessage:
  Array.isArray(payload.messages)
    ? [...payload.messages]
        .reverse()
        .find(message => message?.role === "user")
        ?.content || ""
    : "",

      });

    console.log(
      "North Crescent Brain analysis:",
      brainAnalysis.intent,
      brainAnalysis.nextAction
    );


    /* ===================================================
       VALIDATE REQUIRED BACKEND CONFIG
       =================================================== */

    const makeWebhookUrl =
      process.env.MAKE_CONCIERGE_WEBHOOK_URL;


    if (!makeWebhookUrl) {

      console.error(
        "MAKE_CONCIERGE_WEBHOOK_URL is not configured."
      );

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error:
            "Concierge backend is not configured."
        })
      };

    }


    console.log(
      "Concierge configuration loaded."
    );


    /* ===================================================
       SEND TO MAKE
       =================================================== */

    const makeResponse =
      await fetch(
        makeWebhookUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
  JSON.stringify({
    ...payload,
    brainAnalysis
  })

        }
      );


    /* ===================================================
       HANDLE MAKE ERROR
       =================================================== */

    if (!makeResponse.ok) {

      const makeText =
        await makeResponse.text();

      console.error(
        "Make webhook error:",
        makeResponse.status,
        makeText
      );

      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error:
            "Unable to connect with the Concierge system."
        })
      };

    }


    console.log(
      "Concierge request successfully sent to Make."
    );


    /* ===================================================
       READ MAKE RESPONSE
       =================================================== */

    let makeData = {};

    try {

      makeData =
        await makeResponse.json();

    } catch (error) {

      makeData = {};

    }


    /* ===================================================
       RETURN TO CONCIERGE
       =================================================== */

    return {

      statusCode: 200,

      headers,

      body:
        JSON.stringify({

          reply:
            makeData.reply ||
            makeData.message ||
            makeData.response ||
            "Thank you. We've received your message.",

          leadProfile:
            makeData.leadProfile ||
            payload.leadProfile,

          conversationId:
            makeData.conversationId ||
            payload.conversationId

        })

    };


  } catch (error) {

    console.error(
      "Concierge function error:",
      error
    );

    return {

      statusCode: 500,

      headers,

      body:
        JSON.stringify({
          error:
            "An unexpected Concierge error occurred."
        })

    };

  }

};
