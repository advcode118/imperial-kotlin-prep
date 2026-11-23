// Provided file. You do not need to change anything here.

/** The outcome of handling a request, with its numeric HTTP status code. */
enum class Status(val code: Int) {
    OK(200),
    BAD_REQUEST(400),
    FORBIDDEN(403),
    NOT_FOUND(404),
}

/** A request for a page. The API key is optional and defaults to the empty string. */
data class Request(val url: String, val apiKey: String = "")

/** What the server sends back. The body is optional and defaults to the empty string. */
data class Response(val status: Status, val body: String = "")
