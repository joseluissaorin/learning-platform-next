import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  type AnalysisRequest,
  type AnalysisResponse,
  type ConceptAnalysis,
  type ConceptIndex,
  type ConceptRelationship,
  type LearningPath,
} from "@/types/analysis";
import { analysisCache } from "@/lib/redis/analysis-cache";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

function parseConceptAnalysis(text: string): ConceptAnalysis | null {
  try {
    console.log("[Analysis] Starting concept analysis parsing");
    console.log("[Analysis] Input text length:", text.length);
    
    const startTag = "<concept_analysis>";
    const endTag = "</concept_analysis>";
    const startIndex = text.indexOf(startTag);
    const endIndex = text.indexOf(endTag);
    
    if (startIndex === -1 || endIndex === -1) {
      console.error("[Analysis] No concept_analysis tags found in response");
      return null;
    }

    const analysisText = text.slice(startIndex + startTag.length, endIndex).trim();
    console.log("[Analysis] Found analysis text of length:", analysisText.length);
    
    const sections = analysisText.split("\n\n");
    if (sections.length < 4) {
      console.error("[Analysis] Not enough sections found in analysis. Found:", sections.length);
      return null;
    }

    const analysis = {
      fundamentalConcepts: sections[0]
        .split("\n")
        .filter((line) => line.startsWith("-"))
        .map((line) => line.slice(2).trim()),
      intermediateConcepts: sections[1]
        .split("\n")
        .filter((line) => line.startsWith("-"))
        .map((line) => line.slice(2).trim()),
      advancedConcepts: sections[2]
        .split("\n")
        .filter((line) => line.startsWith("-"))
        .map((line) => line.slice(2).trim()),
      hierarchicalStructure: sections[3].trim(),
      justification: "Generated based on concept hierarchy and relationships"
    };

    console.log("[Analysis] Parsed concept analysis:", {
      fundamentalCount: analysis.fundamentalConcepts.length,
      intermediateCount: analysis.intermediateConcepts.length,
      advancedCount: analysis.advancedConcepts.length,
      hasStructure: !!analysis.hierarchicalStructure
    });

    return analysis;
  } catch (error) {
    console.error("[Analysis] Error parsing concept analysis:", error);
    return null;
  }
}

function parseConceptIndex(markdown: string): ConceptIndex[] {
  console.log("[Analysis] Starting concept index parsing");
  console.log("[Analysis] Input markdown length:", markdown.length);

  const lines = markdown.split("\n");
  const concepts: ConceptIndex[] = [];
  const stack: ConceptIndex[] = [];
  let currentContent = "";
  let currentConcept: ConceptIndex | null = null;

  let currentLevel = 0;
  let order = 0;

  console.log("[Analysis] Processing", lines.length, "lines of markdown");

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith("#")) {
      // Save content of previous concept if any
      if (currentConcept) {
        currentConcept.content = currentContent.trim();
        currentContent = "";
        console.log("[Analysis] Saved content for concept:", currentConcept.title);
      }

      const level = line.match(/^#+/)?.[0].length || 0;
      const title = line.replace(/^#+\s*/, "").trim();
      const id = title.toLowerCase().replace(/\s+/g, "-");

      console.log("[Analysis] Found new concept:", {
        title,
        level,
        id
      });

      currentConcept = {
        id,
        title,
        level,
        content: "",
        order: order++,
        children: [],
      };

      if (level > currentLevel) {
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          currentConcept.parentId = parent.id;
          parent.children?.push(currentConcept);
          console.log("[Analysis] Added as child to:", parent.title);
        } else {
          concepts.push(currentConcept);
          console.log("[Analysis] Added as root concept");
        }
        stack.push(currentConcept);
      } else if (level === currentLevel) {
        stack.pop();
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          currentConcept.parentId = parent.id;
          parent.children?.push(currentConcept);
          console.log("[Analysis] Added as sibling under:", parent.title);
        } else {
          concepts.push(currentConcept);
          console.log("[Analysis] Added as root concept");
        }
        stack.push(currentConcept);
      } else {
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }
        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          currentConcept.parentId = parent.id;
          parent.children?.push(currentConcept);
          console.log("[Analysis] Added to parent after stack reduction:", parent.title);
        } else {
          concepts.push(currentConcept);
          console.log("[Analysis] Added as root after stack reduction");
        }
        stack.push(currentConcept);
      }

      currentLevel = level;
    } else {
      // Accumulate content
      currentContent += line + "\n";
    }
  }

  // Save content of last concept if any
  if (currentConcept) {
    currentConcept.content = currentContent.trim();
    console.log("[Analysis] Saved content for final concept:", currentConcept.title);
  }

  console.log("[Analysis] Completed concept index parsing:", {
    totalConcepts: concepts.length,
    rootConcepts: concepts.length,
    maxDepth: Math.max(...concepts.map(c => c.level))
  });

  return concepts;
}

