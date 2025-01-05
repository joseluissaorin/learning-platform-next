#!/home/joseluis/Dev/VideoSummary/venv_videosummary/bin/python

import sys
import os
import re
import argparse
import logging
import asyncio
from dotenv import load_dotenv
from transcription import Transcribe
from newllmrouter import LLMRouter
from pathlib import Path
import random 
import json
import hashlib
import math
import io

# Load environment variables from .env file
load_dotenv()

anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
openai_api_key = os.getenv("OPENAI_API_KEY")
deepinfra_api_key = os.getenv("DEEPINFRA_API_KEY")
gemini_api_key = os.getenv("GEMINI_API_KEY")

llm_router = LLMRouter(
    anthropic_api_key=anthropic_api_key,
    openai_api_key=openai_api_key,
    deepinfra_api_key=deepinfra_api_key,
    gemini_api_key=gemini_api_key
)

class Summarizer:
    def __init__(self, input_path, output_path, lang='es', easy_to_understand=False, summary_type='medium', skip_repetition_evaluation=False, log_to_file=True, model='claude-3-opus-20240229'):
        # Initialize logging first
        self.log_stream = io.StringIO()
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Add stream handler for capturing logs
        stream_handler = logging.StreamHandler(self.log_stream)
        stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(stream_handler)
        
        # Add file handler if log_to_file is True
        if log_to_file:
            file_handler = logging.FileHandler('summarizer.log')
            file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
            self.logger.addHandler(file_handler)

        # Initialize other attributes
        self.input_path = input_path
        self.output_path = output_path
        self.lang = lang
        self.easy_to_understand = easy_to_understand
        self.summary_type = summary_type
        self.skip_repetition_evaluation = skip_repetition_evaluation
        self.model = model
        self.total_word_count = 0
        self.sections = []
        self.summarized_sections = []
        self.last_200_words = ""
        self.subdivision_factor = 1.0
        self.max_subdivision_factor = 50
        self.min_summary_ratio = 0.05
        self.wiggle_room = 0.06
        self.target_percentages = {
            'nano': 0.01,
            'micro': 0.05,
            'very_short': 0.1,
            'shorter': 0.15,
            'short': 0.23,
            'medium_short': 0.33,
            'medium': 0.4,
            'medium_long': 0.62,
            'long': 0.8
        }
        self.previous_summaries = []
        self.tokens_per_summary = 515
        
        # Set model-specific parameters
        if 'claude' in model.lower():
            self.words_per_token = 0.36
            self.temperature = 0.95
        elif 'gpt' in model.lower():
            self.words_per_token = 2.9
            self.temperature = 1.75
        elif 'gemini' in model.lower():
            self.words_per_token = 0.247
            self.temperature = 1.75
        else:  # Default to Claude's settings
            self.words_per_token = 0.36
            self.temperature = 0.95
            
        self.logger.info(f"Using words per token ratio of {self.words_per_token} and temperature {self.temperature} for model {model}")

        # Public attributes for progress tracking
        self.target_subdivisions = 0
        self.current_subdivisions = 0
            
        self.logger.info(f"Initialized Summarizer with input_path: {input_path}, output_path: {output_path}, summary_type: {summary_type}, skip_repetition_evaluation: {skip_repetition_evaluation}")

    def get_logs(self):
        """Return captured log output"""
        return self.log_stream.getvalue()

    def read_file_to_string(self, file_path):
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            self.logger.info(f"File {file_path} read successfully with utf-8 encoding.")
            return content
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as file:
                    content = file.read()
                self.logger.info(f"File {file_path} read successfully with latin-1 encoding.")
                return content
            except Exception as e:
                self.logger.error(f"Error reading file {file_path}: {str(e)}")
                return None

    async def process_text(self, text):
        self.logger.info("Processing text.")
        self.total_word_count = len(text.split())
        self.logger.info(f"Total word count: {self.total_word_count}")
        
        if self.is_markdown(text):
            self.logger.info("Markdown format detected.")
            self.sections = self.divide_markdown(text)
        else:
            self.logger.info("Plain text format detected.")
            self.sections = [{'header': '', 'content': text}]
        
        self.sections = self.adjust_sections(self.sections)
        self.logger.info(f"Total sections after adjustment: {len(self.sections)}")
        
        await self.summarize_subsections()

    def is_markdown(self, text):
        # Simple check for markdown headers
        return bool(re.search(r'^#{1,6}\s', text, re.MULTILINE))

    def divide_markdown(self, text):
        self.logger.info("Dividing text into sections based on markdown headers and ordered lists.")
        sections = []
        lines = text.split('\n')
        current_section = {'header': '', 'content': ''}
        
        for line in lines:
            if re.match(r'^#{1,6}\s', line):  # Header
                if current_section['content']:
                    sections.append(current_section)
                    current_section = {'header': '', 'content': ''}
                current_section['header'] = line
            elif re.match(r'^\d+\.\s', line):  # Ordered list item
                if current_section['content']:
                    sections.append(current_section)
                    current_section = {'header': '', 'content': ''}
                current_section['header'] = 'List'
                current_section['content'] += line + '\n'
            else:
                current_section['content'] += line + '\n'
        
        if current_section['content']:
            sections.append(current_section)
        
        return sections

    def adjust_sections(self, sections):
        self.logger.info("Adjusting sections to fit word count constraints.")
        adjusted_sections = []
        for section in sections:
            content_words = section['content'].split()
            word_count = len(content_words)
            
            if word_count <= 4000:
                adjusted_sections.append(section)
            else:
                # Need to go deeper into subsections
                subsections = self.divide_into_subsections(section)
                adjusted_sections.extend(subsections)
        
        return adjusted_sections
    
    def format_section_as_list(self, text):
        # Define regex patterns for different list formats
        patterns = [
            (r'\b(\d+\.)\s', '{}. '),  # Numbered list: 1. 2. 3.
            (r'\b([a-z]\.)\s', '{}. '),  # Lowercase letter list: a. b. c.
            (r'\b([A-Z]\.)\s', '{}. '),  # Uppercase letter list: A. B. C.
            (r'\b([ivx]+\.)\s', '{}. '),  # Roman numeral list: i. ii. iii.
            (r'\b([a-z]\))\s', '{}) '),  # Lowercase letter with parenthesis: a) b) c)
            (r'\b(\d+\))\s', '{}) '),  # Number with parenthesis: 1) 2) 3)
        ]

        formatted_text = text
        for pattern, format_string in patterns:
            matches = re.findall(pattern, formatted_text)
            if matches:
                for i, match in enumerate(matches, start=1):
                    formatted_text = formatted_text.replace(match, format_string.format(match[:-1]), 1)
                break  # Use the first matching pattern

        return formatted_text

    def divide_into_subsections(self, section):
        self.logger.info(f"Dividing section '{section['header']}' into subsections.")
        content = section['content']
        lines = content.split('\n')
        subsections = []
        current_subsection = {'header': '', 'content': ''}
        header_pattern = re.compile(r'^(#{1,6}) (.+)')
        
        for line in lines:
            header_match = header_pattern.match(line)
            if header_match:
                if current_subsection['content']:
                    subsections.append(current_subsection)
                    current_subsection = {'header': '', 'content': ''}
                
                current_subsection['header'] = line
            else:
                current_subsection['content'] += line + '\n'
        
        if current_subsection['content']:
            subsections.append(current_subsection)
        
        return subsections

    def subdivide_section(self, section_content):
        words = section_content.split()
        total_words = len(words)
        
        # Calculate chunk size based on target subdivisions
        target_chunk_size = max(150, total_words // self.target_subdivisions)
        
        subdivisions = []
        start = 0
        while start < total_words:
            end = min(start + target_chunk_size, total_words)
            
            # Adjust to end at a sentence boundary
            while end < total_words and not words[end - 1].endswith(('.', '!', '?')):
                end += 1
                if end - start > target_chunk_size * 1.5:  # Prevent runaway sentences
                    break
            
            subdivision = ' '.join(words[start:end])
            subdivisions.append(subdivision)
            start = end

        return subdivisions

    def merge_short_subdivisions(self, subdivisions):
        merged_subdivisions = []
        current_subdivision = ""
        for subdivision in subdivisions:
            if len(current_subdivision.split()) + len(subdivision.split()) < 150:
                current_subdivision += " " + subdivision
            else:
                if current_subdivision:
                    merged_subdivisions.append(current_subdivision.strip())
                current_subdivision = subdivision
        if current_subdivision:
            merged_subdivisions.append(current_subdivision.strip())
        return merged_subdivisions

    def merge_subdivisions(self, subdivisions, target_subdivisions):
        self.logger.info(f"Merging subdivisions to target {target_subdivisions} subdivisions.")
        if len(subdivisions) <= target_subdivisions:
            return subdivisions
        
        # Calculate optimal merge size
        total_words = sum(len(s.split()) for s in subdivisions)
        target_words_per_subdivision = total_words / target_subdivisions
        
        merged = []
        current = []
        current_words = 0
        
        for subdivision in subdivisions:
            subdivision_words = len(subdivision.split())
            
            if current_words + subdivision_words > target_words_per_subdivision * 1.2 and len(merged) < target_subdivisions - 1:
                merged.append(" ".join(current))
                current = [subdivision]
                current_words = subdivision_words
            else:
                current.append(subdivision)
                current_words += subdivision_words
        
        # Add remaining content as last subdivision
        if current:
            merged.append(" ".join(current))
        
        return merged

    async def summarize_subsections(self):
        self.logger.info("Summarizing each subsection.")
        target_word_count = int(self.total_word_count * self.target_percentages[self.summary_type])
        self.target_subdivisions = max(1, int(target_word_count / (self.tokens_per_summary * self.words_per_token)))
        self.logger.info(f"Target subdivisions: {self.target_subdivisions}")
        
        lower_bound = int(target_word_count - 350)
        upper_bound = int(target_word_count + 350)
        self.logger.info(f"Target word count: {target_word_count} (range: {lower_bound} - {upper_bound})")

        # First attempt: Try direct calculation approach
        all_subdivisions = []
        for section in self.sections:
            subdivisions = self.subdivide_section(section['content'])
            all_subdivisions.extend(subdivisions)
        
        # Adjust to target number of subdivisions
        if len(all_subdivisions) > self.target_subdivisions:
            all_subdivisions = self.merge_subdivisions(all_subdivisions, self.target_subdivisions)
        elif len(all_subdivisions) < self.target_subdivisions:
            # If we have too few subdivisions, try to split the longest ones
            while len(all_subdivisions) < self.target_subdivisions:
                longest_idx = max(range(len(all_subdivisions)), key=lambda i: len(all_subdivisions[i].split()))
                longest_subdivision = all_subdivisions.pop(longest_idx)
                new_subdivisions = self.subdivide_section(longest_subdivision)
                if len(new_subdivisions) == 1:  # Can't split further
                    all_subdivisions.insert(longest_idx, longest_subdivision)
                    break
                all_subdivisions.extend(new_subdivisions)

        # Check if we're within expected length
        estimated_words = self.estimate_summary_length(all_subdivisions, self.target_subdivisions)
        if lower_bound <= estimated_words <= upper_bound:
            self.logger.info(f"Direct calculation successful. Estimated words: {estimated_words}")
        else:
            # Fallback to iteration approach if direct calculation fails
            self.logger.info(f"Direct calculation resulted in {estimated_words} words. Falling back to iteration approach.")
            
            iteration = 0
            max_iterations = 15

            while iteration < max_iterations:
                iteration += 1
                self.logger.info(f"Starting iteration {iteration} for summarization.")
                self.summarized_sections = []
                current_word_count = 0
                all_subdivisions = []

                for section in self.sections:
                    content = section['content']
                    subdivisions = self.subdivide_section(content)
                    
                    # First try formatting as list to get more subdivisions
                    if len(subdivisions) < self.target_subdivisions:
                        formatted_content = self.format_section_as_list(content)
                        subdivisions = self.subdivide_section(formatted_content)
                    
                    # If still not enough subdivisions, decrease subdivision factor
                    while len(subdivisions) < self.target_subdivisions and self.subdivision_factor > 0.1:
                        self.subdivision_factor *= 0.5
                        subdivisions = self.subdivide_section(content)
                    
                    # If too many subdivisions, merge them
                    if len(subdivisions) > self.target_subdivisions:
                        subdivisions = self.merge_subdivisions(subdivisions, self.target_subdivisions)
                    
                    all_subdivisions.extend(subdivisions)
                
                # Ensure we have exactly target_subdivisions
                if len(all_subdivisions) > self.target_subdivisions:
                    all_subdivisions = self.merge_subdivisions(all_subdivisions, self.target_subdivisions)

                estimated_words = self.estimate_summary_length(all_subdivisions, self.target_subdivisions)
                self.logger.info(f"Iteration {iteration}: Estimated summary length: {estimated_words:.2f} words")

                if estimated_words < lower_bound:
                    self.subdivision_factor *= 0.5
                    self.logger.info(f"Estimated summary too short ({estimated_words} < {lower_bound}). Decreasing subdivision factor to {self.subdivision_factor}")
                    continue
                elif estimated_words > upper_bound:
                    self.subdivision_factor *= 2
                    if self.subdivision_factor > self.max_subdivision_factor:
                        self.subdivision_factor = self.max_subdivision_factor
                        self.logger.warning(f"Subdivision factor capped at {self.max_subdivision_factor}.")
                    self.logger.info(f"Estimated summary too long ({estimated_words} > {upper_bound}). Increasing subdivision factor to {self.subdivision_factor}")
                    continue
                
                break
            else:
                self.logger.warning("Maximum iterations reached. Proceeding with best attempt.")

        # Process the subdivisions
        for i, subdivision in enumerate(all_subdivisions):
            self.current_subdivisions = i + 1
            self.logger.info(f"Summarizing subdivision {self.current_subdivisions}/{len(all_subdivisions)}")
            summary = await self.ask_for_summary(subdivision)
            self.summarized_sections.append({'header': '', 'content': summary})
            current_word_count = sum(len(section['content'].split()) for section in self.summarized_sections)
            self.last_200_words = ' '.join(summary.split()[-200:])
            self.previous_summaries.append(summary)
            self.logger.info(f"Current word count: {current_word_count}")

        if not self.skip_repetition_evaluation:
            await self.evaluate_repetitions()
        
        self.save_summarized_sections()

    def estimate_summary_length(self, subdivisions, target_subdivisions):
        print(f"Words per token ratio: {self.words_per_token}")
        actual_subdivisions = len(subdivisions)
        total_tokens = actual_subdivisions * self.tokens_per_summary
        estimated_words = total_tokens * self.words_per_token
        print(f"Estimated words: {estimated_words}")
        self.logger.info(f"Estimating summary length: {total_tokens} tokens ({actual_subdivisions} subdivisions) * {self.words_per_token} words/token = {estimated_words} words")
        return math.ceil(estimated_words)

    async def ask_for_summary(self, text):
        context = " ".join(self.last_200_words)
        structured_outline = await self.generate_structured_outline(text)
        messages = [
            {"role": "user", "content": f"## Context: {context}\n\n## Structured Outline: {structured_outline}\n\n## Text to summarize: {text}\n\n## Instructions: Summarize the text above. Maintain the most important information and ensure the summary is substantive. Do not write lists or numbered items unless they are explicitly written in the given text. Write a cohesive text. Output in markdown."}
        ]
        
        language_map = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'it': 'Italian',
        }
        language = language_map.get(self.lang, 'Spanish')
        
        # easy_to_understand_text = "but easy to understand. You must easily explain complex topics in such way that they are understandable to anyone. That means you must not use technical jargon or complex words, you must use simple words and explain the topics in a way that is easy to understand. Also, explain in great detail each topic and subtopic, possibly even stop just to explain a single word or concept if it's necessary. Write thoroughs explanations that take as much space as necessary for explaining these concepts in a way as such that everyone can understand it. " if self.easy_to_understand else "that that would be used in academia"
        easy_to_understand_text = "but easy to understand. You must easily explain complex topics in such way that they are understandable to anyone. That means you must not use technical jargon or complex words, you must use simple words and explain the topics in a way that is easy to understand. Also, explain in great detail each topic and subtopic, possibly even stop just to explain a single word or concept if it's necessary. Write thoroughs explanations that take as much space as necessary for explaining these concepts in a way as such that everyone can understand it. You must divide the answer in two parts: Summary/Resumen/Résumé and Explanation/Explicación/Explication. Only write in the language it is needed, if it is in English:Summary / Explanation, if it is in Spanish: Resumen / Explicación, if it is in French: Résumé / Explication. Use Header 2 (##) To indicate this divide. The first part must be a summary of the text, the second part must be an explanation of the text. The summary must be a concise summary of the text, the explanation must be a detailed explanation of the text. The summary must be in the same language as the text, the explanation must be in the same language as the text." if self.easy_to_understand else "that that would be used in academia"

        # Adjust max tokens based on easy_to_understand setting
        max_tokens = self.tokens_per_summary * 2 if self.easy_to_understand else self.tokens_per_summary
        max_tokens = int(max_tokens * (1 + (random.uniform(-0.1, 0.1))))
        
        system_prompt = (
            f"You are a helpful and knowledgeable assistant specialized in summarizing texts. "
            f"You will understand the given text and its underlying syntax, which might not be evident. "
            f"You will keep the most essential information and optimizing for space, this may include "
            f"specific names, theories, dates, lists and definitions. Follow the provided structured outline "
            f"to maintain the organization of ideas, you are only talking about the text provided, so you "
            f"must not mention anything outside of it or in the outline, this is given to you so that you "
            f"know what not to write about. You must answer in precise and technically perfect Spanish, "
            f"{easy_to_understand_text}. You must make no mention to the fact that you are summarizing "
            f"anything or that you've been given any text but rather you must write the text as one that "
            f"exists by itself. You must not reference the document. Keep in mind the context if provided "
            f"and then make a seamless transition and do not repeat yourself if possible. You must do all "
            f"of this in markdown. Remember to answer in {language}. Take a deep breath and think step by step."
        )
        
        summary_text = await llm_router.generate(
            model=self.model,
            max_tokens=max_tokens,
            messages=messages,
            temperature=self.temperature,
            top_p=0.9,
            stop_sequences=["User:", "Human:", "Assistant:"],
            system=system_prompt
        )
        return summary_text

    async def generate_structured_outline(self, text):
        # Generate hash of first 50 words
        first_50_words = ' '.join(text.split()[:50])
        text_hash = hashlib.md5(first_50_words.encode()).hexdigest()

        cache_file = 'outline_cache.json'

        # Check if cache file exists and load it
        if os.path.exists(cache_file):
            with open(cache_file, 'r') as f:
                cache = json.load(f)
        else:
            cache = {}

        # If hash exists in cache, return cached outline
        if text_hash in cache:
            return cache[text_hash]

        # If not in cache, generate new outline
        outline_prompt = f"Generate a brief structured outline for the following text. The outline should capture the main topics and subtopics, providing a clear organization of ideas:\n\n{text}"
        outline_messages = [{"role": "user", "content": outline_prompt}]
        
        outline = await llm_router.generate(
            model=self.model,
            max_tokens=200,
            messages=outline_messages,
            temperature=0.7,
            top_p=0.9,
            system="You are an expert at creating concise, well-structured outlines. Generate a brief outline that captures the main topics and subtopics of the given text, providing a clear organization of ideas."
        )

        # Save new outline to cache
        cache[text_hash] = outline
        with open(cache_file, 'w') as f:
            json.dump(cache, f)

        return outline

    async def evaluate_repetitions(self):
        self.logger.info("Evaluating repetitions in the summary.")
        combined_summary = " ".join([section['content'] for section in self.summarized_sections])
        
        messages = [
            {"role": "user", "content": f"Analyze the following summary for repetitions or redundant information. If found, provide a revised version without repetitions, maintaining the same level of detail and approximately the same length. If no significant repetitions are found, return the original summary unchanged.\n\nSummary to analyze:\n{combined_summary}\n\nRevised summary (or original if no changes):"}
        ]

        response = await llm_router.generate(
            model=self.model,
            messages=messages,
            max_tokens=1000,
            temperature=0.7,
            top_p=0.9
        )
        
        if response != combined_summary:
            self.logger.info("Repetitions found and removed. Updating summary.")
            self.summarized_sections = [{'header': '', 'content': response}]
        else:
            self.logger.info("No significant repetitions found.")

    def save_summarized_sections(self):
        self.logger.info(f"Saving summarized content to {self.output_path}")
        with open(self.output_path, 'w', encoding='utf-8') as f:
            for section in self.summarized_sections:
                if section['header']:
                    f.write(f"{section['header']}\n\n")
                f.write(f"{section['content']}\n\n")
        self.logger.info("Summary saved successfully.")

    async def process_file(self):
        file_content = self.read_file_to_string(self.input_path)
        if file_content:
            self.logger.info("File content read successfully.")
            await self.process_text(file_content)
        else:
            self.logger.error("Failed to read file content.")

    def process_transcription(self, transcribed_text_path):
        transcribed_text = self.read_file_to_string(transcribed_text_path)
        if transcribed_text:
            self.logger.info("Transcription completed successfully.")
            self.input_path = transcribed_text_path
            self.process_text(transcribed_text)
        else:
            self.logger.error("Failed to transcribe video/audio.")

    async def summarize_text(self, text, context=""):
        try:
            messages = [
                {"role": "system", "content": "You are a helpful assistant that creates concise and accurate summaries."},
                {"role": "user", "content": f"Please summarize the following text. Context: {context}\n\nText to summarize:\n{text}"}
            ]
            
            response = await llm_router.generate(
                model=self.model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
                top_p=0.9
            )
            
            return response
        except Exception as e:
            self.logger.error(f"Error in summarize_text: {str(e)}")
            return None

