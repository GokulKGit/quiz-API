import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Configuration
const MODEL_NAME = "gemini-1.0-pro"; // Replace with the correct model name if needed
const API_KEY = "AIzaSyC92lm5NrJ5SiluNySu1dtZkeGJhN_pIQc"; // Replace with a valid API key
const GENERATION_CONFIG = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(API_KEY);

// generate Programming Questions
app.post("/generate-programming-questions", async (req, res) => {
  const { topic, number, level } = req.body;

  if (!topic || !number || !level) {
    return res.status(400).json({
      error:
        "Please provide 'topic', 'number', and 'level' in the request body.",
    });
  }

  try {
    // Initialize model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Start a new chat session
    const chat = model.startChat({
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
      history: [],
    });

    // Create a prompt for generating multiple-choice questions
    const prompt = `
    Generate exactly ${number} multiple-choice questions on the topic "${topic}" at a "${level}" difficulty level. 
    Each question must include the following:
    1. A clear and concise question string.
    2. Four distinct options.
    3. The correct answer explicitly labeled as "Correct: [Option text]".
    4. A detailed and easy-to-understand explanation of why the correct answer is correct.
    
    Format the output precisely as shown below, without adding any introductory or extra text:
    Question 1: What does the 'printf' function do? | Prints to the screen | Reads input | Allocates memory | Terminates the program | Correct: Prints to the screen | Explanation: The 'printf' function is used to display output on the screen.
    Question 2: What is the size of an integer in C? | bytes | 4 bytes | 8 bytes | Depends on the compiler | Correct: Depends on the compiler | Explanation: The size of an integer depends on the system architecture and compiler.
    Question 3: [Your next question] | [Option A] | [Option B] | [Option C] | [Option D] | Correct: [Correct option] | Explanation: [Explanation of correct answer].
    
    Ensure:
    - The output strictly adheres to the given format.
    - Use appropriate questions relevant to the topic and level.
    - Avoid any additional information, formatting, or introductory/explanatory comments outside the required structure.
    `;

    // Send prompt to the chat model
    const result = await chat.sendMessage(prompt);

    // Handle errors in the chat response
    if (result.error) {
      console.error("AI Error:", result.error.message);
      return res
        .status(500)
        .json({ error: "AI Error", details: result.error.message });
    }

    // Parse the response
    const responseText = result.response.text();
    const questions = responseText
      .split("\n")
      .filter((line) => line.trim() && line.startsWith("Question")) // Ensure lines are valid questions
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim());
        return {
          question: parts[0].replace(/^Question \d+:\s*/, ""), // Remove "Question X: " prefix
          options: parts.slice(1, 5),
          correct: parts
            .find((part) => part.startsWith("Correct:"))
            .replace("Correct: ", ""),
          explanation: parts
            .find((part) => part.startsWith("Explanation:"))
            .replace("Explanation: ", ""),
        };
      });

    // Check for any missing fields
    if (
      !questions.length ||
      questions.some(
        (q) => !q.question || !q.options || !q.correct || !q.explanation
      )
    ) {
      return res.status(500).json({
        error:
          "Failed to parse questions. Ensure AI response follows the correct format.",
      });
    }

    // Send structured response
    res.json({ topic, number, level, questions });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res
      .status(500)
      .json({ error: "Failed to generate questions", details: error.message });
  }
});

// Logical Reasoning
app.post("/generate-logical-questions", async (req, res) => {
  const { topic, number, level } = req.body;

  if (!topic || !number || !level) {
    return res.status(400).json({
      error:
        "Please provide 'topic', 'number', and 'level' in the request body.",
    });
  }

  try {
    // Initialize model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Start a new chat session
    const chat = model.startChat({
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
      history: [],
    });

    const prompt = `
Generate exactly ${number} Logical Reasoning Aptitude questions on the topic "${topic}" at a "${level}" difficulty level.
Each question must include the following:
1. A clear and concise logical reasoning question.
2. Four distinct options.
3. The correct answer explicitly labeled as "Correct: [Option text]".
4. A detailed and easy-to-understand explanation of why the correct answer is correct.

The questions should focus on the given topic: "${topic}" and may include variations within its subcategories. Example topics could be:
- Pattern Recognition
- Syllogisms
- Series Completion
- Coding-Decoding
- Blood Relations
- Puzzles
- Logical Deductions
- Statements and Assumptions

Format the output precisely as shown below, without adding any introductory or extra text:
Question 1: Which of the following completes the series: 2, 6, 12, 20, ? | 30 | 36 | 42 | 48 | Correct: 30 | Explanation: The series adds consecutive even numbers to the previous term (2+4=6, 6+6=12, 12+8=20, 20+10=30).
Question 2: If A is the mother of B and B is the father of C, what is A to C? | Grandmother | Aunt | Mother | Sister | Correct: Grandmother | Explanation: A is B’s mother, and B is C’s father, making A the grandmother of C.
Question 3: [Your next question] | [Option A] | [Option B] | [Option C] | [Option D] | Correct: [Correct option] | Explanation: [Explanation of correct answer].

Ensure:
- The output strictly adheres to the given format.
- Use appropriate logical reasoning questions relevant to the topic and level.
- Avoid any additional information, formatting, or introductory/explanatory comments outside the required structure.
`;

    // Send prompt to the chat model
    const result = await chat.sendMessage(prompt);

    // Handle errors in the chat response
    if (result.error) {
      console.error("AI Error:", result.error.message);
      return res
        .status(500)
        .json({ error: "AI Error", details: result.error.message });
    }

    // Parse the response
    const responseText = result.response.text();
    const questions = responseText
      .split("\n")
      .filter((line) => line.trim()) // Remove empty lines
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim());
        return {
          question: parts[0].replace(/^Question \d+:\s*/, ""), // Remove "Question X: " prefix
          options: parts.slice(1, 5),
          correct: parts
            .find((part) => part.startsWith("Correct:"))
            .replace("Correct: ", ""),
          explanation: parts
            .find((part) => part.startsWith("Explanation:"))
            .replace("Explanation: ", ""),
        };
      });

    // Send structured response
    res.json({ topic, number, level, questions });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res
      .status(500)
      .json({ error: "Failed to generate questions", details: error.message });
  }
});

