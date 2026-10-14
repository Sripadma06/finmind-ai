package com.finmind.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public GeminiService(
            @Value("${gemini.api-key}") String apiKey,
            @Value("${gemini.model:gemini-3.8-flash}") String model,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey;
        this.model = model.replace("models/", "");
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    public String askFinancialAdvisor(String userPrompt, String financialContext) {
        String systemInstruction = """
            You are FinMind AI, an intelligent personal financial advisor and assistant.
            Provide concise, practical, actionable financial advice based on the user's accounts, 
            spending patterns, and questions. Format your answers clearly using bullet points when helpful.
            """;

        String combinedPrompt = String.format(
            "%s\n\nFinancial Context of User:\n%s\n\nUser Question:\n%s",
            systemInstruction,
            financialContext != null ? financialContext : "No account history provided yet.",
            userPrompt
        );

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(
                    Map.of("text", combinedPrompt)
                ))
            )
        );

        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + this.model + ":generateContent?key=" + this.apiKey;

        int attempts = 0;
        while (attempts < 3) {
            try {
                String rawJson = restClient.post()
                        .uri(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(rawJson);
                return root.path("candidates")
                        .get(0)
                        .path("content")
                        .path("parts")
                        .get(0)
                        .path("text")
                        .asText();
            } catch (Exception e) {
                attempts++;
                if (attempts >= 3) {
                    return "FinMind AI encountered an issue connecting to Gemini: " + e.getMessage();
                }
                try {
                    Thread.sleep(1500L * attempts);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                }
            }
        }
        return "FinMind AI is currently busy. Please try again shortly.";
    }
}