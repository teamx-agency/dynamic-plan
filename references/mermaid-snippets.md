# Mermaid Wireframe Snippets

Ready-to-paste Mermaid diagrams organized by use case. Drop them inside
`<Mermaid chart="..." code={`...`} />`.

## 1. Login / Auth flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend
    participant IDP as IdP
    U->>FE: Click "Sign in with Google"
    FE->>API: GET /auth/oauth/google/start
    API->>IDP: 302 Redirect (state, scope)
    IDP-->>U: Consent screen
    U->>IDP: Approve
    IDP->>API: /auth/oauth/google/callback?code=…
    API->>IDP: Exchange code for tokens
    IDP-->>API: access_token, id_token
    API->>API: Upsert user, issue JWT
    API-->>FE: 302 → /dashboard (Set-Cookie)
```

## 2. CRUD list + detail

```mermaid
flowchart TD
    A[Table view] -->|click row| B[Detail view]
    A -->|click +| C[Create form]
    B -->|Edit| D[Edit form]
    B -->|Delete| E{Confirm?}
    E -->|Yes| F[DELETE /items/:id]
    E -->|No| B
    C --> G[POST /items]
    D --> H[PUT /items/:id]
    F --> A
    G --> A
    H --> A
```

## 3. Multi-step wizard

```mermaid
stateDiagram-v2
    [*] --> Step1_Basics
    Step1_Basics --> Step2_Payment: Next
    Step1_Basics --> [*]: Cancel
    Step2_Payment --> Step3_Review: Next
    Step2_Payment --> Step1_Basics: Back
    Step3_Review --> Submitting: Confirm
    Submitting --> Success: 201 Created
    Submitting --> Error: 4xx/5xx
    Error --> Step3_Review: Retry
    Success --> [*]
```

## 4. Data model (class diagram)

```mermaid
classDiagram
    class User {
      +UUID id
      +string email
      +string password_hash
      +datetime created_at
      +login()
      +logout()
    }
    class Session {
      +UUID id
      +UUID user_id
      +string token
      +datetime expires_at
    }
    class OAuthAccount {
      +UUID id
      +UUID user_id
      +string provider
      +string external_id
    }
    User "1" --> "*" Session
    User "1" --> "*" OAuthAccount
```

## 5. Multi-tenant isolation

```mermaid
flowchart LR
    subgraph Tenant A
      UA[Users A] --> DB_A[(DB A)]
    end
    subgraph Tenant B
      UB[Users B] --> DB_B[(DB B)]
    end
    subgraph Edge
      R[Router: tenant = subdomain]
    end
    R --> UA
    R --> UB
```

## 6. Event-driven (publish/subscribe)

```mermaid
flowchart LR
    P[Order Service] -->|order.created| EB{{Event Bus}}
    EB --> I1[Inventory Service]
    EB --> I2[Email Service]
    EB --> I3[Analytics Service]
```

## 7. CI/CD pipeline

```mermaid
flowchart LR
    A[git push] --> B[CI: lint + test]
    B -->|ok| C[Build image]
    B -->|fail| X[Notify dev]
    C --> D[Push to registry]
    D --> E[Deploy: staging]
    E -->|smoke tests ok| F[Deploy: prod]
    E -->|fail| R[Rollback]
```

## 8. Caching strategy

```mermaid
flowchart TD
    R[Request] --> C{Cache hit?}
    C -->|Yes| RET[Return cached]
    C -->|No| S[Service]
    S --> W[Write to cache, TTL=300s]
    W --> RET2[Return to client]
```

## 9. Role-based access

```mermaid
flowchart TD
    U[User] --> R{Role?}
    R -->|admin| A1[All endpoints]
    R -->|editor| A2[CRUD on owned]
    R -->|viewer| A3[Read only]
    R -->|none| A4[401]
```

## 10. WebSocket realtime

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WS Gateway
    participant S as Service
    C->>WS: connect (auth token)
    WS->>S: validate + subscribe
    loop events
      S-->>WS: emit("order.updated", payload)
      WS-->>C: frame
    end
    C->>WS: disconnect
```

## Conventions

- Use `flowchart TD` for top-down control flow.
- Use `sequenceDiagram` for actor/timeline flows.
- Use `stateDiagram-v2` for wizards / finite state.
- Use `classDiagram` for ER-style data models.
- Use `erDiagram` (Mermaid-native) for DB schemas when cardinality matters.
- Keep labels ≤ 6 words. Break long flows into multiple linked diagrams.