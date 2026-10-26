# SLOTWISE — University Exam Timetable Conflict Resolver (Exam Scheduling Studio)

**SLOTWISE** is a University Examination Timetable Conflict Resolver built on graph-theoretic models and Design and Analysis of Algorithms (DAA) principles. 

Phase 1 establishes the core algorithmic engine and verification foundation:
- Undirected conflict graph data structures with set-based symmetric adjacency.
- Graph construction engine with student enrolment parsing and deduplication.
- Heuristic Greedy Graph Coloring (Welsh-Powell descending degree and natural orderings).
- Exact Backtracking $K$-Coloring algorithm with search-node budgeting and deadline controls.
- Independent schedule validator enforcing non-conflict and completeness invariants.

---

## 1. Directory Structure

```text
timetable_conflict_resolver/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── algorithms/
│   │   │   ├── __init__.py
│   │   │   ├── backtracking.py   # Exact Backtracking K-Coloring
│   │   │   └── greedy.py         # Heuristic Greedy Coloring (Welsh-Powell)
│   │   ├── graph/
│   │   │   ├── __init__.py
│   │   │   ├── builder.py        # Graph construction from student enrolments
│   │   │   └── model.py          # Undirected ConflictGraph model
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── models.py         # Exam, Enrolment, ColoringResult, ValidationReport
│   │   ├── services/
│   │   │   └── __init__.py       # Service placeholders for future phases
│   │   └── validation/
│   │       ├── __init__.py
│   │       └── validator.py      # Independent schedule integrity validator
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_backtracking.py  # Tests for backtracking, limits, and infeasibility
│   │   ├── test_graph.py         # Tests for graph model, builder, and enrolments
│   │   ├── test_greedy.py        # Tests for greedy coloring, orderings, and limits
│   │   └── test_validator.py     # Tests for independent validator
│   ├── .env.example              # Environment variables template
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── public/
│   │   └── favicon.svg           # Branded SVG favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # AppShell, Header, Sidebar
│   │   │   └── ui/               # Button, Input, Card, Badge, Tooltip, Dialog, etc.
│   │   ├── context/              # ThemeContext, ToastContext
│   │   ├── lib/                  # Utility helpers (cn)
│   │   ├── routes/               # OverviewPage, PlaceholderPage, router config
│   │   ├── styles/               # tokens.css, index.css
│   │   └── test/                 # Vitest test suites (theme, navigation, components)
│   ├── index.html                # Anti-flash script and font preconnects
│   ├── package.json              # React 18, Vite, Tailwind CSS, Phosphor Icons
│   ├── tailwind.config.js        # Design tokens mapping
│   ├── tsconfig.json             # Strict TypeScript configuration
│   └── vite.config.ts            # Vite bundler configuration
├── .gitignore
├── pytest.ini                    # Pytest configuration
├── README.md                     # Documentation
└── requirements.txt              # Root requirements pointer
```

---

## 2. Graph Representation

The conflict graph $G = (V, E)$ represents the examination timetable problem:
- **Vertices ($V$):** Each examination is uniquely identified by an alphanumeric identifier (e.g., `'CS101'`, `'MATH201'`). Even examinations with zero enrolments are registered as isolated vertices ($d(v) = 0$).
- **Edges ($E$):** An undirected edge $(u, v) \in E$ indicates a conflict: at least one student is concurrently enrolled in both examinations $u$ and $v$. They must not be assigned to the same time slot (color).
- **Adjacency Storage:** Adjacency is stored using `dict[str, set[str]]`. Set-based adjacency provides $O(1)$ average-time edge checks, symmetric edge insertion, and duplicate edge prevention.
- **Constraints Enforced:**
  - Self-loops $(u, u)$ are rejected with `SelfLoopError`.
  - Operations on unregistered vertices raise `VertexNotFoundError`.
  - Edge counts reflect unique undirected pairs $\frac{1}{2} \sum_{v \in V} d(v)$.
  - Deterministic vertex and neighbor iteration orderings are guaranteed.

---

## 3. Input Format & Graph Construction

The graph builder (`build_conflict_graph`) accepts examination catalogs and enrolment records in multiple formats (Pydantic models, dictionaries, tuples, or strings).

### Input Formats

