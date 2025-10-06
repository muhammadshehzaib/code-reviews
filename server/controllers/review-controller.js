// controllers/review-controller.js
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import Review from '../models/Review.js';

// Your existing prompt template remains the same
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

let chain = null;

const getChain = () => {
  if (!chain) {
    console.log('🔑 Hugging Face API Key loaded:', process.env.HUGGINGFACEHUB_API_KEY ? 'YES ✅' : 'NO ❌');

    // Initialize Hugging Face model
    const model = new HuggingFaceInference({
      model: "gpt2", // Free code model
      apiKey: process.env.HUGGINGFACEHUB_API_KEY, // Your HF token
      temperature: 0.3,
      maxTokens: 1000,

    });

    const outputParser = new StringOutputParser();
    chain = promptTemplate.pipe(model).pipe(outputParser);
  }
  return chain;
};

// Your existing reviewCode and getReviewHistory functions remain the same
export const reviewCode = async (req, res) => {
  try {
    const { code, language = 'javascript' } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const reviewChain = getChain();
    const result = await reviewChain.invoke({
      code: code,
      language: language
    });

    // Parse AI response
    let reviewData;
    try {
      reviewData = JSON.parse(result);
    } catch {
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