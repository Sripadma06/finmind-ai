package com.finmind.ai;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AiChatController {

    private final GeminiService geminiService;

    public AiChatController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }

    @PostMapping("/chat")
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        String context = request.getOrDefault("context", "");

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message cannot be empty"));
        }

        try {
            String aiReply = geminiService.askFinancialAdvisor(message, context);
            return ResponseEntity.ok(Map.of("reply", aiReply));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to get AI response: " + e.getMessage()
            ));
        }
    }
}