1. **Examinations Catalog:**
   - List of string identifiers: `["CS101", "MATH101", "PHYS101"]`
   - List of `Exam` models: `[Exam(id="CS101", name="Intro to CS"), ...]`
   - List of dictionaries: `[{"id": "CS101", "name": "Intro to CS"}, ...]`

2. **Student Enrolments:**
   - List of tuples: `[("Student1", "CS101"), ("Student1", "MATH101"), ("Student2", "PHYS101")]`
   - List of `Enrolment` models: `[Enrolment(student_id="S1", exam_id="CS101"), ...]`
   - Mapping (dict): `{"Student1": ["CS101", "MATH101"], "Student2": ["PHYS101"]}`

### Edge Case Handling
- **Single Enrolment:** Students registered for only 1 exam generate no edges; the exam vertex remains present in the graph.
- **Multiple Enrolments:** A student taking $m$ exams generates $\binom{m}{2}$ conflict edges between all pairs.
- **Duplicate Records:** Duplicate `(student_id, exam_id)` records are deduplicated automatically using set hashing.
- **Exams Without Students:** Retained as isolated vertices with degree 0.
- **Unknown Examination Reference:** If an enrolment references an uncatalogued exam, `UnknownExamReferenceError` is raised.
- **Empty Datasets:** Passing empty exams and enrolments produces a clean empty `ConflictGraph` ($|V|=0, |E|=0$).

---

## 4. Algorithm Interfaces and Outputs

Both algorithms return a structured `ColoringResult` model:

```python
class ColoringResult(BaseModel):
    assignment: Dict[str, int]   # exam_id -> slot index (1, 2, ...)
    color_count: int             # Total distinct colors/slots used
    status: ColoringStatus       # SUCCESS, INFEASIBLE, LIMIT_EXCEEDED, INCOMPLETE
    is_complete: bool            # True only if all vertices validly colored
    metadata: Dict[str, Any]     # Execution statistics (nodes, backtracks, ms)
```

### 4.1 Greedy Graph Coloring

```python
from backend.app.algorithms.greedy import greedy_coloring

result = greedy_coloring(
    graph=graph,
    ordering_strategy="descending_degree",  # or "natural"
    max_colors=5                            # optional constraint
)
```

- **Orderings Supported:**
  - `"descending_degree"` (Welsh-Powell): Orders vertices by degree descending, breaking ties by vertex ID ascending.
  - `"natural"`: Orders vertices strictly alphabetically by vertex ID.
- **Color Limit (`max_colors`):** If any vertex requires a slot index $> \text{max\_colors}$, the algorithm halts and returns `ColoringStatus.INCOMPLETE` with `is_complete=False`.

### 4.2 Backtracking $K$-Coloring

```python
from backend.app.algorithms.backtracking import backtracking_k_coloring

result = backtracking_k_coloring(
    graph=graph,
    k=3,                          # maximum allowed slots
    max_nodes=10000,              # optional node budget
    timeout_seconds=5.0,          # optional deadline
    ordering_strategy="descending_degree"
)
```

- **Validation:** $k$ must be a positive integer ($k \ge 1$).
- **Diagnostics Recorded in `metadata`:**
  - `nodes_explored`: Total recursive decision states evaluated.
  - `backtracks`: Total dead ends where assignments were undone.
  - `elapsed_time_ms`: Wall-clock execution time in milliseconds.
  - `proven_infeasible`: Boolean flag indicating mathematical proof of infeasibility.

---

## 5. Independent Validator

The validator (`validate_schedule`) operates independently of algorithm claims and evaluates the ground-truth graph against the candidate schedule:

```python
from backend.app.validation.validator import validate_schedule

report = validate_schedule(
    graph=graph,
    assignment=result.assignment,
    max_colors=3,
    allowed_colors={1, 2, 3}
)

if not report.is_valid:
    print("Violations:", report.errors)
```

**Checks Performed:**
1. `check_unknown_examinations`: Rejects examinations in assignment not present in the graph.
2. `check_missing_examinations`: Flags examinations present in the graph but unassigned (incomplete schedule).
3. `check_color_validity`: Ensures colors are positive integers ($c \in \mathbb{Z}^+$), rejecting non-integers, booleans, and negative values.
4. `check_color_range`: Confirms all colors satisfy $c \le \text{max\_colors}$ and $c \in \text{allowed\_colors}$.
5. `check_conflicts`: Iterates through every edge $(u, v) \in E$ and verifies that $\text{assignment}[u] \neq \text{assignment}[v]$.

