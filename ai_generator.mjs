import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API using the passed key or an environment variable.
// Remember to replace 'YOUR_API_KEY' with an actual key before running!
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function startBoxingMatch() {
  const prompt = "A high-fidelity animation of a boxer landing a knockout punch.";
  console.log(`Prompting Gemini: "${prompt}"...\n`);
  
  try {
    const result = await model.generateContent(prompt);
    console.log("Response from Gemini:");
    console.log(result.response.text());
  } catch (error) {
    console.error("Error connecting to the Gemini API:", error.message);
    if(error.message.includes("API key not valid")) {
      console.log("\nMake sure to add your real API key in the ai_generator.mjs file where it says 'YOUR_API_KEY'.");
    }
  }
}

startBoxingMatch();
