import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuestionPanel } from '../question-panel';
import { messageCacheService } from '@/lib/cache/message-cache';
import gemini from '@/lib/gemini';

// Mock dependencies
jest.mock('@/lib/cache/message-cache');
jest.mock('@/lib/gemini');

describe('QuestionPanel', () => {
  const mockProps = {
    explanationId: 'test-explanation',
    concept: {
      id: 'test-concept',
      title: 'Test Concept',
      content: 'Test content'
    },
    explanation: 'Test explanation'
  };

  const mockMessages = [
    {
      id: '1',
      role: 'user',
      content: 'Test question',
      timestamp: new Date()
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Test answer',
      timestamp: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (messageCacheService.getMessages as jest.Mock).mockResolvedValue([]);
  });

  it('should render correctly', async () => {
    render(<QuestionPanel {...mockProps} />);

    expect(screen.getByText(mockProps.concept.title)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask a question/i)).toBeInTheDocument();
  });

  it('should load cached messages on mount', async () => {
    (messageCacheService.getMessages as jest.Mock).mockResolvedValue(mockMessages);

    render(<QuestionPanel {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument();
      expect(screen.getByText('Test answer')).toBeInTheDocument();
    });

    expect(messageCacheService.getMessages).toHaveBeenCalledWith(mockProps.explanationId);
  });

  it('should handle question submission', async () => {
    const mockResponse = 'Generated response';
    (gemini.getGenerativeModel as jest.Mock).mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => mockResponse }
      })
    });

    render(<QuestionPanel {...mockProps} />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'New question' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New question')).toBeInTheDocument();
      expect(screen.getByText(mockResponse)).toBeInTheDocument();
    });

    expect(messageCacheService.setMessages).toHaveBeenCalled();
  });

  it('should handle errors during question submission', async () => {
    const mockError = new Error('Generation error');
    (gemini.getGenerativeModel as jest.Mock).mockReturnValue({
      generateContent: jest.fn().mockRejectedValue(mockError)
    });

    render(<QuestionPanel {...mockProps} />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'New question' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Generation error/)).toBeInTheDocument();
    });
  });

  it('should clear chat history', async () => {
    (messageCacheService.getMessages as jest.Mock).mockResolvedValue(mockMessages);

    render(<QuestionPanel {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Test question')).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);

    const confirmButton = screen.getByRole('button', { name: /clear history/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.queryByText('Test question')).not.toBeInTheDocument();
      expect(screen.queryByText('Test answer')).not.toBeInTheDocument();
    });

    expect(messageCacheService.deleteMessages).toHaveBeenCalledWith(mockProps.explanationId);
  });

  it('should disable input while submitting', async () => {
    render(<QuestionPanel {...mockProps} />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'New question' } });
    fireEvent.click(submitButton);

    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(input).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should show loading indicator while submitting', async () => {
    render(<QuestionPanel {...mockProps} />);

    const input = screen.getByPlaceholderText(/ask a question/i);
    const submitButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'New question' } });
    fireEvent.click(submitButton);

    expect(screen.getByRole('status')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });
}); 