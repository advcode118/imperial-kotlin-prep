// Library catalogue API: replace each TODO() with your implementation.
// Request, Response and Status are defined in Http.kt.

// ---------------------------------------------------------------------------
// Part 1: URLs
// ---------------------------------------------------------------------------

/** "https://library.example.org:8080/book?title=dune" -> "https" */
fun protocol(url: String): String = TODO()

/** The machine name only, without any port: "library.example.org" */
fun server(url: String): String = TODO()

/** The port after the server name, or the protocol's default (443 for https, otherwise 80). */
fun port(url: String): Int = TODO()

/** The resource being asked for: "/book". A URL with nothing after the server has the resource "/". */
fun resource(url: String): String = TODO()

/** The query parameters in order: [("title", "dune")]. No query string means an empty list. */
fun parameters(url: String): List<Pair<String, String>> = TODO()

/** The value of the first parameter with the given name, or null if there is none. */
fun parameter(url: String, name: String): String? = TODO()

// ---------------------------------------------------------------------------
// Part 1: Handlers
// ---------------------------------------------------------------------------

fun welcomeHandler(request: Request): Response = TODO()

fun bookHandler(request: Request): Response = TODO()

fun loanHandler(request: Request): Response = TODO()

// ---------------------------------------------------------------------------
// Part 2: Routing
// ---------------------------------------------------------------------------

fun hoursHandler(request: Request): Response = TODO()

fun route(request: Request): Response = TODO()

// ---------------------------------------------------------------------------
// Extensions
//
// Nothing is provided for these. Add the Handler type alias, libraryRoutes,
// configureRoutes(), requireKey() and requireParam() below, using the
// signatures given in the exercise text.
// ---------------------------------------------------------------------------
