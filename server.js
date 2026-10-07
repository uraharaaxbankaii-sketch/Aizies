import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();


// --------------------------------
// FILE UPLOAD SETTINGS
// --------------------------------

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024
  }
});


// --------------------------------
// OPENAI
// --------------------------------

if (!process.env.OPENAI_API_KEY) {

  console.error(
    "ERROR: OPENAI_API_KEY is missing."
  );

}


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// --------------------------------
// MIDDLEWARE
// --------------------------------

app.use(
  cors()
);


// --------------------------------
// HOME
// --------------------------------

app.get("/", (req, res) => {

  res.json({
    status: "Aizies backend is running",
    service: "AI Food Nutrition Scanner"
  });

});


// --------------------------------
// FOOD ANALYZER
// --------------------------------

app.post(
  "/analyze-food",
  upload.single("image"),

  async (req, res) => {

    try {

      // Check image

      if (!req.file) {

        return res.status(400).json({
          error: "No food image was uploaded."
        });

      }


      // Convert image to Base64

      const base64 =
        req.file.buffer.toString("base64");


      const image =
        `data:${req.file.mimetype};base64,${base64}`;


      // --------------------------------
      // AI REQUEST
      // --------------------------------

      const response =
        await client.responses.create({

          model: process.env.OPENAI_MODEL,

          input: [

            {

              role: "user",

              content: [

                {

                  type: "input_text",

                  text: `

You are a nutrition estimation assistant.

Analyze the food shown in the image.

Identify the most likely food or foods.

Estimate the visible portion size.

Then estimate:

- calories
- protein
- carbohydrates
- fat

IMPORTANT:

These are estimates only.

A photograph cannot determine exact:

- ingredients
- cooking oil
- recipe
- portion weight

If multiple foods are visible, estimate the entire meal together.

Return ONLY valid JSON.

Do not use Markdown.

Use exactly this structure:

{
  "food": "food name",
  "portion": "estimated portion",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0
}

All nutrition values must be numbers.

                  `

                },

                {

                  type: "input_image",

                  image_url: image

                }

              ]

            }

          ]

        });


      // --------------------------------
      // READ AI RESPONSE
      // --------------------------------

      const text =
        response.output_text;


      let result;


      try {

        result = JSON.parse(text);

      }

      catch {

        console.error(
          "AI returned invalid JSON:",
          text
        );

        return res.status(500).json({
          error: "AI returned an invalid nutrition result."
        });

      }


      // --------------------------------
      // CLEAN RESULT
      // --------------------------------

      const food =
        String(result.food || "Unknown food");


      const portion =
        String(result.portion || "Unknown portion");


      const calories =
        Number(result.calories) || 0;


      const protein =
        Number(result.protein) || 0;


      const carbs =
        Number(result.carbs) || 0;


      const fat =
        Number(result.fat) || 0;


      // --------------------------------
      // SEND RESULT
      // --------------------------------

      res.json({

        food,

        portion,

        calories,

        protein,

        carbs,

        fat

      });

    }

    catch (error) {

      console.error(
        "Food analysis error:",
        error
      );


      res.status(500).json({

        error:
          "Food analysis failed. Please try again."

      });

    }

  }

);


// --------------------------------
// SERVER
// --------------------------------

const PORT =
  process.env.PORT || 3000;


app.listen(
  PORT,

  () => {

    console.log(
      `Aizies backend running on port ${PORT}`
    );

  }

);
