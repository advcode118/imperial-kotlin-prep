// Library catalogue API: reference solution.

// ---------------------------------------------------------------------------
// Part 1: URLs
// ---------------------------------------------------------------------------

fun protocol(url: String): String = url.substringBefore("://")

/** Everything between "://" and the first "/" or "?": the server name and optional port. */
private fun authority(url: String): String =
    url.substringAfter("://").substringBefore("/").substringBefore("?")

fun server(url: String): String = authority(url).substringBefore(":")

fun port(url: String): Int {
    val explicit = authority(url).substringAfter(":", "").toIntOrNull()
    return explicit ?: when (protocol(url)) {
        "https" -> 443
        else -> 80
    }
}

fun resource(url: String): String {
    val afterProtocol = url.substringAfter("://").substringBefore("?")
    return if (afterProtocol.contains("/")) "/" + afterProtocol.substringAfter("/") else "/"
}

fun parameters(url: String): List<Pair<String, String>> {
    val query = url.substringAfter("?", "")
    if (query.isEmpty()) return emptyList()
    return query.split("&").map { entry ->
        entry.substringBefore("=") to entry.substringAfter("=", "")
    }
}

fun parameter(url: String, name: String): String? =
    parameters(url).firstOrNull { it.first == name }?.second

// ---------------------------------------------------------------------------
// Part 1: Handlers
// ---------------------------------------------------------------------------

private fun capitalise(word: String): String = word.replaceFirstChar { it.uppercase() }

fun welcomeHandler(request: Request): Response = Response(Status.OK, "Welcome to the library")

fun bookHandler(request: Request): Response {
    val title = parameter(request.url, "title") ?: "unknown"
    return Response(Status.OK, "Title: ${capitalise(title)}")
}

fun loanHandler(request: Request): Response {
    val member = parameter(request.url, "member") ?: return Response(Status.BAD_REQUEST)
    val days = parameter(request.url, "days") ?: "21"
    return Response(Status.OK, "${capitalise(member)} may borrow for $days days")
}

// ---------------------------------------------------------------------------
// Part 2: Routing
// ---------------------------------------------------------------------------

fun hoursHandler(request: Request): Response = Response(Status.OK, "Open 9 to 5")

fun route(request: Request): Response = when (resource(request.url)) {
    "/" -> welcomeHandler(request)
    "/book" -> bookHandler(request)
    "/loans" -> loanHandler(request)
    "/about/hours" -> hoursHandler(request)
    else -> Response(Status.NOT_FOUND)
}

// ---------------------------------------------------------------------------
// Extension: configurable routing
// ---------------------------------------------------------------------------

typealias Handler = (Request) -> Response

val libraryRoutes: List<Pair<String, Handler>> = listOf(
    "/" to ::welcomeHandler,
    "/book" to ::bookHandler,
    "/loans" to ::loanHandler,
    "/about/hours" to ::hoursHandler,
)

fun configureRoutes(routes: List<Pair<String, Handler>>): Handler = { request ->
    val match = routes.firstOrNull { it.first == resource(request.url) }
    if (match != null) match.second(request) else Response(Status.NOT_FOUND)
}

// ---------------------------------------------------------------------------
// Extension: filters
// ---------------------------------------------------------------------------

fun requireKey(key: String, wrapped: Handler): Handler = { request ->
    if (request.apiKey == key) wrapped(request) else Response(Status.FORBIDDEN)
}

fun requireParam(name: String, wrapped: Handler): Handler = { request ->
    if (parameter(request.url, name) != null) wrapped(request) else Response(Status.BAD_REQUEST)
}

// Beyond the exercise text: a filter that records each request and its outcome.
// It always calls the wrapped handler, so it can sit outside or inside the others.
fun logged(log: MutableList<String>, wrapped: Handler): Handler = { request ->
    val response = wrapped(request)
    log.add("${resource(request.url)} ${response.status.code}")
    response
}
