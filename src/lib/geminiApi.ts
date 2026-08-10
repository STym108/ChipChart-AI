import { QuestionnaireAnswers } from "@/store/questionnaireStore";
import { PCBuild, LaptopRecommendation } from "./recommendationEngine";
//in this module we are using backend to fetch the recommendations for the pc and laptops
//the backend returns the recommendations in the form of JSON objects.

const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:5001';

/*
=============================================================================
PC BUILD RECOMMENDER (PROXIED TO BACKEND)
=============================================================================
*/
export async function fetchGeminiPCBuilds(
  answers: QuestionnaireAnswers
): Promise<PCBuild[]> {
  try {
    console.log(`[Frontend API] Requesting PC recommendations from backend: ${API_BASE_URL}/api/recommend/pc`);

    const response = await fetch(`${API_BASE_URL}/api/recommend/pc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answers),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    const data: PCBuild[] = await response.json();
    return data;
  } catch (error: any) {
    console.error("PC Build Proxy Error:", error);
    throw error;
  }
}

/*
=============================================================================
LAPTOP RECOMMENDER (PROXIED TO BACKEND)
=============================================================================
*/
export async function fetchGeminiLaptops(
  answers: QuestionnaireAnswers
): Promise<LaptopRecommendation[]> {
  try {
    console.log(`[Frontend API] Requesting Laptop recommendations from backend: ${API_BASE_URL}/api/recommend/laptops`);

    const response = await fetch(`${API_BASE_URL}/api/recommend/laptops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answers),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${response.status}`);
    }

    const data: LaptopRecommendation[] = await response.json();
    return data;
  } catch (error: any) {
    console.error("Laptop Proxy Error:", error);
    throw error;
  }
}