// Quantitative Aptitude
app.post("/generate-quantative-questions", async (req, res) => {
  const { topic, number, level } = req.body;

  if (!topic || !number || !level) {
    return res.status(400).json({
      error:
        "Please provide 'topic', 'number', and 'level' in the request body.",
    });
  }

  try {
    // Initialize model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Start a new chat session
    const chat = model.startChat({
      generationConfig: GENERATION_CONFIG,
      safetySettings: SAFETY_SETTINGS,
      history: [],
    });

    const prompt = `
    Generate exactly ${number} Quantitative Aptitude questions on the topic "${topic}" at a "${level}" difficulty level.
    Each question must include the following:
    1. A clear and concise quantitative aptitude question.
    2. Four distinct options.
    3. The correct answer explicitly labeled as "Correct: [Option text]".
    4. A detailed and easy-to-understand explanation of why the correct answer is correct.
    
    The questions should focus on the given topic: "${topic}" and may include variations within its subcategories. Example topics could be:
    - Time and Work
    - Percentages
    - Profit and Loss
    - Ratio and Proportion
    - Speed, Distance, and Time
    - Simple and Compound Interest
    - Averages
    - Probability
    - Permutations and Combinations
    
    Format the output precisely as shown below, without adding any introductory or extra text:
    Question 1: A person can complete a task in 10 days, and another person can complete the same task in 15 days. How many days will it take for both to complete the task together? | 5 days | 6 days | 8 days | 12 days | Correct: 6 days | Explanation: The work rate of the first person is 1/10, and the second person is 1/15. Together, their rate is 1/10 + 1/15 = 1/6. Thus, it will take 6 days.
    Question 2: A shopkeeper marks an item 25% above the cost price and offers a discount of 10%. What is the profit percentage? | 10% | 12.5% | 15% | 20% | Correct: 12.5% | Explanation: If the cost price is 100, the marked price is 125. After a 10% discount, the selling price is 112.5, giving a profit of 12.5%.
    Question 3: [Your next question] | [Option A] | [Option B] | [Option C] | [Option D] | Correct: [Correct option] | Explanation: [Explanation of correct answer].
    
    Ensure:
    - The output strictly adheres to the given format.
    - Use appropriate quantitative aptitude questions relevant to the topic and level.
    - Avoid any additional information, formatting, or introductory/explanatory comments outside the required structure.
    `;

    // Send prompt to the chat model
    const result = await chat.sendMessage(prompt);

    // Handle errors in the chat response
    if (result.error) {
      console.error("AI Error:", result.error.message);
      return res
        .status(500)
        .json({ error: "AI Error", details: result.error.message });
    }

    // Parse the response
    const responseText = result.response.text();
    const questions = responseText
      .split("\n")
      .filter((line) => line.trim()) // Remove empty lines
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim());
        return {
          question: parts[0].replace(/^Question \d+:\s*/, ""), // Remove "Question X: " prefix
          options: parts.slice(1, 5),
          correct: parts
            .find((part) => part.startsWith("Correct:"))
            .replace("Correct: ", ""),
          explanation: parts
            .find((part) => part.startsWith("Explanation:"))
            .replace("Explanation: ", ""),
        };
      });

    // Send structured response
    res.json({ topic, number, level, questions });
  } catch (error) {
    console.error("Error occurred:", error.message);
    res
      .status(500)
      .json({ error: "Failed to generate questions", details: error.message });
  }
});

//Sample Get Method
app.get("/", (req, res) => {
  res.json({
    success: 1,
    message: "This is My First REST API...",
  });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