---

## 6. Theoretical Analysis & Algorithmic Trade-offs

### 6.1 Greedy Coloring's Limitations
- **Polynomial Runtime:** Runs in $O(|V|^2 + |E|)$ time, making it exceptionally fast for large graphs.
- **Heuristic Nature:** Greedy coloring is order-dependent and does **not** guarantee the chromatic number $\chi(G)$ (the theoretical minimum number of time slots).
- **Suboptimality Example (Crown Graph $K_{n, n} - nK_2$):** For bipartite graphs (which have $\chi(G) = 2$), an unfavorable vertex ordering can force greedy coloring to use up to $\frac{|V|}{2}$ colors instead of 2. Welsh-Powell ordering mitigates this for many practical university schedules by processing high-degree conflict hubs first, guaranteeing an upper bound of $\Delta(G) + 1$, where $\Delta(G)$ is the maximum vertex degree.

### 6.2 Backtracking's Exponential Worst-Case Behavior
- **NP-Complete Decision Problem:** Determining whether a general graph can be colored with $k$ colors ($k$-colorability) is NP-complete for $k \ge 3$.
- **Worst-Case Complexity:** Backtracking searches an assignment tree of height $|V|$ with branching factor $k$. The worst-case time complexity is $O(k^{|V|})$.
- **Pruning & Heuristics:** By inspecting assigned neighbors before branching and employing descending-degree vertex ordering (first-fail principle), the search tree is pruned substantially in practical instances.

### 6.3 Infeasibility vs. Resource-Limit Termination
A critical distinction is maintained in SLOTWISE:
- **`INFEASIBLE` (`proven_infeasible = True`):**
  The search tree was explored **exhaustively**. Every branch terminated in a conflict without finding a valid assignment. This constitutes a definitive mathematical proof that no schedule exists with $\le k$ slots.
- **`LIMIT_EXCEEDED` (`proven_infeasible = False`):**
  The search was terminated early because the resource budget (`max_nodes` or `timeout_seconds`) was reached. The algorithm **does not know** whether a valid schedule exists further down the unexplored search tree. It must never be reported as infeasible.

---

## 7. Installation & Test Execution

### Prerequisites
- Python 3.12+
- Virtual environment (`venv`)

### Installation

```bash
# Clone and enter workspace
cd timetable_conflict_resolver

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Running Tests

Execute the full automated test suite with verbose reporting:

```bash
# From workspace root
.venv/bin/pytest -v
```

Or using an active virtual environment:

```bash
pytest -v
```

To run a specific test module:

```bash
pytest backend/tests/test_graph.py -v
pytest backend/tests/test_greedy.py -v
pytest backend/tests/test_backtracking.py -v
pytest backend/tests/test_validator.py -v
```

---

## 8. Phase 2: Frontend Design System & Application Shell

Phase 2 establishes the frontend foundation in `frontend/`:
- **Stack:** React 18, TypeScript (strict mode), Vite, Tailwind CSS v3, React Router v6, Phosphor Icons (`@phosphor-icons/react`), Vitest.
- **Palette & Tokens:**
  - Charcoal (`#111318`), Elevated surfaces (`#1B1E25`), Warm amber (`#F5A64A`), Muted teal (`#69C9B1`).
  - Dark and light themes backed by CSS custom properties in `tokens.css`.
  - LocalStorage theme persistence with inline anti-flash script in `index.html`.
- **Component Library:** `Button`, `Input`, `SearchInput`, `Card`, `Badge`, `Tooltip`, `Breadcrumb`, `EmptyState`, `Skeleton`, `ErrorState`, `Dialog`, and `ToastProvider`.
- **Application Shell:** Collapsible desktop sidebar, mobile responsive navigation drawer, top breadcrumbs, disabled search placeholder, and theme toggle.

### Frontend Development & Testing Commands

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Run frontend tests
npm test

