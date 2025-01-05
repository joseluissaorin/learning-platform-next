import { Question, QuestionType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: string) => void;
  showExplanation?: boolean;
}

export function QuestionCard({ question, onAnswer, showExplanation = false }: QuestionCardProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSubmit = () => {
    const answer = question.type === QuestionType.MULTIPLE_CHOICE ? selectedAnswer : textAnswer;
    onAnswer(answer);
    setShowFeedback(true);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{question.text}</CardTitle>
        {showExplanation && question.explanation && (
          <CardDescription>{question.explanation}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {question.type === QuestionType.MULTIPLE_CHOICE && question.options && (
          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            className="space-y-2"
          >
            {(question.options as string[]).map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === QuestionType.OPEN_ENDED && (
          <Textarea
            placeholder="Type your answer here..."
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="min-h-[100px]"
          />
        )}

        {question.type === QuestionType.TRUE_FALSE && (
          <RadioGroup
            value={selectedAnswer}
            onValueChange={setSelectedAnswer}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true">True</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false">False</Label>
            </div>
          </RadioGroup>
        )}

        <Button
          onClick={handleSubmit}
          disabled={
            (question.type === QuestionType.MULTIPLE_CHOICE && !selectedAnswer) ||
            (question.type === QuestionType.OPEN_ENDED && !textAnswer.trim()) ||
            (question.type === QuestionType.TRUE_FALSE && !selectedAnswer)
          }
          className="w-full"
        >
          Submit Answer
        </Button>

        {showFeedback && question.explanation && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-semibold">Explanation:</p>
            <p className="mt-2">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 