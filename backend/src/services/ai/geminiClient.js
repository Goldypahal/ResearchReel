const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const generateReelScript = async (paperTitle, summaryText, keyPoints, userApiKey = null) => {
  const apiKeyToUse = userApiKey || GEMINI_API_KEY;
  if (!apiKeyToUse || apiKeyToUse.includes('YOUR_GEMINI_API_KEY')) {
    console.warn('[Gemini Client] API Key is not configured. Using fallback script generator.');
    return getFallbackScript(paperTitle, summaryText);
  }

  const prompt = `
We want to generate an engaging, 30-60 second academic video reel/shorts script for a research paper.
Paper Title: "${paperTitle}"
Abstract/Summary: "${summaryText}"
Key Highlights: ${JSON.stringify(keyPoints || [])}

Please structure this into exactly 4 to 6 video scenes. For each scene, provide:
1. title: A short punchy screen overlay text (max 40 chars).
2. visualDescription: A description of what should be displayed on screen.
3. dialogue: The spoken script for the voiceover (max 200 chars).
4. duration: The duration in seconds (integer, e.g., 5-10 seconds, total duration of all scenes must be between 30 and 60 seconds).
5. backgroundStyle: Color theme style description (choose from: 'indigo-dark', 'slate-gradient', 'emerald-glow', 'crimson-deep', 'violet-pulsar').

You MUST respond with a valid JSON array only, containing no extra text or markdown formatting blocks.
Example format:
[
  {
    "title": "Unlocking AI Reasoning",
    "visualDescription": "Futuristic abstract brain grid glowing in blue",
    "dialogue": "Have you ever wondered how artificial intelligence can reason logically like humans do? Let's check out a new framework.",
    "duration": 9,
    "backgroundStyle": "indigo-dark"
  }
]
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKeyToUse}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const scenes = JSON.parse(text);
    if (!Array.isArray(scenes)) {
      throw new Error('Response is not a valid JSON array');
    }

    return scenes;
  } catch (error) {
    console.error('[Gemini Client] API error:', error.message);
    return getFallbackScript(paperTitle, summaryText);
  }
};

const getFallbackScript = (paperTitle, summaryText) => {
  return [
    {
      title: "Breakthrough Discovery",
      visualDescription: "A clean dark indigo background with subtle particles",
      dialogue: `Hey science fans! Today we're diving into a new paper: ${paperTitle.substring(0, 80)}. Let's look at what makes it special.`,
      duration: 10,
      backgroundStyle: "indigo-dark"
    },
    {
      title: "The Core Problem",
      visualDescription: "Visual representation of data networks connected together",
      dialogue: "Current models struggle to solve these challenges efficiently. That is where this new research steps in with a unique method.",
      duration: 10,
      backgroundStyle: "slate-gradient"
    },
    {
      title: "Key Insights & Results",
      visualDescription: "Glow effect showing rising charts and research metrics",
      dialogue: "By implementing their framework, the researchers achieved significantly higher performance compared to existing baselines.",
      duration: 10,
      backgroundStyle: "emerald-glow"
    },
    {
      title: "What's Next?",
      visualDescription: "Clean dark background with the paper title highlighted",
      dialogue: "This opens new doors for scientific discovery. You can read the full publication on ResearchReel. Follow for more insights!",
      duration: 10,
      backgroundStyle: "violet-pulsar"
    }
  ];
};

const generateReelSeries = async (paperTitle, summaryText, keyPoints, userApiKey = null, options = {}) => {
  const apiKeyToUse = userApiKey || GEMINI_API_KEY;
  const { parts_mode = 'auto', parts_count = 3 } = options;

  if (!apiKeyToUse || apiKeyToUse.includes('YOUR_GEMINI_API_KEY')) {
    console.warn('[Gemini Client] API Key is not configured. Using fallback series generator.');
    return getFallbackSeries(paperTitle, summaryText, parts_mode === 'auto' ? 3 : parts_count);
  }

  // Build the prompt instruction
  let partsInstruction = '';
  if (parts_mode === 'auto') {
    partsInstruction = `Please analyze the paper and automatically split it into an appropriate number of parts (typically between 2 and 4 parts) depending on the complexity, depth, and detail of the research. Each part will represent a single short-form video reel.`;
  } else {
    partsInstruction = `Please split the research paper into exactly ${parts_count} distinct parts (each part represents a single short-form video reel).`;
  }

  const prompt = `
We want to generate an engaging multi-part academic video reel series (shorts/reels) summarizing a research paper.
Paper Title: "${paperTitle}"
Abstract/Summary: "${summaryText}"
Key Highlights: ${JSON.stringify(keyPoints || [])}

${partsInstruction}

For each part in the series, generate:
1. part_number: The sequential number of the part (starting at 1).
2. total_parts: The total number of parts in the series.
3. title: A title for this part (e.g., "Part 1: The Core Breakthrough", max 50 chars).
4. description: A short description summarizing this part (max 150 chars).
5. scenes: An array of exactly 4 to 5 video scenes for this part.
   For each scene inside the scenes array, provide:
   - title: Short screen overlay text (max 40 chars).
   - visualDescription: A description of what should be displayed.
   - dialogue: Spoken voiceover dialogue script (max 200 chars).
   - duration: Duration in seconds (integer, e.g., 5-10 seconds).
   - backgroundStyle: Color theme style (choose from: 'indigo-dark', 'slate-gradient', 'emerald-glow', 'crimson-deep', 'violet-pulsar').

You MUST respond with a valid JSON array only, containing no extra text or markdown formatting blocks.
Example format:
[
  {
    "part_number": 1,
    "total_parts": 3,
    "title": "Part 1: The Challenge",
    "description": "Introduction to the core problem of AI reasoning.",
    "scenes": [
      {
        "title": "Unlocking AI Reasoning",
        "visualDescription": "Futuristic abstract brain grid glowing in blue",
        "dialogue": "Let's explore how AI is beginning to reason like humans. Here's the first part of a breakthrough study.",
        "duration": 8,
        "backgroundStyle": "indigo-dark"
      }
    ]
  }
]
`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKeyToUse}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    const series = JSON.parse(text);
    if (!Array.isArray(series)) {
      throw new Error('Response is not a valid JSON array');
    }

    return series;
  } catch (error) {
    console.error('[Gemini Client] API error in series generation:', error.message);
    return getFallbackSeries(paperTitle, summaryText, parts_mode === 'auto' ? 3 : parts_count);
  }
};

const getFallbackSeries = (paperTitle, summaryText, partsCount) => {
  const series = [];
  const actualParts = partsCount || 3;
  for (let i = 1; i <= actualParts; i++) {
    series.push({
      part_number: i,
      total_parts: actualParts,
      title: `Part ${i}: Key Insights from ${paperTitle.substring(0, 30)}`,
      description: `Analysis part ${i} covering key themes of ${paperTitle.substring(0, 30)}.`,
      scenes: [
        {
          title: `Part ${i}: Introduction`,
          visualDescription: "A clean dark background with title slide",
          dialogue: `Welcome to part ${i} of our breakdown of the paper: ${paperTitle.substring(0, 60)}.`,
          duration: 9,
          backgroundStyle: "indigo-dark"
        },
        {
          title: "Core Mechanics",
          visualDescription: "A clean slate grid background",
          dialogue: `In this segment, we focus on the core mechanisms and parameters discovered in section ${i} of the research.`,
          duration: 9,
          backgroundStyle: "slate-gradient"
        },
        {
          title: "The Results",
          visualDescription: "A glowing emerald chart",
          dialogue: "The experiments yielded significant improvements, setting a new benchmark.",
          duration: 9,
          backgroundStyle: "emerald-glow"
        },
        {
          title: "Follow for Part " + (i < actualParts ? (i + 1) : "Finished"),
          visualDescription: "A clean purple background",
          dialogue: i < actualParts 
            ? "Stay tuned for the next part where we explore the practical applications!" 
            : "That wraps up our series on this paper! Subscribe for more research breakdowns.",
          duration: 9,
          backgroundStyle: "violet-pulsar"
        }
      ]
    });
  }
  return series;
};

module.exports = {
  generateReelScript,
  generateReelSeries
};

