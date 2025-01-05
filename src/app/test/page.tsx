"use client";

import { useState } from "react";

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("Sending file:", {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const response = await fetch("/api/test-convert", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      console.log("Response:", data);
      setResult(data);
      setError(null);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload file");
      setResult(null);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test File Upload</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Choose a file to upload:
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
        </div>

        <button
          type="submit"
          disabled={!file}
          className="px-4 py-2 bg-violet-500 text-white rounded-md
            hover:bg-violet-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Upload and Test
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 