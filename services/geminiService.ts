import { GoogleGenAI, Type } from "@google/genai";
import { Machine, TelemetryData } from "../types";

export interface PredictiveAnalysis {
  healthScore: number;
  predictedFailure: string;
  recommendedAction: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasoning: string;
}

export const analyzeMachineHealth = async (
  machine: Machine,
  recentTelemetry: TelemetryData[]
): Promise<PredictiveAnalysis> => {
  // Guidelines: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  if (!process.env.API_KEY) {
    return {
      healthScore: 85,
      predictedFailure: "Simulation: API Key Missing",
      recommendedAction: "Check system configuration.",
      urgency: "LOW",
      reasoning: "The system is running in offline simulation mode."
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are a Senior Reliability Engineer (SRE) for industrial manufacturing.
    Analyze the telemetry data for the following machine:
    
    Machine: ${machine.name} (${machine.type})
    Total Running Hours: ${machine.runningHours}
    
    Recent Telemetry Logs (Last 5 readings):
    ${JSON.stringify(recentTelemetry, null, 2)}
    
    Based on this data, provide a predictive maintenance analysis.
    Return the response in strictly valid JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER, description: "0 to 100 score where 100 is perfect health" },
            predictedFailure: { type: Type.STRING, description: "Potential component failure" },
            recommendedAction: { type: Type.STRING, description: "Specific maintenance action required" },
            urgency: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
            reasoning: { type: Type.STRING, description: "Technical reasoning based on vibration/temp/pressure" }
          },
          required: ["healthScore", "predictedFailure", "recommendedAction", "urgency", "reasoning"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as PredictiveAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
        healthScore: 0,
        predictedFailure: "Analysis Error",
        recommendedAction: "Check logs",
        urgency: "HIGH",
        reasoning: "Failed to connect to AI service."
    };
  }
};