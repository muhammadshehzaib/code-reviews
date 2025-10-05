// controllers/review-controller.js
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import Review from '../models/Review.js';

// Few-shot examples to reduce hallucinations
const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert code reviewer. Analyze the following code for bugs, security issues, and best practices.

EXAMPLES:
Input: const [count setCount] = useState(0)
Output: Missing comma between 'count' and 'setCount'. Should be: const [count, setCount] = useState(0)

Input: fetch('/api/data').then(res => res.json())
Output: Missing error handling. Add .catch() to handle network errors.

NOW REVIEW THIS CODE:
Language: {language}
Code:
{code}

Provide:
1. Overall quality score (0-10)
2. List of issues with severity (critical/warning/info)
3. Specific suggestions for improvement
4. Refactored code if needed

Format your response as JSON with keys: score, issues, suggestions, refactoredCode
`);

// Initialize model lazily (only when needed)
let model = null;
let chain = null;

const getChain = () => {
  if (!chain) {
    console.log('🔑 API Key loaded:', process.env.GOOGLE_API_KEY ? 'YES ✅' : 'NO ❌');
    
    model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.3,
    });
    
    const outputParser = new StringOutputParser();
    chain = promptTemplate.pipe(model).pipe(outputParser);
  }
  return chain;
};

export const reviewCode = async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Get chain (initializes model on first call)
    const reviewChain = getChain();

    // Call LangChain with Gemini using LCEL
    const result = await reviewChain.invoke({
      code: code,
      language: language
    });

    // Parse AI response
    let reviewData;
    try {
      // Try to parse as JSON
      reviewData = JSON.parse(result);
    } catch {
      // If not JSON, use raw text
      reviewData = {
        score: 7,
        issues: ['Check the detailed review below'],
        suggestions: result,
        refactoredCode: null
      };
    }

    // Save to MongoDB
    const review = new Review({
      code,
      language,
      review: result,
      score: reviewData.score || 7,
      issues: reviewData.issues || []
    });

    await review.save();

    res.json({
      success: true,
      review: reviewData,
      id: review._id
    });

  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ 
      error: 'Failed to review code',
      details: error.message 
    });
  }
};

export const getReviewHistory = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};