def process_url(url, output_path='transcription.txt', language='en'):
    transcriber = Transcribe(youtube_url=url, output_transcription_path=output_path, language=language)
    transcribed_text_path = transcriber.transcribe()
    return transcribed_text_path

def process_audio(audio_file, output_path='transcription.txt', language='en'):
    transcriber = Transcribe(audio_file_path=audio_file, output_transcription_path=output_path, language=language)
    transcribed_text_path = transcriber.transcribe()
    return transcribed_text_path

def main():
    parser = argparse.ArgumentParser(description='Summarize text from files or transcribe and summarize from YouTube URLs or audio files.')
    parser.add_argument('input', type=str, help='The text file to summarize, YouTube URL to transcribe and summarize, or audio file to transcribe and summarize')
    parser.add_argument('--type', type=str, choices=['file', 'url', 'audio'], default='file', help='Input type: file, url, or audio')
    parser.add_argument('--summary_length', type=str, choices=['nano', 'micro', 'very_short', 'shorter', 'short', 'medium_short', 'medium', 'medium_long', 'long'], default='medium', help='Summary length: nano (1%), micro (5%), very_short (10%), shorter (15%), short (23%), medium_short (33%), medium (40%), medium_long (62%), long (80%)')
    parser.add_argument('-o', '--output', type=str, default='transcription.txt', help='Output transcription file path.')
    parser.add_argument('--easy', action='store_true', help='Summarize in a way that is easy to understand')
    parser.add_argument('--lang', type=str, default='es', help='Language of the input (default: es)')
    parser.add_argument('--skip_repetition', action='store_true', help='Skip repetition evaluation')
    parser.add_argument('--model', type=str, default='gemini-1.5-pro', help='LLM model to use for summarization')
    args = parser.parse_args()

    if args.type == 'url':
        transcribed_text_path = process_url(args.input, args.output, args.lang)
    elif args.type == 'audio':
        transcribed_text_path = process_audio(args.input, args.output, args.lang)
    else:
        transcribed_text_path = args.input

    summarizer = Summarizer(
        input_path=transcribed_text_path,
        output_path=args.output,
        lang=args.lang,
        easy_to_understand=args.easy,
        summary_type=args.summary_length,
        skip_repetition_evaluation=args.skip_repetition,
        log_to_file=True,
        model=args.model
    )
    
    # Create event loop and run process_file asynchronously
    loop = asyncio.get_event_loop()
    loop.run_until_complete(summarizer.process_file())

if __name__ == "__main__":
    main()

    