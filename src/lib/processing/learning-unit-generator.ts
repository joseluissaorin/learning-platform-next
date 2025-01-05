import { prisma } from '../db/prisma';
import { Anthropic } from '@anthropic-ai/sdk';
import { env } from '@/env.mjs';

export class LearningUnitGenerator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  public async generateUnits(documentId: string, embeddings: number[][]): Promise<void> {
    try {
      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ANALYZING' }
      });

      // Get document content
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          embeddings: true
        }
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Analyze content structure
      const structure = await this.analyzeContentStructure(document.content);

      // Generate learning units
      const units = await this.createLearningUnits(structure, document.id);

      // Generate initial questions for each unit
      await this.generateQuestions(units);

      // Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'COMPLETE' }
      });

    } catch (error) {
      console.error('Error generating learning units:', error);
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'ERROR' }
      });
      throw error;
    }
  }

  private async analyzeContentStructure(content: string): Promise<any> {
    const prompt = `
      Analyze the following content and create a structured learning path.
      Break down the content into logical units, identifying key concepts,
      their relationships, and appropriate learning order.
      
      Content:
      ${content}
      
      Provide the structure in JSON format with:
      - Title
      - Description
      - Prerequisites
      - Key concepts
      - Learning objectives
      - Estimated time
      - Difficulty level
    `;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    try {
      return JSON.parse(message.content[0].text);
    } catch (error) {
      console.error('Error parsing structure:', error);
      throw new Error('Failed to parse content structure');
    }
  }

  private async createLearningUnits(structure: any, documentId: string) {
    const units = [];

    for (const concept of structure.concepts) {
      const unit = await prisma.learningUnit.create({
        data: {
          title: concept.title,
          description: concept.description,
          content: concept.content,
          prerequisites: concept.prerequisites,
          objectives: concept.objectives,
          estimatedTime: concept.estimatedTime,
          difficulty: concept.difficulty,
          order: concept.order,
          documentId
        }
      });
      units.push(unit);
    }

    return units;
  }

  private async generateQuestions(units: any[]) {
    for (const unit of units) {
      const prompt = `
        Generate a set of questions to test understanding of:
        
        Title: ${unit.title}
        Content: ${unit.content}
        Objectives: ${unit.objectives}
        
        Create:
        1. 3 multiple choice questions
        2. 2 open-ended questions
        3. 1 practical application question
        
        Format as JSON with:
        - Question text
        - Type (multiple_choice, open_ended, practical)
        - Options (for multiple choice)
        - Correct answer
        - Explanation
      `;

      const message = await this.anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      try {
        const questions = JSON.parse(message.content[0].text);
        
        // Store questions in database
        for (const question of questions) {
          await prisma.question.create({
            data: {
              text: question.text,
              type: question.type,
              options: question.options,
              correctAnswer: question.correctAnswer,
              explanation: question.explanation,
              learningUnitId: unit.id
            }
          });
        }
      } catch (error) {
        console.error('Error generating questions:', error);
        // Continue with next unit if one fails
        continue;
      }
    }
  }
} 