# Build production bundle
npm run build
```

---

## 9. Phase 3: Landing Page & Authentication

Phase 3 introduces the public landing page and authentication experience:

- **Public Marketing Landing Page (`/`):**
  - Brand identity: **SLOTWISE** (*Exam Scheduling Studio*).
  - Primary message: *"Every exam has its place. Every conflict has a solution."*
  - **Interactive Conflict Graph Illustration:** Custom SVG-based visualization demonstrating examinations as vertices, concurrent student registrations as conflict edges, and valid chromatic time slots without conflicts.
  - **Feature Showcase:** Conflict graph construction, Welsh-Powell greedy coloring, exact backtracking with node budgets, independent timetable validation, and algorithm diagnostics.
  - **Three-Step Workflow:** Ingest student enrolments $\to$ Construct conflict graph $\to$ Solve & independently verify.
  - **Algorithm Comparison:** Transparent trade-off matrix contrasting polynomial heuristic speed ($O(|V|^2 + |E|)$) with exponential exact verification ($O(k^{|V|})$).
  - Seamless navigation, dark/light theme switching, and responsive design.

- **Authentication System:**
  - **Login Route (`/login`):** Email and password validation, show/hide password toggle, loading submission states, explicit error handling, and return-to-destination redirection (`?returnUrl=...`).
  - **Signup Route (`/signup`):** Full name, academic email, minimum 8-character password with complexity rules, confirmation password matching, and submission error states.
  - **Architecture & Security:**
    - Typed authentication service (`authService`) with standardized error codes (`INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `BACKEND_UNAVAILABLE`).
    - `AuthContext` state management providing user session status and reactive updates.
    - `ProtectedRoute` component guarding `/app/*` routes with automatic redirects to login.
    - **No Dummy Logins / No Plaintext Passwords:** When backend persistence is offline (prior to Phase 4 API endpoints), forms cleanly notify users that authentication services require the backend API without accepting fake credentials or exposing passwords.

---

## 10. Phase 4: Backend API, Database, and Data Management

Phase 4 establishes the persistent backend layer, relational database models, dynamic conflict graph API, and transactional sample data loading:

- **Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, SQLite (with `PRAGMA foreign_keys = ON`), Alembic migrations, Pydantic v2, Uvicorn, and Pytest.
- **Architectural Organization:**
  - `backend/app/config.py`: Centralized environment configuration and CORS origins.
  - `backend/app/database.py`: SQLAlchemy engine, SQLite foreign-key enforcement, session provider (`get_db`), and schema initializers.
  - `backend/app/models/`: Declarative ORM models (`ExamModel`, `StudentModel`, `EnrolmentModel`, `DatasetMetadataModel`) with indexes, unique constraints, and cascading deletions.
  - `backend/app/schemas/`: Typed request/response validation schemas with field-level sanitization.
  - `backend/app/repositories/`: Data access layer isolating SQL queries and pagination.
  - `backend/app/services/`: Business logic, referential validations, dynamic conflict graph computation via the Phase 1 builder, and transactional sample dataset loading.
  - `backend/app/routers/`: FastAPI endpoints organized by domain.
  - `backend/app/main.py`: ASGI application factory with startup lifespan and CORS middleware.
  - `backend/alembic/`: Repeatable, version-controlled database migrations.

### API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Health check verifying API status and database connectivity |
| `GET` | `/api/exams` | List paginated examinations with optional search filter |
| `POST` | `/api/exams` | Create examination (validates unique course code) |
| `GET` | `/api/exams/{id}` | Retrieve examination by UUID or course code |
| `PATCH` | `/api/exams/{id}` | Partially update examination fields with uniqueness checks |
| `DELETE` | `/api/exams/{id}` | Delete examination and cascade-clean enrolments |
| `GET` | `/api/students` | List paginated students with optional search filter |
| `POST` | `/api/students` | Register student (validates unique student identifier) |
| `GET` | `/api/students/{id}` | Retrieve student by UUID or institutional student_id |
| `PATCH` | `/api/students/{id}` | Partially update student fields with uniqueness checks |
| `DELETE` | `/api/students/{id}` | Delete student and cascade-clean enrolments |
| `GET` | `/api/enrolments` | List student course enrolments (filterable by exam or student) |
| `POST` | `/api/enrolments` | Enroll student in examination (validates references, prevents duplicates) |
| `DELETE` | `/api/enrolments/{id}` | Remove an enrolment record |
| `GET` | `/api/graph/conflicts` | Dynamically reconstructs conflict graph from database enrolments |
| `POST` | `/api/sample-data` | Transactionally load 10 exams & 20 students (`reset=False` protects data) |
| `POST` | `/api/sample-data/load` | Alias for loading sample academic dataset |