function detectRelationships(concepts: ConceptIndex[]): ConceptRelationship[] {
  console.log("[Structuring] Starting relationship detection between concepts");
  const relationships: ConceptRelationship[] = [];
  const allConcepts = flattenConcepts(concepts);
  console.log("[Structuring] Processing relationships for", allConcepts.length, "concepts");

  // Helper function to calculate concept similarity
  const calculateSimilarity = (a: string, b: string): number => {
    console.log("[Structuring] Calculating similarity between concepts:", {
      concept1: a.substring(0, 50) + "...",
      concept2: b.substring(0, 50) + "..."
    });
    const wordsA = new Set(a.toLowerCase().split(/\W+/));
    const wordsB = new Set(b.toLowerCase().split(/\W+/));
    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
  };

  // Detect relationships based on content similarity and hierarchy
  for (let i = 0; i < allConcepts.length; i++) {
    for (let j = i + 1; j < allConcepts.length; j++) {
      const source = allConcepts[i];
      const target = allConcepts[j];

      // Skip if same concept or direct parent-child relationship
      if (
        source.id === target.id ||
        source.parentId === target.id ||
        target.parentId === source.id
      ) {
        continue;
      }

      const similarity = calculateSimilarity(
        source.title + " " + source.content,
        target.title + " " + target.content,
      );

      if (similarity > 0.3) {
        // Determine relationship type based on levels
        const type =
          source.level < target.level
            ? "prerequisite"
            : source.level > target.level
            ? "followUp"
            : "related";

        relationships.push({
          sourceId: source.id,
          targetId: target.id,
          type,
          strength: similarity,
        });

        console.log("[Structuring] Found relationship:", {
          source: source.title,
          target: target.title,
          type,
          similarity: similarity.toFixed(2)
        });
      }
    }
  }

  console.log("[Structuring] Completed relationship detection:", {
    totalRelationships: relationships.length,
    byType: relationships.reduce((acc, rel) => {
      acc[rel.type] = (acc[rel.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });

  return relationships;
}

function flattenConcepts(concepts: ConceptIndex[]): ConceptIndex[] {
  const flattened: ConceptIndex[] = [];
  
  function traverse(concept: ConceptIndex) {
    flattened.push(concept);
    concept.children?.forEach(traverse);
  }

  concepts.forEach(traverse);
  return flattened;
}

export async function analyzeContent(
  request: AnalysisRequest,
  onProgress?: (stage: string, progress: number) => void,
): Promise<AnalysisResponse> {
  try {
    console.log("[Analysis] Starting content analysis");
    console.log("[Analysis] Request:", {
      contentLength: request.content.length,
      format: request.format,
      language: request.language
    });

    onProgress?.("Checking cache", 10);

    // Check cache first
    const cachedResult = await analysisCache.get(request);
    if (cachedResult) {
      console.log("[Analysis] Cache hit, returning cached result");
      onProgress?.("Retrieved from cache", 100);
      return cachedResult;
    }

    console.log("[Analysis] Cache miss, processing with Gemini");
    onProgress?.("Initializing AI model", 20);

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 1.45,
        topP: 0.8,
        topK: 40,
      },
    });

    console.log("[Analysis] Initialized Gemini model");
    onProgress?.("Analyzing content structure", 30);

    const prompt = `You are an expert educational content organizer tasked with creating a comprehensive, logically structured index for a set of notes. Your goal is to produce an index that facilitates deep understanding and intuitive learning of the subject matter.

Here are the notes you need to analyze:

<apuntes>
${request.content}
</apuntes>

Your task is to create a detailed, hierarchical index based on these notes. Follow these steps:

1. Carefully analyze all the notes and identify the key concepts that need to be understood to master the subject.

2. Create a conceptual hierarchy, starting from fundamental principles and progressing to more complex ideas.

3. Plan a logical progression that builds understanding incrementally, allowing learners to grasp each concept naturally without relying heavily on memorization.

4. Before creating the final index, wrap your analysis inside <concept_analysis> tags. In this analysis:
   - List all key concepts identified from the notes.
   - Group these concepts into fundamental, intermediate, and advanced categories.
   - Create a rough outline of the hierarchical structure.
   - Consider:
     - The most effective structure for presenting the information
     - How to ensure a natural progression of understanding
     - How different concepts are interconnected
     - Why your chosen structure is optimal for learning

5. Create an extremely detailed and dense index using markdown formatting. Ensure that:
   - All topics from the notes are included without exception
   - The structure is intuitive and progressive
   - Relationships between concepts are clearly indicated
   - Nuances and subtleties are captured
   - You do not include introduction or conclusion in the index unless it is explicitly mentioned in the notes.

Begin by analyzing the notes and planning your approach. Use <concept_analysis> tags for this process. Once you've completed your analysis, present your final index using markdown formatting.

IMPORTANT: Your response MUST follow this EXACT format and structure:

<concept_analysis>
Fundamental Concepts:
- [List fundamental concepts]

Intermediate Concepts:
- [List intermediate concepts]

Advanced Concepts:
- [List advanced concepts]

Hierarchical Structure:
[Describe the overall structure and how concepts build upon each other]
</concept_analysis>

\`\`\`markdown
# 1. Fundamental Concept A
  1.1. Subconcept A1
    1.1.1. Detail of A1
    1.1.2. Another detail of A1
  1.2. Subconcept A2
    1.2.1. Detail of A2
    1.2.2. Another detail of A2
      1.2.2.1. Further elaboration

# 2. Intermediate Concept B
  2.1. Subconcept B1
    2.1.1. Detail of B1
  2.2. Subconcept B2
    2.2.1. Detail of B2
    2.2.2. Another detail of B2
      1.2.2.1. Further elaboration
      1.2.2.2. Additional nuance
\`\`\`

Follow this format EXACTLY, maintaining the same structure and indentation in your response. Write the index in the same language as the notes.`;

    console.log("[Analysis] Sending prompt to Gemini, length:", prompt.length);
    onProgress?.("Processing with AI, may take a minute!", 40);
    
    const result = await model.generateContent(prompt);
    onProgress?.("Processing AI response", 50);
    
    const geminiResponse = await result.response;
    const text = geminiResponse.text();
    onProgress?.("Parsing analysis results", 60);
    
    console.log("[Analysis] Received response from Gemini, length:", text.length);

    // Parse the analysis and index
    const analysis = parseConceptAnalysis(text);
    if (!analysis) {
      console.error("[Analysis] Failed to parse concept analysis");
      throw new Error("Failed to parse concept analysis");
    }
    onProgress?.("Building concept structure", 70);

    const markdownStart = "```markdown\n";
    const markdownEnd = "```";
    const indexStart = text.indexOf(markdownStart);
    const indexEnd = text.indexOf(markdownEnd, indexStart + markdownStart.length);
    
    if (indexStart === -1 || indexEnd === -1) {
      console.error("[Analysis] Failed to find markdown section in response");
      throw new Error("Failed to find markdown section in response");
    }

    const markdown = text.slice(
      indexStart + markdownStart.length,
      indexEnd,
    );

    console.log("[Analysis] Found markdown section, length:", markdown.length);
    onProgress?.("Generating concept index", 80);

    const index = parseConceptIndex(markdown);
    onProgress?.("Analyzing relationships", 90);
    
    const relationships = detectRelationships(index);

    const analysisResponse: AnalysisResponse = {
      success: true,
      analysis,
      index,
      relationships,
    };

    // Cache the result
    onProgress?.("Caching results", 95);
    await analysisCache.set(request, analysisResponse);

    console.log("[Analysis] Analysis completed successfully:", {
      hasAnalysis: !!analysisResponse.analysis,
      indexLength: analysisResponse.index?.length,
      relationshipsCount: analysisResponse.relationships?.length
    });

    onProgress?.("Analysis complete", 100);
    return analysisResponse;
  } catch (error) {
    console.error("[Analysis] Error during content analysis:", error);
    throw error;
  }
}

export function generateLearningPath(
  concepts: ConceptIndex[],
  relationships: ConceptRelationship[],
): LearningPath {
  console.log("[Structuring] Generating learning path");
  console.log("[Structuring] Input:", {
    conceptsCount: concepts.length,
    relationshipsCount: relationships.length
  });

  // Find root concepts (no parents)
  const rootConcepts = concepts.filter((c) => !c.parentId);
  console.log("[Structuring] Found root concepts:", rootConcepts.map(c => c.title));

  // Calculate prerequisites based on relationships
  const prerequisites = relationships
    .filter((r) => r.type === "prerequisite")
    .map((r) => r.sourceId);
  console.log("[Structuring] Prerequisites:", prerequisites.length);

  // Estimate duration based on concept complexity and relationships
  const estimatedDuration = concepts.length * 30; // 30 minutes per concept
  console.log("[Structuring] Estimated duration:", estimatedDuration, "minutes");

  // Calculate difficulty based on concept levels and relationships
  const avgLevel =
    concepts.reduce((sum, c) => sum + c.level, 0) / concepts.length;
  const difficulty = Math.min(Math.ceil(avgLevel / 2), 5) as 1 | 2 | 3 | 4 | 5;
  console.log("[Structuring] Calculated difficulty:", difficulty, "based on average level:", avgLevel.toFixed(2));

  // Extract learning objectives from top-level concepts
  const learningObjectives = rootConcepts.map((c) => c.title);
  console.log("[Structuring] Learning objectives:", learningObjectives);

  const learningPath = {
    id: crypto.randomUUID(),
    title: "Generated Learning Path",
    description: "Automatically generated learning path based on content analysis",
    concepts,
    relationships,
    estimatedDuration,
    difficulty,
    prerequisites,
    learningObjectives,
  };

  console.log("[Structuring] Generated learning path:", {
    id: learningPath.id,
    title: learningPath.title,
    estimatedDuration: learningPath.estimatedDuration,
    difficulty: learningPath.difficulty,
    prerequisitesCount: learningPath.prerequisites.length,
    objectivesCount: learningPath.learningObjectives.length
  });

  return learningPath;
} 