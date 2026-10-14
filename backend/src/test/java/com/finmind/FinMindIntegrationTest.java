package com.finmind;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end tests against a real PostgreSQL (pgvector image, so all Flyway migrations including V3 run).
 * Skipped automatically when Docker is not available.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class FinMindIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
        r.add("finmind.jwt.secret", () -> "integration-test-secret-integration-test-secret");
        r.add("finmind.jwt.expiry-minutes", () -> "60");
    }

    @Autowired TestRestTemplate http;

    // ---------- helpers ----------

    private HttpHeaders headers(String token, String idempotencyKey) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.setBearerAuth(token);
        if (idempotencyKey != null) h.set("Idempotency-Key", idempotencyKey);
        return h;
    }

    @SuppressWarnings("unchecked")
    private ResponseEntity<Map<String, Object>> call(HttpMethod method, String path, String token, String key, Object body) {
        return (ResponseEntity<Map<String, Object>>) (ResponseEntity<?>) http.exchange(
                path, method, new HttpEntity<>(body, headers(token, key)), Map.class);
    }

    private String registerAndGetToken() {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        var res = call(HttpMethod.POST, "/api/v1/auth/register", null, null,
                Map.of("name", "Test User", "email", email, "password", "correct-horse-battery"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return (String) res.getBody().get("token");
    }

    private String createAccount(String token, String name) {
        var res = call(HttpMethod.POST, "/api/v1/accounts", token, null, Map.of("name", name, "currency", "INR"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        return (String) res.getBody().get("id");
    }

    private void deposit(String token, String accountId, String amount) {
        var res = call(HttpMethod.POST, "/api/v1/accounts/" + accountId + "/deposits", token,
                UUID.randomUUID().toString(), Map.of("amount", amount));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    private String balance(String token, String accountId) {
        var res = call(HttpMethod.GET, "/api/v1/accounts/" + accountId, token, null, null);
        return String.valueOf(res.getBody().get("balance"));
    }

    // ---------- tests ----------

    @Test
    void healthEndpointIsPublic() {
        var res = call(HttpMethod.GET, "/api/v1/health", null, null, null);
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(res.getBody()).containsEntry("status", "UP");
    }

    @Test
    void protectedEndpointsRequireAToken() {
        assertThat(call(HttpMethod.GET, "/api/v1/accounts", null, null, null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(call(HttpMethod.GET, "/api/v1/accounts", "garbage.token.value", null, null).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void registerLoginAndMe() {
        String email = "login-" + UUID.randomUUID() + "@example.com";
        call(HttpMethod.POST, "/api/v1/auth/register", null, null,
                Map.of("name", "Login User", "email", email, "password", "correct-horse-battery"));

        var bad = call(HttpMethod.POST, "/api/v1/auth/login", null, null,
                Map.of("email", email, "password", "wrong-password"));
        assertThat(bad.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        var ok = call(HttpMethod.POST, "/api/v1/auth/login", null, null,
                Map.of("email", email.toUpperCase(), "password", "correct-horse-battery"));
        assertThat(ok.getStatusCode()).isEqualTo(HttpStatus.OK);

        var me = call(HttpMethod.GET, "/api/v1/users/me", (String) ok.getBody().get("token"), null, null);
        assertThat(me.getBody()).containsEntry("email", email);
        assertThat(me.getBody()).doesNotContainKey("passwordHash");
    }

    @Test
    void duplicateEmailIsRejected() {
        String email = "dup-" + UUID.randomUUID() + "@example.com";
        Map<String, String> body = Map.of("name", "Dup", "email", email, "password", "correct-horse-battery");
        assertThat(call(HttpMethod.POST, "/api/v1/auth/register", null, null, body).getStatusCode())
                .isEqualTo(HttpStatus.CREATED);
        assertThat(call(HttpMethod.POST, "/api/v1/auth/register", null, null, body).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void transferMovesMoneyAtomicallyAndRetryIsIdempotent() {
        String token = registerAndGetToken();
        String a = createAccount(token, "Salary");
        String b = createAccount(token, "Savings");
        deposit(token, a, "1000.00");

        Map<String, Object> body = Map.of("fromAccountId", a, "toAccountId", b, "amount", "250.00");
        String key = "transfer-" + UUID.randomUUID();

        var first = call(HttpMethod.POST, "/api/v1/transfers", token, key, body);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        var retry = call(HttpMethod.POST, "/api/v1/transfers", token, key, body);
        assertThat(retry.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(retry.getBody().get("id")).isEqualTo(first.getBody().get("id"));

        assertThat(balance(token, a)).isEqualTo("750.00");
        assertThat(balance(token, b)).isEqualTo("250.00");

        var differentRequestSameKey = call(HttpMethod.POST, "/api/v1/transfers", token, key,
                Map.of("fromAccountId", a, "toAccountId", b, "amount", "1.00"));
        assertThat(differentRequestSameKey.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void overdrawIsRejectedWithoutChangingBalance() {
        String token = registerAndGetToken();
        String a = createAccount(token, "Main");
        deposit(token, a, "100.00");

        var res = call(HttpMethod.POST, "/api/v1/accounts/" + a + "/withdrawals", token,
                UUID.randomUUID().toString(), Map.of("amount", "100.01"));
        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(balance(token, a)).isEqualTo("100.00");
    }

    @Test
    void usersCannotTouchEachOthersAccounts() {
        String alice = registerAndGetToken();
        String bob = registerAndGetToken();
        String aliceAccount = createAccount(alice, "Alice main");
        String bobAccount = createAccount(bob, "Bob main");
        deposit(alice, aliceAccount, "500.00");

        assertThat(call(HttpMethod.GET, "/api/v1/accounts/" + aliceAccount, bob, null, null).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(call(HttpMethod.POST, "/api/v1/accounts/" + aliceAccount + "/withdrawals", bob,
                UUID.randomUUID().toString(), Map.of("amount", "10.00")).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(call(HttpMethod.POST, "/api/v1/transfers", bob, UUID.randomUUID().toString(),
                Map.of("fromAccountId", aliceAccount, "toAccountId", bobAccount, "amount", "10.00")).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(call(HttpMethod.POST, "/api/v1/transfers", alice, UUID.randomUUID().toString(),
                Map.of("fromAccountId", aliceAccount, "toAccountId", bobAccount, "amount", "10.00")).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(balance(alice, aliceAccount)).isEqualTo("500.00");
    }

    @Test
    void concurrentWithdrawalsCannotOverspend() throws Exception {
        String token = registerAndGetToken();
        String a = createAccount(token, "Contended");
        deposit(token, a, "100.00");

        ExecutorService pool = Executors.newFixedThreadPool(10);
        List<Callable<HttpStatus>> jobs = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            jobs.add(() -> (HttpStatus) call(HttpMethod.POST, "/api/v1/accounts/" + a + "/withdrawals", token,
                    UUID.randomUUID().toString(), Map.of("amount", "60.00")).getStatusCode());
        }
        int created = 0;
        for (Future<HttpStatus> f : pool.invokeAll(jobs)) {
            if (f.get() == HttpStatus.CREATED) created++;
        }
        pool.shutdown();

        assertThat(created).isEqualTo(1);
        assertThat(balance(token, a)).isEqualTo("40.00");
    }

    @Test
    void oppositeConcurrentTransfersDoNotDeadlockAndConserveMoney() throws Exception {
        String token = registerAndGetToken();
        String a = createAccount(token, "A");
        String b = createAccount(token, "B");
        deposit(token, a, "1000.00");
        deposit(token, b, "1000.00");

        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Callable<HttpStatus>> jobs = new ArrayList<>();
        for (int i = 0; i < 20; i++) {
            final boolean forward = i % 2 == 0;
            jobs.add(() -> (HttpStatus) call(HttpMethod.POST, "/api/v1/transfers", token,
                    UUID.randomUUID().toString(),
                    Map.of("fromAccountId", forward ? a : b, "toAccountId", forward ? b : a, "amount", "5.00"))
                    .getStatusCode());
        }
        for (Future<HttpStatus> f : pool.invokeAll(jobs)) {
            assertThat(f.get()).isEqualTo(HttpStatus.CREATED);
        }
        pool.shutdown();

        // 10 transfers each way of 5.00: balances unchanged, total conserved.
        assertThat(balance(token, a)).isEqualTo("1000.00");
        assertThat(balance(token, b)).isEqualTo("1000.00");
    }

    @Test
    void transactionHistoryIsPaginatedFilteredAndOwnerScoped() {
        String token = registerAndGetToken();
        String other = registerAndGetToken();
        String a = createAccount(token, "History");
        String otherAccount = createAccount(other, "Other");
        for (int i = 0; i < 3; i++) deposit(token, a, "10.00");
        deposit(other, otherAccount, "99.00");

        var page = call(HttpMethod.GET, "/api/v1/transactions?size=2&type=DEPOSIT", token, null, null);
        assertThat(page.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<?>) page.getBody().get("content")).hasSize(2);
        assertThat(((Number) page.getBody().get("totalElements")).intValue()).isEqualTo(3);

        assertThat(call(HttpMethod.GET, "/api/v1/transactions?accountId=" + otherAccount, token, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(call(HttpMethod.GET, "/api/v1/transactions?size=1000", token, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(call(HttpMethod.GET, "/api/v1/transactions?from=2020-01-01&to=2026-01-01", token, null, null)
                .getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void missingIdempotencyKeyAndInvalidAmountAreBadRequests() {
        String token = registerAndGetToken();
        String a = createAccount(token, "Validation");

        assertThat(call(HttpMethod.POST, "/api/v1/accounts/" + a + "/deposits", token, null,
                Map.of("amount", "10.00")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(call(HttpMethod.POST, "/api/v1/accounts/" + a + "/deposits", token, "key-1234",
                Map.of("amount", "-5")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(call(HttpMethod.POST, "/api/v1/accounts/" + a + "/deposits", token, "key-1235",
                Map.of("amount", "1.005")).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