### Dynamic Conflict Graph Construction

`GET /api/graph/conflicts` queries active persistent database records and constructs the graph using the Phase 1 `build_conflict_graph` engine. It returns:
- Vertices with metadata and computed vertex degrees.
- Unique undirected conflict edges with weight (number of shared students) and shared student rosters.
- Adjacency mapping and list of isolated examinations (degree 0).
- Deterministic output without self-loops or stale caching.

### Server Startup & Migration Commands

```bash
# Apply database migrations
.venv/bin/alembic upgrade head

# Start FastAPI development server
.venv/bin/uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

- **Interactive API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc UI:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Automated Test Execution

```bash
# Run all backend tests (Phase 1 algorithm tests + Phase 4 persistent API tests)
.venv/bin/pytest -v

# Run frontend tests
cd frontend && npm test
```

### Access Model & Security Assumptions

- **Development Access Model:** The Phase 4 data management API operates in local development mode without pretending that a full multi-user authentication boundary is enforced.
- **CORS Protection:** Requests are restricted to configured origins (`http://localhost:5173`, `http://127.0.0.1:5173`).
- **No Plaintext Passwords / No Fake Auth:** The backend does not expose insecure mock authentication endpoints or accept unhashed dummy passwords.

---

## 11. Phase 5: Frontend–Backend Integration

Phase 5 connects the React + TypeScript frontend with the persistent FastAPI backend, establishing real-time data flow across examinations, student enrolments, and dynamic conflict graphs:

- **Centralized Typed API Client (`frontend/src/services/apiClient.ts`):**
  - Configured via `VITE_API_BASE_URL` (with fallback to Vite development proxy `/api` pointing to `http://127.0.0.1:8000`).
  - Strict TypeScript data contracts (`frontend/src/types/api.ts`) mirroring FastAPI schemas.
  - Automatic error normalization handling HTTP 404, 409 (duplicate unique keys), 422 (validation errors), 500, and offline network errors.
  - `AbortSignal` cancellation support preventing stale asynchronous overwrites on unmount.
  - Safe configuration template provided in [`frontend/.env.example`](file:///Users/rohankumar/Desktop/timetable_conflict_resolver/frontend/.env.example).

- **Live Backend Connection Indicator (`BackendStatusBadge.tsx`):**
  - Integrated directly in the application shell header.
  - Real-time connection states: *Checking API*, *Backend Connected* (with version & DB metadata tooltip), and *API Offline* (with manual retry trigger and operational troubleshooting guidance).

- **Live Overview Dashboard (`OverviewPage.tsx`):**
  - Renders genuine counts computed from persistent SQLite tables: Active Examinations, Registered Students, Total Course Enrolments, and Conflict Edges ($|E|$).
  - Top Conflict Hubs table sorted by degree centrality ($d(v)$) highlighting the hardest-to-schedule examinations.
  - Transactional sample dataset loader with optional database reset toggle.
  - Honest zero-state handling with no fabricated metrics or fake recent events.

- **Examination Management Catalog (`ExaminationsPage.tsx`):**
  - Paginated course catalog with live keyword search.
  - Interactive modal dialogs for registering new examinations and modifying course metadata.
  - Confirmation modal for cascade deletion with live report of cleaned student enrolments.
  - Client-side validation paired with backend 409 duplicate code error handling.

- **Student & Enrolment Management (`StudentsPage.tsx`):**
  - Student roster with search by institutional identifier or student name.
  - Student creation and profile editing modals.
  - Course Enrolment Manager: Inspect enrolled courses, add new courses, drop enrolments, and handle duplicate enrolment conflicts with clear toast notifications.

- **Conflict Graph Data Summary (`ConflictGraphPage.tsx`):**
  - Displays mathematical graph properties derived from `/api/graph/conflicts`: $|V|$, $|E|$, graph density, maximum degree $\Delta(G)$, and isolated courses.
  - Dual-tab inspection:
    1. *Vertices & Adjacency:* Course degree distribution and adjacent conflicting course codes.
    2. *Conflict Edges:* Weighted conflict pairs with shared student identifiers.
  - Clear milestone banner indicating interactive force-directed canvas arrives in Phase 6.

### Running Frontend & Backend Concurrently

```bash
# Terminal 1: Start FastAPI backend
.venv/bin/uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2: Start Vite frontend dev server
cd frontend && npm run dev
```

The frontend will be available at `http://localhost:5173/` (Landing) and `http://localhost:5173/app` (Studio Shell).

### Verification & Testing Commands

```bash
# Backend pytest suite (104 passing tests)
.venv/bin/pytest -v

# Frontend TypeScript type check
cd frontend && npm run typecheck

# Frontend test suite (59 passing tests across 9 test files)
cd frontend && npm test -- --run

# Frontend production build
cd frontend && npm run build
```

---

## 12. Phase 6: Interactive Conflict Graph Explorer

SLOTWISE Phase 6 delivers a fully interactive, production-grade **Conflict Graph Explorer** on `/conflict-graph` (and `/app/conflict-graph`), powered by `@xyflow/react` v12, real backend graph data (`GET /api/graph/conflicts`), and mathematical graph-coloring principles.

### Mathematical Invariants & Architecture

The conflict graph $G = (V, E)$ represents institutional examination scheduling constraints:
1. **Vertices $V$:** Each examination registered in the database is a vertex $v \in V$, regardless of whether it has conflicts.
2. **Conflict Edges $E$:** An undirected edge $(u, v) \in E$ exists if and only if at least one student is enrolled in both course $u$ and course $v$.
3. **No Self-Loops & No Duplicate Edges:** For all $v \in V$, $(v, v) \notin E$, and for each pair $\{u, v\}$, exactly one undirected edge exists.
4. **Dynamic Edge Weights:** Each edge $(u, v)$ carries an exact weight $w(u, v) = |S_u \cap S_v|$ representing the exact count of shared students.
5. **Conflict Degree $d(v)$:** The degree of vertex $v$ equals the number of incident conflict edges. Vertices with $d(v) = 0$ are isolated (can be scheduled in any slot), while vertices with $d(v) \ge 3$ are high-degree scheduling hubs.
6. **Zero-Conflict Invariant:** If $|V| > 0$ and $|E| = 0$, all examinations are pairwise disjoint in student enrolment. The chromatic number is $\chi(G) = 1$, and an informative banner confirms that all courses can be scheduled concurrently in a single slot.

### Key Interactive Features

- **React Flow Canvas (`@xyflow/react`):**
  - **Custom Examination Node (`ExamNode.tsx`):** Displays course code, full title, department/semester, conflict degree badge ($d(v)$), isolated badge, and 4-way docking handles for dynamic edge routing.
  - **Deterministic Layout Engine (`graphLayout.ts`):** Partitions the graph into connected components using BFS and computes stable trigonometric coordinates ($x = cx + R \cos\theta, y = cy + R \sin\theta$) without node overlap or layout jitter. Supports **Concentric Hub Centrality**, **Circular**, and **Component Grid** layouts.
  - **Interactive Highlighting & Dimming:** Clicking an exam node highlights it in accent amber, highlights its direct conflicting neighbours in accent teal, emphasizes incident edges with animated amber strokes, and dims unrelated nodes and edges to 25% opacity. Clicking empty canvas clears selection.
  - **Sliding Details Panel (`GraphDetailsPanel.tsx`):** Detailed side drawer for the active course displaying course specifications, graph-coloring constraints, list of conflicting courses with student weight badges, expandable shared student rosters, and click-to-focus navigation to jump between connected courses.
  - **Keyword Search & Instant Filter Pills:** Search by course code or subject title; filter by *All*, *Conflicted (d ≥ 1)*, *Isolated (d = 0)*, and *High Hubs (d ≥ 3)* with non-destructive state preservation.
  - **Viewport Controls & Navigation:** Smooth pan, zoom (0.2x to 2.5x), Fit to Viewport button, interactive MiniMap with state-colored nodes, and subtle background dot texture.
  - **Compact Visual Legend (`GraphLegend.tsx`):** Collapsible legend explaining node rings (selected amber, neighbour teal, hub, isolated) and conflict edge weights.
  - **Tabular Conflict Matrix Toggle:** Retains the dual-table inspection tabs for Vertices & Adjacency and Weighted Conflict Edges alongside the interactive visual canvas.

---

## 13. Phase 7: Algorithm Laboratory & Timetable Generation

SLOTWISE Phase 7 introduces the **Algorithm Laboratory**, accessible at `/algorithm-lab` and `/app/algorithms`. It provides a comprehensive, interactive workbench to configure, execute, benchmark, and compare graph-coloring heuristics and exact branch-and-bound algorithms using real university examination and enrolment data.

### Algorithmic Foundations & Backend Orchestration

1. **Greedy Graph Coloring ($O(V^2)$ / Welsh-Powell Heuristic):**
   - **Ordering Strategies:** Orders vertices by `descending_degree` (Welsh-Powell degree heuristic) or `natural` (input order). Welsh-Powell prioritizes high-degree constraint hubs early, minimizing total chromatic slots.
   - **Upper Bound:** Produces an upper bound on $\chi(G)$ guaranteed to satisfy $\chi(G) \le \Delta(G) + 1$ (Brook's Theorem).
   - **Optional Slot Ceiling:** Allows specifying a target slot cap $k$. If the heuristic exceeds $k$, returns status `INCOMPLETE` with partial assignments.

2. **Exact Backtracking ($O(k^V)$ / State-Space Search):**
   - **Decision Tree & Forward Checking:** Explores depth-first assignment of color slots $[1..k]$ to vertices, pruning infeasible branches when adjacent constraints are violated.
   - **Exhaustive Infeasibility Certificate:** When the entire state space is exhaustively explored without finding a coloring, proves mathematical infeasibility for $k$ slots (status `INFEASIBLE`).
   - **Safe Resource Limits:** Guards against exponential explosion via configurable `max_nodes` (default: 100,000) and `timeout_seconds` (default: 5.0s). Exceeding limits returns `RESOURCE_LIMITED`, explicitly informing the user that search was truncated without falsely declaring mathematical infeasibility.

3. **Mandatory Independent Constraint Validation:**
   - Every execution run is automatically piped through `validate_schedule()` (`backend/app/validation/validator.py`).
   - A schedule is only stamped `is_valid: true` if:
     - Completeness: Every registered exam is assigned to a slot.
     - Pairwise Invariant: For all $(u, v) \in E(G)$, $\text{slot}(u) \ne \text{slot}(v)$.
     - Contiguity: Assigned slots fall strictly within $[1..k]$.

4. **Side-by-Side Comparison Mode ("Run Both"):**
   - Runs Welsh-Powell and Exact Backtracking concurrently against the exact same conflict graph snapshot.
   - Produces a comparative benchmark comparing slots used, CPU duration (ms), nodes explored, backtracks, and theoretical time complexity.

### Frontend Features & User Experience

- **Configurable Solver Workbench:** Mode selector tabs for Greedy, Backtracking, and Run Both. Dynamic Brooks' Bound recommendation button ($\Delta(G) + 1$) for setting sensible slot targets.
- **Result Metrics Bar & Plain-Language Narrative:** Real-time metrics for status (`COMPLETED`, `INFEASIBLE`, `RESOURCE_LIMITED`, `INCOMPLETE`), slots required, execution time (μs/ms), and 0-conflict validation badge. Pedagogical narrative explains algorithm decisions, bottlenecks, and bounds.
- **Slot Allocation Grid ("Schedule View"):** Visual swimlane columns for each time slot (`Slot 1`, `Slot 2`, ...). Each slot header uses accessible, deterministic color tokens from `getSlotTheme(slot)`. Course cards display code, title, department, semester, student count, and conflict degree.
- **Real-Time Conflict Graph Coloring:** The Conflict Graph Explorer directly reflects active slot assignments, tinting nodes and displaying "Slot X" badges while preserving selection rings, edge highlighting, and layout options.
- **Independent Validation Certificate Tab:** Detailed breakdown of checks performed, zero-conflict certificate, and invariant verification guarantees.
- **Side-by-Side Benchmark Matrix:** Comparative analytical table evaluating Greedy vs. Backtracking metrics and trade-offs.
- **Execution History:** Cached session run drawer allowing past solutions to be reloaded into the viewer with a single click.





