package com.finmind.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);
    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    private static final int MAX_ATTEMPTS = 3;

    private static final String SYSTEM_INSTRUCTION = """
            You are FinMind AI, an intelligent personal financial advisor and assistant.
            Provide concise, practical, actionable financial advice based on the user's accounts,
            spending patterns, and questions. Format your answers clearly using bullet points when helpful.
            """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;

    public GeminiService(
            @Value("${gemini.api-key}") String apiKey,
            @Value("${gemini.model:gemini-3.8-flash}") String model,
            ObjectMapper objectMapper) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        // Normalise: trim whitespace/quotes and accept both "gemini-2.5-flash" and "models/gemini-2.5-flash".
        this.model = model.trim().replace("\"", "").replace("models/", "");
        this.objectMapper = objectMapper;
        // baseUrl + URI template => the model name is encoded as a path segment, and the API key
        // travels in a header instead of the query string (so it never ends up in URLs/logs).
        this.restClient = RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader("x-goog-api-key", this.apiKey)
                .build();
        log.info("GeminiService configured with model '{}'", this.model);
    }

    public String askFinancialAdvisor(String userPrompt, String financialContext) {
        String userText = String.format(
                "Financial Context of User:\n%s\n\nUser Question:\n%s",
                financialContext != null ? financialContext : "No account history provided yet.",
                userPrompt);

        Map<String, Object> requestBody = Map.of(
                "systemInstruction", Map.of(
                        "parts", List.of(Map.of("text", SYSTEM_INSTRUCTION))),
                "contents", List.of(
                        Map.of("role", "user",
                                "parts", List.of(Map.of("text", userText)))));

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                // Resolves to: POST {BASE_URL}/models/{model}:generateContent
                String rawJson = restClient.post()
                        .uri("/models/{model}:generateContent", this.model)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                return extractText(rawJson);

            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                log.warn("Gemini call failed (attempt {}/{}): HTTP {} for model '{}': {}",
                        attempt, MAX_ATTEMPTS, status, this.model, e.getResponseBodyAsString());

                // Only 429 and 5xx are worth retrying. A 404 (unknown model) or 400/403 (bad request / key)
                // will fail identically every time.
                boolean retryable = status == 429 || status >= 500;
                if (!retryable || attempt == MAX_ATTEMPTS) {
                    return "FinMind AI encountered an issue connecting to Gemini (HTTP " + status + "): "
                            + e.getResponseBodyAsString();
                }
                backoff(attempt);

            } catch (Exception e) {
                log.warn("Gemini call failed (attempt {}/{}): {}", attempt, MAX_ATTEMPTS, e.toString());
                if (attempt == MAX_ATTEMPTS) {
                    return "FinMind AI encountered an issue connecting to Gemini: " + e.getMessage();
                }
                backoff(attempt);
            }
        }
        return "FinMind AI is currently busy. Please try again shortly.";
    }

    private String extractText(String rawJson) throws Exception {
        JsonNode root = objectMapper.readTree(rawJson);
        JsonNode parts = root.path("candidates").path(0).path("content").path("parts");

        StringBuilder sb = new StringBuilder();
        for (JsonNode part : parts) {
            sb.append(part.path("text").asText(""));
        }
        if (sb.length() == 0) {
            String reason = root.path("promptFeedback").path("blockReason").asText(
                    root.path("candidates").path(0).path("finishReason").asText("unknown"));
            return "FinMind AI could not generate a response (reason: " + reason + ").";
        }
        return sb.toString();
    }

    private void backoff(int attempt) {
        try {
            Thread.sleep(1500L * attempt);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}