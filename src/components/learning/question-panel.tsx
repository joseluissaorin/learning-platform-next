"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Trash2 } from "lucide-react";
import { type Concept, type Message } from "@/types/learning";
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

interface QuestionPanelProps {
  explanationId: string;
  concept: Concept;
  explanation?: string | null;
}

export function QuestionPanel({ explanationId, concept, explanation }: QuestionPanelProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isSubmitting) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion("");
    setIsSubmitting(true);

    try {
      console.log('Debug - Submitting question with data:', {
        question,
        conceptId: concept.id,
        explanationId,
        hasExplanation: !!explanation,
        explanationLength: explanation?.length || 0
      });

      if (!explanation) {
        console.error('Debug - Missing explanation content');
        throw new Error('Explanation content is missing');
      }

      const response = await fetch('/api/concepts/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          conceptId: concept.id,
          explanationId,
          context: explanation,
        }),
      });

      console.log('Debug - API Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      console.log('Debug - API Response data received');

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Debug - Error details:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
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
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              disabled={isSubmitting || isLoading}
              className="flex-1 bg-background border border-border focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />
            <Button 
              type="submit" 
              size="icon"
              variant="ghost"
              disabled={isSubmitting || isLoading}
              className="h-10 w-10 transition-all duration-200 hover:scale-105"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
} 