"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Trash2 } from "lucide-react";
import { type Concept, type Message, type LearningSession } from "@/types/learning";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { messageCacheService } from "@/lib/cache/message-cache";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { v4 as uuidv4 } from 'uuid';
import gemini from "@/lib/gemini";

interface QuestionPanelProps {
  explanationId: string;
  concept: Concept;
  explanation?: string | null;
  session: LearningSession;
}

export function QuestionPanel({ explanationId, concept, explanation, session }: QuestionPanelProps) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load cached messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        if (typeof window !== 'undefined') {
          const cachedMessages = await messageCacheService.getMessages(explanationId);
          setMessages(cachedMessages);
        }
      } catch (error) {
        console.error('Error loading cached messages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [explanationId]);

  // Update cache when messages change
  useEffect(() => {
    const updateCache = async () => {
      if (!isLoading && typeof window !== 'undefined') {
        await messageCacheService.setMessages(explanationId, messages);
      }
    };

    updateCache();
  }, [messages, explanationId, isLoading]);

  const buildContext = (question: string) => {
    // Build a comprehensive context including the full document structure
    const conceptContext = session.concepts
      .map(c => `${c.title}:\n${c.content}`)
      .join('\n\n');

    return `
      You are a helpful AI tutor assisting with questions about concepts in this learning session.
      
      # Session Overview
      Title: ${session.title}
      
      # Full Document Structure
      ${conceptContext}
      
      # Current Concept
      Title: ${concept.title}
      Content: ${explanation || concept.content}
      
      # Instructions
      1. You are currently focused on explaining "${concept.title}", but you have access to the full document context above.
      2. Use the full context to provide comprehensive answers that show how this concept relates to others.
      3. If the question relates to other concepts, mention those relationships explicitly.
      4. Use markdown formatting for better readability.
      5. Answer in the language of the question.
      6. Prioritize accuracy and clarity in your explanations.
      7. If relevant, explain how this concept builds upon or leads to other concepts in the session.
      
      # Student's Question: ${question}
    `;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const newMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setQuestion('');
    setIsSubmitting(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
      }

      const model = gemini.getGenerativeModel({ 
        model: 'gemini-pro'
      });
      model.apiKey = apiKey;

      // Use the enhanced context builder
      const context = buildContext(question);

      const result = await model.generateContent(context);
      const response = await result.response;
      const answer = response.text();

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (typeof window !== 'undefined') {
        await messageCacheService.setMessages(explanationId, [
          ...messages,
          newMessage,
          assistantMessage
        ]);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      if (typeof window !== 'undefined') {
        await messageCacheService.deleteMessages(explanationId);
      }
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  return (
    <Card className="h-full border border-border">
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold mb-2">{concept.title}</h3>
              <p className="text-sm text-muted-foreground">
                Ask questions about this concept to better understand it.
              </p>
            </div>
            {messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all messages in this chat. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearHistory}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear History
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-20rem)] pr-2 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-primary/50 scrollbar-track-transparent">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-muted mr-4'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {(isSubmitting || isLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-muted rounded-lg px-4 py-2 mr-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              </motion.div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isSubmitting || isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isSubmitting || isLoading || !question.trim()}
              className="shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
} 